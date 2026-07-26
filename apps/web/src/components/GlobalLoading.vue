<template>
  <Teleport to="body">
    <Transition name="global-loading-fade">
      <div
        v-if="uiStore.isLoading"
        class="global-loading"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div class="global-loading__card">
          <div class="global-loading__spinner" aria-hidden="true" />
          <p class="global-loading__text">{{ uiStore.loadingMessage }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
</script>

<style scoped lang="scss">
.global-loading {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
}

.global-loading__card {
  min-width: 200px;
  max-width: min(90vw, 320px);
  padding: 24px 28px;
  border-radius: 16px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, rgba(148, 163, 184, 0.25));
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.global-loading__spinner {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid rgba(var(--color-primary-rgb), 0.2);
  border-top-color: var(--color-primary);
  animation: global-loading-spin 0.75s linear infinite;
}

.global-loading__text {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main, #0f172a);
  text-align: center;
  line-height: 1.5;
}

.global-loading-fade-enter-active,
.global-loading-fade-leave-active {
  transition: opacity 0.18s ease;
}

.global-loading-fade-enter-from,
.global-loading-fade-leave-to {
  opacity: 0;
}

@keyframes global-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
