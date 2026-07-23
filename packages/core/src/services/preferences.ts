import type { DatabaseClient } from '@nav/database'
import type { UserSettings } from '@nav/types'
import {
  UserPreferencesRepository,
  type DefaultHome,
  type UserPreferencesRecord
} from '../repositories/user-preferences.repository.js'

interface PreferencesPayload {
  navTitle: string
  navIcon: string
  defaultHome: DefaultHome
}

export interface UserPreferencesResult extends PreferencesPayload {
  initialized: boolean
  updatedAt: number
}

const DEFAULT_PREFERENCES: PreferencesPayload = {
  navTitle: 'DIY 导航',
  navIcon: 'D',
  defaultHome: 'home'
}

const normalizeTitle = (value: unknown) => {
  const title = typeof value === 'string' ? Array.from(value.trim()).slice(0, 6).join('') : ''
  return title || DEFAULT_PREFERENCES.navTitle
}

const normalizeIcon = (value: unknown) => {
  const icon = typeof value === 'string' ? value.trim().slice(0, 512) : ''
  return icon || DEFAULT_PREFERENCES.navIcon
}

const normalizeHome = (value: unknown): DefaultHome =>
  value === 'all' || value === 'home' ? value : DEFAULT_PREFERENCES.defaultHome

const toResult = (record: UserPreferencesRecord | null): UserPreferencesResult => ({
  navTitle: record?.nav_title || DEFAULT_PREFERENCES.navTitle,
  navIcon: record?.nav_icon || DEFAULT_PREFERENCES.navIcon,
  defaultHome: normalizeHome(record?.default_home),
  initialized: !!record,
  updatedAt: record?.updated_at || 0
})

export class PreferencesService {
  private readonly preferencesRepo: UserPreferencesRepository

  constructor(private readonly db: DatabaseClient) {
    this.preferencesRepo = new UserPreferencesRepository(db)
  }

  async initTable(): Promise<void> {
    await this.preferencesRepo.initTable()
  }

  async get(userId: string): Promise<UserPreferencesResult> {
    return toResult(await this.preferencesRepo.findByUserId(userId))
  }

  async update(userId: string, input: Partial<UserSettings>): Promise<UserPreferencesResult> {
    const current = await this.preferencesRepo.findByUserId(userId)
    if (!current) {
      // The user may have created local settings before the first authenticated request.
      const preferences = {
        navTitle: normalizeTitle(input.navTitle),
        navIcon: normalizeIcon(input.navIcon),
        defaultHome: normalizeHome(input.defaultHome)
      }
      return toResult(await this.preferencesRepo.upsert(userId, preferences, Date.now()))
    }

    const preferences = {
      navTitle: normalizeTitle(input.navTitle ?? current.nav_title),
      navIcon: normalizeIcon(input.navIcon ?? current.nav_icon),
      defaultHome: normalizeHome(input.defaultHome ?? current.default_home)
    }
    return toResult(await this.preferencesRepo.upsert(userId, preferences, Date.now()))
  }
}
