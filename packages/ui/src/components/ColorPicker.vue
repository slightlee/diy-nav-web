<template>
  <div class="nav-color-picker">
    <button
      v-for="c in colors"
      :key="c"
      type="button"
      class="nav-color-picker__item"
      :style="{ backgroundColor: c }"
      :class="{ 'nav-color-picker__item--active': c === modelValue }"
      @click="emit('update:modelValue', c)"
    />
    <input
      type="color"
      class="nav-color-picker__input"
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<script setup lang="ts">
export interface Props {
  modelValue: string
  colors?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  colors: () => ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280']
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;

.nav-color-picker {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);

  &__item {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    cursor: pointer;
    padding: 0;
    transition: box-shadow var(--transition-fast);

    &--active {
      box-shadow: 0 0 0 2px var(--color-primary);
    }
  }

  &__input {
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;

    &::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    &::-webkit-color-swatch {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
    }
  }
}
</style>
