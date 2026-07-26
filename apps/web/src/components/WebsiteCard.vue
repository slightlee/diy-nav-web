<template>
  <article
    class="website-card"
    :class="cardClasses"
    :tabindex="clickable ? 0 : -1"
    role="link"
    :aria-label="website.name"
    :aria-labelledby="titleId"
    :aria-describedby="website.description ? descId : undefined"
    @click="handleCardClick"
    @keydown="handleKeydown"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 拖拽手柄 (Top Right) -->
    <button
      class="drag-handle"
      :aria-label="`拖拽排序：${website.name}`"
      title="拖拽排序"
      type="button"
      draggable="true"
      @click.stop
      @dragstart="onDragHandleDragStart"
      @dragend="onDragHandleDragEnd"
    >
      <i class="fas fa-grip-vertical" />
    </button>

    <div class="website-card__content">
      <!-- 卡片头部 - 网站图标和基本信息 -->
      <header class="website-card__header">
        <!-- 网站图标 -->
        <div ref="faviconRef" class="website-card__favicon">
          <img
            v-if="shouldLoadFavicon && website.favicon && !faviconError"
            :src="website.favicon"
            :alt="`${website.name}的图标`"
            class="website-card__favicon-img"
            loading="lazy"
            decoding="async"
            @error="handleFaviconError"
          />
          <div v-else class="website-card__favicon-placeholder">
            {{ website.name.charAt(0).toUpperCase() }}
          </div>
        </div>

        <!-- 网站名称 -->
        <div class="website-card__title-section">
          <h3 :id="titleId" class="website-card__title" :title="website.name">
            <a
              :href="website.url"
              target="_blank"
              rel="noopener noreferrer"
              class="website-card__title-link"
              @click.stop="handleWebsiteVisit"
              v-html="titleHtml"
            />
          </h3>
          <p :id="descId" class="website-card__description" :title="website.description || ''">
            {{ website.description || '' }}
          </p>
        </div>
      </header>

      <!-- 卡片主体 - 标签 -->
      <main class="website-card__body">
        <div class="website-card__tags">
          <template v-if="websiteTags.length > 0">
            <span
              v-for="tag in websiteTags.slice(0, maxVisibleTags)"
              :key="tag.id"
              class="website-card__tag"
              :title="tag.name"
            >
              {{ tag.name }}
            </span>
            <span
              v-if="websiteTags.length > maxVisibleTags"
              class="website-card__tag website-card__tag--more"
              :title="getMoreTagsTitle()"
            >
              +{{ websiteTags.length - maxVisibleTags }}
            </span>
          </template>
        </div>
      </main>

      <!-- 卡片底部 - 统计信息和操作 -->
      <footer class="website-card__footer">
        <div class="website-card__stats">
          <span
            v-if="showVisitCount"
            class="website-card__stat"
            :title="`访问次数: ${website.visitCount}`"
          >
            <i class="fas fa-eye website-card__stat-icon" />
            {{ formatVisitCountCompact(website.visitCount) }}
          </span>
          <span class="website-card__stat-divider">•</span>
          <span
            v-if="showLastVisited && website.lastVisited"
            class="website-card__stat"
            :title="`最后访问: ${formatDateTimeZh(website.lastVisited)}`"
          >
            {{ formatLastVisitedZh(website.lastVisited) }}
          </span>
        </div>

        <!-- 悬浮操作按钮 (Bottom Right) -->
        <div v-if="showActions" class="website-card__actions">
          <WebsiteCardActions
            :website="website"
            @favorite-toggle="handleFavoriteToggle"
            @edit="handleEdit"
            @delete="handleDelete"
          />
        </div>
      </footer>
    </div>

    <!-- 加载骨架屏 -->
    <div v-if="loading" class="website-card__skeleton">
      <div class="website-card__skeleton-header">
        <div class="website-card__skeleton-favicon" />
        <div class="website-card__skeleton-text website-card__skeleton-text--title" />
      </div>
      <div class="website-card__skeleton-text website-card__skeleton-text--description" />
      <div class="website-card__skeleton-tags" />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTagStore } from '@/stores/tag'
import type { Website, Tag } from '@/types'
import { formatVisitCountCompact, formatDateTimeZh, formatLastVisitedZh } from '@/utils/helpers'
import WebsiteCardActions from '@/components/WebsiteCardActions.vue'

const props = withDefaults(defineProps<Props>(), {
  showVisitCount: true,
  showLastVisited: true,
  maxVisibleTags: 3,
  loading: false,
  clickable: true,
  size: 'md',
  showActions: true,
  showActionsOnHover: true
})

const emit = defineEmits<Emits>()

defineOptions({ name: 'WebsiteCard' })

interface Props {
  website: Website
  showVisitCount?: boolean
  showLastVisited?: boolean
  maxVisibleTags?: number
  loading?: boolean
  clickable?: boolean
  size?: 'sm' | 'md' | 'lg'
  showActions?: boolean
  showActionsOnHover?: boolean
  highlight?: string
}

interface Emits {
  (e: 'favoriteToggle', websiteId: string): void
  (e: 'edit', website: Website): void
  (e: 'delete', websiteId: string): void
  (e: 'visit', website: Website): void
  (e: 'dragHandleStart', evt: DragEvent): void
  (e: 'dragHandleEnd'): void
}

const tagStore = useTagStore()
const isHovered = ref(false)
const faviconError = ref(false)
const shouldLoadFavicon = ref(false)

// 使用 Intersection Observer 优化图标加载
const faviconRef = ref<HTMLElement>()

// 只在图标进入视口时才加载
const setupFaviconObserver = () => {
  if (!faviconRef.value || !('IntersectionObserver' in window)) {
    shouldLoadFavicon.value = true
    return
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          shouldLoadFavicon.value = true
          observer.disconnect()
        }
      })
    },
    { rootMargin: '50px' } // 提前 50px 开始加载
  )

  observer.observe(faviconRef.value)
}

const cardClasses = computed(() => ({
  'website-card--hovered': isHovered.value,
  'website-card--loading': props.loading,
  'website-card--clickable': props.clickable,
  [`website-card--${props.size}`]: props.size
}))

const websiteTags = computed(() => {
  return props.website.tagIds
    .map(tagId => tagStore.getTagById(tagId))
    .filter((tag): tag is Tag => !!tag)
})

const titleId = computed(() => `website-card-title-${props.website.id}`)
const descId = computed(() => `website-card-desc-${props.website.id}`)

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'
  )
const makeHighlightHtml = (text: string, keyword?: string) => {
  if (!keyword?.trim()) return escapeHtml(text)
  const k = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(k, 'ig')
  return escapeHtml(text).replace(re, m => `<mark class="highlight">${escapeHtml(m)}</mark>`)
}
const titleHtml = computed(() => makeHighlightHtml(props.website.name, props.highlight))

const getMoreTagsTitle = (): string => {
  const moreTags = websiteTags.value.slice(props.maxVisibleTags)
  return moreTags.map(tag => tag.name).join(', ')
}

const handleCardClick = (event: MouseEvent) => {
  if (!props.clickable || props.loading) return
  const target = event.target as HTMLElement
  if (target && target.closest('.website-card__actions')) return
  visitWebsite()
}

const handleMouseEnter = () => {
  isHovered.value = true
}

const handleMouseLeave = () => {
  isHovered.value = false
}

const handleWebsiteVisit = (event: MouseEvent) => {
  event.preventDefault()
  visitWebsite()
}

const visitWebsite = () => {
  emit('visit', props.website)
}

const handleEdit = () => {
  emit('edit', props.website)
}

const handleDelete = () => {
  emit('delete', props.website.id)
}

const handleFavoriteToggle = () => {
  emit('favoriteToggle', props.website.id)
}

const handleFaviconError = () => {
  faviconError.value = true
}

const onDragHandleDragStart = (e: DragEvent) => {
  emit('dragHandleStart', e)
}

const onDragHandleDragEnd = () => {
  emit('dragHandleEnd')
}

const handleKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'Enter':
    case ' ':
      if (props.clickable) {
        event.preventDefault()
        visitWebsite()
      }
      break
    case 'e':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        handleEdit()
      }
      break
    case 'Delete':
      if (event.shiftKey) {
        event.preventDefault()
        handleDelete()
      }
      break
  }
}

// 初始化图标观察器
setupFaviconObserver()
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.website-card {
  position: relative;
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-tile);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
  will-change: transform;
  contain: layout style paint;

  &--clickable {
    cursor: pointer;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-card-hover);
    border-color: var(--border-tile-hover);
    z-index: 1;

    .website-card__actions {
      opacity: 1;
      transform: translateY(0);
    }

    .drag-handle {
      opacity: 1;
    }
  }

  &--loading {
    pointer-events: none;
    opacity: var(--opacity-hover);
  }
}

:global([data-theme='dark']) .website-card {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.3),
    0 2px 4px -1px rgba(0, 0, 0, 0.15);

  &:hover {
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.4),
      0 4px 6px -2px rgba(0, 0, 0, 0.2);
    border-color: var(--color-primary);
  }
}

.website-card__content {
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: var(--spacing-lg);
  overflow: hidden;
  max-width: 100%;
}

.website-card__header {
  display: flex;
  gap: var(--spacing-lg);
  align-items: flex-start;
  overflow: hidden;
  max-width: 100%;
}

.website-card__favicon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background-color: var(--bg-body);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-xs);
}

.website-card__favicon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.website-card__favicon-placeholder {
  width: 100%;
  height: 100%;
  background-color: var(--color-primary);
  color: var(--color-white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.website-card__title-section {
  flex: 1;
  min-width: 0;
  padding-top: 0;
  overflow: hidden;
}

.website-card__title {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  color: var(--text-main);
  overflow: hidden;
}

.website-card__title-link {
  color: inherit;
  text-decoration: none;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;

  &:hover {
    color: var(--color-primary);
  }
}

.website-card__description {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-normal);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 3em;
  width: 100%;
  overflow-wrap: break-word;
}

.website-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.website-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  min-height: 20px;
}

.website-card__tag {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 10%, transparent);
  @include text-truncate(1);
  max-width: 80px;

  &--more {
    background-color: var(--bg-tile);
    color: var(--text-muted);
    border-color: var(--border-tile);
  }
}

.website-card__footer {
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--border-tile);
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 32px;
}

.website-card__stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.website-card__stat {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.website-card__stat-divider {
  color: var(--border-tile);
}

.website-card__actions {
  display: flex;
  gap: var(--spacing-xs);
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.drag-handle {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--radius-xs);
  background-color: transparent;
  color: var(--text-muted);
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
  z-index: 5;
  font-size: var(--font-size-xs);

  &:hover {
    background-color: var(--bg-tile);
    color: var(--text-main);
  }

  &:active {
    cursor: grabbing;
  }
}

:deep(mark.highlight) {
  background-color: rgba(var(--color-primary-rgb), 0.15);
  color: inherit;
  border-radius: var(--radius-xs);
  padding: 0 var(--spacing-xs);
}

// Skeleton styles
.website-card__skeleton {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--bg-card);
  padding: var(--spacing-xl);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.website-card__skeleton-header {
  display: flex;
  gap: var(--spacing-lg);
}

.website-card__skeleton-favicon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  @include skeleton-loading;
}

.website-card__skeleton-text {
  border-radius: var(--radius-xs);
  @include skeleton-loading;

  &--title {
    height: 18px;
    width: 60%;
    margin-bottom: var(--spacing-sm);
  }

  &--description {
    height: 12px;
    width: 90%;
  }
}

.website-card__skeleton-tags {
  height: 20px;
  width: 50%;
  border-radius: var(--radius-md);
  margin-top: auto;
  @include skeleton-loading;
}

@media (max-width: 768px) {
  .website-card {
    width: 100%;
  }

  .website-card__actions {
    opacity: 1;
    transform: none;
  }

  .drag-handle {
    opacity: 1;
  }
}
</style>
