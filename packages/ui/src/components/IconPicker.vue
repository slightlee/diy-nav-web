<template>
  <div
    v-if="mode === 'inline'"
    class="icon-picker"
    :class="{ 'icon-picker--compact': props.compact }"
  >
    <button
      v-for="i in icons"
      :key="i"
      type="button"
      class="icon-item"
      :class="{ active: i === props.modelValue }"
      @click="$emit('update:modelValue', i)"
    >
      <i :class="i" />
    </button>
  </div>
  <div v-else class="icon-popover">
    <button class="icon-trigger" type="button" :aria-expanded="open" @click="toggle">
      <i :class="props.modelValue || 'fas fa-folder'" />
    </button>
    <div v-if="open" class="icon-backdrop" />
    <div v-if="open" class="icon-panel" @click.stop>
      <button
        v-for="i in icons"
        :key="i"
        type="button"
        class="icon-item"
        :class="{ active: i === props.modelValue }"
        @click="select(i)"
      >
        <i :class="i" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

export interface Props {
  modelValue: string
  compact?: boolean
  mode?: 'inline' | 'popover'
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  mode: 'inline'
})

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
const open = ref(false)
const mode = props.mode
const toggle = () => (open.value = !open.value)
const select = (i: string) => {
  emit('update:modelValue', i)
  open.value = false
}
const onDocClick = (e: Event) => {
  if (!open.value) return
  const target = e.target as HTMLElement
  if (!target.closest('.icon-popover')) open.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
const icons = [
  'fas fa-folder',
  'fas fa-folder-open',
  'fas fa-layer-group',
  'fas fa-box',
  'fas fa-cubes',
  'fas fa-database',
  'fas fa-cloud',
  'fas fa-server',
  'fas fa-code',
  'fas fa-code-branch',
  'fas fa-puzzle-piece',
  'fas fa-flask',
  'fas fa-wrench',
  'fas fa-tools',
  'fas fa-book',
  'fas fa-bookmark',
  'fas fa-graduation-cap',
  'fas fa-chart-line',
  'fas fa-globe',
  'fas fa-lightbulb',
  'fas fa-robot',
  'fas fa-star',
  'fas fa-heart',
  'fas fa-tag'
]
</script>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;

.icon-picker {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}
.icon-picker--compact {
  display: inline-flex;
  gap: var(--spacing-xs);
  flex-wrap: nowrap;
  overflow-x: auto;
}
.icon-item {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-white);
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background-color: var(--color-neutral-50);
    color: var(--color-primary);
    border-color: var(--color-primary);
  }

  &.active {
    background-color: var(--color-primary);
    color: var(--color-white);
    border-color: var(--color-primary);
  }
}

/* Popover styles */
.icon-popover {
  position: relative;
  display: inline-block;
}

.icon-trigger {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-white);
  color: var(--color-neutral-700);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-lg);

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
}

.icon-panel {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: var(--spacing-xs);
  padding: var(--spacing-sm);
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  width: 280px;
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  z-index: 1000;
}

.icon-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 999;
  background: transparent;
}
</style>
