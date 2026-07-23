import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BackupService } from './backup.js'
import type { DatabaseClient } from '@nav/database'
import { R2Client } from '@nav/storage'

// Mock dependencies
const mockDb = {
  execute: vi.fn(),
  first: vi.fn(),
  all: vi.fn()
} as unknown as DatabaseClient

const mockStorage = {
  upload: vi.fn(),
  get: vi.fn(),
  delete: vi.fn()
} as unknown as R2Client

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
} as any

describe('BackupService', () => {
  let backupService: BackupService

  beforeEach(() => {
    vi.clearAllMocks()
    backupService = new BackupService({
      db: mockDb,
      storage: mockStorage,
      maxBackups: 2, // Small number for testing cleanup
      backupRootDir: 'backups',
      logger: mockLogger
    })
  })

  describe('createBackup', () => {
    it('should create a manual backup successfully', async () => {
      const userId = 'user1'
      const data = { foo: 'bar' }

      vi.spyOn(mockDb, 'execute').mockResolvedValue({})
      vi.spyOn(mockDb, 'first').mockResolvedValue({ id: 1, storage_key: 'key' })
      vi.spyOn(mockDb, 'all').mockResolvedValue([]) // No old backups to cleanup

      const result = await backupService.createBackup(userId, data, 'MANUAL')

      expect(mockStorage.upload).toHaveBeenCalled()
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO data_backups'),
        expect.any(Array)
      )
      expect(result).toBeDefined()
    })

    it('should skip auto backup if content is unchanged', async () => {
      const userId = 'user1'
      const data = { foo: 'bar' }
      // Mock existing backup with same hash
      // MD5 of {"foo":"bar"} is ... let's just rely on the implementation logic
      // We need to know the hash to mock it correctly, or mock the implementation of createBackup to check hash?
      // Actually, we can just mock the return of the first query for last backup.
      // But wait, the service calculates hash of current data.
      // MD5('{"foo":"bar"}') = 9bb58f26192e4ba00f01e2e7b136bbd8

      const hash = '9bb58f26192e4ba00f01e2e7b136bbd8'

      vi.spyOn(mockDb, 'first').mockResolvedValue({ file_hash: hash })

      const result = await backupService.createBackup(userId, data, 'AUTO')

      expect(result).toBeNull()
      expect(mockStorage.upload).not.toHaveBeenCalled()
    })

    it('should skip a concurrent auto backup with the same semantic hash', async () => {
      const userId = 'user1'
      const data = { foo: 'bar' }
      vi.spyOn(mockDb, 'first').mockResolvedValue(null)
      vi.spyOn(mockDb, 'execute').mockImplementation(async sql => {
        if (sql.includes('INSERT INTO data_backups')) return { changes: 0 }
        return {}
      })

      const result = await backupService.createBackup(userId, data, 'AUTO')

      expect(result).toBeNull()
      expect(mockStorage.upload).toHaveBeenCalled()
      expect(mockStorage.delete).toHaveBeenCalled()
    })

    it('should cleanup old backups if limit exceeded', async () => {
      const userId = 'user1'
      const data = { foo: 'bar' }

      // Mock existing backups exceeding limit (limit is 2), sorted by created_at DESC
      const oldBackups = [
        { id: 3, storage_key: 'key3', created_at: 300 },
        { id: 2, storage_key: 'key2', created_at: 200 },
        { id: 1, storage_key: 'key1', created_at: 100 }
      ]

      vi.spyOn(mockDb, 'execute').mockResolvedValue({})
      vi.spyOn(mockDb, 'first').mockResolvedValue({ id: 4 }) // Return new backup
      vi.spyOn(mockDb, 'all').mockResolvedValue(oldBackups)

      await backupService.createBackup(userId, data, 'MANUAL')

      expect(mockStorage.delete).toHaveBeenCalled()
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM data_backups'),
        [1]
      )
    })
  })

  describe('listBackups', () => {
    it('should list backups for user', async () => {
      const userId = 'user1'
      const backups = [{ id: 1 }]
      vi.spyOn(mockDb, 'all').mockResolvedValue(backups)

      const result = await backupService.listBackups(userId)

      expect(result).toEqual(backups)
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM data_backups'),
        [userId]
      )
    })
  })

  describe('getBackupContent', () => {
    it('should return parsed content', async () => {
      const userId = 'user1'
      const backupId = 1
      const content = { foo: 'bar' }

      vi.spyOn(mockDb, 'first').mockResolvedValue({ storage_key: 'key' })
      vi.spyOn(mockStorage, 'get').mockResolvedValue(JSON.stringify(content))

      const result = await backupService.getBackupContent(userId, backupId)

      expect(result).toEqual(content)
    })

    it('should throw error if backup not found', async () => {
      vi.spyOn(mockDb, 'first').mockResolvedValue(null)

      await expect(backupService.getBackupContent('user1', 1)).rejects.toThrow('Backup not found')
    })
  })

  describe('deleteBackup', () => {
    it('should delete backup from storage and database', async () => {
      const userId = 'user1'
      const backupId = 1

      vi.spyOn(mockDb, 'first').mockResolvedValue({ storage_key: 'key' })

      await backupService.deleteBackup(userId, backupId)

      expect(mockStorage.delete).toHaveBeenCalledWith('key')
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM data_backups'),
        [backupId]
      )
    })
  })
})
