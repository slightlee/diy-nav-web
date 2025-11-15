<template>
  <Teleport to="body">
    <div ref="containerRef" class="toast-container" :class="containerClasses">
      <TransitionGroup
        name="toast"
        tag="div"
        class="toast-list"
        :style="{ '--toast-count': toasts.length }"
      >
        <ToastItem
          v-for="toast in visibleToasts"
          :key="toast.id"
          :toast="toast"
          :position="position"
          @close="handleClose"
          @mouseenter="handleMouseEnter"
          @mouseleave="handleMouseLeave"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import ToastItem from './ToastItem.vue'

interface Props {
  /** 最大显示的Toast数量 */
  maxCount?: number
  /** Toast位置 */
  position?: 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center'
  /** 是否在新Toast出现时关闭之前的 */
  newestOnTop?: boolean
  /** 自定义类名 */
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  maxCount: 5,
  position: 'top-right',
  newestOnTop: false
})

// Store
const uiStore = useUIStore()

// 组件引用
const containerRef = ref<HTMLElement>()

// 计算属性
const toasts = computed(() => uiStore.toasts)

const containerClasses = computed(() => ({
  'toast-container': true,
  [`toast-container--${props.position}`]: true,
  ['toast-container--newest-on-top']: props.newestOnTop,
  'custom-class': !!props.className
}))

// 可见的Toast列表（限制数量）
const visibleToasts = computed(() => {
  const toastsList = [...toasts.value]
  return props.newestOnTop
    ? toastsList.slice(-props.maxCount).reverse()
    : toastsList.slice(0, props.maxCount)
})

// 处理Toast关闭
const handleClose = (toastId: string) => {
  uiStore.removeToast(toastId)
}

// 处理鼠标进入（暂停自动关闭）
const handleMouseEnter = (toastId: string) => {
  // 可以在这里实现暂停自动关闭的逻辑
  // 需要在ToastItem中配合实现
}

const handleMouseLeave = (toastId: string) => {
  // 可以在这里实现恢复自动关闭的逻辑
}

// 键盘事件处理（ESC关闭所有Toast）
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && event.ctrlKey) {
    // Ctrl+ESC 关闭所有Toast
    uiStore.toasts.forEach(toast => {
      uiStore.removeToast(toast.id)
    })
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

// Toast容器
.toast-container {
  position: fixed;
  z-index: var(--z-index-toast);
  pointer-events: none;
  max-width: 100vw;

  // 位置变体
  &--top-right {
    top: var(--spacing-lg);
    right: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  &--top-left {
    top: var(--spacing-lg);
    left: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  &--top-center {
    top: var(--spacing-lg);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &--bottom-right {
    bottom: var(--spacing-lg);
    right: var(--spacing-lg);
    display: flex;
    flex-direction: column-reverse;
    align-items: flex-end;
  }

  &--bottom-left {
    bottom: var(--spacing-lg);
    left: var(--spacing-lg);
    display: flex;
    flex-direction: column-reverse;
    align-items: flex-start;
  }

  &--bottom-center {
    bottom: var(--spacing-lg);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
  }

  // 最新的在上面
  &--newest-on-top {
    &.toast-container--top-right,
    &.toast-container--top-left,
    &.toast-container--top-center {
      flex-direction: column-reverse;
    }

    &.toast-container--bottom-right,
    &.toast-container--bottom-left,
    &.toast-container--bottom-center {
      flex-direction: column;
    }
  }
}

// Toast列表
.toast-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  pointer-events: auto;
  max-width: 400px;
  width: 100%;

  // 为Toast动画提供容器高度
  --toast-count: 0;
  --toast-height: 80px;
  --total-height: calc(var(--toast-count) * var(--toast-height));
  min-height: var(--total-height);
}

// Toast动画
.toast-enter-active,
.toast-leave-active {
  transition: all var(--transition-normal);
}

.toast-enter-active {
  transition-delay: calc(var(--toast-index) * 100ms);
}

.toast-leave-active {
  position: absolute;
  right: 0;
  left: 0;
}

.toast-move {
  transition: transform var(--transition-normal);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);

  .toast-container--bottom-right &,
  .toast-container--bottom-left &,
  .toast-container--bottom-center & {
    transform: translateY(20px) scale(0.9);
  }

  .toast-container--top-left &,
  .toast-container--bottom-left & {
    transform: translateX(-20px) scale(0.9);
  }
}

.toast-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-10px);
}

// 响应式适配
@include mobile {
  .toast-container {
    &--top-right,
    &--top-left,
    &--bottom-right,
    &--bottom-left {
      left: var(--spacing-md);
      right: var(--spacing-md);
      align-items: center;
    }

    &--top-center,
    &--bottom-center {
      left: var(--spacing-md);
      right: var(--spacing-md);
      transform: none;
    }
  }

  .toast-list {
    max-width: 100%;
  }
}

// 高对比度模式
@media (prefers-contrast: high) {
  .toast-container {
    // Toast组件内部会处理高对比度样式
  }
}

// 减少动画偏好
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active,
  .toast-move {
    transition: none;
  }

  .toast-enter-from,
  .toast-leave-to {
    transform: none;
    opacity: 0;
  }
}

// 打印样式
@media print {
  .toast-container {
    display: none;
  }
}
</style>
