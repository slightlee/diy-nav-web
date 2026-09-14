import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/main.scss'
import '@nav/ui/styles'
import { logger } from '@nav/logger'
import { useSettingsStore } from '@/stores/settings'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useUIStore } from '@/stores/ui'
import { initializeWorkspaceStorage } from '@/utils/user-data-storage'

import App from './App.vue'
import router from './router'

const app = createApp(App)

import { request } from '@/utils/http'
import { useAuthStore } from '@/stores/auth'

const pinia = createPinia()
app.use(pinia)
app.use(router)

// 全局兜底：未捕获的 Promise 拒绝只进日志，不打扰用户、
// 不向前端暴露内部错误细节。
window.addEventListener('unhandledrejection', event => {
  logger.error({ err: event.reason }, '[Web] Unhandled promise rejection')
})

// Setup global http interceptors
request.onUnauthorized(() => {
  const authStore = useAuthStore()
  // The failed request already proves the cookie is unusable. Clear only the
  // account session so local data remains available without a recursive logout request.
  authStore.expireSession()
})

// Vue 渲染/生命周期错误：记日志并给用户一条通用提示（去重由
// didNotifyRuntimeError 保证只提示一次，文案不暴露内部细节）。
let didNotifyRuntimeError = false
app.config.errorHandler = (err, _instance, info) => {
  logger.error({ err, info }, '[Vue] Unhandled component error')
  if (!didNotifyRuntimeError) {
    didNotifyRuntimeError = true
    useUIStore().showToast('页面出现异常，建议刷新后重试', 'error')
  }
}

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
