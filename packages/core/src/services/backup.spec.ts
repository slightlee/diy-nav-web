import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BackupService } from './backup.js'
import { D1Client } from '@nav/database'
import { R2Client } from '@nav/storage'

// Mock dependencies
const mockD1 = {
  query: vi.fn(),
  first: vi.fn(),
  all: vi.fn()
} as unknown as D1Client

const mockR2 = {
  upload: vi.fn(),
  get: vi.fn(),
  delete: vi.fn()
} as unknown as R2Client

describe('BackupService', () => {
  let backupService: BackupService

  beforeEach(() => {
    vi.clearAllMocks()
    backupService = new BackupService({
      d1: mockD1,
      r2: mockR2,
      maxBackups: 2, // Small number for testing cleanup
      backupRootDir: 'backups'
    })
  })

  describe('createBackup', () => {
    it('should create a manual backup successfully', async () => {
      const userId = 'user1'
      const data = { foo: 'bar' }

      vi.spyOn(mockD1, 'query').mockResolvedValue({
        success: true,
        result: [],
        errors: [],
        messages: []
      })
      vi.spyOn(mockD1, 'first').mockResolvedValue({ id: 1, storage_key: 'key' })
      vi.spyOn(mockD1, 'all').mockResolvedValue([]) // No old backups to cleanup

      const result = await backupService.createBackup(userId, data, 'MANUAL')

      expect(mockR2.upload).toHaveBeenCalled()
      expect(mockD1.query).toHaveBeenCalledWith(
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

      vi.spyOn(mockD1, 'first').mockResolvedValue({ file_hash: hash })

      const result = await backupService.createBackup(userId, data, 'AUTO')

      expect(result).toBeNull()
      expect(mockR2.upload).not.toHaveBeenCalled()
    })

    it('should cleanup old backups if limit exceeded', async () => {
      const userId = 'user1'
      const data = { foo: 'bar' }

      // Mock existing backups exceeding limit (limit is 2)
      const oldBackups = [
        { id: 1, storage_key: 'key1', created_at: 100 },
        { id: 2, storage_key: 'key2', created_at: 200 },
        { id: 3, storage_key: 'key3', created_at: 300 }
      ]

      vi.spyOn(mockD1, 'query').mockResolvedValue({
        success: true,
        result: [],
        errors: [],
        messages: []
      })
      vi.spyOn(mockD1, 'first').mockResolvedValue({ id: 4 }) // Return new backup
      // Mock cleanupOldBackups logic: it calls d1.all
      vi.spyOn(mockD1, 'all').mockResolvedValue(oldBackups)

      await backupService.createBackup(userId, data, 'MANUAL')

      // Should delete the oldest one (id: 1, key1)
      // Wait, logic is: slice(maxBackups) -> slice(2) -> index 2 -> {id:3} if sorted DESC?
      // Code says: ORDER BY created_at DESC. So [newest, middle, oldest].
      // slice(2) gives [oldest].
      // So if we return [300, 200, 100], slice(2) is [100].
      // Let's assume mock returns sorted DESC: [3, 2, 1]

      // Actually, createBackup calls cleanupOldBackups AFTER insert.
      // So if we have 2, insert 1 -> 3. Then cleanup.
      // We mock d1.all to return 3 items.

      expect(mockR2.delete).toHaveBeenCalled()
      expect(mockD1.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM data_backups'),
        expect.any(Array)
      )
    })
  })

  describe('listBackups', () => {
    it('should list backups for user', async () => {
      const userId = 'user1'
      const backups = [{ id: 1 }]
      vi.spyOn(mockD1, 'all').mockResolvedValue(backups)

      const result = await backupService.listBackups(userId)

      expect(result).toEqual(backups)
      expect(mockD1.all).toHaveBeenCalledWith(
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

      vi.spyOn(mockD1, 'first').mockResolvedValue({ storage_key: 'key' })
      vi.spyOn(mockR2, 'get').mockResolvedValue(JSON.stringify(content))

      const result = await backupService.getBackupContent(userId, backupId)

      expect(result).toEqual(content)
    })

    it('should throw error if backup not found', async () => {
      vi.spyOn(mockD1, 'first').mockResolvedValue(null)

      await expect(backupService.getBackupContent('user1', 1)).rejects.toThrow('Backup not found')
    })
  })

  describe('deleteBackup', () => {
    it('should delete backup from R2 and D1', async () => {
      const userId = 'user1'
      const backupId = 1

      vi.spyOn(mockD1, 'first').mockResolvedValue({ storage_key: 'key' })

      await backupService.deleteBackup(userId, backupId)

      expect(mockR2.delete).toHaveBeenCalledWith('key')
      expect(mockD1.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM data_backups'),
        [backupId]
      )
    })
  })
})
