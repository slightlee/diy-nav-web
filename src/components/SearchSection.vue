<template>
  <div class="search-section">
    <div class="search-container">
      <input
        ref="searchInput"
        v-model="searchKeyword"
        type="text"
        placeholder="根据网站名称、标签、描述搜索"
        class="search-input"
      />
      <button class="search-button">
        <i class="fas fa-search" />
      </button>
    </div>

    <div class="tag-filter-section">
      <div class="filter-header">
        <label class="filter-label">标签</label>
        <div class="filter-actions">
          <button v-if="selectedTags.length" class="clear-tags-btn" @click="clearSelectedTags">
            <i class="fas fa-times" />
            清空标签
          </button>
          <button class="manage-tags-btn" @click="emit('manageTags')">
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

    <div class="category-section">
      <div class="filter-header">
        <label class="filter-label">分类</label>
        <button class="manage-categories-btn" @click="emit('manageCategories')">
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
          :highlight="searchKeyword"
          @edit="emit('edit', $event)"
          @delete="emit('delete', $event)"
          @visit="onVisit"
        />
      </div>
    </div>

    <div v-else class="website-list-section">
      <div class="list-toolbar">
        <div class="density-segment">
          <button
            class="density-btn"
            :class="{ active: currentDensity === 'compact' }"
            type="button"
            @click="setDensity('compact')"
          >
            紧凑
          </button>
          <button
            class="density-btn"
            :class="{ active: currentDensity === 'default' }"
            type="button"
            @click="setDensity('default')"
          >
            默认
          </button>
          <button
            class="density-btn"
            :class="{ active: currentDensity === 'loose' }"
            type="button"
            @click="setDensity('loose')"
          >
            宽松
          </button>
        </div>
      </div>
      <div class="website-grid">
        <div
          v-for="website in filteredWebsites"
          :key="website.id"
          class="website-draggable"
          :class="[{ 'is-drag-over': draggingId && draggingId !== website.id && dragOverId === website.id }]"
          :data-id="website.id"
          @dragover.prevent="onDragOver(website.id, $event)"
          @drop.prevent="onDrop(website.id, $event)"
        >
          <WebsiteCard
            :website="website"
            :highlight="searchKeyword"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
            @visit="onVisit"
            @drag-handle-start="onDragStart(website.id, $event)"
            @drag-handle-end="onDragEnd"
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import WebsiteCard from '@/components/WebsiteCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useSettingsStore } from '@/stores/settings'
import type { Website } from '@/types'

const emit = defineEmits(['edit', 'delete', 'addSite', 'manageTags', 'manageCategories'])

const websiteStore = useWebsiteStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()
const settingsStore = useSettingsStore()

const searchKeyword = ref('')
const selectedTags = ref<string[]>([])
const selectedCategory = ref('all')
const currentDensity = computed(() => settingsStore.settings.density || 'default')
const setDensity = (d: 'default' | 'compact' | 'loose') => settingsStore.setDensity(d)

const filteredWebsites = computed(() => {
  let websites = websiteStore.websites
  if (selectedCategory.value !== 'all') {
    websites = websites.filter(w => w.categoryId === selectedCategory.value)
  }
  if (selectedTags.value.length > 0) {
    websites = websites.filter(w => selectedTags.value.some(tagId => w.tagIds.includes(tagId)))
  }
  return websites
})

const searchResults = computed(() => {
  if (!searchKeyword.value.trim()) return [] as Website[]
  const keyword = searchKeyword.value.toLowerCase()
  return websiteStore.websites.filter(website =>
    website.name.toLowerCase().includes(keyword) ||
    website.url.toLowerCase().includes(keyword) ||
    website.description?.toLowerCase().includes(keyword) ||
    getWebsiteTags(website.tagIds).some(tag => tag.name.toLowerCase().includes(keyword))
  )
})

const tags = computed(() => tagStore.tags)
const categories = computed(() => [...categoryStore.categories].sort((a, b) => a.order - b.order))

const getWebsiteTags = (tagIds: string[]) => {
  return tagIds.map(id => tagStore.getTagById(id)).filter((tag): tag is any => !!tag)
}

const toggleTag = (tagId: string) => {
  const index = selectedTags.value.indexOf(tagId)
  if (index > -1) selectedTags.value.splice(index, 1)
  else selectedTags.value.push(tagId)
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

const onAddSite = () => {
  const contextCategoryId = selectedCategory.value !== 'all' ? selectedCategory.value : ''
  emit('addSite', contextCategoryId)
}

const onVisit = (website: Website) => {
  websiteStore.incrementVisitCount(website.id)
  window.open(website.url, '_blank', 'noopener,noreferrer')
}

const searchInput = ref<HTMLInputElement | null>(null)

const handleGlobalKeydown = (e: KeyboardEvent) => {
  const isMac = navigator.platform.toLowerCase().includes('mac')
  const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey
  if (cmdOrCtrl && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    searchInput.value?.focus()
  } else if (e.key === 'Escape') {
    if (document.activeElement === searchInput.value) {
      ;(document.activeElement as HTMLElement)?.blur()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

const draggingId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)
const onDragStart = (id: string, e: DragEvent) => {
  draggingId.value = id
  e.dataTransfer?.setData('text/plain', id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  const target = e.target as HTMLElement | null
  const card = target?.closest('.website-draggable') as HTMLElement | null
  if (card && e.dataTransfer) {
    const rect = card.getBoundingClientRect()
    e.dataTransfer.setDragImage(card, rect.width / 2, rect.height / 2)
  }
}
const onDragOver = (targetId: string, e: DragEvent) => {
  if (!draggingId.value || draggingId.value === targetId) return
  e.preventDefault()
  dragOverId.value = targetId
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}
const onDrop = (targetId: string, e: DragEvent) => {
  e.preventDefault()
  const sourceId = draggingId.value
  draggingId.value = null
  dragOverId.value = null
  if (!sourceId || sourceId === targetId) return
  websiteStore.moveWebsiteBefore(sourceId, targetId)
}
const onDragEnd = () => {
  draggingId.value = null
  dragOverId.value = null
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

.search-input {
  width: 100%;
  padding: 0.75rem 2.75rem 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 1rem;
  background-color: var(--color-neutral-100);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease-in-out;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.12), 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  &::placeholder {
    color: var(--color-neutral-400);
  }
}

.search-button {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-neutral-400);
  font-size: 1.125rem;
  cursor: pointer;
  transition: color 0.2s;

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
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-neutral-700);
}

.manage-tags-btn,
.manage-categories-btn,
.clear-tags-btn {
  font-size: var(--font-size-xs);
  color: var(--color-neutral-500);
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: var(--color-primary);
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

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  padding: 5px 10px;
  border-radius: 9999px;
  font-size: var(--font-size-sm);
  border: 1px solid var(--color-neutral-200);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;
  background-color: var(--color-neutral-100);
  color: var(--color-neutral-700);

  &:hover {
    transform: scale(1.02);
  }

  &.active {
    color: var(--color-white);
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

.category-section {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category-tag {
  padding: 5px 10px;
  border-radius: 9999px;
  font-size: var(--font-size-sm);
  background-color: var(--color-neutral-100);
  color: var(--color-neutral-700);
  border: 1px solid var(--color-neutral-200);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;

  &:hover {
    background-color: var(--color-neutral-200);
  }

  &.active {
    background-color: var(--color-primary);
    color: var(--color-white);
  }

  .dot {
    margin-left: 3px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: var(--color-neutral-300);

    .active & {
      background-color: white;
    }
  }
}

.website-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: clamp(var(--spacing-sm), 2vw, var(--spacing-xl));
  margin-bottom: 1.5rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: clamp(var(--spacing-sm), 2vw, var(--spacing-xl));
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: clamp(var(--spacing-sm), 2vw, var(--spacing-xl));
  }
}

.website-draggable {
  display: block;
}

.website-draggable.is-drag-over {
  outline: 2px dashed var(--color-primary);
  border-radius: var(--radius-lg);
}

.add-card {
  background-color: var(--color-neutral-100);
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;

  &:hover {
    border-color: var(--color-primary);
    background-color: rgba(var(--color-primary-rgb), 0.06);
  }
}

.add-card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-neutral-600);
}

.add-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--color-neutral-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
}

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
    color: var(--color-neutral-800);
    margin: 0;
  }
}

.clear-search-btn {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color 0.2s;

  &:hover {
    color: var(--color-neutral-700);
  }

  i {
    margin-right: 4px;
  }
}

@media (max-width: 768px) {
  .search-section {
    margin-bottom: 1.5rem;
  }

  .website-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--spacing-lg);
  }
}

@media (max-width: 480px) {
  .website-grid {
    grid-template-columns: 1fr;
  }
}

.list-toolbar {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 0.5rem;
}

.density-segment {
  display: inline-flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background-color: var(--color-neutral-100);
  overflow: hidden;
}

.density-btn {
  padding: 0.35rem 0.7rem;
  font-size: var(--font-size-sm);
  color: var(--color-neutral-700);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.density-btn:hover {
  background-color: var(--color-neutral-200);
}

.density-btn:focus {
  outline: none;
}

.density-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.density-btn.active {
  color: var(--color-primary);
  background-color: rgba(var(--color-primary-rgb), 0.10);
}

.density-btn + .density-btn {
  border-left: 1px solid var(--color-border);
}
</style>
