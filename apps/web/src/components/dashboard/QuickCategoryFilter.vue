<template>
  <section class="bottom-card">
    <div class="bottom-card__header"><h3 class="bottom-card__title">分类快捷筛选</h3></div>
    <div class="filter-group">
      <button
        v-for="c in categoryPopular"
        :key="c.id"
        class="filter-tag"
        type="button"
        :aria-label="`筛选分类：${c.name}`"
        :title="c.name"
        @click="goToAllWithCategory(c.id)"
        @keydown.enter="goToAllWithCategory(c.id)"
      >
        <span class="tag-name">{{ c.name }}</span>
        <span class="tag-count">{{ categoryCountMap[c.id] || 0 }}</span>
      </button>
      <button
        v-if="hasMoreCategories"
        class="filter-tag chip-more"
        type="button"
        aria-label="更多分类"
        title="更多"
        @click="emit('openMore')"
      >
        <i class="fas fa-chevron-right" />
        <span class="tag-name">更多</span>
      </button>
      <div v-if="categoryPopular.length === 0" class="recent-empty">暂无分类</div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * @component QuickCategoryFilter
 * @description 快捷分类筛选组件
 * 展示热门分类列表，点击可跳转至全部分类页并自动选中对应分类
 *
 * @emits openMore - 点击"更多"按钮时触发
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCategoryStore } from '@/stores/category'
import { useWebsiteStats } from '@/composables/useWebsiteStats'

const emit = defineEmits<{
  (e: 'openMore'): void
}>()

const router = useRouter()
const categoryStore = useCategoryStore()
const { categoryCountMap } = useWebsiteStats()

const POPULAR_LIMIT = 10
const categoryPopular = computed(() =>
  [...categoryStore.categories]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, POPULAR_LIMIT)
)
const hasMoreCategories = computed(() => categoryStore.categories.length > POPULAR_LIMIT)

const goToAllWithCategory = (categoryId: string) =>
  router.push({ path: '/all', query: { category: categoryId } })
</script>

<style scoped lang="scss">
.bottom-card {
  border: 1px solid var(--border-tile);
  border-radius: 18px;
  background: var(--bg-panel);
  padding: 18px 18px 16px;
  box-shadow: var(--shadow-card);
}
.bottom-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.bottom-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 550;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
}
.bottom-card__title::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--color-primary);
  display: inline-block;
}
.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.filter-tag {
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  background: var(--bg-tile);
  border: 1px solid var(--border-tile);
  font-size: 12px;
  color: var(--text-main);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.12s ease-out;
}
.filter-tag:hover {
  background: var(--bg-tile-hover);
  border-color: var(--border-tile-hover);
  box-shadow: 0 6px 15px rgba(148, 163, 184, 0.2);
}
.tag-count {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--bg-panel);
  border: 1px solid var(--border-tile-hover);
  color: var(--text-secondary);
}
.filter-tag.chip-more {
  background: var(--primary-soft);
  color: var(--color-primary);
  border-style: dashed;
}
.recent-empty {
  color: var(--text-muted);
  font-size: 13px;
  padding: 8px 0;
}
</style>
