<template>
  <header class="header">
    <div class="header-content">
      <div class="header-left">
        <div class="logo-section">
          <div class="logo-icon"><i class="fas fa-compass" /></div>
          <h1 class="app-title">DIY导航</h1>
        </div>
        <nav class="view-nav">
          <router-link
            class="view-nav__link"
            to="/home"
            active-class="active"
            aria-label="主页"
            title="主页"
          >
            <span>主页</span>
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
            :aria-expanded="showSettingsDropdown ? 'true' : 'false'"
            aria-haspopup="menu"
            aria-controls="settings-menu"
            @click="toggleSettingsDropdown"
          >
            <i class="fas fa-cog" />
          </BaseButton>
          <div v-if="showSettingsDropdown" id="settings-menu" class="dropdown-menu" role="menu">
            <BaseButton variant="ghost" block class="dropdown-item" @click="onManageCategories">
              <i class="fas fa-folder-plus" />
              管理分类
            </BaseButton>
            <BaseButton variant="ghost" block class="dropdown-item" @click="onManageTags">
              <i class="fas fa-tags" />
              管理标签
            </BaseButton>
            <div class="dropdown-divider" />
            <BaseButton variant="ghost" block class="dropdown-item" @click="onOpenDataManagement">
              <i class="fas fa-exchange-alt" />
              数据管理
            </BaseButton>
            <BaseButton variant="ghost" block class="dropdown-item" @click="onOpenSettings">
              <i class="fas fa-cog" />
              设置
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { BaseButton } from '@nav/ui'

const emit = defineEmits([
  'addSite',
  'manageCategories',
  'manageTags',
  'openSettings',
  'openDataManagement'
])
const settingsStore = useSettingsStore()
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
const onManageCategories = () => {
  emit('manageCategories')
  showSettingsDropdown.value = false
}
const onManageTags = () => {
  emit('manageTags')
  showSettingsDropdown.value = false
}
const onOpenSettings = () => {
  emit('openSettings')
  showSettingsDropdown.value = false
}
const onOpenDataManagement = () => {
  emit('openDataManagement')
  showSettingsDropdown.value = false
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
onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
.header {
  height: 64px;
  background-color: var(--bg-panel);
  border-bottom: 1px solid var(--border-tile);
  position: sticky;
  top: 0;
  z-index: 100;
  transition:
    background 0.2s ease-out,
    border-color 0.2s ease-out;
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
  gap: 2rem;
}
.logo-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
}
.app-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.view-nav {
  display: inline-flex;
  align-items: center;
  gap: 1.5rem;
}
.view-nav__link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0;
  height: 36px;
  padding: 6px 2px;
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: normal;
  font-size: 14px;
  letter-spacing: 0.1px;
  cursor: pointer;
  transition: color var(--transition-fast);
}
.view-nav__link:hover {
  color: var(--text-main);
}
.view-nav__link.active {
  color: var(--text-main);
  font-weight: 500;
}
.view-nav__link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -6px;
  height: 2px;
  background-color: var(--color-primary);
  border-radius: 999px;
  transform: scaleX(0);
  transition: transform 0.2s ease-out;
}
.view-nav__link.active::after {
  transform: scaleX(1);
}

:deep(.add-site-btn) {
  height: 36px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 14px;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.38);
  gap: 6px;
}

:deep(.header-actions button:not(.add-site-btn)) {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 1px solid var(--border-tile);
  background: var(--bg-tile);
  color: var(--text-secondary);
  padding: 0 !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

:deep(.header-actions button:not(.add-site-btn):hover) {
  background: var(--bg-tile-hover);
}

.theme-toggle {
  position: relative;
}
.theme-hover-tooltip {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background-color: var(--bg-panel);
  border: 1px solid var(--border-tile);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  padding: 6px 10px;
  z-index: 60;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.theme-hover-tooltip .sep {
  color: var(--text-muted);
}
.theme-hover-tooltip .active {
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  background-color: rgba(var(--color-primary-rgb), 0.06);
  border-radius: 4px;
  padding: 0 6px;
}
.settings-dropdown {
  position: relative;
}
.dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 220px;
  background-color: var(--bg-panel);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 8px;
  z-index: 50;
}
.dropdown-item {
  justify-content: flex-start;
  margin: 2px 0;
  color: var(--text-main);
  font-weight: normal;
}
.dropdown-item i {
  margin-right: 10px;
  color: var(--text-muted);
  width: 14px;
  text-align: center;
}
.dropdown-divider {
  height: 1px;
  background-color: var(--border-tile);
  margin: 6px 8px;
}
@media (max-width: 768px) {
  .header-content {
    padding: 0.75rem;
  }
  .header-actions {
    gap: 0.5rem;
  }
  .add-site-btn .btn-text {
    display: none;
  }
}
</style>
