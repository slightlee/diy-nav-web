<template>
  <div class="logo-wrapper" :class="{ 'is-pulsing': pulsing }">
    <router-link v-if="link" :to="link" class="logo" :title="title">
      <slot>D</slot>
    </router-link>
    <div v-else class="logo">
      <slot>D</slot>
    </div>
    <div v-if="pulsing" class="logo-pulse" />
  </div>
</template>

<script setup lang="ts">
defineProps({
  pulsing: {
    type: Boolean,
    default: false
  },
  link: {
    type: String,
    default: undefined
  },
  title: {
    type: String,
    default: undefined
  }
})
</script>

<style scoped>
.logo-wrapper {
  position: relative;
  width: 64px; /* Default size, can be overridden by parent or props if needed, but keeping fixed for Auth consistency */
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  border-radius: 18px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  font-size: 32px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.3);
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

/* Hover effect only if it's a link */
a.logo:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 20px rgba(37, 99, 235, 0.45);
}

.logo-pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 18px;
  background: rgba(37, 99, 235, 0.4);
  z-index: 1;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  70% {
    transform: scale(1.4);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}
</style>
