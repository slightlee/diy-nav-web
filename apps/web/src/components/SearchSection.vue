<template>
  <div class="search-section">
    <!-- Search Header -->
    <div v-if="!hideSearch" class="search-header">
      <div class="search-container">
        <BaseInput
          ref="searchInput"
          v-model="searchKeyword"
          placeholder="根据网站名称、标签、描述搜索"
          size="lg"
          shape="rounded"
          class="main-search-input"
        >
          <template #suffix>
            <button class="search-button" aria-label="搜索">
              <i class="fas fa-search" />
            </button>
          </template>
        </BaseInput>
      </div>
    </div>

    <div class="content-layout">
      <!-- Sidebar Filters -->
      <aside v-if="showFilters" class="sidebar-filters">
        <!-- Tags Section -->
        <div class="filter-group">
          <div class="filter-header">
            <label class="filter-label">标签</label>
            <button class="manage-btn" @click="emit('manageTags')">
              <i class="fas fa-pencil-alt" />
            </button>
          </div>

          <div v-if="tags.length === 0" class="sidebar-empty-state">
            <p class="empty-desc-text">添加网站并打上标签后，你可以在这里按标签快速筛选。</p>
            <div class="tag-list disabled">
              <span class="tag-pill example">示例：GitHub</span>
              <span class="tag-pill example">示例：云服务</span>
              <span class="tag-pill example">示例：AI</span>
            </div>
            <button class="create-first-btn" @click="emit('manageTags')">创建第一个标签</button>
          </div>

          <div v-else class="tag-list">
            <button
              v-for="tag in tags"
              :key="tag.id"
              class="tag-pill"
              :class="{ active: selectedTags.includes(tag.id) }"
              @click="toggleTag(tag.id)"
            >
              {{ tag.name }}
            </button>
          </div>
        </div>

        <!-- Categories Section -->
        <div class="filter-group">
          <div class="filter-header">
            <label class="filter-label">分类</label>
            <button class="manage-btn" @click="emit('manageCategories')">
              <i class="fas fa-pencil-alt" />
            </button>
          </div>

          <div v-if="categories.length === 0" class="sidebar-empty-state">
            <p class="empty-desc-text">
              为网站创建分类后，你可以在这里切换查看「云服务商」「在线工具」「博客论坛」等分组。
            </p>
            <div class="category-list">
              <button class="category-item active" @click="selectCategory('all')">
                <span class="category-name">全部 (0)</span>
              </button>
            </div>
            <div class="tag-list disabled">
              <span class="tag-pill example">示例：云服务商</span>
              <span class="tag-pill example">示例：在线工具</span>
              <span class="tag-pill example">示例：博客论坛</span>
            </div>
            <button class="create-first-btn" @click="emit('manageCategories')">
              创建第一个分类
            </button>
          </div>

          <div v-else class="category-list">
            <button
              class="category-item"
              :class="{ active: selectedCategory === 'all' }"
              @click="selectCategory('all')"
            >
              <span class="category-name">全部</span>
            </button>
            <button
              v-for="category in categories"
              :key="category.id"
              class="category-item"
              :class="{ active: selectedCategory === category.id }"
              @click="selectCategory(category.id)"
            >
              <span class="category-name">{{ category.name }}</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <!-- Selected Conditions Bar -->
        <div v-if="hasActiveFilters" class="selected-conditions-bar">
          <span class="conditions-label">已选条件:</span>
          <div class="selected-tags">
            <template v-if="selectedCategory !== 'all'">
              <div class="selected-pill category-pill">
                <span>分类: {{ getCategoryName(selectedCategory) }}</span>
                <button class="remove-btn" @click="selectCategory('all')">
                  <i class="fas fa-times" />
                </button>
              </div>
            </template>
            <template v-for="tagId in selectedTags" :key="tagId">
              <div class="selected-pill tag-pill">
                <span>标签: {{ getTagName(tagId) }}</span>
                <button class="remove-btn" @click="toggleTag(tagId)">
                  <i class="fas fa-times" />
                </button>
              </div>
            </template>
            <button v-if="hasActiveFilters" class="clear-all-btn" @click="clearAllFilters">
              清空
            </button>
          </div>
          <span v-if="!hasActiveFilters" class="no-filters-text">未选择筛选条件，显示全部网站</span>
        </div>

        <!-- Search Results -->
        <div v-if="searchKeyword && !hideSearch" class="search-results-section">
          <div class="results-header">
            <h3>搜索结果</h3>
            <BaseButton
              variant="neutral-outline"
              size="sm"
              shape="pill"
              class="action-btn"
              @click="clearSearch"
            >
              <i class="fas fa-times" />
              清空搜索
            </BaseButton>
          </div>
          <div v-if="searchResults.length > 0" class="website-grid">
            <WebsiteCard
              v-for="site in searchResults"
              :key="site.id"
              :website="site"
              @visit="onVisit"
              @edit="emit('edit', site)"
              @delete="emit('delete', site.id)"
              @toggle-favorite="onFavoriteToggle"
            />
          </div>
          <EmptyState
            v-else
            type="no-results"
            :message="`未找到与“${searchKeyword}”相关的结果`"
            :show-action-button="false"
          />
        </div>

        <!-- Filtered Grid -->
        <div v-else class="website-grid">
          <div
            v-for="site in filteredWebsites"
            :key="site.id"
            class="website-draggable"
            draggable="true"
            @dragstart="onDragStart(site.id, $event)"
            @dragover="onDragOver(site.id, $event)"
            @drop="onDrop(site.id, $event)"
            @dragend="onDragEnd"
          >
            <WebsiteCard
              :website="site"
              @visit="onVisit"
              @edit="emit('edit', site)"
              @delete="emit('delete', site.id)"
              @toggle-favorite="onFavoriteToggle"
            />
          </div>

          <div v-if="filteredWebsites.length > 0" class="add-card" @click="onAddSite">
            <div class="add-card-content">
              <div class="add-icon">
                <i class="fas fa-plus" />
              </div>
              <span>添加网站</span>
            </div>
          </div>
        </div>

        <EmptyState
          v-if="filteredWebsites.length === 0 && !searchKeyword"
          type="no-websites"
          message="暂时还没有网站"
          description="点击下方按钮，添加你的第一个网站。之后你可以在「全部」中按标签、分类和关键字进行筛选和搜索。"
          hint="小提示：建议为常用网站设置分类和标签，后续管理和查找会更轻松。"
          :show-action-button="true"
          size="small"
        >
          <template #action>
            <BaseButton variant="primary" size="md" shape="pill" @click="onAddSite">
              <i class="fas fa-plus" />
              添加第一个网站
            </BaseButton>
          </template>
        </EmptyState>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @component SearchSection
 * @description 网站搜索与过滤主组件
 * 包含搜索框、标签筛选、分类筛选以及网站列表展示
 * 集成了搜索逻辑、拖拽排序等功能
 *
 * @props fixedView - 固定视图模式 ('recent' | 'favorite' | 'all')
 * @props hideSearch - 是否隐藏搜索框
 *
 * @emits edit - 编辑网站
 * @emits delete - 删除网站
 * @emits addSite - 添加新网站
 * @emits manageTags - 打开标签管理
 * @emits manageCategories - 打开分类管理
 */
import { ref, computed } from 'vue'
import WebsiteCard from '@/components/WebsiteCard.vue'
import { EmptyState, BaseInput, BaseButton } from '@nav/ui'
import { useWebsiteStore } from '@/stores/website'
import { useWebsiteSearch } from '@/composables/useWebsiteSearch'
import { useWebsiteDrag } from '@/composables/useWebsiteDrag'
import type { Website } from '@/types'

interface Props {
  fixedView?: 'recent' | 'favorite' | 'all'
  hideSearch?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hideSearch: false
})

const emit = defineEmits(['edit', 'delete', 'addSite', 'manageTags', 'manageCategories'])

const websiteStore = useWebsiteStore()

// 使用组合式函数
const {
  searchKeyword,
  selectedTags,
  selectedCategory,
  showFilters,
  tags,
  categories,
  filteredWebsites,
  searchResults,
  toggleTag,
  selectCategory,
  clearSearch,
  clearSelectedTags
} = useWebsiteSearch(() => props.fixedView)

const { onDragStart, onDragOver, onDrop, onDragEnd } = useWebsiteDrag(() => props.fixedView)

const searchInput = ref<HTMLInputElement | null>(null)

const hasActiveFilters = computed(() => {
  return selectedTags.value.length > 0 || selectedCategory.value !== 'all'
})

const getCategoryName = (id: string) => {
  const cat = categories.value.find(c => c.id === id)
  return cat ? cat.name : id
}

const getTagName = (id: string) => {
  const tag = tags.value.find(t => t.id === id)
  return tag ? tag.name : id
}

const clearAllFilters = () => {
  selectCategory('all')
  clearSelectedTags()
}

const onAddSite = () => {
  const contextCategoryId = selectedCategory.value !== 'all' ? selectedCategory.value : ''
  emit('addSite', contextCategoryId)
}

const onVisit = (website: Website) => {
  websiteStore.incrementVisitCount(website.id)
  window.open(website.url, '_blank', 'noopener,noreferrer')
}

const onFavoriteToggle = (id: string) => {
  const w = websiteStore.websites.find(x => x.id === id)
  if (!w) return
  websiteStore.updateWebsite(id, { isFavorite: !w.isFavorite })
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.search-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.search-header {
  margin-bottom: 0.5rem;
}

.search-container {
  max-width: 800px;
  margin: 0 auto;
}

:deep(.main-search-input .base-input__wrapper) {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-tile);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border-radius: 999px;
  padding-left: 1rem;
  transition:
    background-color 0.3s ease,
    box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
  }

  &.base-input__wrapper--focused {
    box-shadow: 0 8px 30px rgba(37, 99, 235, 0.15);
    border-color: var(--color-primary);
  }
}

:global([data-theme='dark']) :deep(.main-search-input .base-input__wrapper) {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);

  &.base-input__wrapper--focused {
    box-shadow: 0 8px 30px rgba(37, 99, 235, 0.25);
  }
}

.search-button {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  transition: color 0.2s;
  padding: 0 8px;
  display: flex;
  align-items: center;

  &:hover {
    color: var(--color-primary);
  }
}

.content-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

/* Sidebar Styles */
.sidebar-filters {
  width: 260px;
  flex-shrink: 0;
  background-color: var(--bg-panel);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: sticky;
  top: 80px; // Header (64px) + gap (16px)
  max-height: calc(100vh - 80px - 1rem);
  overflow: hidden auto;
  z-index: 90;

  // 优化的滚动条样式 - 只在需要时显示
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  // 悬停时显示滚动条
  &:hover {
    scrollbar-color: rgba(0, 0, 0, 0.08) transparent;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-radius: 10px;
    transition: background-color 0.2s ease;
  }

  // 悬停时显示滚动条
  &:hover::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.08);

    &:hover {
      background-color: rgba(0, 0, 0, 0.15);
    }

    &:active {
      background-color: rgba(0, 0, 0, 0.2);
    }
  }
}

// 暗色主题侧边栏滚动条
:global([data-theme='dark']) .sidebar-filters {
  scrollbar-color: transparent transparent;

  &:hover {
    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: transparent;
  }

  &:hover::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.1);

    &:hover {
      background-color: rgba(255, 255, 255, 0.18);
    }

    &:active {
      background-color: rgba(255, 255, 255, 0.25);
    }
  }
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.manage-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    color: var(--color-primary);
    background-color: var(--bg-tile-hover);
  }
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-pill {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid var(--border-tile);
  background-color: var(--bg-tile);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  &.active {
    background-color: rgba(37, 99, 235, 0.1);
    color: var(--color-primary);
    border-color: var(--color-primary);
  }
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  font-size: 14px;
  font-weight: 500;

  &:hover {
    background-color: var(--bg-tile);
    color: var(--text-main);
  }

  &.active {
    background-color: var(--color-primary);
    color: var(--color-white);
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
  }
}

.sidebar-empty-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 4px;
}

.empty-desc-text {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0;
}

.tag-list.disabled {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 2px;
}

.tag-pill.example {
  background-color: var(--bg-body);
  border: 1px solid var(--border-tile);
  color: var(--text-muted);
  cursor: default;
  opacity: 0.6;
  padding: 4px 12px;
  font-size: 12px;

  &:hover {
    border-color: var(--border-tile);
    color: var(--text-muted);
  }
}

.category-item.example {
  cursor: default;
  opacity: 0.5;
  padding: 8px 10px;
  font-size: 13px;

  &:hover {
    background-color: transparent;
    color: var(--text-secondary);
  }

  .category-name {
    font-weight: 400;
  }
}

.create-first-btn {
  margin-top: 4px;
  padding: 6px 16px;
  border: 1px dashed var(--border-tile);
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  width: fit-content;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background-color: rgba(37, 99, 235, 0.05);
  }
}

/* Main Content Styles */
.main-content {
  flex: 1;
  min-width: 0;
}

.selected-conditions-bar {
  background-color: var(--bg-panel);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.5rem;
  min-height: 52px;
}

.conditions-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.selected-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;

  &.category-pill {
    background-color: rgba(37, 99, 235, 0.1);
    color: var(--color-primary);
  }

  &.tag-pill {
    background-color: rgba(16, 185, 129, 0.1);
    color: var(--color-success);
  }
}

.remove-btn {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  display: flex;
  align-items: center;

  &:hover {
    opacity: 1;
  }
}

.clear-all-btn {
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;

  &:hover {
    text-decoration: underline;
  }
}

.no-filters-text {
  color: var(--text-muted);
  font-size: 13px;
}

.search-results-section {
  margin-top: 1.5rem;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-main);
  }
}

.website-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.website-draggable {
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.add-card {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 160px;
  background-color: var(--bg-panel);
  border: 1px dashed var(--border-tile);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-primary);
    background-color: rgba(37, 99, 235, 0.02);

    .add-icon {
      background-color: var(--color-primary);
      color: var(--color-white);
      transform: scale(1.1);
    }

    span {
      color: var(--color-primary);
    }
  }

  .add-card-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .add-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: var(--bg-tile);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    transition: all 0.2s;
    font-size: 20px;
  }

  span {
    font-size: 15px;
    color: var(--text-secondary);
    font-weight: 500;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .content-layout {
    flex-direction: column;
  }

  .sidebar-filters {
    width: 100%;
    position: static;
  }

  .website-grid {
    grid-template-columns: 1fr;
  }
}
</style>
