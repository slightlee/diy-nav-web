import type { DatabaseClient } from '@nav/database'
import { User } from '../services/auth.js'

export interface UserIdentityRecord {
  user_id: string
  provider: string
  provider_uid: string
  profile_data: string | null
  created_at: number
  last_used_at: number | null
}

export class UserRepository {
  constructor(private readonly db: DatabaseClient) {}

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.db.first<User>('SELECT * FROM users WHERE email = ?', [email])
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.db.first<User>('SELECT * FROM users WHERE id = ?', [id])
  }

  /**
   * Update login stats
   */
  async updateLoginStats(userId: string, ip: string): Promise<void> {
    const now = Date.now()
    await this.db.execute('UPDATE users SET last_login_at = ?, last_login_ip = ? WHERE id = ?', [
      now,
      ip,
      userId
    ])
  }

  /**
   * Update user nickname
   */
  async updateNickname(userId: string, nickname: string, updatedAt: number): Promise<void> {
    await this.db.execute('UPDATE users SET nickname = ?, updated_at = ? WHERE id = ?', [
      nickname,
      updatedAt,
      userId
    ])
  }

  /**
   * Check if identity exists
   */
  async findIdentity(provider: string, providerUid: string): Promise<{ user_id: string } | null> {
    return this.db.first<{ user_id: string }>(
      'SELECT user_id FROM user_identities WHERE provider = ? AND provider_uid = ?',
      [provider, providerUid]
    )
  }

  async findIdentityByUserAndProvider(
    userId: string,
    provider: string
  ): Promise<UserIdentityRecord | null> {
    return this.db.first<UserIdentityRecord>(
      `SELECT user_id, provider, provider_uid, profile_data, created_at, last_used_at
       FROM user_identities WHERE user_id = ? AND provider = ?`,
      [userId, provider]
    )
  }

  async listIdentities(userId: string): Promise<UserIdentityRecord[]> {
    return this.db.all<UserIdentityRecord>(
      `SELECT user_id, provider, provider_uid, profile_data, created_at, last_used_at
       FROM user_identities WHERE user_id = ? ORDER BY created_at ASC`,
      [userId]
    )
  }

  async updateIdentityLastUsed(
    provider: string,
    providerUid: string,
    usedAt: number
  ): Promise<void> {
    await this.db.execute(
      'UPDATE user_identities SET last_used_at = ? WHERE provider = ? AND provider_uid = ?',
      [usedAt, provider, providerUid]
    )
  }

  async bindEmailLogin(
    userId: string,
    email: string,
    passwordHash: string,
    verifiedAt: number
  ): Promise<void> {
    const result = await this.db.execute(
      `UPDATE users
       SET email = ?, password_hash = ?, email_verified_at = ?, updated_at = ?
       WHERE id = ? AND email IS NULL`,
      [email, passwordHash, verifiedAt, verifiedAt, userId]
    )

    if (result.changes === 0) {
      throw new Error('Email login could not be bound to the user')
    }
  }

  async unbindEmailLogin(userId: string, updatedAt: number): Promise<boolean> {
    const result = await this.db.execute(
      `UPDATE users
       SET email = NULL, password_hash = NULL, email_verified_at = NULL, updated_at = ?
       WHERE id = ?
         AND email IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM user_identities WHERE user_id = ?
         )`,
      [updatedAt, userId, userId]
    )
    return result.changes > 0
  }

  async removeIdentity(userId: string, provider: string): Promise<boolean> {
    const result = await this.db.execute(
      `DELETE FROM user_identities
       WHERE user_id = ?
         AND provider = ?
         AND (
           EXISTS (SELECT 1 FROM users WHERE id = ? AND email IS NOT NULL)
           OR EXISTS (
             SELECT 1 FROM user_identities AS other
             WHERE other.user_id = ? AND other.provider <> ?
           )
         )`,
      [userId, provider, userId, userId, provider]
    )
    return result.changes > 0
  }

  /**
   * Create User (Single)
   */
  async create(user: User): Promise<void> {
    const stmt = this.prepareCreateUserStmt(user)
    await this.db.execute(stmt.sql, stmt.params)
  }

  /**
   * Create Identity (Single)
   */
  async createIdentity(
    userId: string,
    provider: string,
    providerUid: string,
    profileData: unknown
  ): Promise<void> {
    const stmt = this.prepareCreateIdentityStmt(userId, provider, providerUid, profileData)
    await this.db.execute(stmt.sql, stmt.params)
  }

  /**
   * Atomic Transaction: Create User + Identity
   */
  async atomicCreateUserAndIdentity(
    user: User,
    identity: { provider: string; providerUid: string; profileData: unknown }
  ): Promise<void> {
    const userStmt = this.prepareCreateUserStmt(user)
    const identityStmt = this.prepareCreateIdentityStmt(
      user.id,
      identity.provider,
      identity.providerUid,
      identity.profileData
    )

    await this.db.batch([userStmt, identityStmt])
  }

  // --- Internal Helpers ---

  /**
   * Initialize tables (DDL)
   * Note: In production, use migrations instead.
   */
  async initTable(): Promise<void> {
    // Create users table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password_hash TEXT,
        email_verified_at INTEGER,
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

    const userColumns = await this.db.all<{ name: string }>('PRAGMA table_info(users)')
    if (!userColumns.some(column => column.name === 'email_verified_at')) {
      await this.db.execute('ALTER TABLE users ADD COLUMN email_verified_at INTEGER')
      await this.db.execute(
        'UPDATE users SET email_verified_at = created_at WHERE email IS NOT NULL AND email_verified_at IS NULL'
      )
    }

    // Create user_identities table
    await this.db.execute(`
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

    await this.db.execute(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_user_identities_user_provider ON user_identities(user_id, provider)'
    )
  }

  private prepareCreateUserStmt(user: User): { sql: string; params: unknown[] } {
    return {
      sql: `INSERT INTO users (id, email, password_hash, email_verified_at, nickname, avatar_url, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        user.id,
        user.email,
        user.password_hash,
        user.email_verified_at,
        user.nickname,
        user.avatar_url,
        user.role,
        user.status,
        user.created_at,
        user.updated_at
      ]
    }
  }

  private prepareCreateIdentityStmt(
    userId: string,
    provider: string,
    providerUid: string,
    profileData: unknown
  ): { sql: string; params: unknown[] } {
    const now = Date.now()
    return {
      sql: `INSERT INTO user_identities (user_id, provider, provider_uid, profile_data, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?)`,
      params: [userId, provider, providerUid, JSON.stringify(profileData), now, now]
    }
  }
}
