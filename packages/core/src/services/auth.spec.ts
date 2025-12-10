import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from './auth.js'
import { D1Client } from '@nav/database'
import { AvatarService } from './avatar.js'
import bcrypt from 'bcryptjs'

// Mock dependencies
const mockD1 = {
  first: vi.fn(),
  query: vi.fn()
} as unknown as D1Client

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
    vi.clearAllMocks()
    authService = new AuthService({
      d1: mockD1,
      avatarService: mockAvatarService,
      logger: mockLogger
    })
  })

  describe('register', () => {
    it('should throw error if user already exists', async () => {
      vi.spyOn(mockD1, 'first').mockResolvedValueOnce({ id: 'existing' })

      await expect(authService.register('test@example.com', 'password')).rejects.toThrow(
        'User already exists'
      )
    })

    it('should create user successfully', async () => {
      vi.spyOn(mockD1, 'first')
        .mockResolvedValueOnce(null) // Check existing
        .mockResolvedValueOnce({ id: 'new-id', email: 'test@example.com' }) // Return created user

      vi.spyOn(mockAvatarService, 'generateAndUpload').mockResolvedValue('http://avatar.url')

      const user = await authService.register('test@example.com', 'password')

      expect(mockD1.query).toHaveBeenCalled()
      expect(mockAvatarService.generateAndUpload).toHaveBeenCalled()
      expect(user).toBeDefined()
    })

    it('should continue registration if avatar generation fails', async () => {
      vi.spyOn(mockD1, 'first').mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'new-id' })

      vi.spyOn(mockAvatarService, 'generateAndUpload').mockRejectedValue(new Error('Avatar failed'))

      await authService.register('test@example.com', 'password')

      expect(mockD1.query).toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.any(Error),
          userId: expect.any(String)
        }),
        'Failed to generate avatar'
      )
    })
  })

  describe('validateUser', () => {
    it('should return null if user not found', async () => {
      vi.spyOn(mockD1, 'first').mockResolvedValue(null)

      const result = await authService.validateUser('test@example.com', 'password')
      expect(result).toBeNull()
    })

    it('should return null if password does not match', async () => {
      const hash = await bcrypt.hash('correct-password', 10)
      vi.spyOn(mockD1, 'first').mockResolvedValue({ password_hash: hash })

      const result = await authService.validateUser('test@example.com', 'wrong-password')
      expect(result).toBeNull()
    })

    it('should return user if credentials are valid', async () => {
      const hash = await bcrypt.hash('correct-password', 10)
      const mockUser = { id: '1', email: 'test@example.com', password_hash: hash }
      vi.spyOn(mockD1, 'first').mockResolvedValue(mockUser)

      const result = await authService.validateUser('test@example.com', 'correct-password')
      expect(result).toEqual(mockUser)
    })
  })
})
