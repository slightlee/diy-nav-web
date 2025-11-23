<template>
  <div class="compact-list">
    <div v-if="allList.length === 0" class="empty">
      <i class="fas fa-inbox" />
      <span>{{ emptyText }}</span>
    </div>
    <div v-else class="tiles">
      <div
        v-for="w in pagedList"
        :key="w.id"
        class="tile"
        :class="[{ 'is-drag-over': draggingId && draggingId !== w.id && dragOverId === w.id }]"
        :draggable="isFavoriteView"
        @dragstart="onDragStart(w.id, $event)"
        @dragover.prevent="onDragOver(w.id, $event)"
        @drop.prevent="onDrop(w.id, $event)"
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
    <div v-if="totalPages > 1 && isFavoriteView" class="pager" aria-label="分页控制">
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWebsiteStore } from '@/stores/website'
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

const draggingId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

const onDragStart = (id: string, e: DragEvent) => {
  if (!isFavoriteView.value) return
  draggingId.value = id
  e.dataTransfer?.setData('text/plain', id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

const onDragOver = (targetId: string, e: DragEvent) => {
  if (!isFavoriteView.value) return
  if (!draggingId.value || draggingId.value === targetId) return
  e.preventDefault()
  dragOverId.value = targetId
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

const onDrop = (targetId: string, e: DragEvent) => {
  if (!isFavoriteView.value) return
  e.preventDefault()
  const sourceId = draggingId.value
  draggingId.value = null
  dragOverId.value = null
  if (!sourceId || sourceId === targetId) return
  websiteStore.moveFavoriteBefore(sourceId, targetId)
}

const onDragEnd = () => {
  draggingId.value = null
  dragOverId.value = null
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

.empty {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-neutral-600);
  padding: 8px 4px;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(124px, 1fr));
  gap: 10px;
  place-content: start start;
  padding-bottom: calc(var(--pager-h) + 8px);
}

.tile {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  border: 1px solid var(--color-neutral-200);
  background: var(--color-neutral-100);
  height: var(--tile-h);
  box-sizing: border-box;
  padding: 8px 8px 10px;
  transition:
    box-shadow 0.2s ease,
    transform 0.08s ease;
}

.tile:hover {
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  border-color: var(--color-neutral-300);
}

.tile.is-drag-over {
  outline: 2px dashed var(--color-primary);
}

.tile-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  padding-top: 2px;
}

.tile-favicon {
  width: 24px;
  height: 24px;
  background-size: cover;
  border-radius: 8px;
}

.tile-favicon.placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-neutral-100);
  color: var(--color-neutral-500);
}

.tile-name {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-800);
  display: block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  line-height: 1.25;
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

.pager {
  position: absolute;
  right: 0;
  bottom: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--color-neutral-200);
  background: transparent;
  color: var(--color-neutral-700);
  border-radius: 9999px;
  padding: 4px 10px;
  height: var(--pager-h);
  box-sizing: border-box;
}

.pager:hover {
  background: var(--color-neutral-100);
  border-color: var(--color-neutral-300);
}

.pager-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-neutral-700);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pager-btn:hover {
  background: var(--color-neutral-100);
}

.pager-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pager-info {
  font-size: var(--font-size-sm);
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
