<template>
  <div
    ref="toastRef"
    class="toast-item"
    :class="toastClasses"
    :style="toastStyles"
    role="alert"
    :aria-live="toast?.type === 'error' ? 'assertive' : 'polite'"
    :aria-atomic="true"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Toast图标 -->
    <div class="toast-item__icon">
      <i :class="iconClasses" class="toast-item__icon-img" />
    </div>

    <!-- Toast内容 -->
    <div class="toast-item__content">
      <div v-if="toast?.message" class="toast-item__message">
        {{ toast?.message }}
      </div>
      <div v-if="toast?.description" class="toast-item__description">
        {{ toast?.description }}
      </div>
    </div>

    <!-- 关闭按钮 -->
    <button
      v-if="showCloseButton"
      class="toast-item__close-btn"
      title="关闭通知"
      type="button"
      aria-label="关闭通知"
      @click.stop="handleClose"
    >
      <i class="fas fa-times" />
    </button>

    <!-- 进度条 -->
    <div v-if="showProgressBar && autoClose" class="toast-item__progress" :style="progressStyles" />

    <!-- 操作按钮区域 -->
    <div v-if="toast?.actions && toast.actions.length > 0" class="toast-item__actions">
      <button
        v-for="action in toast.actions"
        :key="action.key"
        class="toast-item__action-btn"
        :class="[`toast-item__action-btn--${action.variant || 'default'}`]"
        type="button"
        @click.stop="handleAction(action)"
      >
        {{ action.text }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import type { ToastMessage } from '@/types'

interface ToastAction {
  key: string
  text: string
  variant?: 'default' | 'primary' | 'danger'
  handler?: () => void
}

interface ExtendedToastMessage extends ToastMessage {
  description?: string
  actions?: ToastAction[]
  onClick?: () => void
  showCloseButton?: boolean
  showProgressBar?: boolean
}

interface Props {
  /** Toast消息对象 */
  toast: ExtendedToastMessage
  /** Toast位置 */
  position?:
    | 'top-right'
    | 'top-left'
    | 'top-center'
    | 'bottom-right'
    | 'bottom-left'
    | 'bottom-center'
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean
  /** 是否显示进度条 */
  showProgressBar?: boolean
  /** 是否自动关闭 */
  autoClose?: boolean
  /** 自定义持续时间（毫秒） */
  duration?: number
}

interface Emits {
  (e: 'close', toastId: string): void
  (e: 'mouseenter', toastId: string): void
  (e: 'mouseleave', toastId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top-right',
  showCloseButton: true,
  showProgressBar: true,
  autoClose: true
})

const emit = defineEmits<Emits>()

// 组件引用
const toastRef = ref<HTMLElement>()

// 内部状态
const isVisible = ref(false)
const isHovered = ref(false)
const progressInterval = ref<ReturnType<typeof setInterval> | undefined>()

// 计算属性
const toastClasses = computed(() => ({
  'toast-item': true,
  [`toast-item--${props.toast.type}`]: props.toast?.type,
  'toast-item--hovered': isHovered.value,
  'toast-item--visible': isVisible.value,
  'toast-item--has-actions': props.toast?.actions && props.toast.actions.length > 0,
  'toast-item--has-description': !!props.toast?.description
}))

const toastStyles = computed(() => {
  const el = toastRef.value
  const parentChildren = el?.parentElement?.children
  const index = el && parentChildren ? Array.from(parentChildren).indexOf(el) : 0
  return {
    '--toast-index': index
  }
})

// 图标类名
const iconClasses = computed(() => {
  const iconMap = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  }
  return iconMap[props.toast?.type] || 'fas fa-info-circle'
})

// 进度条样式
const progressStyles = computed(() => {
  const duration = props.duration || props.toast?.duration || 3000

  return {
    animationDuration: `${duration}ms`,
    animationPlayState: isHovered.value ? 'paused' : 'running'
  }
})

// 处理Toast显示
const showToast = async () => {
  await nextTick()
  isVisible.value = true

  // 设置自动关闭
  if (props.autoClose && (props.duration || props.toast?.duration)) {
    const duration = props.duration || props.toast?.duration || 3000

    // 使用 setTimeout 替代 setInterval，避免频繁更新
    const timeoutId = setTimeout(() => {
      if (!isHovered.value) {
        handleClose()
      }
    }, duration)

    // 保存 timeout ID 用于清理
    progressInterval.value = timeoutId as unknown as ReturnType<typeof setInterval>
  }
}

// 处理关闭
const handleClose = () => {
  isVisible.value = false
  if (progressInterval.value) {
    clearTimeout(progressInterval.value as unknown as ReturnType<typeof setTimeout>)
  }

  // 延迟触发关闭事件，让动画完成
  setTimeout(() => {
    emit('close', props.toast?.id)
  }, 300)
}

// 处理点击
const handleClick = () => {
  if (props.toast?.onClick) {
    props.toast.onClick()
  }
}

// 处理鼠标进入
const handleMouseEnter = () => {
  isHovered.value = true
  emit('mouseenter', props.toast?.id)
}

// 处理鼠标离开
const handleMouseLeave = () => {
  isHovered.value = false
  emit('mouseleave', props.toast?.id)
}

// 处理操作按钮点击
const handleAction = (action: ToastAction) => {
  if (action.handler) {
    action.handler()
  }
  handleClose()
}

// 键盘事件处理
const handleKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'Enter':
    case ' ':
      handleClick()
      break
    case 'Escape':
      handleClose()
      break
  }
}

// 生命周期
onMounted(() => {
  showToast()
  if (toastRef.value) {
    toastRef.value.addEventListener('keydown', handleKeydown)
    toastRef.value.focus()
  }
})

onUnmounted(() => {
  if (progressInterval.value) {
    clearTimeout(progressInterval.value as unknown as ReturnType<typeof setTimeout>)
  }
  if (toastRef.value) {
    toastRef.value.removeEventListener('keydown', handleKeydown)
  }
})

const focus = () => {
  toastRef.value?.focus()
}

defineExpose({
  focus
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

// 基础Toast样式
.toast-item {
  --toast-accent: var(--color-primary);

  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: var(--bg-panel);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-tile);
  min-width: 300px;
  max-width: 400px;
  position: relative;
  overflow: hidden;
  transition:
    opacity var(--transition-normal),
    transform var(--transition-normal);
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
  cursor: pointer;

  &--visible {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  &--hovered {
    transform: translateY(-2px) scale(1.02);
    box-shadow: var(--shadow-xl);
  }

  &--error {
    --toast-accent: var(--color-error);
  }

  &--warning {
    --toast-accent: var(--color-warning);
  }

  // 有描述文本时的样式
  &--has-description {
    min-width: 350px;
    max-width: 450px;
  }

  // 有操作按钮时的样式
  &--has-actions {
    flex-direction: column;
    align-items: stretch;
  }
}

// 图标区域
.toast-item__icon {
  flex-shrink: 0;
  margin-top: 2px; // 与文本对齐
}

.toast-item__icon-img {
  font-size: var(--font-size-lg);
  color: var(--toast-accent);
}

// 内容区域
.toast-item__content {
  flex: 1;
  min-width: 0;
}

.toast-item__message {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-main);
  line-height: var(--line-height-tight);
  margin-bottom: var(--spacing-xs);
}

.toast-item__description {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: var(--line-height-normal);
}

// 关闭按钮
.toast-item__close-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: var(--color-neutral-400);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
  font-size: var(--font-size-xs);

  &:hover {
    background-color: var(--bg-tile-hover);
    color: var(--text-main);
  }

  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

// 进度条
.toast-item__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background-color: var(--toast-accent);
  transform-origin: left;
  animation: progress-shrink linear forwards;

  @keyframes progress-shrink {
    from {
      transform: scaleX(1);
    }
    to {
      transform: scaleX(0);
    }
  }
}

// 操作按钮区域
.toast-item__actions {
  display: flex;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-neutral-100);
  justify-content: flex-end;
}

.toast-item__action-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-tile);
  border-radius: var(--radius-sm);
  background-color: var(--bg-panel);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast);

  &:hover {
    background-color: var(--bg-tile-hover);
    border-color: var(--border-tile-hover);
  }

  &--primary {
    background-color: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--color-white);

    &:hover {
      background-color: var(--color-primary-dark);
      border-color: var(--color-primary-dark);
    }
  }

  &--danger {
    background-color: var(--color-error);
    border-color: var(--color-error);
    color: var(--color-white);

    &:hover {
      background-color: rgba(var(--color-primary-rgb), 0.1);
      border-color: rgba(var(--color-primary-rgb), 0.1);
    }
  }
}

// 响应式适配
@include mobile {
  .toast-item {
    min-width: auto;
    max-width: calc(100vw - var(--spacing-lg) * 2);
    margin: 0 var(--spacing-md);
  }

  .toast-item__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .toast-item__action-btn {
    text-align: center;
  }
}

// 高对比度模式
@media (prefers-contrast: high) {
  .toast-item {
    border-width: 2px;
  }

  .toast-item__progress {
    height: 4px;
  }
}

// 减少动画偏好
@media (prefers-reduced-motion: reduce) {
  .toast-item,
  .toast-item__progress,
  .toast-item__close-btn,
  .toast-item__action-btn {
    transition: none;
  }
}

// 打印样式
@media print {
  .toast-item {
    box-shadow: none;
    border: 1px solid var(--color-black);
    break-inside: avoid;
  }

  .toast-item__progress {
    display: none;
  }
}
</style>
