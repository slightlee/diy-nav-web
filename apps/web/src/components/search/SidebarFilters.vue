<template>
  <aside class="sidebar-filters">
    <!-- Tags Section -->
    <div class="filter-group">
      <div class="filter-header">
        <label class="filter-label">标签</label>
        <BaseButton
          variant="neutral-ghost"
          size="xs"
          icon="fas fa-pencil-alt"
          title="管理标签"
          aria-label="管理标签"
          @click="$emit('manageTags')"
        />
      </div>

      <div v-if="tags.length === 0" class="sidebar-empty-state">
        <p class="empty-desc-text">添加网站后，可用标签快速筛选。</p>
        <BaseButton
          class="create-first-btn"
          variant="neutral-ghost"
          size="xs"
          icon="fas fa-plus"
          @click="$emit('manageTags')"
        >
          创建第一个标签
        </BaseButton>
      </div>

      <div v-else class="tag-list">
        <ChoiceChip
          v-for="tag in tags"
          :key="tag.id"
          :label="tag.name"
          :color="tag.color"
          :active="selectedTags.includes(tag.id)"
          :aria-label="`筛选标签：${tag.name}`"
          @click="$emit('toggleTag', tag.id)"
        />
      </div>
    </div>

    <!-- Categories Section -->
    <div class="filter-group">
      <div class="filter-header">
        <label class="filter-label">分类</label>
        <BaseButton
          variant="ghost"
          size="xs"
          icon="fas fa-pencil-alt"
          title="管理分类"
          aria-label="管理分类"
          @click="$emit('manageCategories')"
        />
      </div>

      <div v-if="categories.length === 0" class="sidebar-empty-state">
        <p class="empty-desc-text">创建分类后，可在这里切换查看不同分组。</p>
        <div class="category-list">
          <button class="category-item active" @click="$emit('selectCategory', 'all')">
            <span class="category-name">全部 (0)</span>
          </button>
        </div>
        <BaseButton
          class="create-first-btn"
          variant="ghost"
          size="xs"
          icon="fas fa-plus"
          @click="$emit('manageCategories')"
        >
          创建第一个分类
        </BaseButton>
      </div>

      <div v-else class="category-list">
        <button
          class="category-item"
          :class="{ active: selectedCategory === 'all' }"
          @click="$emit('selectCategory', 'all')"
        >
          <span class="category-name">全部</span>
        </button>
        <button
          v-for="category in categories"
          :key="category.id"
          class="category-item"
          :class="{ active: selectedCategory === category.id }"
          @click="$emit('selectCategory', category.id)"
        >
          <span class="category-name">{{ category.name }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { BaseButton } from '@nav/ui'
import ChoiceChip from '@/components/ChoiceChip.vue'
import type { Tag, Category } from '@/types'

defineProps<{
  tags: readonly Tag[]
  categories: readonly Category[]
  selectedTags: string[]
  selectedCategory: string
}>()

defineEmits<{
  (e: 'toggleTag', id: string): void
  (e: 'selectCategory', id: string): void
  (e: 'manageTags'): void
  (e: 'manageCategories'): void
}>()
</script>

<style scoped lang="scss">
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

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
  min-height: 0;
  min-width: 0;
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
    background-color: var(--primary-soft);
    color: var(--color-primary-dark);
    font-weight: 650;
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--color-primary-rgb), 0.4);
    outline-offset: 2px;
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

.create-first-btn {
  margin-top: 4px;
  width: fit-content;
}
</style>
