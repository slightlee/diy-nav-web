import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserSettings } from '@/types'

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  gridDensity: 'normal',
  viewMode: 'card',
  fontSize: 'medium',
  autoBackup: true,
  shortcuts: {
    'addSite': 'Ctrl+N',
    'search': 'Ctrl+K',
    'settings': 'Ctrl+,'
  }
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
        // 如果解析失败，使用默认设置
        settings.value = { ...DEFAULT_SETTINGS }
      }
    } else {
      settings.value = { ...DEFAULT_SETTINGS }
    }
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

  const setGridDensity = (density: UserSettings['gridDensity']) => {
    settings.value.gridDensity = density
    saveToLocalStorage()
  }

  const setViewMode = (mode: UserSettings['viewMode']) => {
    settings.value.viewMode = mode
    saveToLocalStorage()
  }

  const setFontSize = (size: UserSettings['fontSize']) => {
    settings.value.fontSize = size
    saveToLocalStorage()
    applyFontSize()
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
  }

  const applyFontSize = () => {
    const root = document.documentElement
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    }
    root.style.fontSize = fontSizes[settings.value.fontSize]
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
      applyFontSize()
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
        applyFontSize()
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
    setGridDensity,
    setViewMode,
    setFontSize,
    setShortcut,
    exportSettings,
    importSettings,
    backupData,
    restoreData
  }
})
