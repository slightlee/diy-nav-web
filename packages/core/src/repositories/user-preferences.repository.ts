import type { DatabaseClient } from '@nav/database'

export type DefaultHome = 'home' | 'all'

export interface UserPreferencesRecord {
  user_id: string
  nav_title: string | null
  nav_icon: string | null
  default_home: DefaultHome
  updated_at: number
}

export class UserPreferencesRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findByUserId(userId: string): Promise<UserPreferencesRecord | null> {
    return this.db.first<UserPreferencesRecord>(
      `SELECT user_id, nav_title, nav_icon, default_home, updated_at
       FROM user_preferences WHERE user_id = ?`,
      [userId]
    )
  }

  async upsert(
    userId: string,
    preferences: { navTitle: string; navIcon: string; defaultHome: DefaultHome },
    updatedAt: number
  ): Promise<UserPreferencesRecord> {
    await this.db.execute(
      `INSERT INTO user_preferences (user_id, nav_title, nav_icon, default_home, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         nav_title = excluded.nav_title,
         nav_icon = excluded.nav_icon,
         default_home = excluded.default_home,
         updated_at = excluded.updated_at`,
      [userId, preferences.navTitle, preferences.navIcon, preferences.defaultHome, updatedAt]
    )

    return {
      user_id: userId,
      nav_title: preferences.navTitle,
      nav_icon: preferences.navIcon,
      default_home: preferences.defaultHome,
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
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `)
  }
}
