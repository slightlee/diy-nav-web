import type { DatabaseClient } from '@nav/database'

export type DefaultHome = 'home' | 'all'

export interface UserPreferencesRecord {
  user_id: string
  default_home: DefaultHome
  ai_animation_enabled: number | boolean
  updated_at: number
}

export class UserPreferencesRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findByUserId(userId: string): Promise<UserPreferencesRecord | null> {
    return this.db.first<UserPreferencesRecord>(
      `SELECT user_id, default_home, ai_animation_enabled, updated_at
       FROM user_preferences WHERE user_id = ?`,
      [userId]
    )
  }

  async upsert(
    userId: string,
    preferences: {
      defaultHome: DefaultHome
      aiAnimationEnabled: boolean
    },
    updatedAt: number
  ): Promise<UserPreferencesRecord> {
    const upsertClause =
      this.db.dialect === 'mysql'
        ? `ON DUPLICATE KEY UPDATE
         default_home = VALUES(default_home),
         ai_animation_enabled = VALUES(ai_animation_enabled),
         updated_at = VALUES(updated_at)`
        : `ON CONFLICT(user_id) DO UPDATE SET
         default_home = excluded.default_home,
         ai_animation_enabled = excluded.ai_animation_enabled,
         updated_at = excluded.updated_at`

    await this.db.execute(
      `INSERT INTO user_preferences (user_id, default_home, ai_animation_enabled, updated_at)
       VALUES (?, ?, ?, ?)
       ${upsertClause}`,
      [userId, preferences.defaultHome, preferences.aiAnimationEnabled ? 1 : 0, updatedAt]
    )

    return {
      user_id: userId,
      default_home: preferences.defaultHome,
      ai_animation_enabled: preferences.aiAnimationEnabled ? 1 : 0,
      updated_at: updatedAt
    }
  }

  async initTable(): Promise<void> {
    // nav_title/nav_icon/nav_brand_custom 为已废弃的用户品牌定制列：
    // 保留建表以兼容存量库结构，新代码不再读写。
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id VARCHAR(64) PRIMARY KEY,
        nav_title TEXT,
        nav_icon TEXT,
        default_home VARCHAR(8) NOT NULL DEFAULT 'home',
        ai_animation_enabled INTEGER NOT NULL DEFAULT 1,
        nav_brand_custom INTEGER NOT NULL DEFAULT 0,
        updated_at BIGINT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `)

    try {
      await this.db.execute(
        'ALTER TABLE user_preferences ADD COLUMN ai_animation_enabled INTEGER NOT NULL DEFAULT 1'
      )
    } catch {
      // The column already exists on initialized databases.
    }
  }
}
