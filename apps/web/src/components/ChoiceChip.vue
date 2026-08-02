<template>
  <button
    type="button"
    class="choice-chip"
    :class="{ 'choice-chip--active': active }"
    :aria-label="ariaLabel || label"
    :aria-pressed="active"
    :title="label"
    @click="emit('click')"
  >
    <span v-if="color" class="choice-chip__dot" :style="{ backgroundColor: color }" />
    <span class="choice-chip__label">{{ label }}</span>
    <span v-if="count !== undefined" class="choice-chip__count">{{ count }}</span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    count?: number
    color?: string
    active?: boolean
    ariaLabel?: string
  }>(),
  {
    count: undefined,
    color: undefined,
    active: false,
    ariaLabel: undefined
  }
)

const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<style scoped lang="scss">
.choice-chip {
  max-width: 100%;
  flex: 0 0 auto;
  min-height: 32px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--bg-tile);
  color: var(--text-secondary);
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    color 0.16s ease;

  &:hover {
    background: var(--bg-tile-hover);
    color: var(--text-main);
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--color-primary-rgb), 0.4);
    outline-offset: 2px;
  }
}

.choice-chip--active {
  background: var(--primary-soft);
  color: var(--color-primary-dark);
}

.choice-chip__dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
}

.choice-chip__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.choice-chip__count {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}
</style>
