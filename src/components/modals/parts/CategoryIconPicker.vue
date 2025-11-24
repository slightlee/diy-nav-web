<template>
  <div class="manage-categories-modal__icon-select">
    <BaseButton
      class="manage-categories-modal__icon-btn"
      variant="secondary"
      size="lg"
      shape="rounded"
      :icon="modelValue || 'fas fa-folder'"
      aria-label="选择图标"
      @click="toggle"
    />
    <div v-if="open" class="manage-categories-modal__icon-panel">
      <button
        v-for="icon in iconOptions"
        :key="icon"
        type="button"
        class="manage-categories-modal__icon-item"
        :class="{ 'is-active': (modelValue || 'fas fa-folder') === icon }"
        @click="select(icon)"
      >
        <i :class="icon" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'

interface Props {
  modelValue: string
}

defineProps<Props>()
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const iconOptions = [
  'fas fa-folder',
  'fas fa-bookmark',
  'fas fa-briefcase',
  'fas fa-code',
  'fas fa-globe',
  'fas fa-star',
  'fas fa-chart-bar',
  'fas fa-graduation-cap',
  'fas fa-music',
  'fas fa-film',
  'fas fa-cog',
  'fas fa-lightbulb',
  'fas fa-heart',
  'fas fa-bolt'
]

const toggle = () => {
  open.value = !open.value
}
const select = (icon: string) => {
  emit('update:modelValue', icon)
  open.value = false
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.manage-categories-modal__icon-select {
  position: relative;
  flex-shrink: 0;
}

.manage-categories-modal__icon-btn {
  width: 48px;
  min-width: 48px;
  height: 48px;
  padding: 0;
  background-color: var(--color-neutral-100);
  border-color: var(--color-neutral-200);
  border-radius: var(--radius-md);
}

.manage-categories-modal__icon-panel {
  position: absolute;
  top: calc(100% + var(--spacing-xs));
  left: 0;
  background-color: var(--color-neutral-100);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-sm);
  display: grid;
  grid-template-columns: repeat(8, 36px);
  gap: var(--spacing-xs);
  z-index: 1000;
  max-height: 240px;
  overflow-y: auto;
  width: max-content;
}

.manage-categories-modal__icon-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-neutral-100);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.manage-categories-modal__icon-item:hover {
  transform: scale(1.06);
  background-color: var(--color-neutral-200);
}

.manage-categories-modal__icon-item.is-active {
  border-color: var(--color-primary);
  background-color: rgba(var(--color-primary-rgb), 0.08);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}
</style>
