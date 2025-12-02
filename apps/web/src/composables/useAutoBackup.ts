import { onMounted } from 'vue'
import { useWebsiteStore } from '@/stores/website'

const AUTO_BACKUP_INTERVAL = Number(import.meta.env.VITE_AUTO_BACKUP_INTERVAL) || 1 * 60 * 60 * 1000

export function useAutoBackup() {
  const websiteStore = useWebsiteStore()

  const checkAutoBackup = () => {
    const lastBackupTime = localStorage.getItem('lastAutoBackupTime')
    const now = Date.now()

    if (!lastBackupTime || now - parseInt(lastBackupTime) > AUTO_BACKUP_INTERVAL) {
      // Use requestIdleCallback if available, otherwise setTimeout
      const runBackup = async () => {
        try {
          console.log('[AutoBackup] Starting automatic backup check...')
          const data = websiteStore.exportData()

          // Check if there is data to backup
          if (!data.websites.length && !data.categories.length && !data.tags.length) {
            console.log('[AutoBackup] No data to backup, skipping.')
            return
          }

          const res = await fetch(`${import.meta.env.VITE_ICON_API_URL}/api/backup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, type: 'AUTO' })
          })

          const json = await res.json()
          if (json.success) {
            console.log('[AutoBackup] Backup successful')
            localStorage.setItem('lastAutoBackupTime', now.toString())
          } else {
            console.error('[AutoBackup] Backup failed:', json.message)
          }
        } catch (e) {
          console.error('[AutoBackup] Error:', e)
        }
      }

      if ('requestIdleCallback' in window) {
        ;(window as any).requestIdleCallback(runBackup)
      } else {
        setTimeout(runBackup, 5000)
      }
    }
  }

  onMounted(() => {
    checkAutoBackup()
  })
}
