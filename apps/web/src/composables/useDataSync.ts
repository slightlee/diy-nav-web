import { watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCloudSync } from '@/composables/useCloudSync'

export function useDataSync() {
  const authStore = useAuthStore()
  const cloudSync = useCloudSync()

  const initSync = () => {
    // Sync data on app load if authenticated
    onMounted(() => {
      if (authStore.isAuthenticated) {
        cloudSync.checkOnLogin(authStore.isNewRegistration)
      }
    })

    // Also watch for auth state changes (e.g. login from guest mode)
    watch(
      () => authStore.isAuthenticated,
      isAuthenticated => {
        if (isAuthenticated) {
          cloudSync.checkOnLogin(authStore.isNewRegistration)
        }
      }
    )
  }

  return {
    initSync
  }
}
