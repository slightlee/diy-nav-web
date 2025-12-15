import { useWebsiteStore } from '@/stores/website'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { createBackup } from '@/api/backup'
import { computeCanonicalHash } from '@/utils/hash'
import { logger } from '@nav/logger'
import { BACKUP_CONFIG } from '@/config'

export function useAutoBackup() {
  const websiteStore = useWebsiteStore()
  const authStore = useAuthStore()
  const settingsStore = useSettingsStore()
  let intervalId: number | null = null

  const checkAndRunBackup = async () => {
    // Check if user is logged in and auto backup is enabled
    if (!authStore.isAuthenticated || !settingsStore.settings.autoBackup) {
      return
    }

    const lastBackupTimeStr = localStorage.getItem('lastAutoBackupTime')
    const lastBackupTime = lastBackupTimeStr ? parseInt(lastBackupTimeStr, 10) : 0
    const now = Date.now()

    // Check if lastBackupTime is valid number, if not treat as 0 (never backed up)
    const isValidTime = !isNaN(lastBackupTime) && lastBackupTime > 0
    const timeSinceLastBackup = isValidTime ? now - lastBackupTime : Infinity

    logger.debug(
      {
        interval: BACKUP_CONFIG.INTERVAL,
        lastBackupTime,
        timeSince: timeSinceLastBackup,
        shouldBackup: timeSinceLastBackup > BACKUP_CONFIG.INTERVAL
      },
      '[AutoBackup] Check'
    )

    // Race Condition Lock: Check if another instance is backing up
    const lockTimeStr = localStorage.getItem('autoBackupLock')
    if (lockTimeStr) {
      const lockTime = parseInt(lockTimeStr, 10)
      if (!isNaN(lockTime) && now - lockTime < BACKUP_CONFIG.LOCK_DURATION) {
        logger.debug('[AutoBackup] Backup in progress (locked), skipping')
        return
      }
    }

    if (timeSinceLastBackup > BACKUP_CONFIG.INTERVAL) {
      try {
        // Acquire Lock
        localStorage.setItem('autoBackupLock', now.toString())

        logger.info('[AutoBackup] Starting automatic backup check...')
        const data = websiteStore.exportData()

        // Check if there is data to backup
        if (!data.data.websites.length && !data.data.categories.length && !data.data.tags.length) {
          logger.info('[AutoBackup] No data to backup, skipping.')
          return
        }

        // Compute MD5 hash of the CORE DATA (ignoring meta, using stable stringify)
        const currentHash = await computeCanonicalHash(data.data)
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
      } finally {
        // Release Lock
        localStorage.removeItem('autoBackupLock')
      }
    }
  }

  const startAutoBackup = () => {
    // Run immediately on strict startup (or rely on interval)
    // Actually, running immediately might conflict with initial Restore?
    // Let's just set the interval.

    // Clear existing
    if (intervalId) clearInterval(intervalId)

    // Initial check after app hydration, then interval
    setTimeout(checkAndRunBackup, BACKUP_CONFIG.INITIAL_DELAY)

    intervalId = window.setInterval(checkAndRunBackup, 60 * 1000) as unknown as number
  }

  const stopAutoBackup = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  // Initialize
  startAutoBackup()

  return {
    startAutoBackup,
    stopAutoBackup
  }
}
