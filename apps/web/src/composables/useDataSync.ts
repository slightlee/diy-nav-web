import { watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCloudSync } from '@/composables/useCloudSync'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'

const SYNC_DEBOUNCE_MS = 2000
const SYNC_REFRESH_INTERVAL_MS = 60 * 1000

export function useDataSync() {
  const authStore = useAuthStore()
  const cloudSync = useCloudSync()
  const websiteStore = useWebsiteStore()
  const categoryStore = useCategoryStore()
  const tagStore = useTagStore()
  let syncTimer: number | null = null
  let refreshTimer: number | null = null
  let localSyncInFlight = false

  const flushLocalChanges = async () => {
    if (localSyncInFlight) return
    localSyncInFlight = true
    try {
      await cloudSync.syncLocalChanges()
    } finally {
      localSyncInFlight = false
    }
  }

  const scheduleSync = () => {
    if (syncTimer) window.clearTimeout(syncTimer)
    syncTimer = window.setTimeout(() => {
      syncTimer = null
      void flushLocalChanges()
    }, SYNC_DEBOUNCE_MS)
  }

  const initSync = () => {
    onMounted(() => {
      if (authStore.isAuthenticated) {
        // Start reconcile before any delayed auto-backup can snapshot local forks.
        void cloudSync.checkOnLogin()
      }
    })

    watch(
      () => authStore.isAuthenticated,
      isAuthenticated => {
        if (isAuthenticated) {
          void cloudSync.checkOnLogin()
        } else if (syncTimer) {
          window.clearTimeout(syncTimer)
          syncTimer = null
          cloudSync.resetSession()
        } else {
          cloudSync.resetSession()
        }
      },
      // Run before other watchers (e.g. auto-backup) react to the same login edge.
      { flush: 'sync' }
    )

    watch(
      [
        () => websiteStore.dataRevision,
        () => categoryStore.dataRevision,
        () => tagStore.dataRevision
      ],
      () => {
        if (authStore.isAuthenticated && cloudSync.isEnabled.value) scheduleSync()
      }
    )

    const reconcileWhenVisible = () => {
      if (syncTimer) {
        window.clearTimeout(syncTimer)
        syncTimer = null
        void flushLocalChanges()
        return
      }

      if (
        !localSyncInFlight &&
        document.visibilityState === 'visible' &&
        authStore.isAuthenticated &&
        cloudSync.isEnabled.value
      ) {
        void cloudSync.checkOnLogin()
      }
    }

    document.addEventListener('visibilitychange', reconcileWhenVisible)
    refreshTimer = window.setInterval(reconcileWhenVisible, SYNC_REFRESH_INTERVAL_MS)

    onUnmounted(() => {
      if (syncTimer) window.clearTimeout(syncTimer)
      if (refreshTimer) window.clearInterval(refreshTimer)
      document.removeEventListener('visibilitychange', reconcileWhenVisible)
    })
  }

  return {
    initSync
  }
}
