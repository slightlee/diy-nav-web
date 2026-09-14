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
import type { User } from './auth.js'

const EMAIL_BINDING_TTL_MS = 30 * 60 * 1000

export interface EmailVerificationMessage {
  to: string
  verificationUrl: string
  expiresInMinutes: number
  idempotencyKey: string
}

export interface EmailVerificationSender {
  sendEmailBindingVerification(message: EmailVerificationMessage): Promise<void>
}

export interface EmailBindingServiceOptions {
  db: DatabaseClient
  sender: EmailVerificationSender
  webAppUrl: string
  exposeVerificationUrl?: boolean
}

export interface EmailBindingRequestResult {
  expiresAt: number
  verificationUrl?: string
}

export class EmailBindingService {
  private readonly userRepo: UserRepository
  private readonly bindingRepo: EmailBindingRepository
  private readonly sender: EmailVerificationSender
  private webAppUrl: string
  private readonly exposeVerificationUrl: boolean

  constructor(options: EmailBindingServiceOptions) {
    this.userRepo = new UserRepository(options.db)
    this.bindingRepo = new EmailBindingRepository(options.db)
    this.sender = options.sender
    this.webAppUrl = options.webAppUrl.replace(/\/$/, '')
    this.exposeVerificationUrl = options.exposeVerificationUrl ?? false
  }

  /** Hot-swap the web app URL without restarting the server */
  setWebAppUrl(url: string): void {
    this.webAppUrl = url.replace(/\/$/, '')
  }

  async initTable(): Promise<void> {
    await this.bindingRepo.initTable()
  }

  async requestBinding(userId: string, rawEmail: string): Promise<EmailBindingRequestResult> {
    const email = rawEmail.trim().toLowerCase()
    const user = await this.userRepo.findById(userId)
    if (!user) throw new AppError('用户不存在', 'USER_NOT_FOUND', 404)
    if (user.email) {
      throw new AppError('当前账号已绑定邮箱登录', 'EMAIL_ALREADY_BOUND', 409)
    }

    const existing = await this.userRepo.findByEmail(email)
    if (existing) {
      throw new AppError('该邮箱已被使用', 'EMAIL_IN_USE', 409)
    }

    const now = Date.now()
    const token = randomBytes(32).toString('base64url')
    const challenge: EmailBindingChallenge = {
      id: uuidv4(),
      user_id: userId,
      email,
      token_hash: this.hashToken(token),
      expires_at: now + EMAIL_BINDING_TTL_MS,
      created_at: now,
      consumed_at: null
    }
    const verificationUrl = `${this.webAppUrl}/email-binding/verify?token=${encodeURIComponent(token)}`

    await this.bindingRepo.replacePendingForUser(challenge)
    try {
      await this.sender.sendEmailBindingVerification({
        to: email,
        verificationUrl,
        expiresInMinutes: EMAIL_BINDING_TTL_MS / 60_000,
        idempotencyKey: challenge.id
      })
    } catch (error) {
      await this.bindingRepo.remove(challenge.id)
      throw error
    }

    return {
      expiresAt: challenge.expires_at,
      ...(this.exposeVerificationUrl ? { verificationUrl } : {})
    }
  }

  async validateToken(token: string): Promise<{ email: string }> {
    const challenge = await this.requireActiveChallenge(token)
    const existing = await this.userRepo.findByEmail(challenge.email)
    if (existing && existing.id !== challenge.user_id) {
      throw new AppError('该邮箱已被使用', 'EMAIL_IN_USE', 409)
    }
    return { email: this.maskEmail(challenge.email) }
  }

  /** Repository 层用普通 Error 表示"challenge 已消费"，这里转成用户可恢复的 409。 */
  private async consumeChallenge(id: string, consumedAt: number): Promise<void> {
    try {
      await this.bindingRepo.consume(id, consumedAt)
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError('该验证链接已被使用，请重新发起绑定', 'CHALLENGE_ALREADY_CONSUMED', 409)
    }
  }

  async completeBinding(token: string, password: string): Promise<User> {
    const challenge = await this.requireActiveChallenge(token)
    const user = await this.userRepo.findById(challenge.user_id)
    if (!user) throw new AppError('用户不存在', 'USER_NOT_FOUND', 404)
    if (user.email) {
      if (user.email.toLowerCase() === challenge.email) {
        await this.consumeChallenge(challenge.id, Date.now())
        return user
      }
      throw new AppError('当前账号已绑定邮箱登录', 'EMAIL_ALREADY_BOUND', 409)
    }

    const existing = await this.userRepo.findByEmail(challenge.email)
    if (existing) {
      throw new AppError('该邮箱已被使用', 'EMAIL_IN_USE', 409)
    }

    const now = Date.now()
    const passwordHash = await bcrypt.hash(password, 10)
    try {
      await this.userRepo.bindEmailLogin(challenge.user_id, challenge.email, passwordHash, now)
    } catch (error) {
      const occupied = await this.userRepo.findByEmail(challenge.email)
      if (occupied && occupied.id !== challenge.user_id) {
        throw new AppError('该邮箱已被使用', 'EMAIL_IN_USE', 409)
      }
      throw error
    }
    await this.consumeChallenge(challenge.id, now)

    const updated = await this.userRepo.findById(challenge.user_id)
    if (!updated) throw new AppError('用户不存在', 'USER_NOT_FOUND', 404)
    return updated
  }

  private async requireActiveChallenge(token: string): Promise<EmailBindingChallenge> {
    const challenge = await this.bindingRepo.findByTokenHash(this.hashToken(token))
    if (!challenge || challenge.consumed_at) {
      throw new AppError('邮箱验证链接无效', 'EMAIL_BINDING_INVALID', 400)
    }
    if (challenge.expires_at <= Date.now()) {
      throw new AppError('邮箱验证链接已过期，请重新获取', 'EMAIL_BINDING_EXPIRED', 410)
    }
    return challenge
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@')
    if (!local || !domain) return email
    const visible = local.slice(0, Math.min(2, local.length))
    return `${visible}${'*'.repeat(Math.max(2, local.length - visible.length))}@${domain}`
  }
}
