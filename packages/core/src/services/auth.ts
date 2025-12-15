import { D1Client } from '@nav/database'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { AvatarService } from './avatar.js'
import { UserRepository } from '../repositories/user.repository.js'
import { AppError } from '../error.js'
import { logger as defaultLogger, type Logger } from '@nav/logger'

export interface User {
  id: string
  email: string | null
  password_hash: string
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

export type D1Result<T> = {
  results: T[]
  success: boolean
  meta: unknown
}

export interface AuthConfig {
  d1: D1Client
  avatarService: AvatarService
  logger?: Logger
}

export class AuthService {
  private userRepo: UserRepository
  private avatarService: AvatarService
  private logger: Logger

  constructor(config: AuthConfig) {
    // We instantiate repository internally or it could be injected.
    // To match existing signature, we instantiate it here.
    this.userRepo = new UserRepository(config.d1)
    this.avatarService = config.avatarService
    this.logger = config.logger || defaultLogger
  }

  /**
   * Initialize tables (Deprecated: Schema management should be external)
   */
  async initTable(): Promise<void> {
    // Keeping this for backward compatibility during dev
    // In strict enterprise env, this logic belongs to migrations
    // Delegating to Repository to avoid direct D1 access
    await this.userRepo.initTable()
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string): Promise<User> {
    const existing = await this.userRepo.findByEmail(email)
    if (existing) {
      throw new AppError('User already exists', 'USER_EXISTS', 409)
    }

    const passwordHash = await bcrypt.hash(password, 10)
    return this.persistUser({
      email,
      passwordHash
    })
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findByEmail(email)
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
      if (user) return { user, isNewUser: false }
    }

    // 2. If not found, try to find user by email (auto-link)
    // We only use the email for matching existing accounts, but we DO NOT use it for creating new ones if matching fails.
    let user: User | null = null
    if (rawData.email) {
      user = await this.userRepo.findByEmail(rawData.email)
    }

    // 3. If User not found, create new user AND identity atomically
    if (!user) {
      // For OAuth users, we generate a random password
      const randomPwd = uuidv4()
      const passwordHash = await bcrypt.hash(randomPwd, 10)

      // Prepare User Object (Business Logic)
      const newUser = await this.prepareUserObject({
        email: null, // Custom Rule: Don't use provider email
        passwordHash,
        nickname: rawData.nickname,
        avatarUrl: rawData.avatar_url
      })

      // Execute Atomic Transaction
      await this.userRepo.atomicCreateUserAndIdentity(newUser, {
        provider,
        providerUid,
        profileData: rawData
      })

      return { user: newUser, isNewUser: true }
    }

    // 4. If User existed (via email match), just link identity
    // Reuse repo method for single identity creation
    await this.userRepo.createIdentity(user.id, provider, providerUid, rawData)

    return { user, isNewUser: false }
  }

  /**
   * Internal helper to persist a user (for Register flow)
   */
  private async persistUser(props: {
    email: string | null
    passwordHash: string
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
    passwordHash: string
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
