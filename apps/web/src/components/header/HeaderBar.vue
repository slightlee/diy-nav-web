<template>
  <header class="header">
    <div class="header-content">
      <div class="logo-section">
        <div class="logo-icon"><i class="fas fa-compass" /></div>
        <h1 class="app-title">DIY导航</h1>
      </div>
      <div class="header-actions">
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
  background-color: var(--color-neutral-100);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-xs);
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-content {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  color: var(--color-white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
}
.app-title {
  font-size: var(--font-size-title);
  font-weight: bold;
  color: var(--color-neutral-800);
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
  gap: 14px;
  margin-right: 0.5rem;
}
.view-nav__link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0;
  height: 36px;
  padding: 0 2px;
  color: var(--color-neutral-700);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  letter-spacing: 0.1px;
  transition: color var(--transition-fast);
}
.view-nav__link:hover {
  color: var(--color-neutral-800);
}
.view-nav__link.active {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}
.view-nav__link::after {
  content: '';
  position: absolute;
  left: 25%;
  bottom: 0;
  width: 50%;
  height: 1.5px;
  border-radius: 2px;
  background: transparent;
  transition: background-color var(--transition-fast);
}
.view-nav__link:hover::after {
  background: var(--color-neutral-300);
}
.view-nav__link.active::after {
  background: var(--color-primary);
}
.view-nav__link:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.theme-toggle {
  position: relative;
}
.theme-hover-tooltip {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background-color: var(--color-neutral-100);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  padding: 6px 10px;
  z-index: 60;
  font-size: var(--font-size-sm);
  color: var(--color-neutral-700);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.theme-hover-tooltip .sep {
  color: var(--color-neutral-500);
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
  background-color: var(--color-neutral-100);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 8px;
  z-index: 50;
}
.dropdown-item {
  justify-content: flex-start;
  margin: 2px 0;
  color: var(--color-neutral-800);
  font-weight: normal;
}
.dropdown-item i {
  margin-right: 10px;
  color: var(--color-neutral-600);
  width: 14px;
  text-align: center;
}
.dropdown-divider {
  height: 1px;
  background-color: var(--color-border);
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
