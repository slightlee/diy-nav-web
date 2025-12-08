<template>
  <header class="header">
    <div class="header-content">
      <div class="header-left">
        <div class="logo-section">
          <div class="logo-icon">D</div>
          <h1 class="app-title">DIY 导航</h1>
        </div>
        <nav class="view-nav">
          <router-link
            class="view-nav__link"
            to="/home"
            active-class="active"
            aria-label="首页"
            title="首页"
          >
            <span>首页</span>
          </router-link>
          <router-link
            class="view-nav__link"
            to="/all"
            active-class="active"
            aria-label="全部"
            title="全部"
          >
            <span>全部</span>
          </router-link>
        </nav>
      </div>
      <div class="header-actions">
        <BaseButton
          variant="primary"
          size="sm"
          icon="fas fa-plus"
          class="add-site-btn"
          @click="emit('addSite')"
        >
          <span class="btn-text">添加网站</span>
        </BaseButton>
        <div class="theme-toggle">
          <BaseButton
            variant="ghost"
            size="sm"
            shape="circle"
            :title="themeToggleTitle"
            @mouseenter="onThemeHover(true)"
            @mouseleave="onThemeHover(false)"
            @click="cycleTheme"
          >
            <i :class="themeToggleIcon" />
          </BaseButton>
          <div v-if="hoveringTheme || showClickTooltip" class="theme-hover-tooltip" role="tooltip">
            <span :class="[{ active: currentTheme === 'light' }]">浅色</span>
            <span class="sep">/</span>
            <span :class="[{ active: currentTheme === 'dark' }]">深色</span>
            <span class="sep">/</span>
            <span :class="[{ active: currentTheme === 'auto' }]">跟随系统</span>
          </div>
        </div>
        <div class="settings-dropdown">
          <BaseButton
            variant="ghost"
            size="sm"
            shape="circle"
            :aria-expanded="showSettingsDropdown ? 'true' : 'false'"
            aria-haspopup="menu"
            class="user-avatar-btn"
            @click="toggleSettingsDropdown"
          >
            <img
              v-if="authStore.isAuthenticated && authStore.user?.avatar_url"
              :src="authStore.user.avatar_url"
              class="user-avatar"
              alt="User Avatar"
            />
            <div v-else-if="authStore.isAuthenticated" class="user-avatar">
              {{ authStore.user?.email?.[0]?.toUpperCase() || 'U' }}
            </div>
            <i v-else class="fas fa-cog" />
          </BaseButton>

          <div v-if="showSettingsDropdown" class="dropdown-menu" role="menu">
            <!-- Guest: Login Option -->
            <template v-if="!authStore.isAuthenticated">
              <BaseButton
                variant="ghost"
                block
                class="dropdown-item text-primary"
                @click="router.push('/login')"
              >
                <i class="fas fa-sign-in-alt" />
                登录 / 注册
              </BaseButton>
              <div class="dropdown-divider" />
            </template>

            <!-- User Info Header -->
            <div v-if="authStore.isAuthenticated" class="dropdown-header">
              <div class="user-email">{{ authStore.user?.email }}</div>
            </div>
            <div v-if="authStore.isAuthenticated" class="dropdown-divider" />

            <!-- Common Options -->
            <BaseButton variant="ghost" block class="dropdown-item" @click="onOpenDataManagement">
              <i class="fas fa-exchange-alt" />
              数据管理
            </BaseButton>
            <BaseButton variant="ghost" block class="dropdown-item" @click="onOpenSettings">
              <i class="fas fa-cog" />
              设置
            </BaseButton>

            <!-- User: Logout Option -->
            <template v-if="authStore.isAuthenticated">
              <div class="dropdown-divider" />
              <BaseButton
                variant="ghost"
                block
                class="dropdown-item text-danger"
                @click="handleLogout"
              >
                <i class="fas fa-sign-out-alt" />
                退出登录
              </BaseButton>
            </template>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import { BaseButton } from '@nav/ui'

const emit = defineEmits(['addSite', 'openSettings', 'openDataManagement'])
const router = useRouter()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const currentTheme = computed(() => settingsStore.settings.theme)
const themeToggleIcon = computed(() =>
  currentTheme.value === 'light'
    ? 'fas fa-sun'
    : currentTheme.value === 'dark'
      ? 'fas fa-moon'
      : 'fas fa-adjust'
)
const themeToggleTitle = computed(
  () => (({ light: '浅色', dark: '深色', auto: '跟随系统' }) as const)[currentTheme.value]
)
const showSettingsDropdown = ref(false)
const showClickTooltip = ref(false)
const hoveringTheme = ref(false)
let clickTooltipTimer: number | undefined

const toggleSettingsDropdown = () => {
  showSettingsDropdown.value = !showSettingsDropdown.value
}
const onOpenSettings = () => {
  emit('openSettings')
  showSettingsDropdown.value = false
}
const onOpenDataManagement = () => {
  emit('openDataManagement')
  showSettingsDropdown.value = false
}
const handleLogout = () => {
  authStore.logout()
  showSettingsDropdown.value = false
  router.push('/login')
}

const cycleTheme = () => {
  const order: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto']
  const next = order[(order.indexOf(currentTheme.value) + 1) % order.length]
  settingsStore.setTheme(next)
  showClickTooltip.value = true
  if (clickTooltipTimer) clearTimeout(clickTooltipTimer)
  clickTooltipTimer = window.setTimeout(() => {
    if (!hoveringTheme.value) showClickTooltip.value = false
  }, 1200)
}
const onThemeHover = (hover: boolean) => {
  hoveringTheme.value = hover
  showClickTooltip.value = hover
}
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.settings-dropdown')) showSettingsDropdown.value = false
}
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  authStore.fetchUser()
})
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.header {
  height: 64px;
  background-color: var(--bg-panel);
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--border-tile);
  transition: background 0.2s ease-out;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.header-content {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 0 1rem;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 3rem;
}
.logo-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
}
.app-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  letter-spacing: -0.02em;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.view-nav {
  display: inline-flex;
  align-items: center;
  gap: 2rem;
}
.view-nav__link {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 36px;
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  font-size: 15px;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: var(--text-main);
  }

  &.active {
    color: var(--text-main);
    font-weight: 600;

    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -4px;
      height: 2px;
      background-color: var(--color-primary);
      border-radius: 2px;
    }
  }
}

:deep(.add-site-btn) {
  height: 36px;
  padding: 0 20px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  .btn-text {
    margin-left: 6px;
  }
}

:deep(.header-actions button:not(.add-site-btn)) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.2s;

  &:hover {
    background: var(--bg-tile-hover);
    color: var(--text-main);
  }
}

.theme-toggle {
  position: relative;
}
.theme-hover-tooltip {
  position: absolute;
  right: 0;
  top: calc(100% + 12px);
  background-color: var(--bg-panel);
  border: 1px solid var(--border-tile);
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 8px 12px;
  z-index: 60;
  font-size: 13px;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.theme-hover-tooltip .sep {
  color: var(--text-muted);
  font-size: 10px;
}
.theme-hover-tooltip .active {
  color: var(--color-primary);
  font-weight: 600;
}
.settings-dropdown {
  position: relative;
}
.dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 12px);
  width: 200px;
  background-color: var(--bg-panel);
  border: 1px solid var(--border-tile);
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 6px;
  z-index: 50;
}
.dropdown-item {
  justify-content: flex-start;
  margin: 2px 0;
  color: var(--text-main);
  font-weight: 500;
  font-size: 14px;
  border-radius: 8px;
  padding: 8px 12px;

  &:hover {
    background-color: var(--bg-tile-hover);
  }
}
.dropdown-item i {
  margin-right: 10px;
  color: var(--text-muted);
  width: 16px;
  text-align: center;
}
.dropdown-item :deep(.button-text) {
  overflow: visible;
}
.dropdown-divider {
  height: 1px;
  background-color: var(--border-tile);
  margin: 4px 6px;
}
@media (max-width: 768px) {
  .header-content {
    padding: 0.75rem;
  }
  .header-left {
    gap: 1.5rem;
  }
  .header-actions {
    gap: 0.5rem;
  }
  .add-site-btn .btn-text {
    display: none;
  }
}

.user-avatar-btn {
  padding: 0;
  overflow: hidden;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  object-fit: cover;
}

div.user-avatar {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
}

img.user-avatar {
  background: transparent;
}

.dropdown-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-tile);
  margin-bottom: 4px;
}

.user-email {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-danger {
  color: var(--color-error) !important;

  &:hover {
    background-color: rgba(var(--color-error-rgb), 0.1) !important;
  }
}

.text-primary {
  color: var(--color-primary) !important;
  font-weight: 600;

  &:hover {
    background-color: rgba(var(--color-primary-rgb), 0.1) !important;
  }
}
</style>
