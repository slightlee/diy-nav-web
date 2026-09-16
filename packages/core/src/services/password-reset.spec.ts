import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '@nav/database'
import { PasswordResetService, type PasswordResetSender } from './password-reset.js'
import type { EmailVerificationMessage } from './email-binding.js'

const createDbMock = (): DatabaseClient => ({
  dialect: 'mysql',
  first: vi.fn(async () => null),
  all: vi.fn(async () => []),
  execute: vi.fn(async () => ({ changes: 1 })),
  batch: vi.fn(async () => [])
})

const createSender = (): PasswordResetSender & { sent: EmailVerificationMessage[] } => {
  const sent: EmailVerificationMessage[] = []
  return {
    sent,
    async sendPasswordResetVerification(message) {
      sent.push(message)
    }
  }
}

// 直接构造 challenge 行（模拟 repo 返回），token 是其 sha256 的原像由测试持有
import { createHash } from 'node:crypto'
const makeToken = (seed: string) => `token-${seed}-0123456789abcdef`
const hashOf = (token: string) => createHash('sha256').update(token).digest('hex')

const challengeRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'challenge-1',
  user_id: 'user-1',
  email: 'user@test.com',
  token_hash: hashOf(makeToken('valid')),
  expires_at: Date.now() + 30 * 60 * 1000,
  created_at: Date.now(),
  consumed_at: null,
  ...overrides
})

describe('PasswordResetService', () => {
  let db: ReturnType<typeof createDbMock>
  let sender: ReturnType<typeof createSender>
  let service: PasswordResetService
  let userRow: Record<string, unknown> | null

  beforeEach(() => {
    db = createDbMock()
    sender = createSender()
    userRow = {
      id: 'user-1',
      email: 'user@test.com',
      password_hash: 'oldhash',
      role: 'USER'
    }
    service = new PasswordResetService({
      db,
      sender,
      webAppUrl: 'http://localhost:3000'
    })
    // findByEmail / findById 走 db.first，按 SQL 内容区分
    ;(db.first as ReturnType<typeof vi.fn>).mockImplementation(async (sql: string) => {
      if (sql.includes('FROM users WHERE email')) return userRow
      if (sql.includes('FROM users WHERE id')) return userRow
      if (sql.includes('email_binding_challenges WHERE token_hash')) {
        return challengeRow()
      }
      return null
    })
  })

  describe('requestReset', () => {
    it('已绑定邮箱的用户：创建挑战并发信', async () => {
      const result = await service.requestReset('user@test.com')
      expect(sender.sent).toHaveLength(1)
      expect(sender.sent[0].to).toBe('user@test.com')
      expect(result.expiresAt).toBeGreaterThan(Date.now())
      // replacePendingForUser 走 batch（清旧 + 插新）
      expect(db.batch).toHaveBeenCalledTimes(1)
    })

    it('邮箱不存在：防枚举，返回一致的响应且不发信', async () => {
      userRow = null
      const result = await service.requestReset('nobody@test.com')
      expect(sender.sent).toHaveLength(0)
      expect(result.expiresAt).toBeGreaterThan(Date.now())
      expect(db.batch).not.toHaveBeenCalled()
    })

    it('邮箱未绑定到用户（email 字段为空）：防枚举不发信', async () => {
      userRow = { id: 'user-1', email: null }
      const result = await service.requestReset('user@test.com')
      expect(sender.sent).toHaveLength(0)
      expect(result.expiresAt).toBeGreaterThan(Date.now())
    })

    it('账号被停用：外观一致不发信（防枚举且防绕过封禁）', async () => {
      userRow = { id: 'user-1', email: 'user@test.com', status: 'SUSPENDED' }
      const result = await service.requestReset('user@test.com')
      expect(sender.sent).toHaveLength(0)
      expect(result.expiresAt).toBeGreaterThan(Date.now())
    })
  })

  describe('validateResetToken', () => {
    it('有效挑战：返回脱敏邮箱', async () => {
      const result = await service.validateResetToken(makeToken('valid'))
      // local 部分 "user" → 前 2 位可见 + **，域名完整保留
      expect(result.maskedEmail).toBe('us**@test.com')
    })

    it('过期挑战：400 RESET_TOKEN_INVALID', async () => {
      ;(db.first as ReturnType<typeof vi.fn>).mockImplementation(async () =>
        challengeRow({ expires_at: Date.now() - 1000 })
      )
      await expect(service.validateResetToken(makeToken('valid'))).rejects.toMatchObject({
        code: 'RESET_TOKEN_INVALID'
      })
    })

    it('已消费挑战：400', async () => {
      ;(db.first as ReturnType<typeof vi.fn>).mockImplementation(async () =>
        challengeRow({ consumed_at: Date.now() })
      )
      await expect(service.validateResetToken(makeToken('valid'))).rejects.toMatchObject({
        code: 'RESET_TOKEN_INVALID'
      })
    })

    it('未知令牌：400', async () => {
      ;(db.first as ReturnType<typeof vi.fn>).mockImplementation(async () => null)
      await expect(service.validateResetToken(makeToken('unknown'))).rejects.toMatchObject({
        code: 'RESET_TOKEN_INVALID'
      })
    })
  })

  describe('completeReset', () => {
    it('成功：更新密码并消费挑战', async () => {
      await service.completeReset(makeToken('valid'), 'newPassword123')
      // UPDATE users SET password_hash + UPDATE challenges SET consumed_at
      const executedSql = db.execute.mock.calls.map(c => c[0] as string)
      expect(executedSql.some(sql => sql.includes('SET password_hash'))).toBe(true)
      expect(executedSql.some(sql => sql.includes('consumed_at'))).toBe(true)
    })

    it('账号在链接有效期内被停用：403 且不消费挑战', async () => {
      userRow = { id: 'user-1', email: 'user@test.com', status: 'SUSPENDED' }
      await expect(
        service.completeReset(makeToken('valid'), 'newPassword123')
      ).rejects.toMatchObject({ code: 'ACCOUNT_DISABLED' })
      // 未消费：之后解封时链接仍可按正常逻辑处理（30 分钟内）
      expect(db.execute.mock.calls.some(c => String(c[0]).includes('consumed_at'))).toBe(false)
    })

    it('用户已不存在：404', async () => {
      userRow = null
      ;(db.first as ReturnType<typeof vi.fn>).mockImplementation(async (sql: string) =>
        sql.includes('email_binding_challenges') ? challengeRow() : null
      )
      await expect(
        service.completeReset(makeToken('valid'), 'newPassword123')
      ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' })
    })
  })

  it('webAppUrl 热更新反映到重置链接', async () => {
    service.setWebAppUrl('https://nav.example.com/')
    await service.requestReset('user@test.com')
    expect(
      sender.sent[0].verificationUrl.startsWith('https://nav.example.com/reset-password')
    ).toBe(true)
  })
})
