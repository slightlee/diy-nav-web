import { D1Client } from '@nav/database'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { AvatarService } from './avatar.js'

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
}

export class AuthService {
  private d1: D1Client
  private avatarService: AvatarService

  constructor(config: AuthConfig) {
    this.d1 = config.d1
    this.avatarService = config.avatarService
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
      throw new Error('User already exists')
    }

    const id = uuidv4()
    const passwordHash = await bcrypt.hash(password, 10)
    const now = Date.now()

    // Generate avatar
    let avatarUrl: string | null = null
    try {
      avatarUrl = await this.avatarService.generateAndUpload(id)
    } catch (error) {
      console.error('Failed to generate avatar:', error)
      // Continue registration even if avatar generation fails
    }

    await this.d1.query(
      `INSERT INTO users (id, email, password_hash, avatar_url, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'USER', 'ACTIVE', ?, ?)`,
      [id, email, passwordHash, avatarUrl, now, now]
    )

    const user = await this.d1.first<User>('SELECT * FROM users WHERE id = ?', [id])
    if (!user) throw new Error('Failed to create user')
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
}
