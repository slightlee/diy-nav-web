<template>
  <div class="selected-conditions-bar">
    <span class="conditions-label">已选条件:</span>
    <div class="selected-tags">
      <template v-if="selectedCategory !== 'all'">
        <div class="selected-pill category-pill">
          <span>分类: {{ getCategoryName(selectedCategory) }}</span>
          <button
            class="remove-btn"
            type="button"
            :aria-label="`移除分类筛选 ${getCategoryName(selectedCategory)}`"
            @click="$emit('selectCategory', 'all')"
          >
            <i class="fas fa-times" />
          </button>
        </div>
      </template>
      <template v-for="tagId in selectedTags" :key="tagId">
        <div class="selected-pill tag-pill">
          <span>标签: {{ getTagName(tagId) }}</span>
          <button
            class="remove-btn"
            type="button"
            :aria-label="`移除标签筛选 ${getTagName(tagId)}`"
            @click="$emit('toggleTag', tagId)"
          >
            <i class="fas fa-times" />
          </button>
        </div>
      </template>
      <BaseButton v-if="hasActiveFilters" variant="ghost" size="xs" @click="$emit('clearAll')">
        清空
      </BaseButton>
    </div>
    <span v-if="!hasActiveFilters" class="no-filters-text">未选择筛选条件，显示全部网站</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BaseButton } from '@nav/ui'
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
  return cat ? cat.name : '分类已失效'
}

const getTagName = (id: string) => {
  const tag = props.tags.find(t => t.id === id)
  return tag ? tag.name : '标签已失效'
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
    background-color: var(--primary-soft);
    color: var(--color-primary);
  }

  &.tag-pill {
    background-color: rgba(16, 185, 129, 0.1);
    color: var(--color-success);
  }
}

.remove-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  &:hover {
    opacity: 1;
    background: color-mix(in srgb, currentcolor 8%, transparent);
  }

  &:focus-visible {
    outline: 2px solid currentcolor;
    outline-offset: 1px;
  }
}

.no-filters-text {
  color: var(--text-muted);
  font-size: 13px;
}
</style>
