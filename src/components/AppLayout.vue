<template>
  <div class="app-container">
    <!-- 顶部区域 -->
    <header class="header">
      <div class="header-content">
        <!-- Logo和标题 -->
        <div class="logo-section">
          <div class="logo-icon">
            <i class="fas fa-compass" />
          </div>
          <h1 class="app-title">
            DIY导航
          </h1>
        </div>

        <!-- 操作按钮 -->
        <div class="header-actions">
          <button class="add-site-btn" @click="handleAddSite">
            <i class="fas fa-plus" />
            <span>添加网站</span>
          </button>

          <div class="settings-dropdown">
            <button class="settings-btn" @click="toggleSettingsDropdown">
              <i class="fas fa-cog" />
            </button>
            <div v-if="showSettingsDropdown" class="dropdown-menu">
              <a href="#" class="dropdown-item" @click="openManageCategories">
                <i class="fas fa-folder-plus" />
                管理分类
              </a>
              <a href="#" class="dropdown-item" @click="openManageTags">
                <i class="fas fa-tags" />
                管理标签
              </a>
              <div class="dropdown-divider" />
              <a href="#" class="dropdown-item" @click="openImportExport">
                <i class="fas fa-exchange-alt" />
                导入/导出数据
              </a>
              <a href="#" class="dropdown-item" @click="toggleTheme">
                <i class="fas fa-moon" />
                主题设置
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="main-content">
      <div class="container">
        <!-- 搜索区域 -->
        <div class="search-section">
          <div class="search-container">
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索标签..."
              class="search-input"
            />
            <button class="search-button">
              <i class="fas fa-search" />
            </button>
          </div>

          <!-- 标签筛选 -->
          <div class="tag-filter-section">
            <div class="filter-header">
              <label class="filter-label">标签</label>
              <div class="filter-actions">
                <button v-if="selectedTags.length" class="clear-tags-btn" @click="clearSelectedTags">
                  <i class="fas fa-times" />
                  清空标签
                </button>
                <button class="manage-tags-btn" @click="openManageTags">
                  <i class="fas fa-edit" />
                  管理标签
                </button>
              </div>
            </div>
            <div class="tag-list">
              <button
                v-for="tag in tags"
                :key="tag.id"
                class="tag-item"
                :class="[{ active: selectedTags.includes(tag.id) }]"
                :style="selectedTags.includes(tag.id) ? { backgroundColor: tag.color } : undefined"
                @click="toggleTag(tag.id)"
              >
                {{ tag.name }}
                <i v-if="selectedTags.includes(tag.id)" class="fas fa-times-circle tag-remove-icon" />
              </button>
            </div>
          </div>
        </div>

        <!-- 分类筛选 -->
        <div class="category-section">
          <div class="filter-header">
            <label class="filter-label">分类</label>
            <button class="manage-categories-btn" @click="openManageCategories">
              <i class="fas fa-edit" />
              管理分类
            </button>
          </div>
          <div class="category-list">
            <button
              class="category-tag"
              :class="[{ active: selectedCategory === 'all' }]"
              @click="selectCategory('all')"
            >
              所有分类
              <span class="dot" />
            </button>
            <button
              v-for="category in categories"
              :key="category.id"
              class="category-tag"
              :class="[{ active: selectedCategory === category.id }]"
              @click="selectCategory(category.id)"
            >
              {{ category.name }}
              <span class="dot" />
            </button>
          </div>
        </div>

        <!-- 搜索结果区域 -->
        <div v-if="searchKeyword" class="search-results-section">
          <div class="results-header">
            <h3>搜索结果</h3>
            <button class="clear-search-btn" @click="clearSearch">
              <i class="fas fa-times" />
              清除搜索
            </button>
          </div>
          <div class="website-grid">
            <WebsiteCard
              v-for="website in searchResults"
              :key="website.id"
              :website="website"
              @edit="handleEditWebsite"
              @delete="handleDeleteWebsite"
            />
          </div>
        </div>

        <!-- 网站列表 -->
        <div v-else class="website-list-section">
          <div class="website-grid">
            <WebsiteCard
              v-for="website in filteredWebsites"
              :key="website.id"
              :website="website"
              @edit="handleEditWebsite"
              @delete="handleDeleteWebsite"
            />

            <!-- 添加网站卡片 -->
            <div v-if="filteredWebsites.length > 0" class="add-card" @click="handleAddSite">
              <div class="add-card-content">
                <div class="add-icon">
                  <i class="fas fa-plus" />
                </div>
                <span>添加网站</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <EmptyState
          v-if="filteredWebsites.length === 0 && !searchKeyword"
          type="no-websites"
          :show-action-button="true"
          @action="handleAddSite"
        />
      </div>
    </main>

    <!-- 模态框容器 -->
    <BaseModal
      v-if="uiStore.modalState.addSite"
      :is-open="uiStore.modalState.addSite"
      title="添加新网站"
      @close="closeAddSite"
    >
      <AddSiteModal
        :website="uiStore.getModalData('addSite')"
        :context-category-id="addSiteContextCategoryId"
        @close="closeAddSite"
      />
    </BaseModal>

    <BaseModal
      v-if="uiStore.modalState.manageCategories"
      :is-open="uiStore.modalState.manageCategories"
      title="管理分类"
      @close="() => uiStore.closeModal('manageCategories')"
    >
      <ManageCategoriesModal
        @close="() => uiStore.closeModal('manageCategories')"
      />
    </BaseModal>

    <BaseModal
      v-if="uiStore.modalState.manageTags"
      :is-open="uiStore.modalState.manageTags"
      title="管理标签"
      @close="() => uiStore.closeModal('manageTags')"
    >
      <ManageTagsModal
        @close="() => uiStore.closeModal('manageTags')"
      />
    </BaseModal>

    <BaseModal
      v-if="uiStore.modalState.settings"
      :is-open="uiStore.modalState.settings"
      title="设置"
      @close="() => uiStore.closeModal('settings')"
    >
      <SettingsModal
        @close="() => uiStore.closeModal('settings')"
      />
    </BaseModal>

    <!-- Toast容器 -->
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { Website } from '@/types'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/base/BaseModal.vue'
import WebsiteCard from '@/components/WebsiteCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import AddSiteModal from '@/components/modals/AddSiteModal.vue'
import ManageCategoriesModal from '@/components/modals/ManageCategoriesModal.vue'
import ManageTagsModal from '@/components/modals/ManageTagsModal.vue'
import SettingsModal from '@/components/modals/SettingsModal.vue'
import ToastContainer from '@/components/ToastContainer.vue'

// 确保有这些组件文件存在
// 如果不存在，先创建简单版本

// Store初始化
const websiteStore = useWebsiteStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()
const uiStore = useUIStore()

// 响应式状态
const searchKeyword = ref('')
const selectedTags = ref<string[]>([])
const selectedCategory = ref('all')
const showSettingsDropdown = ref(false)
const addSiteContextCategoryId = ref('')

// 计算属性
const filteredWebsites = computed(() => {
  let websites = websiteStore.websites

  // 按分类筛选
  if (selectedCategory.value !== 'all') {
    websites = websites.filter(w => w.categoryId === selectedCategory.value)
  }

  // 按标签筛选
  if (selectedTags.value.length > 0) {
    websites = websites.filter(w =>
      selectedTags.value.some(tagId => w.tagIds.includes(tagId))
    )
  }

  return websites
})

const searchResults = computed(() => {
  if (!searchKeyword.value.trim()) return []

  const keyword = searchKeyword.value.toLowerCase()
  return websiteStore.websites.filter(website =>
    website.name.toLowerCase().includes(keyword) ||
    website.url.toLowerCase().includes(keyword) ||
    website.description?.toLowerCase().includes(keyword) ||
    getWebsiteTags(website.tagIds).some(tag =>
      tag.name.toLowerCase().includes(keyword)
    )
  )
})

const tags = computed(() => tagStore.tags)
const categories = computed(() => {
  return [...categoryStore.categories].sort((a, b) => a.order - b.order)
})

// 辅助函数
const getWebsiteTags = (tagIds: string[]) => {
  return tagIds
    .map(id => tagStore.getTagById(id))
    .filter((tag): tag is any => !!tag)
}

// 事件处理函数

const handleAddSite = () => {
  uiStore.openModal('addSite')
}

const closeAddSite = () => {
  uiStore.closeModal('addSite')
  addSiteContextCategoryId.value = ''
}

watch(() => uiStore.modalState.addSite, isOpen => {
  if (isOpen) {
    addSiteContextCategoryId.value = selectedCategory.value !== 'all' ? selectedCategory.value : ''
  }
})

// 添加键盘快捷键支持
const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl+K 快速搜索
  if (event.ctrlKey && event.key === 'k') {
    event.preventDefault()
    const searchInput = document.querySelector('.search-input') as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
    }
  }

  // Ctrl+N 添加网站
  if (event.ctrlKey && event.key === 'n') {
    event.preventDefault()
    handleAddSite()
  }

  // ESC 清除搜索
  if (event.key === 'Escape' && searchKeyword.value) {
    clearSearch()
  }
}

const handleEditWebsite = (website: Website) => {
  uiStore.openModal('addSite', website)
}

const handleDeleteWebsite = (websiteId: string) => {
  if (confirm('确定要删除这个网站吗？')) {
    websiteStore.deleteWebsite(websiteId)
    uiStore.showToast('网站删除成功', 'success')
  }
}

const toggleTag = (tagId: string) => {
  const index = selectedTags.value.indexOf(tagId)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tagId)
  }
}

const selectCategory = (categoryId: string) => {
  selectedCategory.value = categoryId
}

const clearSearch = () => {
  searchKeyword.value = ''
}

const clearSelectedTags = () => {
  selectedTags.value = []
}

const toggleSettingsDropdown = () => {
  showSettingsDropdown.value = !showSettingsDropdown.value
}

const openManageCategories = () => {
  uiStore.openModal('manageCategories')
  showSettingsDropdown.value = false
}

const openManageTags = () => {
  uiStore.openModal('manageTags')
  showSettingsDropdown.value = false
}

const openImportExport = () => {
  uiStore.openModal('settings')
  showSettingsDropdown.value = false
}

const toggleTheme = () => {
  uiStore.openModal('settings')
  showSettingsDropdown.value = false
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.settings-dropdown')) {
    showSettingsDropdown.value = false
  }
}

// 生命周期
onMounted(() => {
  websiteStore.initializeData()
  categoryStore.initializeData()
  tagStore.initializeData()
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.app-container {
  min-height: 100vh;
  background-color: #F9FAFB;
  display: flex;
  flex-direction: column;
}

// 顶部区域样式
.header {
  background-color: white;
  border-bottom: 1px solid #E5E7EB;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
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
  border-radius: 8px;
  background-color: #3B82F6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
}

.app-title {
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: bold;
  color: #1F2937;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.add-site-btn {
  background-color: #3B82F6;
  color: white;
  border: none;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: #2563EB;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }
}

.settings-dropdown {
  position: relative;
}

.settings-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: #F3F4F6;
  border: none;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: #E5E7EB;
    color: #3B82F6;
  }
}

.dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 192px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  padding: 8px 0;
  z-index: 50;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  color: #374151;
  text-decoration: none;
  font-size: 0.875rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: #F3F4F6;
    color: #3B82F6;
  }

  i {
    margin-right: 8px;
    color: #6B7280;
    width: 12px;
  }
}

.dropdown-divider {
  height: 1px;
  background-color: #E5E7EB;
  margin: 4px 0;
}

// 主内容区域样式
.main-content {
  flex: 1;
  padding: 1.5rem 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

// 搜索区域样式
.search-section {
  margin-bottom: 1.25rem;
}

.search-container {
  position: relative;
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 2.75rem 0.75rem 1rem;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  font-size: 1rem;
  background-color: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease-in-out;

  &:focus {
    outline: none;
    border-color: #3B82F6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.12), 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  &::placeholder {
    color: #9CA3AF;
  }
}

.search-button {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9CA3AF;
  font-size: 1.125rem;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #3B82F6;
  }
}

// 标签筛选样式
.tag-filter-section {
  margin-top: 1.25rem;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.filter-label {
  font-size: 1rem;
  font-weight: 600;
  color: #1F2937;
  letter-spacing: 0.01em;
}

.manage-tags-btn {
  font-size: 0.75rem;
  color: #6B7280;
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #3B82F6;
  }

  i {
    margin-right: 4px;
  }
}

.manage-categories-btn {
  font-size: 0.75rem;
  color: #6B7280;
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #3B82F6;
  }

  i {
    margin-right: 4px;
  }
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clear-tags-btn {
  font-size: 0.75rem;
  color: #6B7280;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color 0.2s;

  &:hover {
    color: #374151;
  }

  i {
    margin-right: 4px;
  }
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  padding: 5px 10px;
  border-radius: 9999px;
  font-size: 0.875rem;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;
  background-color: #F3F4F6;
  color: #374151;

  &:hover {
    transform: scale(1.02);
  }

  &.active {
    color: white;
    border-color: transparent;
  }

  .tag-remove-icon {
    margin-left: 3px;
    font-size: 0.75rem;
    opacity: 0.7;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }
}

// 分类筛选样式
.category-section {
  margin-bottom: 1.25rem;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category-tag {
  padding: 5px 10px;
  border-radius: 9999px;
  font-size: 0.875rem;
  background-color: #F3F4F6;
  color: #374151;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;

  &:hover {
    background-color: #E5E7EB;
  }

  &.active {
    background-color: #3B82F6;
    color: white;
  }

  .dot {
    margin-left: 3px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: #D1D5DB;

    .active & {
      background-color: white;
    }
  }
}

// 网站网格样式
.website-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.875rem;
  margin-bottom: 1.5rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.875rem;
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.875rem;
}
}

// 添加网站卡片样式
.add-card {
  background-color: white;
  border: 2px dashed #E5E7EB;
  border-radius: 8px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;

  &:hover {
    border-color: #3B82F6;
    background-color: #F0F9FF;
  }
}

.add-card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  color: #6B7280;
}

.add-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #F3F4F6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
}

// 搜索结果样式
.search-results-section {
  margin-bottom: 1.25rem;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;

  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1F2937;
    margin: 0;
  }
}

.clear-search-btn {
  font-size: 0.875rem;
  color: #6B7280;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color 0.2s;

  &:hover {
    color: #374151;
  }

  i {
    margin-right: 4px;
  }
}

// 响应式调整
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

  .main-content {
    padding: 1rem 0;
  }

  .search-section {
    margin-bottom: 1.5rem;
  }

  .website-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.75rem;
  }
}

@media (max-width: 480px) {
  .website-grid {
    grid-template-columns: 1fr;
  }
}
</style>
