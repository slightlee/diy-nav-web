<template>
  <aside class="sidebar-filters">
    <!-- Tags Section -->
    <div class="filter-group">
      <div class="filter-header">
        <label class="filter-label">标签</label>
        <button class="manage-btn" @click="$emit('manageTags')">
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
        <button class="create-first-btn" @click="$emit('manageTags')">创建第一个标签</button>
      </div>

      <div v-else class="tag-list">
        <button
          v-for="tag in tags"
          :key="tag.id"
          class="tag-pill"
          :class="{ active: selectedTags.includes(tag.id) }"
          @click="$emit('toggleTag', tag.id)"
        >
          {{ tag.name }}
        </button>
      </div>
    </div>

    <!-- Categories Section -->
    <div class="filter-group">
      <div class="filter-header">
        <label class="filter-label">分类</label>
        <button class="manage-btn" @click="$emit('manageCategories')">
          <i class="fas fa-pencil-alt" />
        </button>
      </div>

      <div v-if="categories.length === 0" class="sidebar-empty-state">
        <p class="empty-desc-text">
          为网站创建分类后，你可以在这里切换查看「云服务商」「在线工具」「博客论坛」等分组。
        </p>
        <div class="category-list">
          <button class="category-item active" @click="$emit('selectCategory', 'all')">
            <span class="category-name">全部 (0)</span>
          </button>
        </div>
        <div class="tag-list disabled">
          <span class="tag-pill example">示例：云服务商</span>
          <span class="tag-pill example">示例：在线工具</span>
          <span class="tag-pill example">示例：博客论坛</span>
        </div>
        <button class="create-first-btn" @click="$emit('manageCategories')">创建第一个分类</button>
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

.manage-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
  padding: 4px;
  min-height: 0;
  min-width: 0;
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
  min-height: 0;
  min-width: 0;
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
  min-height: 0;
  min-width: 0;
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
</style>
