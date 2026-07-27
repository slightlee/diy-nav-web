<script setup lang="ts">
/**
 * AI Assistant Component
 * Edge bird with expandable chat panel
 */
import { ref, computed, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import AIPanel from './AIPanel.vue'
import PeekBirdSprite from './PeekBirdSprite.vue'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const isPanelOpen = ref(false)
const isPanelVisible = ref(false)
const isDocked = ref(true)
const isPeekVisible = ref(false)
const isPointerInside = ref(false)
const isFlying = ref(false)
const flightDirection = ref<'in' | 'out'>('in')
const assistantRef = ref<HTMLElement | null>(null)
let autoDockTimer: ReturnType<typeof setTimeout> | null = null
let flightTimer: ReturnType<typeof setTimeout> | null = null
let panelRevealTimer: ReturnType<typeof setTimeout> | null = null

const AUTO_DOCK_DELAY = 8000
const FLIGHT_DURATION = 2600
const PANEL_REVEAL_DELAY = 1800

const isLoggedIn = computed(() => authStore.isAuthenticated)
const isAnimationEnabled = computed(() => settingsStore.settings.aiAnimationEnabled !== false)

const openPanel = () => {
  if (!isDocked.value) return

  isPeekVisible.value = false
  isDocked.value = false
  isPanelOpen.value = true
  isPanelVisible.value = false

  if (!isAnimationEnabled.value) {
    isPanelVisible.value = true
    scheduleAutoDock()
    return
  }

  startFlight('in')
  revealPanelAfterFlightBegins()
  scheduleAutoDock()
}

const closePanel = () => {
  clearPanelRevealTimer()
  const wasPanelVisible = isPanelVisible.value
  isPanelOpen.value = false
  isPanelVisible.value = false
  isPeekVisible.value = false

  if (!wasPanelVisible && !isAnimationEnabled.value) isDocked.value = true
  if (!wasPanelVisible && isAnimationEnabled.value) startFlight('out')
}

const clearAutoDockTimer = () => {
  if (autoDockTimer) {
    clearTimeout(autoDockTimer)
    autoDockTimer = null
  }
}

const scheduleAutoDock = () => {
  clearAutoDockTimer()
  autoDockTimer = setTimeout(() => {
    const activeElement = document.activeElement
    const hasFocusedControl = Boolean(activeElement && assistantRef.value?.contains(activeElement))

    if (isPointerInside.value || hasFocusedControl) {
      scheduleAutoDock()
      return
    }

    closePanel()
  }, AUTO_DOCK_DELAY)
}

const clearPanelRevealTimer = () => {
  if (panelRevealTimer) {
    clearTimeout(panelRevealTimer)
    panelRevealTimer = null
  }
}

const revealPanelAfterFlightBegins = () => {
  clearPanelRevealTimer()
  panelRevealTimer = setTimeout(() => {
    if (isPanelOpen.value) {
      isPanelVisible.value = true
    }
  }, PANEL_REVEAL_DELAY)
}

const handlePanelLeave = () => {
  if (!isPanelOpen.value) {
    if (isAnimationEnabled.value) startFlight('out')
    else isDocked.value = true
  }
}

const clearFlightTimer = () => {
  if (flightTimer) {
    clearTimeout(flightTimer)
    flightTimer = null
  }
}

const startFlight = (direction: 'in' | 'out') => {
  clearFlightTimer()
  flightDirection.value = direction
  isFlying.value = true
  flightTimer = setTimeout(() => {
    isFlying.value = false
    if (direction === 'out') {
      isDocked.value = true
    }
  }, FLIGHT_DURATION)
}

const handlePointerEnter = () => {
  isPointerInside.value = true
  if (isDocked.value) isPeekVisible.value = true
  clearAutoDockTimer()
}

const handlePointerLeave = () => {
  isPointerInside.value = false
  if (isDocked.value) {
    isPeekVisible.value = false
  } else {
    scheduleAutoDock()
  }
}

const handleActivity = () => {
  if (!isDocked.value && !isPointerInside.value) scheduleAutoDock()
}

onBeforeUnmount(() => {
  clearAutoDockTimer()
  clearFlightTimer()
  clearPanelRevealTimer()
})
</script>

<template>
  <div
    v-if="isLoggedIn"
    ref="assistantRef"
    class="ai-assistant"
    :class="{ 'is-docked': isDocked && !isPanelOpen }"
    @mouseenter="handlePointerEnter"
    @mouseleave="handlePointerLeave"
    @pointermove="handleActivity"
    @focusin="handleActivity"
    @keydown="handleActivity"
  >
    <PeekBirdSprite
      v-if="isDocked && !isPanelOpen"
      :is-visible="isPeekVisible"
      :is-animated="isAnimationEnabled"
      @activate="openPanel"
    />

    <div
      v-if="isFlying"
      class="ai-flight-bird"
      :class="`is-flight-${flightDirection}`"
      aria-hidden="true"
    >
      <img
        v-for="frame in 4"
        :key="frame"
        class="ai-flight-bird__frame"
        :class="[`ai-flight-bird__frame--${frame}`]"
        :src="`/icons/ai-flight-full/frame-${frame}.png`"
        alt=""
      />
    </div>

    <!-- Chat Panel -->
    <Transition name="slide-up" @after-leave="handlePanelLeave">
      <AIPanel v-if="isPanelVisible && isPanelOpen" @close="closePanel" />
    </Transition>
  </div>
</template>

<style scoped>
.ai-assistant {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 60px;
  height: 60px;
  z-index: 1000;
}

.ai-assistant.is-docked {
  right: 0;
  width: 24px;
  height: 135px;
}

.ai-flight-bird {
  position: fixed;
  right: -12px;
  bottom: 4px;
  width: 112px;
  height: 135px;
  pointer-events: none;
  z-index: 2;
  offset-path: path(
    'M 0 0 C 20 -160 -15 -270 -105 -325 C -170 -370 -235 -320 -215 -375 C -198 -412 -180 -430 -218 -442 C -230 -450 -242 -447 -251 -449'
  );
  offset-rotate: 0deg;
  will-change: offset-distance, transform, opacity;
}

.ai-flight-bird__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  filter: drop-shadow(0 8px 12px rgba(var(--color-primary-rgb), 0.18));
}

.ai-flight-bird__frame--1 {
  opacity: 1;
}

.ai-flight-bird.is-flight-in .ai-flight-bird__frame,
.ai-flight-bird.is-flight-out .ai-flight-bird__frame {
  animation-duration: 0.8s;
  animation-timing-function: steps(1, end);
  animation-iteration-count: infinite;
}

.ai-flight-bird.is-flight-in .ai-flight-bird__frame--1,
.ai-flight-bird.is-flight-out .ai-flight-bird__frame--1 {
  animation-name: ai-flight-frame-1;
}

.ai-flight-bird.is-flight-in .ai-flight-bird__frame--2,
.ai-flight-bird.is-flight-out .ai-flight-bird__frame--2 {
  animation-name: ai-flight-frame-2;
}

.ai-flight-bird.is-flight-in .ai-flight-bird__frame--3,
.ai-flight-bird.is-flight-out .ai-flight-bird__frame--3 {
  animation-name: ai-flight-frame-3;
}

.ai-flight-bird.is-flight-in .ai-flight-bird__frame--4,
.ai-flight-bird.is-flight-out .ai-flight-bird__frame--4 {
  animation-name: ai-flight-frame-4;
}

@keyframes ai-flight-frame-1 {
  0%,
  24.99% {
    opacity: 1;
  }
  25%,
  100% {
    opacity: 0;
  }
}

@keyframes ai-flight-frame-2 {
  0%,
  24.99%,
  50%,
  100% {
    opacity: 0;
  }
  25%,
  49.99% {
    opacity: 1;
  }
}

@keyframes ai-flight-frame-3 {
  0%,
  49.99%,
  75%,
  100% {
    opacity: 0;
  }
  50%,
  74.99% {
    opacity: 1;
  }
}

@keyframes ai-flight-frame-4 {
  0%,
  74.99% {
    opacity: 0;
  }
  75%,
  100% {
    opacity: 1;
  }
}

.ai-flight-bird.is-flight-in {
  animation: ai-flight-in 2.6s cubic-bezier(0.18, 0.72, 0.22, 1) forwards;
}

.ai-flight-bird.is-flight-out {
  animation: ai-flight-out 2.6s cubic-bezier(0.18, 0.72, 0.22, 1) forwards;
}

@keyframes ai-flight-in {
  0% {
    offset-distance: 0%;
    transform: rotate(-12deg) scale(1);
    opacity: 1;
  }
  14% {
    offset-distance: 0%;
    transform: rotate(-8deg) scale(1.02);
    opacity: 1;
  }
  42% {
    offset-distance: 38%;
    transform: rotate(-4deg) scale(0.78);
    opacity: 1;
  }
  68% {
    offset-distance: 68%;
    transform: rotate(4deg) scale(0.64);
    opacity: 1;
  }
  86% {
    offset-distance: 88%;
    transform: rotate(2deg) scale(0.56);
    opacity: 1;
  }
  94% {
    offset-distance: 96%;
    transform: rotate(0) scale(0.54);
    opacity: 1;
  }
  100% {
    offset-distance: 100%;
    transform: rotate(0) scale(0.52);
    opacity: 0;
  }
}

@keyframes ai-flight-out {
  0% {
    offset-distance: 100%;
    transform: rotate(0) scaleX(-1) scale(0.52);
    opacity: 0;
  }
  14% {
    offset-distance: 100%;
    transform: rotate(0) scaleX(-1) scale(0.54);
    opacity: 1;
  }
  32% {
    offset-distance: 88%;
    transform: rotate(-2deg) scaleX(-1) scale(0.56);
    opacity: 1;
  }
  54% {
    offset-distance: 68%;
    transform: rotate(-4deg) scaleX(-1) scale(0.64);
    opacity: 1;
  }
  76% {
    offset-distance: 38%;
    transform: rotate(4deg) scaleX(-1) scale(0.78);
    opacity: 1;
  }
  90% {
    offset-distance: 8%;
    transform: rotate(8deg) scaleX(-1) scale(1.02);
    opacity: 1;
  }
  100% {
    offset-distance: 0%;
    transform: rotate(12deg) scale(1);
    opacity: 1;
  }
}

/* Panel Transition */
.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.35s ease;
  transform-origin: bottom right;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translate3d(16px, 18px, 0) scale(0.96);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .ai-flight-bird,
  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: none;
  }
}

@media (max-width: 768px) {
  .ai-assistant {
    right: 16px;
    bottom: 16px;
    width: 60px;
    height: 60px;
  }

  .ai-assistant.is-docked {
    right: 0;
    width: 24px;
    height: 135px;
  }

  .ai-flight-bird {
    right: -12px;
  }
}
</style>
