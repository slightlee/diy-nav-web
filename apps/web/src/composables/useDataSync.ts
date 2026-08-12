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
  // A cached user means this is a page refresh. Session verification and the
  // following workspace reconcile can run without blocking the already
  // hydrated local workspace with a global loading overlay.
  const startupUserId = authStore.user?.id || null
  let startupSessionPending = true
  let activeSessionUserId: string | null | undefined
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
        // Keep the cached user id while the cookie session is being verified. OAuth binding
        // callbacks run during this window and must stay in the same account session.
        () => authStore.user?.id || null
      ],
      ([hasCheckedSession, userId]) => {
        if (syncTimer) {
          window.clearTimeout(syncTimer)
          syncTimer = null
        }

        // Session verification changes hasCheckedSession for the same user. Reset only when
        // the actual account id changes, otherwise in-flight OAuth binding is aborted after
        // the server has already completed it and the callback incorrectly reports failure.
        if (activeSessionUserId !== userId) {
          activeSessionUserId = userId
          cloudSync.resetSession(userId)
          uiStore.closeAllModals()
          aiStore.clearState()
        }

        if (!hasCheckedSession) {
          // Verify the httpOnly session silently on startup. The local
          // workspace was initialized before mount and remains usable while
          // the server confirms the cached account.
          uiStore.setLoading(false)
          return
        }

        const isStartupRefresh = startupSessionPending && userId === startupUserId
        startupSessionPending = false
        settingsStore.activateAccountPreferences(userId)

        if (userId) {
          const session = captureAccountSession()
          const shouldShowLoading = !isStartupRefresh
          if (shouldShowLoading) {
            uiStore.setLoading(true, '正在加载账号数据…')
          } else {
            uiStore.setLoading(false)
          }
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
        void cloudSync.checkOnLogin().catch(() => undefined)
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
