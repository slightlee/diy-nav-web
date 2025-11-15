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
    <!-- 卡片头部 - 网站图标和基本信息 -->
    <header class="website-card__header">
      <!-- 网站图标 -->
      <div class="website-card__favicon">
        <img
          v-if="website.favicon && !faviconError"
          :src="website.favicon"
          :alt="`${website.name}的图标`"
          class="website-card__favicon-img"
          loading="lazy"
          @error="handleFaviconError"
        />
        <i
          v-else
          class="fas fa-globe website-card__favicon-placeholder"
        />
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
          >
            {{ website.name }}
          </a>
        </h3>
        <p :id="descId" class="website-card__description" :title="website.description || ''">
          {{ website.description || '' }}
        </p>
      </div>
    </header>

    <!-- 卡片主体 - URL和标签 -->
    <main class="website-card__body">
      <!-- URL显示 -->
      <div class="website-card__url">
        <i class="fas fa-link website-card__url-icon" />
        <span class="website-card__url-text" :title="website.url">
          {{ getDomain(website.url) }}
        </span>
      </div>

      <!-- 标签列表 -->
      <div class="website-card__tags">
        <template v-if="websiteTags.length > 0">
          <span
            v-for="tag in websiteTags.slice(0, maxVisibleTags)"
            :key="tag.id"
            class="website-card__tag"
            :style="getTagStyle(tag.color)"
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

    <!-- 卡片底部 - 操作按钮和统计信息 -->
    <footer class="website-card__footer">
      <!-- 统计信息 -->
      <div class="website-card__stats">
        <span
          v-if="showVisitCount"
          class="website-card__stat"
          :title="`访问次数: ${website.visitCount}`"
        >
          <i class="fas fa-eye website-card__stat-icon" />
          {{ formatVisitCountCompact(website.visitCount) }}
        </span>
        <span
          v-if="showLastVisited && website.lastVisited"
          class="website-card__stat"
          :title="`最后访问: ${formatDateTimeZh(website.lastVisited)}`"
        >
          <i class="fas fa-clock website-card__stat-icon" />
          {{ formatLastVisitedZh(website.lastVisited) }}
        </span>
      </div>

      <!-- 操作按钮 -->
      <div v-if="showActions" class="website-card__actions">
        <slot name="actions" :website="website">
          <WebsiteCardActions :website="website" @edit="handleEdit" @delete="handleDelete" />
        </slot>
      </div>
    </footer>

    <!-- 加载骨架屏 -->
    <div v-if="loading" class="website-card__skeleton">
      <div class="website-card__skeleton-header">
        <div class="website-card__skeleton-favicon" />
        <div class="website-card__skeleton-text website-card__skeleton-text--title" />
      </div>
      <div class="website-card__skeleton-text website-card__skeleton-text--url" />
      <div class="website-card__skeleton-text website-card__skeleton-text--description" />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTagStore } from '@/stores/tag'
import type { Website, Tag } from '@/types'
import { getDomain, formatVisitCountCompact, formatDateTimeZh, formatLastVisitedZh, getContrastColor } from '@/utils/helpers'
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
  /** 网站数据 */
  website: Website
  /** 是否显示访问次数 */
  showVisitCount?: boolean
  /** 是否显示最后访问时间 */
  showLastVisited?: boolean
  /** 最大显示标签数量 */
  maxVisibleTags?: number
  /** 是否加载中 */
  loading?: boolean
  /** 是否可点击 */
  clickable?: boolean
  /** 卡片尺寸变体 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否显示操作按钮 */
  showActions?: boolean
  /** 是否悬停时显示操作按钮 */
  showActionsOnHover?: boolean
}

interface Emits {
  (e: 'edit', website: Website): void
  (e: 'delete', websiteId: string): void
  (e: 'visit', website: Website): void
}

// Store
const tagStore = useTagStore()

// 组件引用

// 内部状态
const isHovered = ref(false)
const faviconError = ref(false)

// 计算属性
const cardClasses = computed(() => ({
  'website-card--hovered': isHovered.value,
  'website-card--loading': props.loading,
  'website-card--clickable': props.clickable,
  [`website-card--${props.size}`]: props.size,
  'website-card--actions-visible': !props.showActionsOnHover || isHovered.value
}))

// 获取网站标签
const websiteTags = computed(() => {
  return props.website.tagIds
    .map(tagId => tagStore.getTagById(tagId))
    .filter((tag): tag is Tag => !!tag)
})



const titleId = computed(() => `website-card-title-${props.website.id}`)
const descId = computed(() => `website-card-desc-${props.website.id}`)
const getTagStyle = (bg: string) => ({ backgroundColor: bg, color: getContrastColor(bg) })

// 获取更多标签的标题
const getMoreTagsTitle = (): string => {
  const moreTags = websiteTags.value.slice(props.maxVisibleTags)
  return moreTags.map(tag => tag.name).join(', ')
}

// 事件处理
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

const handleFaviconError = () => {
  faviconError.value = true
}


// 键盘导航支持
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

</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

// 基础卡片样式
.website-card {
  @include card-layout;
  position: relative;
  cursor: default;
  transition: all var(--transition-normal);
  border: 1px solid var(--color-border);
  background-color: var(--color-neutral-100);
  border-radius: var(--radius-lg);
  overflow: hidden;
  min-height: 160px;
  display: flex;
  flex-direction: column;

  &--clickable {
    cursor: pointer;

    &:hover {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-card-hover);
    }
  }

  &--hovered {
    box-shadow: var(--shadow-card-hover);
  }

  &--loading {
    pointer-events: none;
    opacity: 0.8;
  }

  // 尺寸变体
  &--sm {
    min-height: 120px;
    padding: var(--spacing-sm);
  }

  &--md {
    min-height: 160px;
    padding: var(--spacing-md);
  }

  &--lg {
    min-height: 200px;
    padding: var(--spacing-lg);
  }

  // 操作按钮可见性（已通过 .website-card__actions 内部选择器处理）
}

// 卡片头部
.website-card__header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  flex-shrink: 0;
}

// 网站图标
.website-card__favicon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background-color: var(--color-neutral-100);
  display: flex;
  align-items: center;
  justify-content: center;

  .website-card--sm & {
    width: 24px;
    height: 24px;
  }

  .website-card--lg & {
    width: 40px;
    height: 40px;
  }
}

.website-card__favicon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.website-card__favicon-placeholder {
  color: var(--color-neutral-400);
  font-size: var(--font-size-sm);
}

// 标题区域
.website-card__title-section {
  flex: 1;
  min-width: 0;
}

.website-card__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
  margin-bottom: var(--spacing-xs);

  .website-card--sm & {
    font-size: var(--font-size-sm);
  }

  .website-card--lg & {
    font-size: var(--font-size-lg);
  }
}

.website-card__title-link {
  color: inherit;
  text-decoration: none;
  @include text-truncate(1);

  &:hover {
    color: var(--color-primary);
  }

  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
}

.website-card__description {
  margin: 0;
  color: var(--color-neutral-600);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
  @include text-truncate(2);
  min-height: calc(2 * var(--line-height-normal) * 1em);

  .website-card--sm & {
    display: none;
  }
}

// 状态指示器
.website-card__status {
  flex-shrink: 0;
}

.website-card__status-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background-color: var(--color-error);

  &--online {
    background-color: var(--color-success);
  }
}

// 卡片主体
.website-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

// URL显示
.website-card__url {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-neutral-500);
  font-size: var(--font-size-sm);
  font-family: var(--font-family-mono);
}

.website-card__url-icon {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
}

.website-card__url-text {
  @include text-truncate(1);
}

// 标签列表
.website-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  align-items: center;
  min-height: 24px;
}

.website-card__tag {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-white);
  background-color: var(--color-primary);
  @include text-truncate(1);
  max-width: 80px;

  &--more {
    background-color: var(--color-neutral-300);
    color: var(--color-neutral-600);
  }
}

// 卡片底部
.website-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  margin-top: auto;
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-neutral-200);
}

// 统计信息
.website-card__stats {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  flex: 1;
  min-width: 0;
}

.website-card__stat {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-neutral-500);
  font-size: var(--font-size-xs);
  @include text-truncate(1);
}

.website-card__stat-icon {
  flex-shrink: 0;
}

// 操作按钮
.website-card__actions {
  display: flex;
  gap: var(--spacing-xs);
  opacity: 0;
  transform: translateY(4px);
  transition: all var(--transition-fast);

  .website-card--actions-visible & {
    opacity: 1;
    transform: translateY(0);
  }
}

:deep(.website-card__action-btn) {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background-color: var(--color-neutral-100);
  color: var(--color-neutral-500);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  font-size: var(--font-size-sm);
}

:deep(.website-card__action-btn:hover) {
  transform: scale(1.05);
}

:deep(.website-card__action-btn:focus) {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

:deep(.website-card__action-btn--edit:hover) {
  background-color: var(--color-primary);
  color: var(--color-white);
}

:deep(.website-card__action-btn--delete:hover) {
  background-color: var(--color-error);
  color: var(--color-white);
}

.website-card--sm :deep(.website-card__action-btn) {
  width: 28px;
  height: 28px;
  font-size: var(--font-size-xs);
}

.website-card--lg :deep(.website-card__action-btn) {
  width: 36px;
  height: 36px;
  font-size: var(--font-size-base);
}

// 骨架屏
.website-card__skeleton {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--color-neutral-100);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  z-index: 1;
}

.website-card__skeleton-header {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.website-card__skeleton-favicon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  @include skeleton-loading;
}

.website-card__skeleton-text {
  height: 16px;
  border-radius: var(--radius-sm);
  @include skeleton-loading;

  &--title {
    width: 120px;
  }

  &--url {
    width: 80%;
  }

  &--description {
    width: 60%;
    height: 12px;
  }
}

// 响应式适配
@include mobile {
  .website-card {
    padding: var(--spacing-sm);
    min-height: 140px;
  }

  .website-card__title {
    font-size: var(--font-size-sm);
  }

  .website-card__description {
    font-size: var(--font-size-xs);
  }

  .website-card__footer {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }

  .website-card__actions {
    opacity: 1;
    transform: translateY(0);
  }
}

// 高对比度模式
@media (prefers-contrast: high) {
  .website-card {
    border-width: 2px;
  }

  :deep(.website-card__action-btn) {
    border: 1px solid var(--color-border);
  }
}

// 减少动画偏好
@media (prefers-reduced-motion: reduce) {
  .website-card,
  .website-card__actions,
  :deep(.website-card__action-btn) {
    transition: none;
  }

  .website-card--hovered {
    transform: none;
  }
}

// 打印样式
@media print {
  .website-card {
    box-shadow: none;
    border: 1px solid var(--color-black);
    break-inside: avoid;
  }

  .website-card__actions {
    display: none;
  }
}
</style>
