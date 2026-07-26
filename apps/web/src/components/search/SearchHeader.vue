<template>
  <div class="search-header">
    <div class="search-container">
      <BaseInput
        ref="searchInput"
        :model-value="modelValue"
        placeholder="根据网站名称、标签、描述搜索"
        size="lg"
        shape="rounded"
        class="main-search-input"
        @update:model-value="$emit('update:modelValue', $event as string)"
      >
        <template #suffix>
          <button class="search-button" aria-label="搜索">
            <i class="fas fa-search" />
          </button>
        </template>
      </BaseInput>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BaseInput } from '@nav/ui'

defineProps<{
  modelValue: string
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<style scoped lang="scss">
.search-header {
  margin-bottom: 0.5rem;
}

.search-container {
  max-width: 800px;
  margin: 0 auto;
}

:deep(.main-search-input .base-input__wrapper) {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-tile);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border-radius: 999px;
  padding-left: 1rem;
  height: 56px;
  transition:
    background-color 0.3s ease,
    box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
  }

  &.base-input__wrapper--focused {
    box-shadow: 0 8px 30px rgba(var(--color-primary-rgb), 0.16);
    border-color: var(--color-primary);
  }
}

:deep(.main-search-input .base-input__inner) {
  font-size: 16px;
  height: 100%;
}

:global([data-theme='dark']) :deep(.main-search-input .base-input__wrapper) {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);

  &.base-input__wrapper--focused {
    box-shadow: 0 8px 30px rgba(var(--color-primary-rgb), 0.24);
  }
}

.search-button {
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-size: 14px;
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  min-height: 0;
  min-width: 0;
  border-radius: 50%;
  margin-right: 6px;

  &:hover {
    background: var(--primary-soft);
    color: var(--color-primary-dark);
  }

  &:active {
    background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  }
}
</style>
