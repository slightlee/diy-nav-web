import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/main.scss'
import '@nav/ui/style.css'
import { useSettingsStore } from '@/stores/settings'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'

import App from './App.vue'
import router from './router'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)

const settingsStore = useSettingsStore()
const websiteStore = useWebsiteStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()

settingsStore.loadSettings()
websiteStore.initializeData()
categoryStore.initializeData()
tagStore.initializeData()

app.mount('#app')
