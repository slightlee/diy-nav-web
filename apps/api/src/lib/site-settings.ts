/**
 * SiteSettingsService
 *
 * Manages site-wide settings stored in the `site_settings` D1 table.
 * Settings are cached in-memory after the first load and can be hot-swapped
 * when the admin updates them through the admin panel — no restart needed.
 *
 * Sensitive values (SMTP password) are stored encrypted using the same
 * OAUTH_CONFIG_ENCRYPTION_KEY used by the OAuth config service.
 */
import type { DatabaseClient } from '@nav/database'
import { decrypt, encrypt } from '@nav/ai-core'

// ─────────────────────────────────────────────
//  Setting keys (single source of truth)
// ─────────────────────────────────────────────

export const SITE_SETTING_KEYS = {
  SITE_NAME: 'site_name',
  WEB_APP_URL: 'web_app_url',
  SMTP_USER: 'smtp_user',
  SMTP_PASSWORD: 'smtp_password'
} as const

export type SiteSettingKey = (typeof SITE_SETTING_KEYS)[keyof typeof SITE_SETTING_KEYS]

// ─────────────────────────────────────────────
//  Defaults (used when no DB row exists)
// ─────────────────────────────────────────────

const DEFAULTS: Record<SiteSettingKey, string> = {
  site_name: 'DIY 导航',
  web_app_url: 'http://localhost:3000',
  smtp_user: '',
  smtp_password: ''
}

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

export interface SiteSettings {
  siteName: string
  webAppUrl: string
  smtpUser: string
  hasSmtpPassword: boolean
}

export interface AdminSiteSettingsConfig extends SiteSettings {
  updatedAt: number
}

export interface UpdateSiteSettingsPayload {
  siteName?: string
  webAppUrl?: string
  smtpUser?: string
  /** Provide to change password; omit to keep existing */
  smtpPassword?: string
}

type SiteSettingRow = {
  key: string
  value: string
  encrypted: number
  updated_at: number
}

// ─────────────────────────────────────────────
//  Service
// ─────────────────────────────────────────────

export class SiteSettingsService {
  private cache: Record<SiteSettingKey, string> | null = null
  private cacheUpdatedAt = 0

  constructor(
    private readonly db: DatabaseClient,
    private readonly encryptionKey: string
  ) {}

  // ── Table init ──────────────────────────────

  async initTable(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key       TEXT PRIMARY KEY,
        value     TEXT NOT NULL,
        encrypted INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      )
    `)
  }

  // ── Cache hydration ─────────────────────────

  async hydrateCache(): Promise<void> {
    const rows = await this.db.all<SiteSettingRow>(`SELECT * FROM site_settings`)
    const map: Partial<Record<SiteSettingKey, string>> = {}

    for (const row of rows) {
      const key = row.key as SiteSettingKey
      if (!(key in DEFAULTS)) continue

      if (row.encrypted) {
        try {
          map[key] = decrypt(row.value, this.encryptionKey)
        } catch {
          map[key] = ''
        }
      } else {
        map[key] = row.value
      }
    }

    this.cache = {
      site_name: map.site_name ?? DEFAULTS.site_name,
      web_app_url: map.web_app_url ?? DEFAULTS.web_app_url,
      smtp_user: map.smtp_user ?? DEFAULTS.smtp_user,
      smtp_password: map.smtp_password ?? DEFAULTS.smtp_password
    }

    this.cacheUpdatedAt = Date.now()
  }

  // ── Read ────────────────────────────────────

  /** Get cached settings (call hydrateCache() first during initServices) */
  getSettings(): SiteSettings {
    const c = this.cache
    return {
      siteName: c?.site_name ?? DEFAULTS.site_name,
      webAppUrl: c?.web_app_url ?? DEFAULTS.web_app_url,
      smtpUser: c?.smtp_user ?? DEFAULTS.smtp_user,
      hasSmtpPassword: !!c?.smtp_password
    }
  }

  /** Returns plaintext SMTP password (for email sending) */
  getSmtpPassword(): string {
    return this.cache?.smtp_password ?? ''
  }

  // ── Admin read ──────────────────────────────

  async getAdminConfig(): Promise<AdminSiteSettingsConfig> {
    if (!this.cache) await this.hydrateCache()
    return {
      ...this.getSettings(),
      updatedAt: this.cacheUpdatedAt
    }
  }

  // ── Write ────────────────────────────────────

  async updateSettings(payload: UpdateSiteSettingsPayload): Promise<AdminSiteSettingsConfig> {
    const now = Date.now()

    const upsert = async (key: SiteSettingKey, value: string, encrypted = false) => {
      const stored = encrypted ? encrypt(value, this.encryptionKey) : value
      await this.db.execute(
        `INSERT INTO site_settings (key, value, encrypted, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           encrypted = excluded.encrypted,
           updated_at = excluded.updated_at`,
        [key, stored, encrypted ? 1 : 0, now]
      )
    }

    if (payload.siteName !== undefined)
      await upsert(SITE_SETTING_KEYS.SITE_NAME, payload.siteName.trim())
    if (payload.webAppUrl !== undefined)
      await upsert(SITE_SETTING_KEYS.WEB_APP_URL, payload.webAppUrl.trim())
    if (payload.smtpUser !== undefined)
      await upsert(SITE_SETTING_KEYS.SMTP_USER, payload.smtpUser.trim())
    if (payload.smtpPassword?.trim())
      await upsert(SITE_SETTING_KEYS.SMTP_PASSWORD, payload.smtpPassword.trim(), true)

    // Refresh cache after write
    await this.hydrateCache()
    this.cacheUpdatedAt = now

    return {
      ...this.getSettings(),
      updatedAt: now
    }
  }
}
