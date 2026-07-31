import { defineStore } from 'pinia'
import { readonly, ref, watch } from 'vue'
import {
  NAVIGATION_BRAND_CONFIG,
  resolveNavigationIcon,
  resolveNavigationTitle
} from '@nav/config/brand'
import type { UserPreferences, UserSettings } from '@nav/types'
import { getPreferences, updatePreferences } from '@/api/preferences'

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'auto',
  autoBackup: true,
  aiAnimationEnabled: true,
  defaultHome: 'home',
  navTitle: NAVIGATION_BRAND_CONFIG.defaultTitle,
  navIcon: NAVIGATION_BRAND_CONFIG.defaultIcon
}

const USER_PREFERENCES_CACHE_PREFIX = 'userPreferences:'

function normalizeSettings(raw: Partial<UserSettings> | null | undefined): UserSettings {
  const theme = raw?.theme
  const validTheme =
    theme === 'light' || theme === 'dark' || theme === 'auto' ? theme : DEFAULT_SETTINGS.theme
  const home = raw?.defaultHome
  const validHome = home === 'home' || home === 'all' ? home : DEFAULT_SETTINGS.defaultHome

  return {
    theme: validTheme,
    autoBackup: typeof raw?.autoBackup === 'boolean' ? raw.autoBackup : DEFAULT_SETTINGS.autoBackup,
    aiAnimationEnabled:
      typeof raw?.aiAnimationEnabled === 'boolean'
        ? raw.aiAnimationEnabled
        : DEFAULT_SETTINGS.aiAnimationEnabled,
    defaultHome: validHome,
    navTitle: resolveNavigationTitle(raw?.navTitle),
    navIcon: resolveNavigationIcon(raw?.navIcon)
  }
}

export function isNavIconUrl(value: string): boolean {
  return /^(https?:\/\/|data:image\/|\/)/i.test(value.trim())
}

export function isNavIconFa(value: string): boolean {
  const v = value.trim()
  return /^(fa[srlbd]?|fa)\s+fa-[\w-]+/i.test(v) || /^fa-[\w-]+(\s+fa-[\w-]+)*$/i.test(v)
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettings>({ ...DEFAULT_SETTINGS })
  let mql: MediaQueryList | null = null
  let mqlHandler: ((e: MediaQueryListEvent) => void) | null = null
  let remoteLoadPromise: Promise<void> | null = null
  let remoteLoadUserId: string | null = null

  const applyDocumentTitle = () => {
    if (typeof document === 'undefined') return
    document.title = settings.value.navTitle || NAVIGATION_BRAND_CONFIG.defaultTitle
  }

  const loadSettings = () => {
    const stored = localStorage.getItem('userSettings')
    if (stored) {
      try {
        settings.value = normalizeSettings(JSON.parse(stored))
      } catch {
        settings.value = { ...DEFAULT_SETTINGS }
      }
    } else {
      settings.value = { ...DEFAULT_SETTINGS }
    }
    applyTheme()
    applyDocumentTitle()
  }

  const updateSettings = (updates: Partial<UserSettings>) => {
    settings.value = normalizeSettings({ ...settings.value, ...updates })
    saveToLocalStorage()
    applyTheme()
    applyDocumentTitle()
  }

  const resetSettings = () => {
    settings.value = { ...DEFAULT_SETTINGS }
    saveToLocalStorage()
    applyTheme()
    applyDocumentTitle()
  }

  const setTheme = (theme: UserSettings['theme']) => {
    updateSettings({ theme })
  }

  const setDefaultHome = (home: NonNullable<UserSettings['defaultHome']>) => {
    updateSettings({ defaultHome: home })
  }

  const setNavBrand = (payload: { navTitle?: string; navIcon?: string }) => {
    updateSettings(payload)
  }

  const currentPreferences = (): UserPreferences => ({
    navTitle: settings.value.navTitle || NAVIGATION_BRAND_CONFIG.defaultTitle,
    navIcon: settings.value.navIcon || NAVIGATION_BRAND_CONFIG.defaultIcon,
    defaultHome: settings.value.defaultHome === 'all' ? 'all' : 'home',
    aiAnimationEnabled: settings.value.aiAnimationEnabled !== false
  })

  const getPreferencesCacheKey = (userId: string) => `${USER_PREFERENCES_CACHE_PREFIX}${userId}`

  const readCachedPreferences = (userId: string): UserPreferences | null => {
    try {
      // 清空 userSettings 后视为本地设置缓存已失效，允许重新从服务端恢复。
      if (!localStorage.getItem('userSettings')) return null
      const raw = localStorage.getItem(getPreferencesCacheKey(userId))
      if (!raw) return null
      const parsed = JSON.parse(raw) as Partial<UserPreferences>
      if (
        typeof parsed.navTitle !== 'string' ||
        typeof parsed.navIcon !== 'string' ||
        (parsed.defaultHome !== 'home' && parsed.defaultHome !== 'all') ||
        typeof parsed.aiAnimationEnabled !== 'boolean'
      ) {
        return null
      }
      return {
        navTitle: parsed.navTitle,
        navIcon: parsed.navIcon,
        defaultHome: parsed.defaultHome,
        aiAnimationEnabled: parsed.aiAnimationEnabled
      }
    } catch {
      return null
    }
  }

  const cachePreferences = (userId: string, preferences: UserPreferences) => {
    localStorage.setItem(getPreferencesCacheKey(userId), JSON.stringify(preferences))
  }

  const saveRemotePreferences = async (userId?: string) => {
    if (!userId) return
    const preferences = currentPreferences()
    try {
      const res = await updatePreferences(preferences)
      if (res.success) cachePreferences(userId, preferences)
    } catch {
      // 本地设置仍然有效，服务端失败时等待下次登录或用户修改后重试。
    }
  }

  const loadRemotePreferences = (userId?: string): Promise<void> => {
    if (!userId) return Promise.resolve()

    const cached = readCachedPreferences(userId)
    // 先用缓存完成首屏展示，但不能因此跳过服务端校验，否则其他设备的修改会过期。
    if (cached) updateSettings(cached)

    if (remoteLoadPromise) {
      if (remoteLoadUserId === userId) return remoteLoadPromise
      return remoteLoadPromise.then(() => loadRemotePreferences(userId))
    }

    remoteLoadUserId = userId
    remoteLoadPromise = (async () => {
      try {
        const res = await getPreferences()
        if (!res.success || !res.data) return

        if (res.data.initialized) {
          const preferences: UserPreferences = {
            navTitle: res.data.navTitle,
            navIcon: res.data.navIcon,
            defaultHome: res.data.defaultHome,
            aiAnimationEnabled: res.data.aiAnimationEnabled !== false
          }
          updateSettings(preferences)
          cachePreferences(userId, preferences)
        } else {
          // 首次迁移保留当前设备已有的品牌配置，不用默认值覆盖用户设置。
          await saveRemotePreferences(userId)
        }
      } catch {
        // 未登录或网络暂不可用时继续使用本地缓存。
      } finally {
        remoteLoadPromise = null
        remoteLoadUserId = null
      }
    })()

    return remoteLoadPromise
  }

  const clearPreferencesCache = (userId?: string) => {
    if (userId) localStorage.removeItem(getPreferencesCacheKey(userId))
  }

  const applyTheme = () => {
    const theme = settings.value.theme
    const root = document.documentElement
    if (theme === 'auto') {
      if (!mql) mql = window.matchMedia('(prefers-color-scheme: dark)')
      const prefersDark = mql.matches
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
      if (!mqlHandler) {
        mqlHandler = e => root.setAttribute('data-theme', e.matches ? 'dark' : 'light')
        mql.addEventListener('change', mqlHandler)
      }
    } else {
      root.setAttribute('data-theme', theme)
      if (mql && mqlHandler) {
        mql.removeEventListener('change', mqlHandler)
        mqlHandler = null
      }
    }
  }

  const saveToLocalStorage = () => {
    localStorage.setItem('userSettings', JSON.stringify(settings.value))
  }

  const exportSettings = () => JSON.stringify(settings.value, null, 2)

  const importSettings = (data: string) => {
    try {
      settings.value = normalizeSettings(JSON.parse(data))
      saveToLocalStorage()
      applyTheme()
      applyDocumentTitle()
      return true
    } catch {
      return false
    }
  }

  const backupData = () => {
    const backup = {
      websites: localStorage.getItem('websites'),
      categories: localStorage.getItem('categories'),
      tags: localStorage.getItem('tags'),
      settings: JSON.stringify(settings.value),
      timestamp: new Date().toISOString()
    }
    return JSON.stringify(backup, null, 2)
  }

  const restoreData = (backupData: string) => {
    try {
      const backup = JSON.parse(backupData)
      if (backup.websites) localStorage.setItem('websites', backup.websites)
      if (backup.categories) localStorage.setItem('categories', backup.categories)
      if (backup.tags) localStorage.setItem('tags', backup.tags)
      if (backup.settings) {
        const parsed =
          typeof backup.settings === 'string' ? JSON.parse(backup.settings) : backup.settings
        settings.value = normalizeSettings(parsed)
        applyTheme()
        applyDocumentTitle()
      }
      saveToLocalStorage()
      return true
    } catch {
      return false
    }
  }

  // Keep tab title in sync if settings mutated elsewhere
  watch(
    () => settings.value.navTitle,
    () => applyDocumentTitle()
  )

  return {
    settings: readonly(settings),
    loadSettings,
    updateSettings,
    resetSettings,
    setTheme,
    setDefaultHome,
    setNavBrand,
    saveRemotePreferences,
    loadRemotePreferences,
    clearPreferencesCache,
    exportSettings,
    importSettings,
    backupData,
    restoreData
  }
})
