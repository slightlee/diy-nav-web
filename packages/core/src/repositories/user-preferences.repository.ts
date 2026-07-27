import type { DatabaseClient } from '@nav/database'

export type DefaultHome = 'home' | 'all'

export interface UserPreferencesRecord {
  user_id: string
  nav_title: string | null
  nav_icon: string | null
  default_home: DefaultHome
  ai_animation_enabled: number | boolean
  updated_at: number
}

export class UserPreferencesRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findByUserId(userId: string): Promise<UserPreferencesRecord | null> {
    return this.db.first<UserPreferencesRecord>(
      `SELECT user_id, nav_title, nav_icon, default_home, ai_animation_enabled, updated_at
       FROM user_preferences WHERE user_id = ?`,
      [userId]
    )
  }

  async upsert(
    userId: string,
    preferences: {
      navTitle: string
      navIcon: string
      defaultHome: DefaultHome
      aiAnimationEnabled: boolean
    },
    updatedAt: number
  ): Promise<UserPreferencesRecord> {
    await this.db.execute(
      `INSERT INTO user_preferences (user_id, nav_title, nav_icon, default_home, ai_animation_enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         nav_title = excluded.nav_title,
         nav_icon = excluded.nav_icon,
         default_home = excluded.default_home,
         ai_animation_enabled = excluded.ai_animation_enabled,
         updated_at = excluded.updated_at`,
      [
        userId,
        preferences.navTitle,
        preferences.navIcon,
        preferences.defaultHome,
        preferences.aiAnimationEnabled ? 1 : 0,
        updatedAt
      ]
    )

    return {
      user_id: userId,
      nav_title: preferences.navTitle,
      nav_icon: preferences.navIcon,
      default_home: preferences.defaultHome,
      ai_animation_enabled: preferences.aiAnimationEnabled ? 1 : 0,
      updated_at: updatedAt
    }
  }

  async initTable(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        nav_title TEXT,
        nav_icon TEXT,
        default_home TEXT NOT NULL DEFAULT 'home',
        ai_animation_enabled INTEGER NOT NULL DEFAULT 1,
        updated_at INTEGER NOT NULL,
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
