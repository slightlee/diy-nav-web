import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from './auth.js'
import type { DatabaseClient } from '@nav/database'
import { AvatarService } from './avatar.js'
import bcrypt from 'bcryptjs'
import type { Logger } from '@nav/logger'

// Mock dependencies
const mockDb = {
  first: vi.fn(),
  execute: vi.fn(),
  all: vi.fn(),
  batch: vi.fn()
} as unknown as DatabaseClient

const mockAvatarService = {
  getAvatarUrl: vi.fn(() => 'http://avatar.url'),
  isValidKey: vi.fn(() => true)
} as unknown as AvatarService

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
} as unknown as Logger

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

      vi.spyOn(mockAvatarService, 'getAvatarUrl').mockReturnValue('http://avatar.url')

      const user = await authService.register('test@example.com', 'password')

      expect(mockDb.execute).toHaveBeenCalled()
      expect(mockAvatarService.getAvatarUrl).toHaveBeenCalled()
      expect(user).toBeDefined()
    })

    it('should continue registration if avatar generation fails', async () => {
      vi.spyOn(mockDb, 'first').mockResolvedValueOnce(null)

      vi.spyOn(mockAvatarService, 'getAvatarUrl').mockImplementation(() => {
        throw new Error('Avatar failed')
      })

      await authService.register('test@example.com', 'password')

      expect(mockDb.execute).toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.any(Error),
          userId: expect.any(String)
        }),
        'Failed to assign avatar during creation'
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

  describe('provider identities', () => {
    it('does not auto-link an existing email when a provider identity is new', async () => {
      vi.spyOn(mockDb, 'first').mockResolvedValueOnce(null)
      vi.spyOn(mockAvatarService, 'getAvatarUrl').mockReturnValue('http://avatar.url')

      const result = await authService.findOrCreateByProvider('github', 'github-1', {
        email: 'existing@example.com',
        nickname: 'GitHub user'
      })

      expect(result.isNewUser).toBe(true)
      expect(result.user.email).toBeNull()
      expect(result.user.password_hash).toBeNull()
      expect(mockDb.first).toHaveBeenCalledTimes(1)
      expect(mockDb.batch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            params: expect.arrayContaining([null, null])
          })
        ])
      )
    })

    it('rejects binding a provider identity used by another account', async () => {
      vi.spyOn(mockDb, 'first')
        .mockResolvedValueOnce({ id: 'current-user' })
        .mockResolvedValueOnce({ user_id: 'other-user' })

      await expect(
        authService.bindProviderIdentity('current-user', 'github', 'github-1', {})
      ).rejects.toMatchObject({ code: 'PROVIDER_ACCOUNT_IN_USE', statusCode: 409 })
      expect(mockDb.execute).not.toHaveBeenCalled()
    })

    it('treats binding the current identity as idempotent', async () => {
      vi.spyOn(mockDb, 'first')
        .mockResolvedValueOnce({ id: 'current-user' })
        .mockResolvedValueOnce({ user_id: 'current-user' })

      await authService.bindProviderIdentity('current-user', 'github', 'github-1', {})

      expect(mockDb.execute).not.toHaveBeenCalled()
    })

    it('rejects a second identity from the same provider', async () => {
      vi.spyOn(mockDb, 'first')
        .mockResolvedValueOnce({ id: 'current-user' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          user_id: 'current-user',
          provider: 'github',
          provider_uid: 'github-old'
        })

      await expect(
        authService.bindProviderIdentity('current-user', 'github', 'github-new', {})
      ).rejects.toMatchObject({ code: 'PROVIDER_ALREADY_BOUND', statusCode: 409 })
      expect(mockDb.execute).not.toHaveBeenCalled()
    })
  })

  describe('login method unbinding', () => {
    it('marks bound methods as removable only when another login method exists', async () => {
      vi.spyOn(mockDb, 'first').mockResolvedValueOnce({
        id: 'current-user',
        email: 'user@example.com'
      })
      vi.spyOn(mockDb, 'all').mockResolvedValueOnce([
        {
          user_id: 'current-user',
          provider: 'google',
          provider_uid: 'google-1',
          created_at: 100
        }
      ])

      await expect(authService.getLoginMethods('current-user')).resolves.toEqual({
        email: {
          bound: true,
          address: 'user@example.com',
          canUnbind: true
        },
        providers: [{ provider: 'google', boundAt: 100, canUnbind: true }]
      })
    })

    it('protects the only login method in the returned state', async () => {
      vi.spyOn(mockDb, 'first').mockResolvedValueOnce({
        id: 'current-user',
        email: 'user@example.com'
      })
      vi.spyOn(mockDb, 'all').mockResolvedValueOnce([])

      const methods = await authService.getLoginMethods('current-user')

      expect(methods.email.canUnbind).toBe(false)
    })

    it('unbinds email credentials when another method remains', async () => {
      const currentUser = { id: 'current-user', email: 'user@example.com' }
      const updatedUser = {
        ...currentUser,
        email: null,
        password_hash: null,
        email_verified_at: null
      }
      vi.spyOn(mockDb, 'first')
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(updatedUser)
      vi.spyOn(mockDb, 'execute').mockResolvedValueOnce({ changes: 1 })

      await expect(authService.unbindEmailLogin('current-user')).resolves.toEqual(updatedUser)
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringMatching(/SET email = NULL, password_hash = NULL[\s\S]+AND EXISTS/),
        [expect.any(Number), 'current-user', 'current-user']
      )
    })

    it('rejects unbinding the last email login method', async () => {
      vi.spyOn(mockDb, 'first').mockResolvedValueOnce({
        id: 'current-user',
        email: 'user@example.com'
      })
      vi.spyOn(mockDb, 'execute').mockResolvedValueOnce({ changes: 0 })

      await expect(authService.unbindEmailLogin('current-user')).rejects.toMatchObject({
        code: 'LAST_LOGIN_METHOD',
        statusCode: 409
      })
    })

    it('unbinds a provider identity when another method remains', async () => {
      vi.spyOn(mockDb, 'first')
        .mockResolvedValueOnce({ id: 'current-user', email: 'user@example.com' })
        .mockResolvedValueOnce({
          user_id: 'current-user',
          provider: 'google',
          provider_uid: 'google-1'
        })
      vi.spyOn(mockDb, 'execute').mockResolvedValueOnce({ changes: 1 })

      await expect(
        authService.unbindProviderIdentity('current-user', 'google')
      ).resolves.toBeUndefined()
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringMatching(/DELETE FROM user_identities[\s\S]+other\.provider <> \?/),
        ['current-user', 'google', 'current-user', 'current-user', 'google']
      )
    })

    it('rejects unbinding the last provider login method', async () => {
      vi.spyOn(mockDb, 'first')
        .mockResolvedValueOnce({ id: 'current-user', email: null })
        .mockResolvedValueOnce({
          user_id: 'current-user',
          provider: 'google',
          provider_uid: 'google-1'
        })
      vi.spyOn(mockDb, 'execute').mockResolvedValueOnce({ changes: 0 })

      await expect(
        authService.unbindProviderIdentity('current-user', 'google')
      ).rejects.toMatchObject({ code: 'LAST_LOGIN_METHOD', statusCode: 409 })
    })
  })
})
