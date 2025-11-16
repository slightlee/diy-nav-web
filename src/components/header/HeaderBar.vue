<template>
  <header class="header">
    <div class="header-content">
      <div class="logo-section">
        <div class="logo-icon">
          <i class="fas fa-compass" />
        </div>
        <h1 class="app-title">
          DIY导航
        </h1>
      </div>

      <div class="header-actions">
        <button class="add-site-btn" @click="emit('addSite')">
          <i class="fas fa-plus" />
          <span>添加网站</span>
        </button>

        <div class="theme-toggle">
          <button
            class="theme-toggle-btn"
            :title="themeToggleTitle"
            @mouseenter="onThemeHover(true)"
            @mouseleave="onThemeHover(false)"
            @click="cycleTheme"
          >
            <i :class="themeToggleIcon" />
          </button>
          <div v-if="hoveringTheme || showClickTooltip" class="theme-hover-tooltip" role="tooltip">
            <span :class="[{ active: currentTheme === 'light' }]">浅色</span>
            <span class="sep">/</span>
            <span :class="[{ active: currentTheme === 'dark' }]">深色</span>
            <span class="sep">/</span>
            <span :class="[{ active: currentTheme === 'auto' }]">跟随系统</span>
          </div>
        </div>

        <div class="settings-dropdown">
          <button class="settings-btn" @click="toggleSettingsDropdown">
            <i class="fas fa-cog" />
          </button>
          <div v-if="showSettingsDropdown" class="dropdown-menu">
            <a href="#" class="dropdown-item" @click="onManageCategories">
              <i class="fas fa-folder-plus" />
              管理分类
            </a>
            <a href="#" class="dropdown-item" @click="onManageTags">
              <i class="fas fa-tags" />
              管理标签
            </a>
            <div class="dropdown-divider" />
            <a href="#" class="dropdown-item" @click="onOpenDataManagement">
              <i class="fas fa-exchange-alt" />
              数据管理
            </a>
            <a href="#" class="dropdown-item" @click="onOpenSettings">
              <i class="fas fa-cog" />
              设置
            </a>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const emit = defineEmits(['addSite', 'manageCategories', 'manageTags', 'openSettings', 'openDataManagement'])

const settingsStore = useSettingsStore()
const currentTheme = computed(() => settingsStore.settings.theme)

const themeToggleIcon = computed(() => {
  switch (currentTheme.value) {
    case 'light':
      return 'fas fa-sun'
    case 'dark':
      return 'fas fa-moon'
    default:
      return 'fas fa-adjust'
  }
})

const themeToggleTitle = computed(() => {
  const names: Record<'light' | 'dark' | 'auto', string> = {
    light: '浅色',
    dark: '深色',
    auto: '跟随系统'
  }
  return names[currentTheme.value]
})

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
  const idx = order.indexOf(currentTheme.value)
  const next = order[(idx + 1) % order.length]
  settingsStore.setTheme(next)
  showClickTooltip.value = true
  if (clickTooltipTimer) clearTimeout(clickTooltipTimer)
  clickTooltipTimer = window.setTimeout(() => {
    if (!hoveringTheme.value) {
      showClickTooltip.value = false
    }
  }, 1200)
}

const onThemeHover = (hover: boolean) => {
  hoveringTheme.value = hover
  if (hover) {
    showClickTooltip.value = true
  } else {
    showClickTooltip.value = false
  }
}

const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.settings-dropdown')) {
    showSettingsDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.header {
  background-color: var(--color-neutral-100);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
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
  font-size: 1.125rem;
}

.app-title {
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: bold;
  color: var(--color-neutral-800);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.add-site-btn {
  background-color: var(--color-primary);
  color: var(--color-white);
  border: none;
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-sm);

  &:hover {
    background-color: var(--color-primary-dark);
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }
}

.theme-toggle {
  position: relative;
}

.theme-toggle-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background-color: var(--color-neutral-100);
  border: none;
  color: var(--color-neutral-700);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background-color: var(--color-neutral-200);
    color: var(--color-primary);
  }
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
  font-size: 0.8125rem;
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
  font-weight: 600;
  background-color: rgba(var(--color-primary-rgb), 0.06);
  border-radius: 4px;
  padding: 0 6px;
}

.settings-dropdown {
  position: relative;
}

.settings-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background-color: var(--color-neutral-100);
  border: none;
  color: var(--color-neutral-700);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background-color: var(--color-neutral-200);
    color: var(--color-primary);
  }
}

.dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 192px;
  background-color: var(--color-neutral-100);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 8px 0;
  z-index: 50;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  color: var(--color-neutral-700);
  text-decoration: none;
  font-size: 0.875rem;
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: var(--color-neutral-200);
    color: var(--color-primary);
  }

  i {
    margin-right: 8px;
    color: var(--color-neutral-600);
    width: 12px;
  }
}

.dropdown-divider {
  height: 1px;
  background-color: var(--color-neutral-300);
  margin: 4px 0;
}

@media (max-width: 768px) {
  .header-content {
    padding: 0.75rem;
  }

  .header-actions {
    gap: 0.5rem;
  }

  .add-site-btn span {
    display: none;
  }
}
</style>
