<template>
  <div class="search-section">
    <!-- Search Header -->
    <div v-if="!hideSearch" class="search-header-wrapper">
      <SearchHeader v-model="searchKeyword" />
    </div>

    <div class="content-layout">
      <!-- Sidebar Filters -->
      <SidebarFilters
        v-if="showFilters"
        :tags="tags"
        :categories="categories"
        :selected-tags="selectedTags"
        :selected-category="selectedCategory"
        @toggle-tag="toggleTag"
        @select-category="selectCategory"
        @manage-tags="emit('manageTags')"
        @manage-categories="emit('manageCategories')"
      />

      <!-- Main Content -->
      <main class="main-content">
        <!-- Selected Conditions Bar -->
        <ActiveFiltersBar
          v-if="hasActiveFilters"
          :selected-tags="selectedTags"
          :selected-category="selectedCategory"
          :tags="tags"
          :categories="categories"
          @toggle-tag="toggleTag"
          @select-category="selectCategory"
          @clear-all="clearAllFilters"
        />

        <!-- Search Results -->
        <div v-if="searchKeyword && !hideSearch" class="search-results-section">
          <div class="results-header">
            <h3>搜索结果</h3>
            <BaseButton
              variant="ghost"
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
import { computed } from 'vue'
import WebsiteCard from '@/components/WebsiteCard.vue'
import { EmptyState, BaseButton } from '@nav/ui'
import { useWebsiteStore } from '@/stores/website'
import { useWebsiteSearch } from '@/composables/useWebsiteSearch'
import { useWebsiteDrag } from '@/composables/useWebsiteDrag'
import type { Website } from '@/types'

// Sub-components
import SearchHeader from './search/SearchHeader.vue'
import SidebarFilters from './search/SidebarFilters.vue'
import ActiveFiltersBar from './search/ActiveFiltersBar.vue'

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

const hasActiveFilters = computed(() => {
  return selectedTags.value.length > 0 || selectedCategory.value !== 'all'
})

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

.search-header-wrapper {
  margin-bottom: 0.5rem;
}

.content-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

/* Main Content Styles */
.main-content {
  flex: 1;
  min-width: 0;
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
  min-width: 0; /* Critical for grid/flex overflow */
  width: 100%;

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
}

.add-card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  span {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    transition: color 0.2s;
  }
}

.add-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--bg-body);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: all 0.2s;
}

@include mobile {
  .search-section {
    gap: 1rem;
  }

  .content-layout {
    flex-direction: column;
    gap: 1rem;
  }

  /* Sidebar becomes a horizontal scrollable bar on mobile */
  :deep(.sidebar-filters) {
    width: 100%;
    position: static;
    max-height: none;
    padding: 0;
    background: transparent;
    gap: 1rem;
    overflow: visible;
  }

  :deep(.filter-group) {
    background-color: var(--bg-panel);
    padding: 1rem;
    border-radius: 12px;
  }

  :deep(.tag-list),
  :deep(.category-list) {
    flex-flow: row nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
    align-items: center; /* Prevent items from stretching vertically */

    /* Hide scrollbar */
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }

  :deep(.tag-pill) {
    white-space: nowrap;
    flex-shrink: 0;
  }

  :deep(.category-item) {
    white-space: nowrap;
    flex-shrink: 0;
    background-color: var(--bg-tile);
    border: 1px solid var(--border-tile);
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 12px;

    &.active {
      background-color: rgba(37, 99, 235, 0.1);
      color: var(--color-primary);
      border-color: var(--color-primary);
      box-shadow: none;
    }
  }

  .website-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .add-card {
    min-height: 120px;
    flex-direction: row;
    gap: 1rem;

    .add-icon {
      width: 48px;
      height: 48px;
      font-size: 20px;
    }

    span {
      font-size: 14px;
    }
  }
}
</style>
```
