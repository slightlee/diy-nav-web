<template>
  <button
    class="peek-bird-sprite"
    :class="{ 'is-visible': isVisible || !isAnimated, 'is-static': !isAnimated }"
    type="button"
    aria-label="唤醒 AI 助手"
    @click="$emit('activate')"
  >
    <span class="peek-bird-sprite__frames" aria-hidden="true">
      <img
        v-for="frame in 4"
        :key="frame"
        class="peek-bird-sprite__frame"
        :class="[`peek-bird-sprite__frame--${frame}`]"
        :src="`/icons/ai-peek/frame-${frame}.png`"
        alt=""
      />
    </span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  isVisible: boolean
  isAnimated: boolean
}>()

defineEmits<{
  activate: []
}>()
</script>

<style scoped>
.peek-bird-sprite {
  width: 112px;
  height: 135px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  overflow: visible;
  position: absolute;
  right: -12px;
  top: 0;
  transform: translateX(8px);
  transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

.peek-bird-sprite.is-visible {
  transform: translateX(0);
}

.peek-bird-sprite:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 4px;
  border-radius: 14px;
}

.peek-bird-sprite__frames {
  width: 100%;
  height: 100%;
  display: block;
  position: relative;
}

.peek-bird-sprite__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  opacity: 0;
}

.peek-bird-sprite__frame--1 {
  opacity: 1;
}

.peek-bird-sprite.is-visible:not(.is-static) .peek-bird-sprite__frame {
  animation-duration: 1.6s;
  animation-timing-function: steps(1, end);
  animation-iteration-count: infinite;
  animation-play-state: running;
}

.peek-bird-sprite.is-visible .peek-bird-sprite__frame--1 {
  animation-name: peek-bird-frame-1;
}

.peek-bird-sprite.is-visible .peek-bird-sprite__frame--2 {
  animation-name: peek-bird-frame-2;
}

.peek-bird-sprite.is-visible .peek-bird-sprite__frame--3 {
  animation-name: peek-bird-frame-3;
}

.peek-bird-sprite.is-visible .peek-bird-sprite__frame--4 {
  animation-name: peek-bird-frame-4;
}

@keyframes peek-bird-frame-1 {
  0%,
  24.99% {
    opacity: 1;
  }
  25%,
  100% {
    opacity: 0;
  }
}

@keyframes peek-bird-frame-2 {
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

@keyframes peek-bird-frame-3 {
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

@keyframes peek-bird-frame-4 {
  0%,
  74.99% {
    opacity: 0;
  }
  75%,
  100% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .peek-bird-sprite,
  .peek-bird-sprite__frames {
    transition: none;
  }
  .peek-bird-sprite__frame {
    animation: none;
  }

  .peek-bird-sprite__frame--1 {
    opacity: 1;
  }
}
</style>
