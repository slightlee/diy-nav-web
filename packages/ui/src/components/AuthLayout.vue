<template>
  <div class="auth-layout">
    <div class="auth-card">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// Layout container for Auth pages
</script>

<style scoped>
/* Layout container */
.auth-layout {
  width: 100%;
  min-height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 16px;
  /* Use app-provided vars, fallback to light theme defaults */
  background-color: var(--bg-page, #f3f4f8);
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  transition: background-color 0.3s ease;
}

.auth-card {
  background-color: var(--bg-card, #fff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 24px;
  padding: 36px 44px;
  box-shadow: 0 22px 55px rgba(15, 23, 42, 0.08);
  width: 100%;
  max-width: 500px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition:
    background-color 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

@media (max-width: 640px) {
  .auth-card {
    padding: 32px 24px;
    border-radius: 22px;
  }
}
</style>
