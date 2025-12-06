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
    <button
      ref="triggerRef"
      class="icon-trigger"
      type="button"
      :aria-expanded="open"
      @click="toggle"
    >
      <i :class="props.modelValue || 'fas fa-folder'" />
    </button>
    <div v-if="open" class="icon-backdrop" />
    <Teleport to="body">
      <div v-if="open" ref="panelRef" class="icon-panel" :style="panelStyle" @click.stop>
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
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

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
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelPosition = ref({ top: 0, left: 0 })
const mode = props.mode

const checkPosition = () => {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const panelHeight = panelRef.value?.offsetHeight || 220
  const spaceBelow = window.innerHeight - rect.bottom
  const margin = 8

  let top = rect.bottom + margin
  // Prefer top if space below is insufficient OR if we are in the bottom half of the screen and there is enough space above
  const spaceAbove = rect.top
  if (spaceBelow < panelHeight || (rect.top > window.innerHeight / 2 && spaceAbove > panelHeight)) {
    top = rect.top - panelHeight - margin
  }

  // Ensure top is not negative
  if (top < 0) top = margin

  panelPosition.value = {
    top,
    left: rect.left
  }
}

const panelStyle = computed(() => ({
  top: `${panelPosition.value.top}px`,
  left: `${panelPosition.value.left}px`
}))

const toggle = async () => {
  if (!open.value) {
    open.value = true
    // Wait for render to measure height
    setTimeout(() => {
      checkPosition()
    }, 0)
  } else {
    open.value = false
  }
}

const select = (i: string) => {
  emit('update:modelValue', i)
  open.value = false
}
const onDocClick = (e: Event) => {
  if (!open.value) return
  const target = e.target as HTMLElement
  if (!target.closest('.icon-panel') && !target.closest('.icon-trigger')) {
    open.value = false
  }
}
const updatePosition = () => {
  if (open.value) {
    requestAnimationFrame(checkPosition)
  }
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('scroll', updatePosition, true)
  window.addEventListener('resize', updatePosition)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
})
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
  border: 1px solid var(--border-tile);
  border-radius: var(--radius-sm);
  background-color: var(--bg-tile);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background-color: var(--bg-tile-hover);
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
  border: 1px solid var(--border-tile);
  border-radius: var(--radius-md);
  background-color: var(--bg-panel);
  color: var(--text-main);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--font-size-lg);

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
}

.icon-panel {
  position: fixed;
  margin-top: 0;
  padding: var(--spacing-sm);
  background-color: var(--bg-panel);
  border: 1px solid var(--border-tile);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  width: 280px;
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  z-index: 10000;
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
