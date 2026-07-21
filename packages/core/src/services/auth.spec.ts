import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from './auth.js'
import type { DatabaseClient } from '@nav/database'
import { AvatarService } from './avatar.js'
import bcrypt from 'bcryptjs'

// Mock dependencies
const mockDb = {
  first: vi.fn(),
  execute: vi.fn(),
  all: vi.fn(),
  batch: vi.fn()
} as unknown as DatabaseClient

const mockAvatarService = {
  generateAndUpload: vi.fn()
} as unknown as AvatarService

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
} as any

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(() => {
    vi.resetAllMocks()
    authService = new AuthService({
      db: mockDb,
      avatarService: mockAvatarService,
      logger: mockLogger
    })
  })

  describe('register', () => {
    it('should throw error if user already exists', async () => {
      vi.spyOn(mockDb, 'first').mockResolvedValueOnce({ id: 'existing' })

      await expect(authService.register('test@example.com', 'password')).rejects.toThrow(
        'User already exists'
      )
    })

    it('should create user successfully', async () => {
      vi.spyOn(mockDb, 'first').mockResolvedValueOnce(null) // Check existing

      vi.spyOn(mockAvatarService, 'generateAndUpload').mockResolvedValue('http://avatar.url')

      const user = await authService.register('test@example.com', 'password')

      expect(mockDb.execute).toHaveBeenCalled()
      expect(mockAvatarService.generateAndUpload).toHaveBeenCalled()
      expect(user).toBeDefined()
    })

    it('should continue registration if avatar generation fails', async () => {
      vi.spyOn(mockDb, 'first').mockResolvedValueOnce(null)

      vi.spyOn(mockAvatarService, 'generateAndUpload').mockRejectedValue(new Error('Avatar failed'))

      await authService.register('test@example.com', 'password')

      expect(mockDb.execute).toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.any(Error),
          userId: expect.any(String)
        }),
        'Failed to generate avatar during creation'
      )
    })
  })

  describe('validateUser', () => {
    it('should return null if user not found', async () => {
      vi.spyOn(mockDb, 'first').mockResolvedValue(null)

      const result = await authService.validateUser('test@example.com', 'password')
      expect(result).toBeNull()
    })

    it('should return null if password does not match', async () => {
      const hash = await bcrypt.hash('correct-password', 10)
      vi.spyOn(mockDb, 'first').mockResolvedValue({ password_hash: hash })

      const result = await authService.validateUser('test@example.com', 'wrong-password')
      expect(result).toBeNull()
    })

    it('should return user if credentials are valid', async () => {
      const hash = await bcrypt.hash('correct-password', 10)
      const mockUser = { id: '1', email: 'test@example.com', password_hash: hash }
      vi.spyOn(mockDb, 'first').mockResolvedValue(mockUser)

      const result = await authService.validateUser('test@example.com', 'correct-password')
      expect(result).toEqual(mockUser)
    })
  })

  describe('updateNickname', () => {
    it('should trim and update the nickname', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        nickname: 'Old name',
        updated_at: 1
      }
      vi.spyOn(mockDb, 'first').mockResolvedValue(mockUser)

      const result = await authService.updateNickname('1', '  New name  ')

      expect(mockDb.execute).toHaveBeenCalledWith(
        'UPDATE users SET nickname = ?, updated_at = ? WHERE id = ?',
        ['New name', expect.any(Number), '1']
      )
      expect(result).toEqual(
        expect.objectContaining({
          nickname: 'New name',
          updated_at: expect.any(Number)
        })
      )
    })

    it('should reject an empty nickname', async () => {
      await expect(authService.updateNickname('1', '   ')).rejects.toThrow(
        'Nickname must contain 1 to 30 characters'
      )
      expect(mockDb.first).not.toHaveBeenCalled()
      expect(mockDb.execute).not.toHaveBeenCalled()
    })

    it('should reject a nickname longer than 30 characters', async () => {
      await expect(authService.updateNickname('1', 'a'.repeat(31))).rejects.toThrow(
        'Nickname must contain 1 to 30 characters'
      )
      expect(mockDb.first).not.toHaveBeenCalled()
      expect(mockDb.execute).not.toHaveBeenCalled()
    })

    it('should return not found when the user does not exist', async () => {
      vi.spyOn(mockDb, 'first').mockResolvedValue(null)

      await expect(authService.updateNickname('missing', 'New name')).rejects.toThrow(
        'User not found'
      )
      expect(mockDb.execute).not.toHaveBeenCalled()
    })
  })
})
