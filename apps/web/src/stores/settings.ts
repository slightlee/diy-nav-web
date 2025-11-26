import { defineStore } from 'pinia'
import { readonly, ref } from 'vue'
import type { UserSettings } from '@/types'

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'auto',
  autoBackup: true,
  defaultHome: 'home'
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettings>({ ...DEFAULT_SETTINGS })
  let mql: MediaQueryList | null = null
  let mqlHandler: ((e: MediaQueryListEvent) => void) | null = null

  const loadSettings = () => {
    const stored = localStorage.getItem('userSettings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        settings.value = { ...DEFAULT_SETTINGS, ...parsed }
      } catch {
        settings.value = { ...DEFAULT_SETTINGS }
      }
    } else {
      settings.value = { ...DEFAULT_SETTINGS }
    }
    applyTheme()
  }

  const updateSettings = (updates: Partial<UserSettings>) => {
    settings.value = { ...settings.value, ...updates }
    saveToLocalStorage()
    applyTheme()
  }

  const resetSettings = () => {
    settings.value = { ...DEFAULT_SETTINGS }
    saveToLocalStorage()
    applyTheme()
  }

  const setTheme = (theme: UserSettings['theme']) => {
    settings.value.theme = theme
    saveToLocalStorage()
    applyTheme()
  }

  const setDefaultHome = (home: NonNullable<UserSettings['defaultHome']>) => {
    settings.value.defaultHome = home
    saveToLocalStorage()
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
      const imported = JSON.parse(data)
      settings.value = { ...DEFAULT_SETTINGS, ...imported }
      saveToLocalStorage()
      applyTheme()
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
        settings.value = { ...DEFAULT_SETTINGS, ...JSON.parse(backup.settings) }
        applyTheme()
      }
      saveToLocalStorage()
      return true
    } catch {
      return false
    }
  }

  return {
    settings: readonly(settings),
    loadSettings,
    updateSettings,
    resetSettings,
    setTheme,
    setDefaultHome,
    exportSettings,
    importSettings,
    backupData,
    restoreData
  }
})
