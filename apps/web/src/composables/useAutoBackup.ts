import { useWebsiteStore } from '@/stores/website'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useUIStore } from '@/stores/ui'
import { createBackup } from '@/api/backup'
import { shouldBlockBackgroundDataOps } from '@/composables/useCloudSync'
import { computeCanonicalHash } from '@/utils/hash'
import { logger } from '@nav/logger'
import { BACKUP_CONFIG } from '@/config'
import { watch, onUnmounted, type WatchStopHandle } from 'vue'
import { getWorkspaceStorageKey } from '@/utils/user-data-storage'

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
  const uiStore = useUIStore()

  /**
   * Interval ID for periodic backup checks
   * Type: number (DOM timer) instead of NodeJS.Timeout to avoid type conflicts in browser environment
   * @see https://developer.mozilla.org/en-US/docs/Web/API/setInterval
   */
  let intervalId: number | null = null
  let stopDataWatch: WatchStopHandle | null = null

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
    const lockKey = getWorkspaceStorageKey('autoBackupLock')
    const lockTimeStr = localStorage.getItem(lockKey)
    if (lockTimeStr) {
      const [lockTimeValue] = lockTimeStr.split('-')
      const lockTime = parseInt(lockTimeValue, 10)
      if (!isNaN(lockTime) && now - lockTime < BACKUP_CONFIG.LOCK_DURATION) {
        logger.debug('[AutoBackup] Backup in progress (locked), skipping')
        return
      }
    }

    try {
      localStorage.setItem(lockKey, lockId)
      await task()
    } finally {
      if (localStorage.getItem(lockKey) === lockId) {
        localStorage.removeItem(lockKey)
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
    const userId = authStore.user?.id
    if (!userId) return

    // Never archive while sync is reconciling or a conflict is open — that produced
    // tiny 700B "auto backups" of the local fork before the user chose how to merge.
    if (
      shouldBlockBackgroundDataOps() ||
      uiStore.modalState.syncConflict ||
      uiStore.modalState.syncRecovery
    ) {
      logger.info('[AutoBackup] Sync reconcile/conflict in progress, skipping automatic backup.')
      return
    }

    await runWithBackupLock(async () => {
      if (!authStore.isAuthenticated || authStore.user?.id !== userId) return
      if (
        shouldBlockBackgroundDataOps() ||
        uiStore.modalState.syncConflict ||
        uiStore.modalState.syncRecovery
      ) {
        logger.info('[AutoBackup] Sync blocked after lock, skipping automatic backup.')
        return
      }

      const lastBackupTimeKey = getWorkspaceStorageKey('lastAutoBackupTime')
      const lastBackupHashKey = getWorkspaceStorageKey('lastAutoBackupHash')
      const lastBackupTimeStr = localStorage.getItem(lastBackupTimeKey)
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
        const lastHash = localStorage.getItem(lastBackupHashKey)

        if (currentHash === lastHash) {
          logger.info('[AutoBackup] Data has not changed since last backup, skipping.')
          // Update time to avoid checking again too soon, effectively resetting the timer
          localStorage.setItem(lastBackupTimeKey, now.toString())
          return
        }

        if (
          authStore.user?.id !== userId ||
          shouldBlockBackgroundDataOps() ||
          uiStore.modalState.syncConflict ||
          uiStore.modalState.syncRecovery
        ) {
          logger.info('[AutoBackup] Sync blocked before upload, skipping automatic backup.')
          return
        }

        const res = await createBackup(data, 'AUTO')
        if (!authStore.isAuthenticated || authStore.user?.id !== userId) return

        if (res.success) {
          logger.info('[AutoBackup] Backup successful')
          localStorage.setItem(lastBackupTimeKey, Date.now().toString())
          localStorage.setItem(lastBackupHashKey, currentHash)
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
    stopDataWatch?.()

    stopDataWatch = watch(
      [
        () => websiteStore.dataRevision,
        () => categoryStore.dataRevision,
        () => tagStore.dataRevision
      ],
      () => {
        logger.debug('[AutoBackup] Change detected, scheduling backup...')
        triggerBackup()
      }
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
    stopDataWatch?.()
    stopDataWatch = null
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
