import type { DatabaseClient } from '@nav/database'
import {
  NAVIGATION_BRAND_CONFIG,
  resolveNavigationIcon,
  resolveNavigationTitle
} from '@nav/config/brand'
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
  aiAnimationEnabled: boolean
}

export interface UserPreferencesResult extends PreferencesPayload {
  initialized: boolean
  updatedAt: number
}

const DEFAULT_PREFERENCES: PreferencesPayload = {
  navTitle: NAVIGATION_BRAND_CONFIG.defaultTitle,
  navIcon: NAVIGATION_BRAND_CONFIG.defaultIcon,
  defaultHome: 'home',
  aiAnimationEnabled: true
}

const normalizeHome = (value: unknown): DefaultHome =>
  value === 'all' || value === 'home' ? value : DEFAULT_PREFERENCES.defaultHome

const normalizeAnimation = (value: unknown) => value !== false && value !== 0

const toResult = (record: UserPreferencesRecord | null): UserPreferencesResult => ({
  navTitle: resolveNavigationTitle(record?.nav_title),
  navIcon: resolveNavigationIcon(record?.nav_icon),
  defaultHome: normalizeHome(record?.default_home),
  aiAnimationEnabled: normalizeAnimation(record?.ai_animation_enabled),
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
        navTitle: resolveNavigationTitle(input.navTitle),
        navIcon: resolveNavigationIcon(input.navIcon),
        defaultHome: normalizeHome(input.defaultHome),
        aiAnimationEnabled: normalizeAnimation(input.aiAnimationEnabled)
      }
      return toResult(await this.preferencesRepo.upsert(userId, preferences, Date.now()))
    }

    const preferences = {
      navTitle: resolveNavigationTitle(input.navTitle ?? current.nav_title),
      navIcon: resolveNavigationIcon(input.navIcon ?? current.nav_icon),
      defaultHome: normalizeHome(input.defaultHome ?? current.default_home),
      aiAnimationEnabled: normalizeAnimation(
        input.aiAnimationEnabled ?? current.ai_animation_enabled
      )
    }
    return toResult(await this.preferencesRepo.upsert(userId, preferences, Date.now()))
  }
}
