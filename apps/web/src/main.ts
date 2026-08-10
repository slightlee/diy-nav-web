import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/main.scss'
import '@nav/ui/styles'
import { useSettingsStore } from '@/stores/settings'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { initializeWorkspaceStorage } from '@/utils/user-data-storage'

import App from './App.vue'
import router from './router'

const app = createApp(App)

import { request } from '@/utils/http'
import { useAuthStore } from '@/stores/auth'

const pinia = createPinia()
app.use(pinia)
app.use(router)

// Setup global http interceptors
request.onUnauthorized(() => {
  const authStore = useAuthStore()
  // The failed request already proves the cookie is unusable. Clear only the
  // account session so local data remains available without a recursive logout request.
  authStore.expireSession()
})

const settingsStore = useSettingsStore()
const websiteStore = useWebsiteStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()

// 应用启动时通过 httpOnly Cookie 验证会话并刷新用户信息
const authStore = useAuthStore()
settingsStore.loadSettings()

// auth_user is only a migration hint for the last workspace owner. The loading
// overlay blocks interaction until the httpOnly-cookie session is verified.
const cachedUserId = authStore.user?.id
initializeWorkspaceStorage(cachedUserId)
categoryStore.initializeData()
tagStore.initializeData()
websiteStore.initializeData()

app.mount('#app')
void authStore
  .fetchUser()
  .then(() => {
    void settingsStore.loadRemotePreferences(authStore.user?.id)
  })
  .catch(() => undefined)
