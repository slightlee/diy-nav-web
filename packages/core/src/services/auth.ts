import { D1Client } from '@nav/database'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { AvatarService } from './avatar.js'
import { AppError } from '../error.js'
import { logger as defaultLogger, type Logger } from '@nav/logger'

export interface User {
  id: string
  email: string
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

export interface AuthConfig {
  d1: D1Client
  avatarService: AvatarService
  logger?: Logger
}

export class AuthService {
  private d1: D1Client
  private avatarService: AvatarService
  private logger: Logger

  constructor(config: AuthConfig) {
    this.d1 = config.d1
    this.avatarService = config.avatarService
    this.logger = config.logger || defaultLogger
  }

  /**
   * Initialize tables
   */
  async initTable(): Promise<void> {
    // Create users table
    await this.d1.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password_hash TEXT,
        nickname TEXT,
        avatar_url TEXT,
        role TEXT DEFAULT 'USER',
        status TEXT DEFAULT 'ACTIVE',
        last_login_at INTEGER,
        last_login_ip TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );
    `)

    // Create user_identities table
    await this.d1.query(`
      CREATE TABLE IF NOT EXISTS user_identities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_uid TEXT NOT NULL,
        profile_data TEXT,
        created_at INTEGER NOT NULL,
        last_used_at INTEGER,
        UNIQUE(provider, provider_uid)
      );
    `)
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string): Promise<User> {
    // Check if user exists
    const existing = await this.d1.first<User>('SELECT * FROM users WHERE email = ?', [email])
    if (existing) {
      throw new AppError('User already exists', 'USER_EXISTS', 409)
    }

    const id = uuidv4()
    const passwordHash = await bcrypt.hash(password, 10)
    const now = Date.now()

    // Generate avatar
    let avatarUrl: string | null = null
    try {
      avatarUrl = await this.avatarService.generateAndUpload(id)
    } catch (error) {
      this.logger.error({ err: error, userId: id }, 'Failed to generate avatar')
      // Continue registration even if avatar generation fails
    }

    await this.d1.query(
      `INSERT INTO users (id, email, password_hash, avatar_url, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'USER', 'ACTIVE', ?, ?)`,
      [id, email, passwordHash, avatarUrl, now, now]
    )

    const user = await this.d1.first<User>('SELECT * FROM users WHERE id = ?', [id])
    if (!user) throw new AppError('Failed to create user', 'CREATE_USER_FAILED', 500)
    return user
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.d1.first<User>('SELECT * FROM users WHERE email = ?', [email])
    if (!user || !user.password_hash) return null

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) return null

    return user
  }

  /**
   * Update login statistics
   */
  async updateLoginStats(userId: string, ip: string): Promise<void> {
    const now = Date.now()
    await this.d1.query('UPDATE users SET last_login_at = ?, last_login_ip = ? WHERE id = ?', [
      now,
      ip,
      userId
    ])
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    return this.d1.first<User>('SELECT * FROM users WHERE id = ?', [id])
  }
  /**
   * Find or create user by provider (OAuth)
   */
  async findOrCreateByProvider(
    provider: string,
    providerUid: string,
    rawData: { email?: string; nickname?: string; avatar_url?: string }
  ): Promise<User> {
    // 1. Try to find existing link
    const identity = await this.d1.first<{ user_id: string }>(
      'SELECT user_id FROM user_identities WHERE provider = ? AND provider_uid = ?',
      [provider, providerUid]
    )

    if (identity) {
      const user = await this.getUserById(identity.user_id)
      if (user) return user
    }

    // 2. If not found, try to find user by email (auto-link)
    // Note: This assumes the provider's email is verified and trusted.
    let userId: string
    const now = Date.now()

    if (rawData.email) {
      const existingUser = await this.d1.first<User>('SELECT * FROM users WHERE email = ?', [
        rawData.email
      ])
      if (existingUser) {
        userId = existingUser.id
      } else {
        // Create new user
        userId = uuidv4()
        const randomPwd = uuidv4() // Users created via OAuth don't have a password initially
        const passwordHash = await bcrypt.hash(randomPwd, 10)

        let avatarUrl = rawData.avatar_url || null
        if (!avatarUrl) {
          try {
            avatarUrl = await this.avatarService.generateAndUpload(userId)
          } catch (e) {
            this.logger.error({ err: e }, 'Failed to generate avatar for oauth user')
          }
        }

        await this.d1.query(
          `INSERT INTO users (id, email, password_hash, nickname, avatar_url, role, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'USER', 'ACTIVE', ?, ?)`,
          [userId, rawData.email, passwordHash, rawData.nickname || null, avatarUrl, now, now]
        )
      }
    } else {
      // No email provided, must create a new user with a placeholder email or handle differently
      // For now, we generate a placeholder
      userId = uuidv4()
      const placeholderEmail = `${providerUid}@${provider}.placeholder`
      const randomPwd = uuidv4()
      const passwordHash = await bcrypt.hash(randomPwd, 10)

      let avatarUrl = rawData.avatar_url || null
      if (!avatarUrl) {
        try {
          avatarUrl = await this.avatarService.generateAndUpload(userId)
        } catch (e) {
          this.logger.error({ err: e }, 'Failed to generate avatar for oauth user')
        }
      }

      await this.d1.query(
        `INSERT INTO users (id, email, password_hash, nickname, avatar_url, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'USER', 'ACTIVE', ?, ?)`,
        [userId, placeholderEmail, passwordHash, rawData.nickname || null, avatarUrl, now, now]
      )
    }

    // 3. Create identity link
    await this.d1.query(
      `INSERT INTO user_identities (user_id, provider, provider_uid, profile_data, created_at, last_used_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, provider, providerUid, JSON.stringify(rawData), now, now]
    )

    // 4. Return user
    const user = await this.getUserById(userId)
    if (!user)
      throw new AppError('Failed to create/find user after oauth', 'OAUTH_USER_FAILED', 500)
    return user
  }
}
