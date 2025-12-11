<template>
  <div class="selected-conditions-bar">
    <span class="conditions-label">已选条件:</span>
    <div class="selected-tags">
      <template v-if="selectedCategory !== 'all'">
        <div class="selected-pill category-pill">
          <span>分类: {{ getCategoryName(selectedCategory) }}</span>
          <button class="remove-btn" @click="$emit('selectCategory', 'all')">
            <i class="fas fa-times" />
          </button>
        </div>
      </template>
      <template v-for="tagId in selectedTags" :key="tagId">
        <div class="selected-pill tag-pill">
          <span>标签: {{ getTagName(tagId) }}</span>
          <button class="remove-btn" @click="$emit('toggleTag', tagId)">
            <i class="fas fa-times" />
          </button>
        </div>
      </template>
      <button v-if="hasActiveFilters" class="clear-all-btn" @click="$emit('clearAll')">清空</button>
    </div>
    <span v-if="!hasActiveFilters" class="no-filters-text">未选择筛选条件，显示全部网站</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Tag, Category } from '@/types'

const props = defineProps<{
  selectedTags: string[]
  selectedCategory: string
  tags: readonly Tag[]
  categories: readonly Category[]
}>()

defineEmits<{
  (e: 'toggleTag', id: string): void
  (e: 'selectCategory', id: string): void
  (e: 'clearAll'): void
}>()

const hasActiveFilters = computed(() => {
  return props.selectedTags.length > 0 || props.selectedCategory !== 'all'
})

const getCategoryName = (id: string) => {
  const cat = props.categories.find(c => c.id === id)
  return cat ? cat.name : id
}

const getTagName = (id: string) => {
  const tag = props.tags.find(t => t.id === id)
  return tag ? tag.name : id
}
</script>

<style scoped lang="scss">
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
  min-height: 0;
  min-width: 0;
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
  min-height: 0;
  min-width: 0;
  padding: 4px 8px;

  &:hover {
    text-decoration: underline;
  }
}

.no-filters-text {
  color: var(--text-muted);
  font-size: 13px;
}
</style>
