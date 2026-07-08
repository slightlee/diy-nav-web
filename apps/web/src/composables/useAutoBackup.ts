import { useWebsiteStore } from '@/stores/website'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { createBackup } from '@/api/backup'
import { computeCanonicalHash } from '@/utils/hash'
import { logger } from '@nav/logger'
import { BACKUP_CONFIG } from '@/config'
import { watch, onUnmounted } from 'vue'

/**
 * Auto backup configuration constants
 */
const AUTO_BACKUP_CONFIG = {
  /** Debounce delay after data changes (30 seconds) */
  DEBOUNCE_DELAY_MS: 30 * 1000,
  /** Periodic backup check interval (1 minute) */
  CHECK_INTERVAL_MS: 60 * 1000
} as const

const AUTO_BACKUP_LOCK_NAME = 'auto-backup-lock'
const LOCAL_STORAGE_BACKUP_LOCK_KEY = 'autoBackupLock'

/**
 * Composable for automatic backup functionality
 * Monitors data changes and triggers backups based on configured intervals
 * @returns Control functions for starting/stopping auto backup
 */
export function useAutoBackup() {
  const websiteStore = useWebsiteStore()
  const authStore = useAuthStore()
  const settingsStore = useSettingsStore()
  const categoryStore = useCategoryStore()
  const tagStore = useTagStore()

  /**
   * Interval ID for periodic backup checks
   * Type: number (DOM timer) instead of NodeJS.Timeout to avoid type conflicts in browser environment
   * @see https://developer.mozilla.org/en-US/docs/Web/API/setInterval
   */
  let intervalId: number | null = null

  /**
   * Debounce utility with strict typing
   * @param fn - Function to debounce
   * @param delay - Delay in milliseconds
   * @returns Debounced function
   */
  function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
    let timeoutId: number | undefined
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => fn(...args), delay)
    }
  }

  async function runWithLocalStorageBackupLock(task: () => Promise<void>) {
    const now = Date.now()
    const lockId = `${now}-${Math.random()}`
    const lockTimeStr = localStorage.getItem(LOCAL_STORAGE_BACKUP_LOCK_KEY)
    if (lockTimeStr) {
      const [lockTimeValue] = lockTimeStr.split('-')
      const lockTime = parseInt(lockTimeValue, 10)
      if (!isNaN(lockTime) && now - lockTime < BACKUP_CONFIG.LOCK_DURATION) {
        logger.debug('[AutoBackup] Backup in progress (locked), skipping')
        return
      }
    }

    try {
      localStorage.setItem(LOCAL_STORAGE_BACKUP_LOCK_KEY, lockId)
      await task()
    } finally {
      if (localStorage.getItem(LOCAL_STORAGE_BACKUP_LOCK_KEY) === lockId) {
        localStorage.removeItem(LOCAL_STORAGE_BACKUP_LOCK_KEY)
      }
    }
  }

  async function runWithBackupLock(task: () => Promise<void>) {
    if (navigator.locks?.request) {
      await navigator.locks.request(AUTO_BACKUP_LOCK_NAME, task)
      return
    }

    await runWithLocalStorageBackupLock(task)
  }

  const checkAndRunBackup = async (isEventDriven = false) => {
    // Check if user is logged in and auto backup is enabled
    if (!authStore.isAuthenticated || !settingsStore.settings.autoBackup) {
      return
    }

    await runWithBackupLock(async () => {
      const lastBackupTimeStr = localStorage.getItem('lastAutoBackupTime')
      const lastBackupTime = lastBackupTimeStr ? parseInt(lastBackupTimeStr, 10) : 0
      const now = Date.now()

      // Check if lastBackupTime is valid number, if not treat as 0 (never backed up)
      const isValidTime = !isNaN(lastBackupTime) && lastBackupTime > 0
      const timeSinceLastBackup = isValidTime ? now - lastBackupTime : Infinity

      // Use configured interval as the strict rate limit.
      // This allows the user to control the frequency via VITE_AUTO_BACKUP_INTERVAL.
      const effectiveInterval = BACKUP_CONFIG.INTERVAL

      logger.debug(
        {
          interval: effectiveInterval,
          isEventDriven,
          lastBackupTime,
          timeSince: timeSinceLastBackup,
          shouldBackup: timeSinceLastBackup > effectiveInterval
        },
        '[AutoBackup] Check'
      )

      if (timeSinceLastBackup <= effectiveInterval) {
        return
      }

      try {
        logger.info('[AutoBackup] Starting automatic backup check...')
        const data = websiteStore.exportData()

        // Check if there is data to backup
        if (!data.data.websites.length && !data.data.categories.length && !data.data.tags.length) {
          logger.info('[AutoBackup] No data to backup, skipping to prevent accidental cloud wipe.')
          return
        }

        // Compute MD5 hash of the CORE DATA (ignoring meta, using stable stringify)
        // Use getHashData to exclude volatile fields (visitCount, lastVisited, etc.)
        const hashData = websiteStore.getHashData()
        const currentHash = await computeCanonicalHash(hashData)
        const lastHash = localStorage.getItem('lastAutoBackupHash')

        if (currentHash === lastHash) {
          logger.info('[AutoBackup] Data has not changed since last backup, skipping.')
          // Update time to avoid checking again too soon, effectively resetting the timer
          localStorage.setItem('lastAutoBackupTime', now.toString())
          return
        }

        const res = await createBackup(data, 'AUTO')

        if (res.success) {
          logger.info('[AutoBackup] Backup successful')
          localStorage.setItem('lastAutoBackupTime', Date.now().toString())
          localStorage.setItem('lastAutoBackupHash', currentHash)
        } else {
          logger.error({ err: res.message }, '[AutoBackup] Backup failed')
        }
      } catch (e) {
        logger.error({ err: e }, '[AutoBackup] Error')
      }
    })
  }

  // Debounced backup trigger (wait 30s after last change)
  const triggerBackup = debounce(() => {
    checkAndRunBackup(true)
  }, AUTO_BACKUP_CONFIG.DEBOUNCE_DELAY_MS)

  const startAutoBackup = () => {
    // Clear existing
    if (intervalId) clearInterval(intervalId)

    // Watch for deep changes in website data
    // We watch the computed hash data to be efficient? No, getting hash data is cheap.
    // Or just watch the store refs?
    // Watching the store refs directly is best for "any change"
    // Note: This won't trigger on visitCount if visitCount is mutated but we don't watch it?
    // Websites is a Ref array. Deep watch works.
    watch(
      [() => websiteStore.websites, () => categoryStore.categories, () => tagStore.tags],
      () => {
        // Trigger debounced backup
        logger.debug('[AutoBackup] Change detected, scheduling backup...')
        triggerBackup()
      },
      { deep: true }
    )

    // Initial check after app hydration, then interval (fallback)
    setTimeout(() => checkAndRunBackup(false), BACKUP_CONFIG.INITIAL_DELAY)

    intervalId = window.setInterval(
      () => checkAndRunBackup(false),
      AUTO_BACKUP_CONFIG.CHECK_INTERVAL_MS
    )
  }

  const stopAutoBackup = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  // Ensure cleanup to prevent memory leaks if component unmounts
  onUnmounted(() => {
    stopAutoBackup()
  })

  // Initialize
  startAutoBackup()

  return {
    startAutoBackup,
    stopAutoBackup
  }
}
