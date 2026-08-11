import { watch, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCloudSync } from '@/composables/useCloudSync'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useUIStore } from '@/stores/ui'
import { useAIStore } from '@/stores/ai'
import { useSettingsStore } from '@/stores/settings'
import { captureAccountSession, isCurrentAccountSession } from '@/utils/account-session'

const SYNC_DEBOUNCE_MS = 2000
const SYNC_REFRESH_INTERVAL_MS = 60 * 1000

export function useDataSync() {
  const authStore = useAuthStore()
  const cloudSync = useCloudSync()
  const websiteStore = useWebsiteStore()
  const categoryStore = useCategoryStore()
  const tagStore = useTagStore()
  const uiStore = useUIStore()
  const aiStore = useAIStore()
  const settingsStore = useSettingsStore()
  let syncTimer: number | null = null
  let refreshTimer: number | null = null
  let localSyncInFlight = false

  const showBookmarkImportOnboarding = (userId: string) => {
    if (websiteStore.websites.length > 0) return
    if (uiStore.modalState.syncConflict || uiStore.modalState.syncRecovery) return

    const promptKey = `navData:user:${encodeURIComponent(userId)}:bookmarkImportPromptSeen`
    try {
      if (localStorage.getItem(promptKey) === 'true') return
      localStorage.setItem(promptKey, 'true')
    } catch {
      // The import entry remains available from data management when storage is unavailable.
    }
    uiStore.openModal('accountPanel', { tab: 'data' })
  }

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
    watch(
      [
        () => authStore.hasCheckedSession,
        () => (authStore.isAuthenticated ? authStore.user?.id || null : null)
      ],
      ([hasCheckedSession, userId]) => {
        if (syncTimer) {
          window.clearTimeout(syncTimer)
          syncTimer = null
        }

        // Stop the old account before activating the next workspace. This
        // prevents old data from being exported under the new session cookie.
        cloudSync.resetSession(userId)
        uiStore.closeAllModals()
        aiStore.clearState()

        if (!hasCheckedSession) {
          uiStore.setLoading(true, '正在验证登录状态…')
          return
        }

        settingsStore.activateAccountPreferences(userId)

        if (userId) {
          const session = captureAccountSession()
          uiStore.setLoading(true, '正在加载账号数据…')
          void cloudSync
            .activateWorkspace()
            .then(activated => {
              if (activated && isCurrentAccountSession(session)) {
                uiStore.setLoading(false)
                showBookmarkImportOnboarding(userId)
              }
            })
            .catch(error => {
              if (!isCurrentAccountSession(session)) return
              uiStore.setLoading(true, '账号数据加载失败，请刷新重试')
              uiStore.showToast(
                error instanceof Error ? error.message : '账号数据加载失败，请刷新重试',
                'error'
              )
            })
          return
        }
        uiStore.setLoading(false)
      },
      // Run before other watchers (e.g. auto-backup) react to the same login edge.
      { flush: 'sync', immediate: true }
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
