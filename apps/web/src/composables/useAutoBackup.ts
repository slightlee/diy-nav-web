/* eslint-disable no-console */
import { onMounted, onUnmounted } from 'vue'
import { useWebsiteStore } from '@/stores/website'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { createBackup } from '@/api/backup'
import { computeHash } from '@/utils/hash'

const AUTO_BACKUP_INTERVAL = Number(import.meta.env.VITE_AUTO_BACKUP_INTERVAL) || 1 * 60 * 60 * 1000

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
    const isValidTime = !isNaN(lastBackupTime)
    const timeSinceLastBackup = isValidTime ? now - lastBackupTime : Infinity

    if (timeSinceLastBackup > AUTO_BACKUP_INTERVAL) {
      try {
        console.log('[AutoBackup] Starting automatic backup check...')
        const data = websiteStore.exportData()

        // Check if there is data to backup
        if (!data.data.websites.length && !data.data.categories.length && !data.data.tags.length) {
          console.log('[AutoBackup] No data to backup, skipping.')
          return
        }

        // Compute hash of the current data
        const currentHash = await computeHash(JSON.stringify(data.data))
        const lastHash = localStorage.getItem('lastAutoBackupHash')

        if (currentHash === lastHash) {
          console.log('[AutoBackup] Data has not changed since last backup, skipping.')
          // Update time to avoid checking again too soon
          localStorage.setItem('lastAutoBackupTime', now.toString())
          return
        }

        const res = await createBackup(data, 'AUTO')

        if (res.success) {
          console.log('[AutoBackup] Backup successful')
          localStorage.setItem('lastAutoBackupTime', now.toString())
          localStorage.setItem('lastAutoBackupHash', currentHash)
        } else {
          console.error('[AutoBackup] Backup failed:', res.message)
        }
      } catch (e) {
        console.error('[AutoBackup] Error:', e)
      }
    } else {
      // Optional: Log only if debugging, otherwise it might be too noisy for a loop
      // console.log('[AutoBackup] Skipping backup, last backup was', Math.round(timeSinceLastBackup / 1000 / 60), 'minutes ago')
    }
  }

  onMounted(() => {
    // Run immediately on mount
    checkAndRunBackup()

    // Set up periodic check
    // We check every minute to see if the interval has passed
    // This is more robust than setting a long timeout which might be cleared
    intervalId = window.setInterval(checkAndRunBackup, 60 * 1000)
  })

  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  })
}
