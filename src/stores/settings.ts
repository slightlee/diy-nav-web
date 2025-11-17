import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserSettings } from '@/types'

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  autoBackup: true,
  shortcuts: {
    addSite: 'Ctrl+N',
    search: 'Ctrl+K',
    settings: 'Ctrl+,'
  },
  density: 'default'
}

export const useSettingsStore = defineStore('settings', () => {
  // 状态
  const settings = ref<UserSettings>({ ...DEFAULT_SETTINGS })

  // 动作
  const loadSettings = () => {
    const stored = localStorage.getItem('userSettings')
    if (stored) {
      try {
        const parsedSettings = JSON.parse(stored)
        settings.value = { ...DEFAULT_SETTINGS, ...parsedSettings }
      } catch (e) {
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

  const setDensity = (density: NonNullable<UserSettings['density']>) => {
    settings.value.density = density
    saveToLocalStorage()
    applyTheme()
  }

  const setShortcut = (action: string, shortcut: string) => {
    settings.value.shortcuts[action] = shortcut
    saveToLocalStorage()
  }

  const applyTheme = () => {
    const theme = settings.value.theme
    const root = document.documentElement

    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      root.setAttribute('data-theme', theme)
    }

    const density = settings.value.density || 'default'
    root.setAttribute('data-density', density)
  }

  const saveToLocalStorage = () => {
    localStorage.setItem('userSettings', JSON.stringify(settings.value))
  }

  const exportSettings = () => {
    return JSON.stringify(settings.value, null, 2)
  }

  const importSettings = (data: string) => {
    try {
      const importedSettings = JSON.parse(data)
      settings.value = { ...DEFAULT_SETTINGS, ...importedSettings }
      saveToLocalStorage()
      applyTheme()
      return true
    } catch (e) {
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

      if (backup.websites) {
        localStorage.setItem('websites', backup.websites)
      }
      if (backup.categories) {
        localStorage.setItem('categories', backup.categories)
      }
      if (backup.tags) {
        localStorage.setItem('tags', backup.tags)
      }
      if (backup.settings) {
        settings.value = { ...DEFAULT_SETTINGS, ...JSON.parse(backup.settings) }
        applyTheme()
      }

      saveToLocalStorage()
      return true
    } catch (e) {
      return false
    }
  }

  return {
    // 状态
    settings,

    // 动作
    loadSettings,
    updateSettings,
    resetSettings,
    setTheme,
    setDensity,
    setShortcut,
    exportSettings,
    importSettings,
    backupData,
    restoreData
  }
})
