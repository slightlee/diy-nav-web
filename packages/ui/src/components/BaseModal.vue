<template>
  <Teleport to="body">
    <Transition name="modal" appear @before-enter="onBeforeEnter" @after-leave="onAfterLeave">
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
          <header v-if="title || $slots.header" class="modal-header">
            <slot name="header">
              <h2 :id="titleId" class="modal-title">{{ title }}</h2>
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
          <main class="modal-body" :class="{ 'modal-body-scrollable': scrollable }">
            <slot />
          </main>
          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

export interface Props {
  isOpen: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fullscreen?: boolean
  showCloseButton?: boolean
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
  scrollable?: boolean
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
const modalRef = ref<HTMLElement>()
const titleId = computed(() => (props.title ? `modal-title-${Date.now()}` : undefined))

watch(
  () => props.isOpen,
  async newVal => {
    if (newVal) {
      emit('open')
      if (props.preventBodyScroll) document.body.style.overflow = 'hidden'
      await nextTick()
      modalRef.value?.focus()
    }
  }
)

const handleClose = () => emit('close')
const handleOverlayClick = () => {
  if (props.closeOnOverlay) handleClose()
}
const handleEscape = (event: KeyboardEvent) => {
  if (props.closeOnEscape && event.key === 'Escape') handleClose()
}
const onBeforeEnter = () => {
  if (props.preventBodyScroll) document.body.style.overflow = 'hidden'
}
const onAfterLeave = () => {
  const otherModals = document.querySelectorAll('.modal-overlay')
  if (props.preventBodyScroll && otherModals.length === 0) {
    document.body.style.overflow = ''
  }
  emit('afterClose')
}

const handleFocusTrap = (event: KeyboardEvent) => {
  if (!modalRef.value || !props.isOpen) return
  const focusable = Array.from(
    modalRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.key === 'Tab') {
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
  }
}

onMounted(() => document.addEventListener('keydown', handleFocusTrap))
onUnmounted(() => {
  document.removeEventListener('keydown', handleFocusTrap)
  const otherModals = document.querySelectorAll('.modal-overlay')
  if (props.preventBodyScroll && otherModals.length === 0) {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;
@use '../styles/mixins.scss' as *;
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-modal);
  padding: var(--spacing-lg);
  backdrop-filter: blur(8px);
}
.modal-container {
  background-color: #fff;
  border-radius: 16px;
  box-shadow: var(--shadow-xl);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.modal-fullscreen {
  width: 100vw;
  height: 100vh;
  max-width: none;
  max-height: none;
  border-radius: 0;
}
.modal-size-sm {
  width: 100%;
  max-width: 400px;
}
.modal-size-md {
  width: 100%;
  max-width: 600px;
}
.modal-size-lg {
  width: 100%;
  max-width: 800px;
}
.modal-size-xl {
  width: 100%;
  max-width: 1200px;
}
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
}
.modal-close-btn:hover {
  background-color: var(--color-neutral-100);
  color: var(--color-neutral-700);
}
.modal-close-btn:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.modal-body {
  padding: var(--spacing-lg);
  flex: 1;
  overflow-y: auto;
}
.modal-body-scrollable {
  overflow-y: auto;
  max-height: calc(90vh - 140px);
}
.modal-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}
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
@include mobile {
  .modal-overlay {
    padding: var(--spacing-sm);
  }
  .modal-size-sm,
  .modal-size-md,
  .modal-size-lg,
  .modal-size-xl {
    max-width: 100vw;
    width: 100vw;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: var(--spacing-md);
  }
}
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
@media (prefers-contrast: high) {
  .modal-overlay {
    background-color: rgba(0, 0, 0, 0.8);
  }
  .modal-container {
    border: 2px solid var(--color-black);
  }
}
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
