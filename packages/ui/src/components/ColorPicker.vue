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

withDefaults(defineProps<Props>(), {
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
  gap: $spacing-xs;

  &__item {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid $color-border;
    cursor: pointer;
    padding: 0;
    transition:
      transform $transition-fast,
      box-shadow $transition-fast;

    &--active {
      box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.9);
      transform: scale(1.06);
    }
  }

  &__input {
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;

    &::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    &::-webkit-color-swatch {
      border: 1px solid $color-border;
      border-radius: $border-radius-md;
    }
  }
}
</style>
