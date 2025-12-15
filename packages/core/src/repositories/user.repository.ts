import { D1Client } from '@nav/database'
import { User } from '../services/auth.js'

export class UserRepository {
  constructor(private readonly d1: D1Client) {}

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.d1.first<User>('SELECT * FROM users WHERE email = ?', [email])
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.d1.first<User>('SELECT * FROM users WHERE id = ?', [id])
  }

  /**
   * Update login stats
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
   * Check if identity exists
   */
  async findIdentity(provider: string, providerUid: string): Promise<{ user_id: string } | null> {
    return this.d1.first<{ user_id: string }>(
      'SELECT user_id FROM user_identities WHERE provider = ? AND provider_uid = ?',
      [provider, providerUid]
    )
  }

  /**
   * Create User (Single)
   */
  async create(user: User): Promise<void> {
    const stmt = this.prepareCreateUserStmt(user)
    await this.d1.query(stmt.sql, stmt.params)
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
    await this.d1.query(stmt.sql, stmt.params)
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

    await this.d1.batch([userStmt, identityStmt])
  }

  // --- Internal Helpers ---

  /**
   * Initialize tables (DDL)
   * Note: In production, use migrations instead.
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

  private prepareCreateUserStmt(user: User): { sql: string; params: unknown[] } {
    return {
      sql: `INSERT INTO users (id, email, password_hash, nickname, avatar_url, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        user.id,
        user.email,
        user.password_hash,
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
