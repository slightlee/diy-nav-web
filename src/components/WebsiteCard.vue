<template>
  <article
    ref="cardRef"
    class="website-card"
    :class="cardClasses"
    @click="handleCardClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 卡片头部 - 网站图标和基本信息 -->
    <header class="website-card__header">
      <!-- 网站图标 -->
      <div class="website-card__favicon">
        <img
          v-if="website.favicon"
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
        <h3 class="website-card__title" :title="website.name">
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
        <p class="website-card__description" :title="website.description || ''">
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
          {{ formatUrl(website.url) }}
        </span>
      </div>

      <!-- 标签列表 -->
      <div class="website-card__tags">
        <template v-if="websiteTags.length > 0">
          <span
            v-for="tag in websiteTags.slice(0, maxVisibleTags)"
            :key="tag.id"
            class="website-card__tag"
            :style="{ backgroundColor: tag.color }"
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
          {{ formatVisitCount(website.visitCount) }}
        </span>
        <span
          v-if="showLastVisited && website.lastVisited"
          class="website-card__stat"
          :title="`最后访问: ${formatDateTime(website.lastVisited)}`"
        >
          <i class="fas fa-clock website-card__stat-icon" />
          {{ formatLastVisited(website.lastVisited) }}
        </span>
      </div>

      <!-- 操作按钮 -->
      <div class="website-card__actions">
        <button
          class="website-card__action-btn website-card__action-btn--edit"
          :title="`编辑 ${website.name}`"
          @click.stop="handleEdit"
        >
          <i class="fas fa-edit" />
        </button>
        <button
          class="website-card__action-btn website-card__action-btn--delete"
          :title="`删除 ${website.name}`"
          @click.stop="handleDelete"
        >
          <i class="fas fa-trash" />
        </button>
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
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useWebsiteStore } from '@/stores/website'
import { useTagStore } from '@/stores/tag'
import type { Website, Tag } from '@/types'

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
  (e: 'click', website: Website): void
}

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

// Store
const websiteStore = useWebsiteStore()
const tagStore = useTagStore()

// 组件引用
const cardRef = ref<HTMLElement>()

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

// 格式化URL显示
const formatUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return url
  }
}

// 格式化访问次数
const formatVisitCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

// 格式化日期时间
const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化最后访问时间
const formatLastVisited = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}周前`
  } else if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)}个月前`
  } else {
    return `${Math.floor(diffDays / 365)}年前`
  }
}

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
  websiteStore.incrementVisitCount(props.website.id)
  window.open(props.website.url, '_blank', 'noopener,noreferrer')
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

// 检查网站状态（可选功能）
const checkWebsiteStatus = async () => {
  if (props.website.url) {
    try {
      const url = new URL(props.website.url)
      // 这里可以实现网站状态检查逻辑
      // 由于CORS限制，可能需要后端支持
    } catch (error) {
      console.warn('Invalid URL:', props.website.url)
    }
  }
}

// 键盘导航支持
const handleKeydown = (event: KeyboardEvent) => {
  if (!cardRef.value) return

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

// 生命周期
onMounted(() => {
  if (cardRef.value) {
    cardRef.value.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  if (cardRef.value) {
    cardRef.value.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

// 基础卡片样式
.website-card {
  @include card-layout;
  position: relative;
  cursor: default;
  transition: all $transition-normal;
  border: 1px solid $color-border;
  background-color: $color-white;
  border-radius: $border-radius-lg;
  overflow: hidden;
  min-height: 160px;
  display: flex;
  flex-direction: column;

  &--clickable {
    cursor: pointer;

    &:hover {
      border-color: $color-primary;
      box-shadow: $shadow-card-hover;
    }
  }

  &--hovered {
    box-shadow: $shadow-card-hover;
  }

  &--loading {
    pointer-events: none;
    opacity: 0.8;
  }

  // 尺寸变体
  &--sm {
    min-height: 120px;
    padding: $spacing-sm;
  }

  &--md {
    min-height: 160px;
    padding: $spacing-md;
  }

  &--lg {
    min-height: 200px;
    padding: $spacing-lg;
  }

  // 操作按钮可见性
  &--actions-visible {
    .website-card__actions {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

// 卡片头部
.website-card__header {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
  flex-shrink: 0;
}

// 网站图标
.website-card__favicon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: $border-radius-sm;
  overflow: hidden;
  background-color: $color-neutral-100;
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
  color: $color-neutral-400;
  font-size: $font-size-sm;
}

// 标题区域
.website-card__title-section {
  flex: 1;
  min-width: 0;
}

.website-card__title {
  margin: 0;
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  line-height: $line-height-tight;
  margin-bottom: $spacing-xs;

  .website-card--sm & {
    font-size: $font-size-sm;
  }

  .website-card--lg & {
    font-size: $font-size-lg;
  }
}

.website-card__title-link {
  color: inherit;
  text-decoration: none;
  @include text-truncate(1);

  &:hover {
    color: $color-primary;
  }

  &:focus {
    outline: 2px solid $color-primary;
    outline-offset: 2px;
    border-radius: $border-radius-sm;
  }
}

.website-card__description {
  margin: 0;
  color: $color-neutral-600;
  font-size: $font-size-sm;
  line-height: $line-height-normal;
  @include text-truncate(2);
  min-height: calc(2 * #{$line-height-normal} * 1em);

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
  border-radius: $border-radius-full;
  background-color: $color-error;

  &--online {
    background-color: $color-success;
  }
}

// 卡片主体
.website-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
}

// URL显示
.website-card__url {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  color: $color-neutral-500;
  font-size: $font-size-sm;
  font-family: $font-family-mono;
}

.website-card__url-icon {
  flex-shrink: 0;
  font-size: $font-size-xs;
}

.website-card__url-text {
  @include text-truncate(1);
}

// 标签列表
.website-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  align-items: center;
  min-height: 24px;
}

.website-card__tag {
  padding: $spacing-xs $spacing-sm;
  border-radius: $border-radius-pill;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  color: $color-white;
  background-color: $color-primary;
  @include text-truncate(1);
  max-width: 80px;

  &--more {
    background-color: $color-neutral-300;
    color: $color-neutral-600;
  }
}

// 卡片底部
.website-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  margin-top: auto;
  padding-top: $spacing-sm;
  border-top: 1px solid $color-neutral-100;
}

// 统计信息
.website-card__stats {
  display: flex;
  gap: $spacing-sm;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.website-card__stat {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  color: $color-neutral-500;
  font-size: $font-size-xs;
  @include text-truncate(1);
}

.website-card__stat-icon {
  flex-shrink: 0;
}

// 操作按钮
.website-card__actions {
  display: flex;
  gap: $spacing-xs;
  opacity: 0;
  transform: translateY(4px);
  transition: all $transition-fast;

  .website-card--actions-visible & {
    opacity: 1;
    transform: translateY(0);
  }
}

.website-card__action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: $border-radius-sm;
  background-color: $color-neutral-100;
  color: $color-neutral-500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;
  font-size: $font-size-sm;

  &:hover {
    transform: scale(1.05);
  }

  &:focus {
    outline: 2px solid $color-primary;
    outline-offset: 2px;
  }

  &--edit:hover {
    background-color: $color-primary;
    color: $color-white;
  }

  &--delete:hover {
    background-color: $color-error;
    color: $color-white;
  }

  .website-card--sm & {
    width: 28px;
    height: 28px;
    font-size: $font-size-xs;
  }

  .website-card--lg & {
    width: 36px;
    height: 36px;
    font-size: $font-size-base;
  }
}

// 骨架屏
.website-card__skeleton {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: $color-white;
  border-radius: $border-radius-lg;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-md;
  z-index: 1;
}

.website-card__skeleton-header {
  display: flex;
  gap: $spacing-sm;
  align-items: center;
}

.website-card__skeleton-favicon {
  width: 32px;
  height: 32px;
  border-radius: $border-radius-sm;
  @include skeleton-loading;
}

.website-card__skeleton-text {
  height: 16px;
  border-radius: $border-radius-sm;
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
    padding: $spacing-sm;
    min-height: 140px;
  }

  .website-card__title {
    font-size: $font-size-sm;
  }

  .website-card__description {
    font-size: $font-size-xs;
  }

  .website-card__footer {
    flex-direction: column;
    align-items: flex-start;
    gap: $spacing-xs;
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

  .website-card__action-btn {
    border: 1px solid $color-border;
  }
}

// 减少动画偏好
@media (prefers-reduced-motion: reduce) {
  .website-card,
  .website-card__actions,
  .website-card__action-btn {
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
    border: 1px solid $color-black;
    break-inside: avoid;
  }

  .website-card__actions {
    display: none;
  }
}
</style>
