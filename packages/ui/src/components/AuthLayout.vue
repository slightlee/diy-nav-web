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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
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
  border-radius: 26px;
  padding: 40px 52px;
  box-shadow: var(--shadow-card, 0 28px 60px rgba(15, 23, 42, 0.12));
  width: 100%;
  max-width: 520px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition:
    background-color 0.3s ease,
    box-shadow 0.3s ease;
}

/* Optional: Border for dark mode could be handled via var(--border-color) if available. */
:global([data-theme='dark']) .auth-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
}

@media (max-width: 640px) {
  .auth-card {
    padding: 32px 24px;
    border-radius: 22px;
  }
}
</style>
