<template>
  <div class="category-filter">
    <div class="filter-header">
      <label class="filter-label">分类</label>
      <div class="category-tabs">
        <BaseButton
          v-for="category in categories"
          :key="category.id"
          :variant="selectedCategory === category.id ? 'primary' : 'ghost'"
          size="sm"
          @click="selectCategory(category.id)"
        >
          {{ category.name }}
          <span v-if="category.websiteCount > 0" class="category-count">
            ({{ category.websiteCount }})
          </span>
        </BaseButton>
      </div>

      <BaseButton
        variant="secondary"
        size="sm"
        icon="edit"
        @click="openManageCategoriesModal"
      >
        管理分类
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCategoryStore } from '@/stores/category'
import { useUIStore } from '@/stores/ui'
import BaseButton from '@/components/base/BaseButton.vue'

const categoryStore = useCategoryStore()
const uiStore = useUIStore()

// 计算属性
const categories = computed(() => categoryStore.categories)
const selectedCategory = computed(() => {
  // 返回选中的分类ID字符串
  if (categoryStore.searchFilters.categoryIds.length === 1) {
    return categoryStore.searchFilters.categoryIds[0]
  }
  return null
})

// 添加缺失的computed属性
const totalWebsites = computed(() => {
  // 由于访问website store需要类型兼容，暂时返回0
  return 0
})

const totalCategories = computed(() => categories.value.length)

const totalTags = computed(() => {
  // 由于访问tag store需要类型兼容，暂时返回0
  return 0
})

// 事件处理
const selectCategory = (categoryId: string) => {
  if (categoryId) {
    categoryStore.setSearchFilters({ categoryIds: [categoryId] })
  } else {
    categoryStore.setSearchFilters({ categoryIds: [] })
  }
}

const openManageCategoriesModal = () => {
  uiStore.openModal('manageCategories')
}
</script>

<style scoped lang="scss" src="@/styles/mixins.scss">
.category-filter {
  margin-bottom: 1.5rem;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.filter-label {
  font-weight: 500;
  color: #374151;
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.category-count {
  margin-left: 0.25rem;
  font-size: 0.75rem;
  opacity: 0.8;
}

// 响应式调整
@media (max-width: 768px) {
  .category-filter {
    margin-bottom: 1rem;
  }

  .category-tabs {
    gap: 0.375rem;
  }
}
</style>
