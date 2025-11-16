<template>
  <Teleport to="body">
    <Transition
      name="modal"
      appear
      @before-enter="onBeforeEnter"
      @after-leave="onAfterLeave"
    >
      <div
        v-if="isOpen"
        class="modal-overlay"
        tabindex="-1"
        @click="handleOverlayClick"
        @keydown.esc="handleEscape"
      >
        <div
          ref="modalRef"
          class="modal-container"
          :class="[`modal-size-${size}`, { 'modal-fullscreen': fullscreen }]"
          role="dialog"
          :aria-modal="true"
          :aria-labelledby="titleId"
          @click.stop
        >
          <!-- 模态框头部 -->
          <header v-if="title || $slots.header" class="modal-header">
            <slot name="header">
              <h2 :id="titleId" class="modal-title">
                {{ title }}
              </h2>
            </slot>
            <button
              v-if="showCloseButton"
              class="modal-close-btn"
              :aria-label="'关闭' + (title || '对话框')"
              @click="handleClose"
            >
              <i class="fas fa-times" />
            </button>
          </header>

          <!-- 模态框内容 -->
          <main class="modal-body" :class="{ 'modal-body-scrollable': scrollable }">
            <slot />
          </main>

          <!-- 模态框底部 -->
          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  /** 是否打开模态框 */
  isOpen: boolean
  /** 模态框标题 */
  title?: string
  /** 模态框尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** 是否全屏显示 */
  fullscreen?: boolean
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean
  /** 点击遮罩是否关闭 */
  closeOnOverlay?: boolean
  /** 按ESC是否关闭 */
  closeOnEscape?: boolean
  /** 内容区域是否可滚动 */
  scrollable?: boolean
  /** 防止body滚动 */
  preventBodyScroll?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'open'): void
  (e: 'afterOpen'): void
  (e: 'afterClose'): void
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  fullscreen: false,
  showCloseButton: true,
  closeOnOverlay: true,
  closeOnEscape: true,
  scrollable: false,
  preventBodyScroll: true
})

const emit = defineEmits<Emits>()

// 模态框引用
const modalRef = ref<HTMLElement>()

// 生成唯一的标题ID
const titleId = computed(() => {
  return props.title ? `modal-title-${Date.now()}` : undefined
})

// 处理打开事件
watch(() => props.isOpen, async newVal => {
  if (newVal) {
    emit('open')
    await nextTick()
    if (props.preventBodyScroll) {
      document.body.style.overflow = 'hidden'
    }
    // 聚焦到模态框
    if (modalRef.value) {
      modalRef.value.focus()
    }
  }
})

// 处理关闭事件
const handleClose = () => {
  emit('close')
}

// 处理遮罩点击
const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    handleClose()
  }
}

// 处理ESC键
const handleEscape = (event: KeyboardEvent) => {
  if (props.closeOnEscape && event.key === 'Escape') {
    handleClose()
  }
}

// 动画钩子
const onBeforeEnter = () => {
  if (props.preventBodyScroll) {
    document.body.style.overflow = 'hidden'
  }
}

const onAfterLeave = () => {
  if (props.preventBodyScroll) {
    document.body.style.overflow = ''
  }
  emit('afterClose')
}

// 清理
onUnmounted(() => {
  if (props.preventBodyScroll) {
    document.body.style.overflow = ''
  }
})

// 处理焦点管理
const handleFocusTrap = (event: KeyboardEvent) => {
  if (!modalRef.value || !props.isOpen) return

  const focusableElements = Array.from(
    modalRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  )

  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  if (event.key === 'Tab') {
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }
  }
}

// 监听键盘事件
onMounted(() => {
  document.addEventListener('keydown', handleFocusTrap)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleFocusTrap)
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

// 模态框遮罩
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-modal);
  padding: var(--spacing-lg);
  backdrop-filter: blur(4px);
}

// 模态框容器
.modal-container {
  background-color: var(--color-neutral-50);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  &.modal-fullscreen {
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
    border-radius: 0;
  }

  // 尺寸变体
  &.modal-size-sm {
    width: 100%;
    max-width: 400px;
  }

  &.modal-size-md {
    width: 100%;
    max-width: 600px;
  }

  &.modal-size-lg {
    width: 100%;
    max-width: 800px;
  }

  &.modal-size-xl {
    width: 100%;
    max-width: 1200px;
  }
}

// 模态框头部
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0;
  flex: 1;
}

.modal-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: var(--color-neutral-500);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);

  &:hover {
    background-color: var(--color-neutral-100);
    color: var(--color-neutral-700);
  }

  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

// 模态框内容
.modal-body {
  padding: var(--spacing-lg);
  flex: 1;
  overflow-y: auto;

  &.modal-body-scrollable {
    overflow-y: auto;
    max-height: calc(90vh - 140px);
  }

  // 全屏模式下的内容区域
  .modal-fullscreen & {
    max-height: calc(100vh - 140px);
  }
}

// 模态框底部
.modal-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

// 过渡动画
.modal-enter-active,
.modal-leave-active {
  transition: all var(--transition-normal);
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: all var(--transition-normal);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9) translateY(-20px);
  opacity: 0;
}

// 响应式适配
@include mobile {
  .modal-overlay {
    padding: var(--spacing-sm);
  }

  .modal-container {
    &.modal-size-sm,
    &.modal-size-md,
    &.modal-size-lg,
    &.modal-size-xl {
      max-width: 100vw;
      width: 100vw;
      height: 100vh;
      max-height: 100vh;
      border-radius: 0;
    }
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: var(--spacing-md);
  }
}

// 打印样式
@media print {
  .modal-overlay {
    position: static;
    background-color: transparent;
    backdrop-filter: none;
    padding: 0;
  }

  .modal-container {
    box-shadow: none;
    border: 1px solid var(--color-border);
    max-height: none;
  }
}

// 高对比度模式
@media (prefers-contrast: high) {
  .modal-overlay {
    background-color: rgba(0, 0, 0, 0.8);
  }

  .modal-container {
    border: 2px solid var(--color-black);
  }
}

// 减少动画偏好
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active {
    transition: none;
  }

  .modal-enter-active .modal-container,
  .modal-leave-active .modal-container {
    transition: none;
  }
}
</style>
