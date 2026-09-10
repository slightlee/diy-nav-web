import { defineStore } from 'pinia'
import { computed, readonly, ref, watch } from 'vue'
import { NAVIGATION_BRAND_CONFIG } from '@nav/config/brand'
import type { UserPreferences, UserSettings } from '@nav/types'
import { getPreferences, updatePreferences } from '@/api/preferences'
import { getPublicSiteConfig, type PublicSiteConfig } from '@/api/admin'
import { captureAccountSession, isCurrentAccountSession } from '@/utils/account-session'

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'auto',
  autoBackup: true,
  aiAnimationEnabled: true,
  defaultHome: 'home'
}

const USER_PREFERENCES_CACHE_PREFIX = 'userPreferences:'
// 站点公开配置的本地缓存：仅作为 boot.js 不可用（API 故障）时的兜底品牌。
// 正常情况下 boot.js 每次加载都带回最新配置（no-store），缓存由 boot 数据保持最新。
const PUBLIC_SITE_CONFIG_CACHE_KEY = 'publicSiteConfig'

interface RawSiteConfig {
  siteName?: unknown
  siteLogo?: unknown
  registrationEnabled?: unknown
}

/** 统一校验来自 boot.js / localStorage 的站点配置形状，非法数据一律拒绝。 */
function normalizePublicSiteConfig(raw: RawSiteConfig | null | undefined): PublicSiteConfig | null {
  if (!raw || typeof raw.siteName !== 'string' || !raw.siteName.trim()) return null
  return {
    siteName: raw.siteName,
    siteLogo: typeof raw.siteLogo === 'string' ? raw.siteLogo : '',
    registrationEnabled: raw.registrationEnabled !== false
  }
}

function readBootSiteConfig(): PublicSiteConfig | null {
  // index.html 在 <head> 同步加载 /api/site/boot.js（由 API 动态生成），
  // 渲染前即写入 window.__SITE_BOOT_CONFIG__，首帧即可用。
  const boot = (window as { __SITE_BOOT_CONFIG__?: RawSiteConfig }).__SITE_BOOT_CONFIG__
  return normalizePublicSiteConfig(boot)
}

function readCachedPublicSiteConfig(): PublicSiteConfig | null {
  try {
    const raw = localStorage.getItem(PUBLIC_SITE_CONFIG_CACHE_KEY)
    if (!raw) return null
    return normalizePublicSiteConfig(JSON.parse(raw) as Partial<PublicSiteConfig>)
  } catch {
    return null
  }
}

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
    defaultHome: validHome
  }
}

// 图标类型判定已下沉到 @nav/config/brand，这里保留导出兼容既有引用。
export { isNavIconUrl, isNavIconFa } from '@nav/config/brand'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettings>({ ...DEFAULT_SETTINGS })
  // 初始品牌：boot.js 注入的后台配置（首访零闪、每次最新）优先，本地缓存仅兜底。
  // 品牌由管理员统一配置、全员一致：站点配置 > 项目内置默认，无用户级覆盖。
  const bootSiteConfig = readBootSiteConfig()
  const publicSiteConfig = ref<PublicSiteConfig | null>(
    bootSiteConfig || readCachedPublicSiteConfig()
  )
  // boot 数据顺手写入兜底缓存；boot 已带回最新配置时跳过启动期冗余请求。
  if (bootSiteConfig) {
    try {
      localStorage.setItem(PUBLIC_SITE_CONFIG_CACHE_KEY, JSON.stringify(bootSiteConfig))
    } catch {
      // 缓存写入失败不影响本次展示。
    }
  }
  const skipInitialSiteConfigFetch = !!bootSiteConfig
  let mql: MediaQueryList | null = null
  let mqlHandler: ((e: MediaQueryListEvent) => void) | null = null
  let remoteLoadPromise: Promise<void> | null = null
  let remoteLoadUserId: string | null = null

  const effectiveNavTitle = computed(
    () => publicSiteConfig.value?.siteName || NAVIGATION_BRAND_CONFIG.defaultTitle
  )

  const effectiveNavIcon = computed(
    () => publicSiteConfig.value?.siteLogo || NAVIGATION_BRAND_CONFIG.defaultIcon
  )

  const fetchPublicSiteConfig = async (isRetry = false): Promise<void> => {
    try {
      const res = await getPublicSiteConfig()
      if (res.success && res.data) {
        publicSiteConfig.value = res.data
        try {
          localStorage.setItem(PUBLIC_SITE_CONFIG_CACHE_KEY, JSON.stringify(res.data))
        } catch {
          // 缓存写入失败不影响本次展示，下次拉取会再次尝试。
        }
        applyDocumentTitle()
        return
      }
    } catch {
      // 落入下方重试；失败时继续使用本地缓存的品牌而非项目默认值。
    }
    if (!isRetry) {
      // 失败重试一次，避免启动瞬间网络抖动导致页面一直停留在旧品牌。
      await new Promise(resolve => setTimeout(resolve, 1200))
      await fetchPublicSiteConfig(true)
    }
  }

  const applyDocumentTitle = () => {
    if (typeof document === 'undefined') return
    document.title = effectiveNavTitle.value || NAVIGATION_BRAND_CONFIG.defaultTitle
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
    // boot.js 已带回最新站点配置时跳过启动请求（数据同源，重复拉取只会
    // 增加一次冗余请求和一次潜在的二次跳变）；管理面板保存后仍会显式刷新。
    if (!skipInitialSiteConfigFetch) void fetchPublicSiteConfig()
  }

  const updateSettings = (updates: Partial<UserSettings>) => {
    settings.value = normalizeSettings({ ...settings.value, ...updates })
    saveToLocalStorage()
    applyTheme()
  }

  const resetSettings = () => {
    settings.value = { ...DEFAULT_SETTINGS }
    saveToLocalStorage()
    applyTheme()
  }

  const setTheme = (theme: UserSettings['theme']) => {
    updateSettings({ theme })
  }

  const setDefaultHome = (home: NonNullable<UserSettings['defaultHome']>) => {
    updateSettings({ defaultHome: home })
  }

  const currentPreferences = (): UserPreferences => ({
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
        (parsed.defaultHome !== 'home' && parsed.defaultHome !== 'all') ||
        typeof parsed.aiAnimationEnabled !== 'boolean'
      ) {
        return null
      }
      return {
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

  /**
   * Switches the account-owned settings view without touching the device theme.
   * Signed-out users get neutral defaults; signed-in users get only their own
   * cache until the server response arrives.
   */
  const activateAccountPreferences = (userId?: string | null) => {
    const cached = userId ? readCachedPreferences(userId) : null
    settings.value = normalizeSettings({
      ...DEFAULT_SETTINGS,
      theme: settings.value.theme,
      autoBackup: false,
      ...(cached || {})
    })
    saveToLocalStorage()
    applyTheme()
  }

  const saveRemotePreferences = async (userId?: string) => {
    if (!userId) return
    const session = captureAccountSession()
    if (session.userId !== userId) return
    const preferences = currentPreferences()
    try {
      const res = await updatePreferences(preferences)
      if (res.success && isCurrentAccountSession(session)) cachePreferences(userId, preferences)
    } catch {
      // 本地设置仍然有效，服务端失败时等待下次登录或用户修改后重试。
    }
  }

  const loadRemotePreferences = (userId?: string): Promise<void> => {
    if (!userId) return Promise.resolve()
    const session = captureAccountSession()
    if (session.userId !== userId) return Promise.resolve()

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
        if (!isCurrentAccountSession(session)) return
        if (!res.success || !res.data) return

        if (res.data.initialized) {
          const preferences: UserPreferences = {
            defaultHome: res.data.defaultHome,
            aiAnimationEnabled: res.data.aiAnimationEnabled !== false
          }
          updateSettings(preferences)
          cachePreferences(userId, preferences)
        } else {
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
      return true
    } catch {
      return false
    }
  }

  // Keep tab title in sync if site config is refreshed at runtime.
  watch(effectiveNavTitle, () => applyDocumentTitle())

  return {
    settings: readonly(settings),
    publicSiteConfig: readonly(publicSiteConfig),
    effectiveNavTitle,
    effectiveNavIcon,
    fetchPublicSiteConfig,
    loadSettings,
    activateAccountPreferences,
    updateSettings,
    resetSettings,
    setTheme,
    setDefaultHome,
    saveRemotePreferences,
    loadRemotePreferences,
    clearPreferencesCache,
    exportSettings,
    importSettings
  }
})
