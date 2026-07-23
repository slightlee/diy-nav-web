import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/main.scss'
import '@nav/ui/styles'
import { useSettingsStore } from '@/stores/settings'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'

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
  void authStore.logout()
  router.push('/login')
})

const settingsStore = useSettingsStore()
const websiteStore = useWebsiteStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()

// 应用启动时通过 httpOnly Cookie 验证会话并刷新用户信息
const authStore = useAuthStore()
void authStore.fetchUser().then(() => settingsStore.loadRemotePreferences(authStore.user?.id))

settingsStore.loadSettings()
websiteStore.initializeData()
categoryStore.initializeData()
tagStore.initializeData()

app.mount('#app')
