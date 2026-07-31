<template>
  <section class="bottom-card">
    <div class="bottom-card__header"><h3 class="bottom-card__title">标签快捷筛选</h3></div>
    <div class="filter-group">
      <button
        v-for="t in tagPopular"
        :key="t.id"
        class="filter-tag"
        type="button"
        :aria-label="`筛选标签：${t.name}`"
        :title="t.name"
        @click="goToAllWithTag(t.id)"
        @keydown.enter="goToAllWithTag(t.id)"
      >
        <span class="tag-name">{{ t.name }}</span>
        <span class="tag-count">{{ tagUsageMap[t.id] || 0 }}</span>
      </button>
      <button
        v-if="hasMoreTags"
        class="filter-tag chip-more"
        type="button"
        aria-label="更多标签"
        title="更多"
        @click="emit('openMore')"
      >
        <i class="fas fa-chevron-right" />
        <span class="tag-name">更多</span>
      </button>
      <div v-if="tagPopular.length === 0" class="filter-empty">
        <p class="empty-text">暂无标签数据</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * @component QuickTagFilter
 * @description 快捷标签筛选组件
 * 展示热门标签列表，点击可跳转至全部页面并自动选中对应标签
 *
 * @emits openMore - 点击"更多"按钮时触发
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTagStore } from '@/stores/tag'
import { useWebsiteStats } from '@/composables/useWebsiteStats'

const emit = defineEmits<{
  (e: 'openMore'): void
}>()

const router = useRouter()
const tagStore = useTagStore()
const { tagUsageMap } = useWebsiteStats()

const POPULAR_LIMIT = 10
const tagPopular = computed(() =>
  [...tagStore.tags].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).slice(0, POPULAR_LIMIT)
)
const hasMoreTags = computed(() => tagStore.tags.length > POPULAR_LIMIT)

const goToAllWithTag = (tagId: string) => router.push({ path: '/all', query: { tag: tagId } })
</script>

<style scoped lang="scss">
.bottom-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-tile);
  border-radius: 18px;
  background: var(--bg-panel);
  padding: 14px 16px 13px;
  box-shadow: var(--shadow-sm);
}
.bottom-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
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
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  gap: 8px;
}
.filter-tag {
  height: 28px;
  padding: 0 7px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  font-size: 12px;
  color: var(--text-main);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition:
    background-color 0.12s ease-out,
    color 0.12s ease-out,
    transform 0.12s ease-out;
}
.filter-tag:hover {
  background: var(--primary-soft);
  color: var(--color-primary);
  transform: translateY(-1px);
}
.filter-tag:focus-visible {
  outline: 2px solid rgba(var(--color-primary-rgb), 0.35);
  outline-offset: 2px;
}
.tag-count {
  font-size: 11px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.filter-tag.chip-more {
  background: transparent;
  color: var(--color-primary);
}

.filter-empty {
  width: 100%;
  padding: 4px 0;
}

.empty-text {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
</style>
