<template>
  <div class="compact-list">
    <EmptyState v-if="allList.length === 0" :message="emptyText" />
    <div v-else class="tiles content-auto">
      <div
        v-for="w in pagedList"
        :key="w.id"
        class="tile"
        :class="[{ 'is-drag-over': draggingId && draggingId !== w.id && dragOverId === w.id }]"
        :draggable="isFavoriteView"
        @dragstart="isFavoriteView && onDragStart(w.id, $event)"
        @dragover.prevent="isFavoriteView && onDragOver(w.id, $event)"
        @drop.prevent="isFavoriteView && onDrop(w.id, $event)"
        @dragend="onDragEnd"
      >
        <button class="tile-main" type="button" @click="onVisit(w)">
          <i
            v-if="w.favicon"
            class="tile-favicon"
            :style="{ backgroundImage: `url(${w.favicon})` }"
          />
          <div v-else class="tile-favicon placeholder">
            <i class="fas fa-globe" />
          </div>
          <span class="tile-name">{{ w.name }}</span>
        </button>
        <button
          class="tile-star"
          :class="[{ 'is-active': w.isFavorite }]"
          type="button"
          @click.stop="onFavoriteToggle(w.id)"
        >
          <i :class="w.isFavorite ? 'fas fa-star' : 'far fa-star'" />
        </button>
      </div>
    </div>
    <Teleport v-if="pagerTarget && totalPages > 1" :to="pagerTarget">
      <div class="pager-portal-content">
        <button
          class="pager-btn"
          type="button"
          :disabled="currentPage <= 1"
          aria-label="上一页"
          title="上一页"
          @click="goPrev"
        >
          <i class="fas fa-chevron-left" />
        </button>
        <span class="pager-info">{{ currentPage }} / {{ totalPages }}</span>
        <button
          class="pager-btn"
          type="button"
          :disabled="currentPage >= totalPages"
          aria-label="下一页"
          title="下一页"
          @click="goNext"
        >
          <i class="fas fa-chevron-right" />
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * @component CompactList
 * @description 紧凑型网站列表组件
 * 用于展示最近访问或常用网站，支持分页和拖拽排序(常用列表)
 *
 * @props fixedView - 视图模式 ('recent' | 'favorite')
 * @props limit - 每页显示数量
 *
 * @emits pageCount - 当前页显示的网站数量变化时触发
 */
import { computed, ref, watch } from 'vue'
import { EmptyState } from '@nav/ui'
import { useWebsiteStore } from '@/stores/website'
import { useWebsiteDrag } from '@/composables/useWebsiteDrag'
import type { Website } from '@/types'

interface Props {
  fixedView?: 'recent' | 'favorite'
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  limit: 12
})

const emit = defineEmits<{ (e: 'pageCount', count: number): void }>()
const websiteStore = useWebsiteStore()
const isFavoriteView = computed(() => props.fixedView === 'favorite')

const { draggingId, dragOverId, onDragStart, onDragOver, onDrop, onDragEnd } = useWebsiteDrag(
  () => props.fixedView
)

const pagerTarget = computed(() => {
  if (props.fixedView === 'recent') return '#recent-pager-portal'
  if (props.fixedView === 'favorite') return '#favorite-pager-portal'
  return null
})

const allList = computed<Website[]>(() => {
  if (props.fixedView === 'recent') {
    return websiteStore.websites
      .filter(w => !!w.lastVisited)
      .sort((a, b) => (b.lastVisited?.getTime() ?? 0) - (a.lastVisited?.getTime() ?? 0))
  }
  if (props.fixedView === 'favorite') {
    return websiteStore.websites
      .filter(w => !!w.isFavorite)
      .sort(
        (a, b) =>
          (a.favoriteOrder ?? a.order ?? 0) - (b.favoriteOrder ?? b.order ?? 0) ||
          (b.visitCount ?? 0) - (a.visitCount ?? 0)
      )
  }
  return []
})

const page = ref(1)
const pageSize = computed(() => props.limit)
const totalPages = computed(() => Math.max(1, Math.ceil(allList.value.length / pageSize.value)))
const currentPage = computed(() => Math.min(Math.max(page.value, 1), totalPages.value))
const pagedList = computed<Website[]>(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return allList.value.slice(start, start + pageSize.value)
})

watch(allList, () => {
  if (currentPage.value > totalPages.value) page.value = 1
})

watch(
  pagedList,
  list => {
    emit('pageCount', list.length)
  },
  { immediate: true }
)

const emptyText = computed(() => (props.fixedView === 'recent' ? '暂无最近使用' : '暂无常用网站'))

const onVisit = (website: Website) => {
  websiteStore.incrementVisitCount(website.id)
  window.open(website.url, '_blank', 'noopener,noreferrer')
}

const onFavoriteToggle = (id: string) => {
  const w = websiteStore.websites.find(x => x.id === id)
  if (!w) return
  websiteStore.updateWebsite(id, { isFavorite: !w.isFavorite })
}

const goPrev = () => {
  if (currentPage.value <= 1) return
  page.value = currentPage.value - 1
}

const goNext = () => {
  if (currentPage.value >= totalPages.value) return
  page.value = currentPage.value + 1
}
</script>

<style scoped lang="scss">
.compact-list {
  width: 100%;
  position: relative;
  height: 100%;

  --pager-h: 32px;
  --tile-h: clamp(88px, 9vh, 104px);
}

.tiles {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(3, var(--tile-h));
  gap: 12px;
  place-content: start start;
  height: calc(3 * var(--tile-h) + 2 * 12px);
  padding-bottom: 0;
  margin-bottom: calc(var(--pager-h) + 8px);
}
@media (max-width: 1024px) {
  .tiles {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 768px) {
  .tiles {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.tile {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  border: 1px solid var(--border-tile);
  background: var(--bg-tile);
  height: var(--tile-h);
  box-sizing: border-box;
  padding: 10px 10px 8px;
  transition: all 0.15s ease-out;
  min-width: 0;
}

.tile:hover {
  background: var(--bg-tile-hover);
  border-color: var(--border-tile-hover);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}

.tile.is-drag-over {
  outline: 2px dashed var(--color-primary);
}

.tile-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  cursor: pointer;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  padding: 0;
  position: relative;
}

.tile-favicon {
  width: 38px;
  height: 38px;
  background-size: cover;
  border-radius: 12px;
}

.tile-favicon.placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-neutral-100);
  color: var(--color-neutral-500);
  font-size: 18px;
}

.tile-name {
  font-size: 12px;
  color: var(--color-neutral-800);
  display: block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  line-height: 1.3;
}

.tile-star {
  position: absolute;
  top: 6px;
  right: 6px;
  background: none;
  border: none;
  color: var(--color-neutral-500);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast),
    color var(--transition-fast);
}

.tile:hover .tile-star {
  opacity: 1;
}

.tile-star.is-active {
  color: var(--color-primary);
}

.tile-main:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 12px;
}

.tile-star:hover {
  transform: scale(1.06);
}

.pager-portal-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-neutral-500);
}

.pager-btn {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid var(--border-tile);
  background: var(--bg-tile);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.pager-btn:hover:not(:disabled) {
  background: var(--bg-tile-hover);
  border-color: var(--border-tile-hover);
  color: var(--text-main);
}

.pager-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-page);
  border-color: var(--border-tile);
}

.pager-info {
  min-width: 40px;
  text-align: center;
  font-size: 12px;
  color: var(--color-neutral-700);
}
@media (max-width: 640px) {
  .compact-list {
    --tile-h: clamp(96px, 10vh, 112px);
  }
}
@media (min-width: 1440px) {
  .compact-list {
    --tile-h: clamp(84px, 8vh, 100px);
  }
}
@media (min-width: 1920px) {
  .compact-list {
    --tile-h: clamp(82px, 7.5vh, 98px);
  }
}
@media (min-width: 2560px) {
  .compact-list {
    --tile-h: clamp(80px, 7vh, 96px);
  }
}
</style>
