import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '@nav/database'
import { EmailBindingService, type EmailVerificationSender } from './email-binding.js'

const mockDb = {
  first: vi.fn(),
  execute: vi.fn(),
  all: vi.fn(),
  batch: vi.fn()
} as unknown as DatabaseClient

const mockSender = {
  sendEmailBindingVerification: vi.fn()
} as unknown as EmailVerificationSender

describe('EmailBindingService', () => {
  let service: EmailBindingService

  beforeEach(() => {
    vi.resetAllMocks()
    service = new EmailBindingService({
      db: mockDb,
      sender: mockSender,
      webAppUrl: 'https://nav.example.com',
      exposeVerificationUrl: true
    })
  })

  it('creates a verification challenge for an unused email', async () => {
    vi.spyOn(mockDb, 'first')
      .mockResolvedValueOnce({ id: 'user-1', email: null })
      .mockResolvedValueOnce(null)

    const result = await service.requestBinding('user-1', '  New@Example.com ')

    expect(mockDb.batch).toHaveBeenCalledTimes(1)
    expect(mockSender.sendEmailBindingVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'new@example.com',
        verificationUrl: expect.stringContaining('/email-binding/verify?token=')
      })
    )
    expect(result.verificationUrl).toContain('/email-binding/verify?token=')
  })

  it('rejects an email already used by another account', async () => {
    vi.spyOn(mockDb, 'first')
      .mockResolvedValueOnce({ id: 'user-1', email: null })
      .mockResolvedValueOnce({ id: 'user-2', email: 'used@example.com' })

    await expect(service.requestBinding('user-1', 'used@example.com')).rejects.toMatchObject({
      code: 'EMAIL_IN_USE',
      statusCode: 409
    })
    expect(mockSender.sendEmailBindingVerification).not.toHaveBeenCalled()
  })

  it('rejects expired verification links', async () => {
    vi.spyOn(mockDb, 'first').mockResolvedValueOnce({
      id: 'challenge-1',
      user_id: 'user-1',
      email: 'new@example.com',
      token_hash: 'hash',
      expires_at: Date.now() - 1,
      created_at: Date.now() - 1000,
      consumed_at: null
    })

    await expect(service.validateToken('a'.repeat(32))).rejects.toMatchObject({
      code: 'EMAIL_BINDING_EXPIRED',
      statusCode: 410
    })
  })

  it('sets the verified email and password when the challenge is completed', async () => {
    const challenge = {
      id: 'challenge-1',
      user_id: 'user-1',
      email: 'new@example.com',
      token_hash: 'hash',
      expires_at: Date.now() + 60_000,
      created_at: Date.now(),
      consumed_at: null
    }
    vi.spyOn(mockDb, 'first')
      .mockResolvedValueOnce(challenge)
      .mockResolvedValueOnce({ id: 'user-1', email: null })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'user-1', email: 'new@example.com' })
    vi.spyOn(mockDb, 'execute').mockResolvedValue({ changes: 1 })

    const user = await service.completeBinding('a'.repeat(32), 'password-123')

    expect(mockDb.execute).toHaveBeenCalledWith(
      expect.stringContaining('SET email = ?, password_hash = ?'),
      expect.arrayContaining(['new@example.com', expect.any(String), 'user-1'])
    )
    expect(user.email).toBe('new@example.com')
  })
})
