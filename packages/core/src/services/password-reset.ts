import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import type { DatabaseClient } from '@nav/database'
import { AppError } from '../error.js'
import {
  EmailBindingRepository,
  type EmailBindingChallenge
} from '../repositories/email-binding.repository.js'
import { UserRepository } from '../repositories/user.repository.js'
import type { EmailVerificationMessage } from './email-binding.js'

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000

/**
 * 密码重置挑战发件人契约。
 * 与邮箱绑定的发件模板分开：主题与文案面向"重置密码"场景。
 */
export interface PasswordResetSender {
  sendPasswordResetVerification(message: EmailVerificationMessage): Promise<void>
}

export interface PasswordResetServiceOptions {
  db: DatabaseClient
  sender: PasswordResetSender
  webAppUrl: string
  /** 非生产环境把重置链接直接带回给调用方（本地调试用） */
  exposeVerificationUrl?: boolean
}

export interface PasswordResetRequestResult {
  expiresAt: number
  verificationUrl?: string
}

export interface PasswordResetValidateResult {
  /** 脱敏后的邮箱，用于重置页展示确认 */
  maskedEmail: string
  expiresAt: number
}

/**
 * 忘记密码 / 邮件重置密码。
 *
 * 复用 email_binding_challenges 表（字段对挑战用途无感知，且
 * replacePendingForUser 保证同一用户同时只有一个有效挑战）：
 * 绑定流程只面向未绑定邮箱的用户，重置流程只面向已绑定用户，互不干扰。
 *
 * 防枚举：请求重置时无论邮箱是否存在都返回一致的成功响应，
 * 差异只体现在是否真的发信。令牌本身即能力凭证（32 字节随机）。
 */
export class PasswordResetService {
  private readonly userRepo: UserRepository
  private readonly challengeRepo: EmailBindingRepository
  private readonly sender: PasswordResetSender
  private webAppUrl: string
  private readonly exposeVerificationUrl: boolean

  constructor(options: PasswordResetServiceOptions) {
    this.userRepo = new UserRepository(options.db)
    this.challengeRepo = new EmailBindingRepository(options.db)
    this.sender = options.sender
    this.webAppUrl = options.webAppUrl.replace(/\/$/, '')
    this.exposeVerificationUrl = options.exposeVerificationUrl ?? false
  }

  setWebAppUrl(url: string): void {
    this.webAppUrl = url.replace(/\/$/, '')
  }

  async requestReset(rawEmail: string): Promise<PasswordResetRequestResult> {
    const email = rawEmail.trim().toLowerCase()
    const user = await this.userRepo.findByEmail(email)
    const expiresAt = Date.now() + PASSWORD_RESET_TTL_MS

    // 防枚举：邮箱不存在/未绑定邮箱/账号被停用的用户，返回与成功一致的响应且不发信
    // （停用账号不允许通过重置绕过封禁；外观一致避免暴露账号状态）
    if (!user || user.email !== email || user.status !== 'ACTIVE') {
      return { expiresAt }
    }

    const now = Date.now()
    const token = randomBytes(32).toString('base64url')
    const challenge: EmailBindingChallenge = {
      id: uuidv4(),
      user_id: user.id,
      email,
      token_hash: this.hashToken(token),
      expires_at: now + PASSWORD_RESET_TTL_MS,
      created_at: now,
      consumed_at: null
    }
    const verificationUrl = `${this.webAppUrl}/reset-password?token=${encodeURIComponent(token)}`

    await this.challengeRepo.replacePendingForUser(challenge)
    try {
      await this.sender.sendPasswordResetVerification({
        to: email,
        verificationUrl,
        expiresInMinutes: PASSWORD_RESET_TTL_MS / 60_000,
        idempotencyKey: challenge.id
      })
    } catch (error) {
      await this.challengeRepo.remove(challenge.id)
      throw error
    }

    return {
      expiresAt: challenge.expires_at,
      ...(this.exposeVerificationUrl ? { verificationUrl } : {})
    }
  }

  async validateResetToken(token: string): Promise<PasswordResetValidateResult> {
    const challenge = await this.requireActiveChallenge(token)
    return {
      maskedEmail: this.maskEmail(challenge.email),
      expiresAt: challenge.expires_at
    }
  }

  async completeReset(token: string, newPassword: string): Promise<{ maskedEmail: string }> {
    const challenge = await this.requireActiveChallenge(token)
    const user = await this.userRepo.findById(challenge.user_id)
    if (!user) throw new AppError('用户不存在', 'USER_NOT_FOUND', 404)
    // 链接有效期内账号被停用：拒绝重置（防止绕过封禁），且不消费挑战
    if (user.status !== 'ACTIVE') {
      throw new AppError('账号当前不可用，无法重置密码', 'ACCOUNT_DISABLED', 403)
    }

    const now = Date.now()
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await this.userRepo.updatePassword(user.id, passwordHash, now)
    await this.consumeChallenge(challenge.id, now)
    return { maskedEmail: this.maskEmail(challenge.email) }
  }

  private async requireActiveChallenge(token: string): Promise<EmailBindingChallenge> {
    const challenge = await this.challengeRepo.findByTokenHash(this.hashToken(token))
    if (!challenge || challenge.consumed_at !== null || challenge.expires_at < Date.now()) {
      throw new AppError('重置链接无效或已过期，请重新申请', 'RESET_TOKEN_INVALID', 400)
    }
    return challenge
  }

  private async consumeChallenge(id: string, consumedAt: number): Promise<void> {
    try {
      await this.challengeRepo.consume(id, consumedAt)
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError('该重置链接已被使用，请重新申请', 'RESET_TOKEN_ALREADY_USED', 409)
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@')
    if (!domain) return '***'
    const visible = local.slice(0, 2)
    return `${visible}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`
  }
}
