<!--
  无限滚动网站网格组件
  滚动到底部时自动加载更多
-->
<template>
  <div ref="gridRoot" class="infinite-website-grid">
    <!-- 网站网格 -->
    <div class="website-grid">
      <slot v-for="website in visibleItems" :key="website.id" :website="website" />

      <!-- 添加网站卡片插槽 -->
      <slot name="add-card" />
    </div>

    <!-- 加载状态 -->
    <div v-if="hasMore && isLoading" class="load-more">
      <div class="loading-indicator">
        <i class="fas fa-spinner fa-spin" />
        <span>加载中...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef, watch } from 'vue'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import type { Website } from '@/types'

interface Props {
  /** 网站列表 */
  websites: Website[]
  /** 每次加载数量 */
  pageSize?: number
  /** 初始加载数量 */
  initialSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 30,
  initialSize: 30
})

const websitesRef = toRef(props, 'websites')
const gridRoot = ref<HTMLElement | null>(null)

const { visibleItems, hasMore, isLoading, reset } = useInfiniteScroll(websitesRef, {
  pageSize: props.pageSize,
  initialSize: props.initialSize,
  anchor: gridRoot
})

// 当网站列表变化时，重置加载状态
watch(
  () => props.websites,
  () => {
    reset()
  },
  { deep: false }
)
</script>

<style scoped lang="scss">
.infinite-website-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.website-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-primary);
  font-size: var(--font-size-sm);

  i {
    font-size: 1.25rem;
  }
}

// 响应式
@media (max-width: 768px) {
  .website-grid {
    grid-template-columns: 1fr;
  }
}
</style>
