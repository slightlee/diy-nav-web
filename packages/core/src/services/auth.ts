import type { DatabaseClient } from '@nav/database'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { AvatarService } from './avatar.js'
import { UserRepository } from '../repositories/user.repository.js'
import { AppError } from '../error.js'
import { logger as defaultLogger, type Logger } from '@nav/logger'

export interface User {
  id: string
  email: string | null
  password_hash: string | null
  email_verified_at: number | null
  nickname: string | null
  avatar_url: string | null
  role: 'USER' | 'ADMIN'
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFY'
  last_login_at: number | null
  last_login_ip: string | null
  created_at: number
  updated_at: number
  deleted_at: number | null
}

export interface AuthServiceOptions {
  db: DatabaseClient
  avatarService: AvatarService
  logger?: Logger
}

export class AuthService {
  private userRepo: UserRepository
  private avatarService: AvatarService
  private logger: Logger

  constructor(config: AuthServiceOptions) {
    // We instantiate repository internally or it could be injected.
    // To match existing signature, we instantiate it here.
    this.userRepo = new UserRepository(config.db)
    this.avatarService = config.avatarService
    this.logger = config.logger || defaultLogger
  }

  /**
   * Initialize tables (Deprecated: Schema management should be external)
   */
  async initTable(): Promise<void> {
    // Keeping this for backward compatibility during dev
    // In strict enterprise env, this logic belongs to migrations
    // Delegating to Repository to avoid direct database access
    await this.userRepo.initTable()
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase()
    const existing = await this.userRepo.findByEmail(normalizedEmail)
    if (existing) {
      throw new AppError('User already exists', 'USER_EXISTS', 409)
    }

    const passwordHash = await bcrypt.hash(password, 10)
    return this.persistUser({
      email: normalizedEmail,
      passwordHash,
      emailVerifiedAt: Date.now()
    })
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findByEmail(email.trim().toLowerCase())
    if (!user || !user.password_hash) return null

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) return null

    return user
  }

  /**
   * Update login statistics
   */
  async updateLoginStats(userId: string, ip: string): Promise<void> {
    await this.userRepo.updateLoginStats(userId, ip)
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    return this.userRepo.findById(id)
  }

  /**
   * Update the profile fields managed by the user
   */
  async updateNickname(userId: string, nickname: string): Promise<User> {
    const normalizedNickname = nickname.trim()
    if (!normalizedNickname || normalizedNickname.length > 30) {
      throw new AppError('Nickname must contain 1 to 30 characters', 'INVALID_NICKNAME', 400)
    }

    const user = await this.userRepo.findById(userId)
    if (!user) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404)
    }

    const updatedAt = Date.now()
    await this.userRepo.updateNickname(userId, normalizedNickname, updatedAt)

    return {
      ...user,
      nickname: normalizedNickname,
      updated_at: updatedAt
    }
  }

  /**
   * Find or create user by provider (OAuth)
   */
  async findOrCreateByProvider(
    provider: string,
    providerUid: string,
    rawData: { email?: string; nickname?: string; avatar_url?: string }
  ): Promise<{ user: User; isNewUser: boolean }> {
    // 1. Try to find existing link
    const identity = await this.userRepo.findIdentity(provider, providerUid)

    if (identity) {
      const user = await this.getUserById(identity.user_id)
      if (user) {
        await this.userRepo.updateIdentityLastUsed(provider, providerUid, Date.now())
        return { user, isNewUser: false }
      }
    }

    // Provider email is profile data, not proof that an existing local account
    // should be linked. Only an explicit authenticated binding flow may link it.
    const newUser = await this.prepareUserObject({
      email: null,
      passwordHash: null,
      emailVerifiedAt: null,
      nickname: rawData.nickname,
      avatarUrl: rawData.avatar_url
    })

    await this.userRepo.atomicCreateUserAndIdentity(newUser, {
      provider,
      providerUid,
      profileData: rawData
    })

    return { user: newUser, isNewUser: true }
  }

  async getLoginMethods(userId: string): Promise<{
    email: { bound: boolean; address: string | null; canUnbind: boolean }
    providers: Array<{ provider: string; boundAt: number; canUnbind: boolean }>
  }> {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new AppError('User not found', 'USER_NOT_FOUND', 404)
    const identities = await this.userRepo.listIdentities(userId)
    const loginMethodCount = (user.email ? 1 : 0) + identities.length
    return {
      email: {
        bound: !!user.email,
        address: user.email,
        canUnbind: !!user.email && loginMethodCount > 1
      },
      providers: identities.map(identity => ({
        provider: identity.provider,
        boundAt: identity.created_at,
        canUnbind: loginMethodCount > 1
      }))
    }
  }

  async unbindEmailLogin(userId: string): Promise<User> {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new AppError('User not found', 'USER_NOT_FOUND', 404)
    if (!user.email) return user

    const removed = await this.userRepo.unbindEmailLogin(userId, Date.now())
    if (!removed) {
      throw new AppError('At least one login method must remain bound', 'LAST_LOGIN_METHOD', 409)
    }

    const updated = await this.userRepo.findById(userId)
    if (!updated) throw new AppError('User not found', 'USER_NOT_FOUND', 404)
    return updated
  }

  async unbindProviderIdentity(userId: string, provider: string): Promise<void> {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new AppError('User not found', 'USER_NOT_FOUND', 404)

    const identity = await this.userRepo.findIdentityByUserAndProvider(userId, provider)
    if (!identity) return

    const removed = await this.userRepo.removeIdentity(userId, provider)
    if (!removed) {
      throw new AppError('At least one login method must remain bound', 'LAST_LOGIN_METHOD', 409)
    }
  }

  async bindProviderIdentity(
    userId: string,
    provider: string,
    providerUid: string,
    rawData: { email?: string; nickname?: string; avatar_url?: string }
  ): Promise<void> {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new AppError('User not found', 'USER_NOT_FOUND', 404)

    const existingIdentity = await this.userRepo.findIdentity(provider, providerUid)
    if (existingIdentity) {
      if (existingIdentity.user_id === userId) return
      throw new AppError('This provider account is already in use', 'PROVIDER_ACCOUNT_IN_USE', 409)
    }

    const existingProvider = await this.userRepo.findIdentityByUserAndProvider(userId, provider)
    if (existingProvider) {
      throw new AppError(
        'Current account already has this provider bound',
        'PROVIDER_ALREADY_BOUND',
        409
      )
    }

    try {
      await this.userRepo.createIdentity(userId, provider, providerUid, rawData)
    } catch (error) {
      const occupied = await this.userRepo.findIdentity(provider, providerUid)
      if (occupied && occupied.user_id !== userId) {
        throw new AppError(
          'This provider account is already in use',
          'PROVIDER_ACCOUNT_IN_USE',
          409
        )
      }
      throw error
    }
  }

  /**
   * Internal helper to persist a user (for Register flow)
   */
  private async persistUser(props: {
    email: string | null
    passwordHash: string | null
    emailVerifiedAt: number | null
    nickname?: string
    avatarUrl?: string
  }): Promise<User> {
    const user = await this.prepareUserObject(props)
    await this.userRepo.create(user)
    return user
  }

  /**
   * Helper to construct User entity with defaults (Domain Logic)
   */
  private async prepareUserObject(props: {
    email: string | null
    passwordHash: string | null
    emailVerifiedAt: number | null
    nickname?: string
    avatarUrl?: string
  }): Promise<User> {
    const id = uuidv4()
    const now = Date.now()

    // Default Nickname Logic
    let nickname = props.nickname
    if (!nickname) {
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      nickname = `User_${randomSuffix}`
    }

    // Default Avatar Logic
    let avatarUrl = props.avatarUrl || null
    if (!avatarUrl) {
      try {
        avatarUrl = await this.avatarService.generateAndUpload(id)
      } catch (error) {
        this.logger.error({ err: error, userId: id }, 'Failed to generate avatar during creation')
      }
    }

    return {
      id,
      email: props.email,
      password_hash: props.passwordHash,
      email_verified_at: props.emailVerifiedAt,
      nickname,
      avatar_url: avatarUrl,
      role: 'USER',
      status: 'ACTIVE',
      last_login_at: null,
      last_login_ip: null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    }
  }
}
