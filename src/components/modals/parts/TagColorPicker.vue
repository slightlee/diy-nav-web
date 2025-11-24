<template>
  <div class="manage-tags-modal__color-picker">
    <label class="manage-tags-modal__color-label">颜色</label>
    <div class="manage-tags-modal__color-list">
      <button
        v-for="color in colors"
        :key="color"
        type="button"
        class="manage-tags-modal__color-btn"
        :class="{ 'manage-tags-modal__color-btn--selected': modelValue === color }"
        :style="{ backgroundColor: color }"
        @click="select(color)"
      >
        <i
          v-if="modelValue === color"
          class="fas fa-check"
          :style="{ color: getIconColor(color) }"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useTagStore } from '@/stores/tag'

interface Props {
  modelValue: string
  palette?: string[]
}

const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue'])

const tagStore = useTagStore()
const colors = computed<string[]>(() =>
  props.palette && props.palette.length ? props.palette : unref(tagStore.tagColors)
)

const select = (color: string) => {
  emit('update:modelValue', color)
}

const getIconColor = (hex: string) => {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return lum > 0.6 ? '#000' : '#fff'
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.manage-tags-modal__color-picker {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-sm);
}

.manage-tags-modal__color-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
}

.manage-tags-modal__color-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  min-height: 34px;
}

.manage-tags-modal__color-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: 2px solid var(--color-border);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;

  &:hover {
    transform: scale(1.1);
    border-color: var(--color-neutral-300);
  }

  &--selected {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
  }
}
</style>
