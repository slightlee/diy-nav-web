<script setup lang="ts">
/**
 * AI Assistant Component
 * Floating bubble with expandable chat panel
 */
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AIPanel from './AIPanel.vue'

const authStore = useAuthStore()

const isPanelOpen = ref(false)
const isMinimized = ref(false)

const isLoggedIn = computed(() => authStore.isAuthenticated)

const togglePanel = () => {
  if (!isPanelOpen.value) {
    isPanelOpen.value = true
    isMinimized.value = false
  } else {
    isPanelOpen.value = false
  }
}

const minimizePanel = () => {
  isMinimized.value = true
}

const closePanel = () => {
  isPanelOpen.value = false
  isMinimized.value = false
}
</script>

<template>
  <div v-if="isLoggedIn" class="ai-assistant">
    <!-- Floating Bubble -->
    <button
      class="ai-bubble"
      :class="{ 'is-active': isPanelOpen && !isMinimized }"
      title="AI 助手"
      @click="togglePanel"
    >
      <i class="fas fa-robot" />
      <span v-if="!isPanelOpen" class="pulse-ring" />
    </button>

    <!-- Chat Panel -->
    <Transition name="slide-up">
      <AIPanel v-if="isPanelOpen && !isMinimized" @close="closePanel" @minimize="minimizePanel" />
    </Transition>
  </div>
</template>

<style scoped>
.ai-assistant {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

.ai-bubble {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
  border: none;
  color: white;
  font-size: 26px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 8px 32px rgba(59, 130, 246, 0.35),
    0 4px 12px rgba(37, 99, 235, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  backdrop-filter: blur(10px);
}

.ai-bubble::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 50%);
  pointer-events: none;
}

.ai-bubble:hover {
  transform: scale(1.08) translateY(-2px);
  box-shadow:
    0 12px 40px rgba(59, 130, 246, 0.45),
    0 6px 16px rgba(37, 99, 235, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.ai-bubble:active {
  transform: scale(0.98);
}

.ai-bubble.is-active {
  transform: scale(0.9);
  opacity: 0.8;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid rgba(59, 130, 246, 0.5);
  animation: pulse 2s ease-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

/* Panel Transition */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(24px) scale(0.95);
  opacity: 0;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .ai-bubble {
    box-shadow:
      0 8px 32px rgba(59, 130, 246, 0.25),
      0 4px 12px rgba(37, 99, 235, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
}
</style>
