<template>
  <header class="header">
    <div class="header-container">
      <!-- Logo和标题 -->
      <div class="logo-section">
        <div class="logo-icon">
          <i class="fas fa-compass" />
        </div>
        <div class="logo-text">
          <span class="main-title">DIY导航</span>
          <span class="sub-title">您的私人网站收藏夹</span>
        </div>
      </div>

      <!-- 搜索区域 -->
      <div class="search-section">
        <div class="search-container">
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索网站、分类或标签..."
            class="search-input"
          />
          <button class="search-button" @click="handleSearch">
            <i class="fas fa-search" />
          </button>
        </div>
      </div>

      <!-- 导航菜单 -->
      <nav class="nav-menu">
        <div class="nav-item" :class="{ active: currentRoute === 'home' }" @click="navigateTo('home')">
          <i class="fas fa-home menu-icon" />
          <span>首页</span>
        </div>

        <div class="nav-item" :class="{ active: currentRoute === 'categories' }" @click="navigateTo('categories')">
          <i class="fas fa-folder menu-icon" />
          <span>分类</span>
        </div>

        <div class="nav-item" :class="{ active: currentRoute === 'tags' }" @click="navigateTo('tags')">
          <i class="fas fa-tags menu-icon" />
          <span>标签</span>
        </div>

        <div class="nav-item" @click="showAddModal">
          <i class="fas fa-plus-circle menu-icon" />
          <span>添加网站</span>
        </div>
      </nav>

      <!-- 工具栏 -->
      <div class="tools-section">
        <button class="tool-button" title="切换主题" @click="toggleTheme">
          <i class="fas fa-moon menu-icon" />
        </button>

        <button class="tool-button" title="设置" @click="showSettings">
          <i class="fas fa-cog menu-icon" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useUIStore } from '@/stores/ui'
import type { Website } from '@/types'

const emit = defineEmits<{
  navigate: [route: string]
}>()

// Store
const websiteStore = useWebsiteStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()
const uiStore = useUIStore()

// 状态
const searchKeyword = ref('')
const currentRoute = ref('home')

// 计算属性
const totalWebsites = computed(() => websiteStore.filteredWebsites.length)
const totalCategories = computed(() => categoryStore.categories.length)
const totalTags = computed(() => tagStore.tags.length)

// 事件处理
const handleSearch = () => {
  websiteStore.setSearchFilters({ keyword: searchKeyword.value.trim() })
}

const navigateTo = (route: string) => {
  currentRoute.value = route
  emit('navigate', route)
}

const toggleTheme = () => {
  const isDark = document.documentElement.classList.contains('dark-theme')
  document.documentElement.classList.toggle('dark-theme', !isDark)
}

const showAddModal = () => {
  uiStore.openModal('addSite')
}

const showSettings = () => {
  uiStore.openModal('settings')
}

// 监听全局主题变化
const initTheme = () => {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (isDark) {
    document.documentElement.classList.add('dark-theme')
  }
}
</script>

<style scoped lang="scss">
.header {
  background-color: var(--neutral-color);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow-card);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius);
  background-color: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin-right: var(--spacing-xs);
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.main-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--neutral-dark-color);
  margin: 0;
}

.sub-title {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0;
}

.search-section {
  flex: 1;
  margin: 0 var(--spacing-md);
  max-width: 400px;
}

.search-container {
  display: flex;
  flex: 1;
  background-color: var(--neutral-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;
  transition: all var(--transition-duration);
}

.search-input {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  outline: none;
  background-color: transparent;
  color: var(--text-muted);
  font-size: var(--font-size-base);
  font-family: var(--font-family);

  &::placeholder {
    color: var(--text-secondary);
  }

  &:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
}

.search-button {
  padding: 0 var(--spacing-md);
  background: transparent;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  transition: all var(--transition-duration);
}

.nav-menu {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-sm);
  border-radius: var(--border-radius);
  transition: all var(--transition-duration);
  cursor: pointer;
  position: relative;

  &:hover {
    background-color: var(--neutral-color);
  }

  &.active {
    color: var(--primary-color);
  }

  &.active::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 2px;
    background-color: var(--primary-color);
    border-radius: 1px;
  }
}

.menu-icon {
  margin-right: var(--spacing-xs);
  color: var(--text-muted);
  transition: all var(--transition-duration);

  .nav-item:hover &,
  .nav-item.active & {
    color: var(--primary-color);
  }
}

.tools-section {
  display: flex;
  gap: var(--spacing-sm);
}

.tool-button {
  padding: var(--spacing-sm);
  border-radius: var(--border-radius);
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  transition: all var(--transition-duration);
  cursor: pointer;
  position: relative;

  &:hover {
    color: var(--primary-color);
    border-color: var(--primary-color);
    background-color: var(--primary-color);
    color: var(--text-inverse);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .header-container {
    padding: 0 var(--spacing-sm);
  }

  .search-section {
    margin: 0 var(--spacing-sm);
    max-width: 100%;
  }

  .nav-menu {
    gap: var(--spacing-xs);
  }

  .nav-item span {
    font-size: var(--font-size-sm);
  }

  .tools-section {
    display: none; // 移动端隐藏工具栏
  }
}

@media (max-width: 480px) {
  .logo-text .sub-title {
    display: none; // 小屏幕隐藏副标题
  }
}

// 暗色主题支持
.dark-theme .header {
  background-color: #1a1a1a;
  border-bottom-color: #333;
}

.dark-theme .search-container {
  background-color: #2d2d2d;
  border-color: #444;
}

.dark-theme .nav-item:hover {
  background-color: #2d2d2d;
}

.dark-theme .tool-button:hover {
  color: var(--primary-color);
  background-color: #2d2d2d;
}
</style>
