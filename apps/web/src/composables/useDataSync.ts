import { watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useWebsiteStore } from '@/stores/website'

export function useDataSync() {
  const authStore = useAuthStore()
  const websiteStore = useWebsiteStore()

  const initSync = () => {
    // Sync data on app load if authenticated
    onMounted(() => {
      if (authStore.isAuthenticated) {
        websiteStore.checkAndRestoreCloudData(authStore.isNewRegistration)
      }
    })

    // Also watch for auth state changes (e.g. login from guest mode)
    watch(
      () => authStore.isAuthenticated,
      isAuthenticated => {
        if (isAuthenticated) {
          websiteStore.checkAndRestoreCloudData(authStore.isNewRegistration)
        }
      }
    )
  }

  return {
    initSync
  }
}
