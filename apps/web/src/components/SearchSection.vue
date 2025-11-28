<template>
  <div class="search-section">
    <div v-if="!hideSearch" class="search-container">
      <BaseInput
        ref="searchInput"
        v-model="searchKeyword"
        placeholder="根据网站名称、标签、描述搜索"
        size="lg"
        shape="rounded"
      >
        <template #suffix>
          <button class="search-button" aria-label="搜索">
            <i class="fas fa-search" />
          </button>
        </template>
      </BaseInput>
    </div>

    <div v-if="showFilters" class="tag-filter-section">
      <div class="filter-header">
        <label class="filter-label">标签</label>
        <div class="filter-actions">
          <BaseButton
            v-if="selectedTags.length"
            variant="neutral-outline"
            size="sm"
            shape="pill"
            class="action-btn"
            @click="clearSelectedTags"
          >
            <i class="fas fa-times" />
            清空标签
          </BaseButton>
          <BaseButton
            variant="neutral-outline"
            size="sm"
            shape="pill"
            class="action-btn"
            @click="emit('manageTags')"
          >
            <i class="fas fa-edit" />
            管理标签
          </BaseButton>
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

    <div v-if="showFilters" class="category-section">
      <div class="filter-header">
        <label class="filter-label">分类</label>
        <BaseButton
          variant="neutral-outline"
          size="sm"
          shape="pill"
          class="action-btn"
          @click="emit('manageCategories')"
        >
          <i class="fas fa-edit" />
          管理分类
        </BaseButton>
      </div>
      <div class="category-list">
        <button
          class="category-tag"
          :class="[{ active: selectedCategory === 'all' }]"
          @click="selectCategory('all')"
        >
          全部
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
      :show-action-button="true"
      @action="onAddSite"
    />
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
import { ref } from 'vue'
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

.search-section {
  margin-bottom: 1.25rem;
}

.search-container {
  position: relative;
  margin-bottom: 1rem;
}

.search-button {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: var(--font-size-lg);
  cursor: pointer;
  transition: color 0.2s;
  padding: 0;
  display: flex;
  align-items: center;

  &:hover {
    color: var(--color-primary);
  }
}

.tag-filter-section {
  margin-top: 0.75rem;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.filter-label {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text-main);
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  padding: 5px 10px;
  border-radius: 9999px;
  font-size: var(--font-size-sm);
  border: 1px solid var(--border-tile);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;
  background-color: var(--bg-tile);
  color: var(--text-secondary);

  &:hover {
    transform: scale(1.02);
    background-color: var(--bg-tile-hover);
  }

  &.active {
    color: var(--color-white);
    border-color: transparent;
  }

  .tag-remove-icon {
    margin-left: 3px;
    font-size: var(--font-size-xs);
    opacity: 0.7;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }
}

.category-section {
  margin-top: 1rem;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-tag {
  position: relative;
  padding: 6px 12px;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: var(--font-weight-medium);

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 0;
    height: 2px;
    background-color: var(--color-primary);
    transition: all 0.2s ease-in-out;
    transform: translateX(-50%);
  }

  &:hover {
    color: var(--color-primary);
  }

  &.active {
    color: var(--color-primary);
    font-weight: var(--font-weight-bold);

    &::after {
      width: 80%;
    }
  }

  .dot {
    display: none; // hidden for now, can be enabled if needed
  }
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
  gap: 1rem;
  margin-top: 1rem;
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
  height: 100px;
  background-color: var(--bg-tile);
  border: 1px dashed var(--border-tile);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-primary);
    background-color: var(--bg-tile-hover);

    .add-icon {
      background-color: var(--color-primary);
      color: var(--color-white);
    }

    span {
      color: var(--color-primary);
    }
  }

  .add-card-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .add-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--bg-body);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    transition: all 0.2s;
  }

  span {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    font-weight: var(--font-weight-medium);
  }
}
</style>
