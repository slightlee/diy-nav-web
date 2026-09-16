import { ensureIndex, getTableColumns, type DatabaseClient } from '@nav/database'
import { User } from '../services/auth.js'

export interface UserIdentityRecord {
  user_id: string
  provider: string
  provider_uid: string
  profile_data: string | null
  created_at: number
  last_used_at: number | null
}

export interface UserListOptions {
  query?: string
  role?: User['role']
  status?: User['status']
  limit: number
  offset: number
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

  async list(options: UserListOptions): Promise<{
    users: User[]
    total: number
    adminCount: number
    activeCount: number
    suspendedCount: number
  }> {
    const query = options.query?.trim() || ''
    const conditions: string[] = ['deleted_at IS NULL']
    const params: unknown[] = []

    if (query) {
      conditions.push('(email LIKE ? OR nickname LIKE ?)')
      params.push(`%${query}%`, `%${query}%`)
    }
    if (options.role) {
      conditions.push('role = ?')
      params.push(options.role)
    }
    if (options.status) {
      conditions.push('status = ?')
      params.push(options.status)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const [users, filteredTotalRow, totalRow, adminRow, activeRow, suspendedRow] =
      await Promise.all([
        this.db.all<User>(
          `SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          [...params, options.limit, options.offset]
        ),
        this.db.first<{ count: number }>(`SELECT COUNT(*) AS count FROM users ${where}`, params),
        this.db.first<{ count: number }>(
          'SELECT COUNT(*) AS count FROM users WHERE deleted_at IS NULL'
        ),
        this.db.first<{ count: number }>(
          "SELECT COUNT(*) AS count FROM users WHERE deleted_at IS NULL AND role = 'ADMIN'"
        ),
        this.db.first<{ count: number }>(
          "SELECT COUNT(*) AS count FROM users WHERE deleted_at IS NULL AND status = 'ACTIVE'"
        ),
        this.db.first<{ count: number }>(
          "SELECT COUNT(*) AS count FROM users WHERE deleted_at IS NULL AND status = 'SUSPENDED'"
        )
      ])

    return {
      users,
      total: totalRow?.count || 0,
      filteredTotal: filteredTotalRow?.count || 0,
      adminCount: adminRow?.count || 0,
      activeCount: activeRow?.count || 0,
      suspendedCount: suspendedRow?.count || 0
    }
  }

  async updateRole(
    userId: string,
    role: User['role'],
    updatedAt: number,
    preserveOneAdmin = false
  ): Promise<boolean> {
    const where = preserveOneAdmin
      ? `WHERE id = ? AND deleted_at IS NULL AND role = 'ADMIN'
         AND (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND role = 'ADMIN') > 1`
      : 'WHERE id = ? AND deleted_at IS NULL'
    const result = await this.db.execute(`UPDATE users SET role = ?, updated_at = ? ${where}`, [
      role,
      updatedAt,
      userId
    ])
    return (result.changes || 0) > 0
  }

  async updateStatus(
    userId: string,
    status: User['status'],
    updatedAt: number,
    preserveOneActiveAdmin = false
  ): Promise<boolean> {
    const where = preserveOneActiveAdmin
      ? `WHERE id = ? AND deleted_at IS NULL AND role = 'ADMIN' AND status = 'ACTIVE'
         AND (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND role = 'ADMIN' AND status = 'ACTIVE') > 1`
      : 'WHERE id = ? AND deleted_at IS NULL'
    const result = await this.db.execute(`UPDATE users SET status = ?, updated_at = ? ${where}`, [
      status,
      updatedAt,
      userId
    ])
    return (result.changes || 0) > 0
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

  async updateAvatar(userId: string, avatarUrl: string, updatedAt: number): Promise<void> {
    await this.db.execute('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?', [
      avatarUrl,
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

  async updatePassword(userId: string, passwordHash: string, updatedAt: number): Promise<void> {
    const result = await this.db.execute(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      [passwordHash, updatedAt, userId]
    )
    if (result.changes === 0) {
      throw new Error('User not found while updating password')
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
    // 列类型同时兼容 SQLite（D1）与 MySQL：
    // - 主键/唯一列/带默认值列用 VARCHAR（MySQL 的 TEXT 不能作主键、不能带字面量默认值）
    // - 时间戳用 BIGINT（MySQL INTEGER 为 4 字节，存不下 Date.now() 毫秒值）
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        email_verified_at BIGINT,
        nickname VARCHAR(128),
        avatar_url VARCHAR(512),
        role VARCHAR(16) DEFAULT 'USER',
        status VARCHAR(16) DEFAULT 'ACTIVE',
        last_login_at BIGINT,
        last_login_ip VARCHAR(64),
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        deleted_at BIGINT
      );
    `)

    const userColumns = await getTableColumns(this.db, 'users')
    if (!userColumns.has('email_verified_at')) {
      await this.db.execute('ALTER TABLE users ADD COLUMN email_verified_at BIGINT')
      await this.db.execute(
        'UPDATE users SET email_verified_at = created_at WHERE email IS NOT NULL AND email_verified_at IS NULL'
      )
    }

    // Create user_identities table
    const identityIdColumn =
      this.db.dialect === 'mysql'
        ? 'id BIGINT AUTO_INCREMENT PRIMARY KEY'
        : 'id INTEGER PRIMARY KEY AUTOINCREMENT'
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS user_identities (
        ${identityIdColumn},
        user_id VARCHAR(64) NOT NULL,
        provider VARCHAR(32) NOT NULL,
        provider_uid VARCHAR(255) NOT NULL,
        profile_data TEXT,
        created_at BIGINT NOT NULL,
        last_used_at BIGINT,
        UNIQUE(provider, provider_uid)
      );
    `)

    await ensureIndex(
      this.db,
      'idx_user_identities_user_provider',
      'user_identities',
      ['user_id', 'provider'],
      { unique: true }
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
