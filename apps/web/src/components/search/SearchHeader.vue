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
        @update:model-value="$emit('update:modelValue', $event)"
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
    box-shadow: 0 8px 30px rgba(37, 99, 235, 0.15);
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
    box-shadow: 0 8px 30px rgba(37, 99, 235, 0.25);
  }
}

.search-button {
  background: var(--color-primary);
  border: none;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
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
    opacity: 0.9;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
}
</style>
