<template>
  <component
    :is="tag"
    ref="buttonRef"
    :type="tag === 'button' ? htmlType : undefined"
    :href="tag === 'a' ? href : undefined"
    :class="buttonClasses"
    :disabled="disabled"
    :loading="loading"
    :aria-disabled="disabled"
    :aria-label="ariaLabel"
    :title="title"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <i v-if="loading" class="fas fa-spinner fa-spin button-loading-icon" />
    <i v-if="icon && !loading" :class="[iconClasses, icon]" />
    <span v-if="$slots.default || text" class="button-text">
      <slot>{{ text }}</slot>
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed, ref, type VNode } from 'vue'

export interface Props {
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'neutral-outline'
    | 'danger-outline'
    | 'ghost'
    | 'danger'
    | 'success'
    | 'warning'
    | 'info'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  shape?: 'rounded' | 'square' | 'pill' | 'circle'
  disabled?: boolean
  loading?: boolean
  block?: boolean
  htmlType?: 'button' | 'submit' | 'reset'
  tag?: 'button' | 'a' | 'router-link'
  href?: string
  icon?: string
  iconPosition?: 'left' | 'right'
  text?: string
  ariaLabel?: string
  title?: string
  shadow?: boolean
  bordered?: boolean
  className?: string
}

interface Emits {
  (e: 'click', event: MouseEvent | KeyboardEvent): void
  (e: 'keydown', event: KeyboardEvent): void
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  shape: 'rounded',
  disabled: false,
  loading: false,
  block: false,
  htmlType: 'button',
  tag: 'button',
  iconPosition: 'left',
  shadow: false,
  bordered: true
})

const emit = defineEmits<Emits>()

interface Slots {
  default: () => VNode[]
}

const slots = defineSlots<Slots>()
const buttonRef = ref<HTMLElement>()

const buttonClasses = computed(() => {
  const classes = [
    'base-button',
    `base-button--${props.variant}`,
    `base-button--${props.size}`,
    `base-button--${props.shape}`,
    {
      'base-button--disabled': props.disabled,
      'base-button--loading': props.loading,
      'base-button--block': props.block,
      'base-button--shadow': props.shadow,
      'base-button--bordered': props.bordered,
      'base-button--icon-only': props.icon && !slots.default && !props.text,
      'base-button--icon-left': props.icon && props.iconPosition === 'left',
      'base-button--icon-right': props.icon && props.iconPosition === 'right'
    }
  ]
  return classes
})

const iconClasses = computed(() => {
  return [
    'base-button__icon',
    {
      'base-button__icon--left': props.iconPosition === 'left',
      'base-button__icon--right': props.iconPosition === 'right'
    }
  ]
})

const handleClick = (event: MouseEvent) => {
  if (props.disabled || props.loading) {
    event.preventDefault()
    return
  }
  emit('click', event)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (props.disabled || props.loading) {
    return
  }
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    emit('click', event)
  }
  emit('keydown', event)
}

const focus = () => {
  buttonRef.value?.focus()
}

defineExpose({
  focus
})
</script>

<style scoped lang="scss">
@use 'sass:color';
@use '../styles/variables.scss' as *;
@use '../styles/mixins.scss' as *;

.base-button {
  @include button-base;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  white-space: nowrap;
  text-decoration: none;
  outline: none;
  user-select: none;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:focus-visible {
    @include focus-visible;
  }

  &--disabled {
    opacity: $opacity-disabled;
    cursor: not-allowed;
    pointer-events: none;

    &:hover {
      transform: none;
      box-shadow: none;
    }
  }

  &--loading {
    cursor: wait;
    pointer-events: none;
  }

  &--block {
    width: 100%;
    display: flex;
  }

  &--icon-only {
    padding: var(--spacing-sm);
    min-width: auto;
  }

  &--shadow {
    box-shadow: var(--shadow-md);
    &:hover {
      box-shadow: var(--shadow-lg);
    }
  }

  &--bordered {
    border: 1px solid var(--color-border);
  }
  &--rounded {
    border-radius: var(--radius-md);
  }
  &--square {
    border-radius: var(--radius-sm);
  }
  &--pill {
    border-radius: var(--radius-pill);
  }
  &--circle {
    border-radius: 50%;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
  }

  &--xs {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
    min-height: 24px;
  }
  &--sm {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-sm);
    min-height: 32px;
  }
  &--md {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-base);
    min-height: 40px;
  }
  &--lg {
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-lg);
    min-height: 48px;
  }
  &--xl {
    padding: var(--spacing-lg) var(--spacing-xl);
    font-size: var(--font-size-xl);
    min-height: 56px;
  }

  #{&}--xs#{&}--icon-only {
    width: 24px;
    height: 24px;
    padding: 0;
  }
  #{&}--sm#{&}--icon-only {
    width: 32px;
    height: 32px;
    padding: 0;
  }
  #{&}--md#{&}--icon-only {
    width: 40px;
    height: 40px;
    padding: 0;
  }
  #{&}--lg#{&}--icon-only {
    width: 48px;
    height: 48px;
    padding: 0;
  }
  #{&}--xl#{&}--icon-only {
    width: 56px;
    height: 56px;
    padding: 0;
  }

  &--primary {
    background-color: var(--color-primary);
    color: var(--color-white);
    border-color: var(--color-primary);
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: var(--color-primary-dark);
      border-color: var(--color-primary-dark);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    &:active {
      transform: translateY(0);
    }
  }

  &--secondary {
    background-color: var(--color-neutral-100);
    color: var(--color-neutral-800);
    border-color: var(--color-neutral-200);
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: var(--color-neutral-200);
      color: var(--color-neutral-900);
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }
  }

  &--outline {
    background-color: transparent;
    color: var(--color-primary);
    border-color: var(--color-primary);
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: var(--color-primary);
      color: var(--color-white);
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }
  }

  &--neutral-outline {
    background-color: transparent;
    color: var(--color-neutral-700);
    border-color: var(--color-neutral-300);
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: var(--color-neutral-100);
      color: var(--color-neutral-900);
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }
  }

  &--danger-outline {
    background-color: transparent;
    color: var(--color-error);
    border-color: var(--color-error);
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: rgba(var(--color-error-rgb), 0.06);
      color: var(--color-error);
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }
  }

  &--ghost {
    background-color: transparent;
    color: var(--color-primary);
    border-color: transparent;
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: rgba(var(--color-primary-rgb), 0.1);
      color: var(--color-primary-dark);
      transform: translateY(-1px);
    }
  }

  &--danger {
    background-color: var(--color-error);
    color: var(--color-white);
    border-color: var(--color-error);
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: #dc2626; /* Darker red (red-600) for hover */
      border-color: #dc2626;
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
  }

  &--success {
    background-color: var(--color-success);
    color: var(--color-white);
    border-color: var(--color-success);
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: rgba(var(--color-success-rgb), 0.9);
      border-color: rgba(var(--color-success-rgb), 0.1);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
  }

  &--warning {
    background-color: var(--color-warning);
    color: var(--color-white);
    border-color: var(--color-warning);
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: rgba(var(--color-warning-rgb), 0.1);
      border-color: rgba(var(--color-warning-rgb), 0.9);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
  }

  &--info {
    background-color: var(--color-info);
    color: var(--color-white);
    border-color: var(--color-info);
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: rgba(var(--color-info-rgb), 0.1);
      border-color: rgba(var(--color-info-rgb), 0.9);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
  }
}

.base-button__icon {
  flex-shrink: 0;
  transition: transform var(--transition-fast);
}
.base-button__icon--left {
  margin-right: var(--spacing-xs);
}
.base-button__icon--right {
  margin-left: var(--spacing-xs);
}

.button-loading-icon {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.button-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

@include mobile {
  .base-button {
    min-height: 44px;
  }
  .base-button--xs {
    min-height: 36px;
  }
  .base-button--sm {
    min-height: 40px;
  }
}

@media (prefers-contrast: high) {
  .base-button {
    border-width: 2px;
  }
  .base-button--ghost {
    border-color: currentcolor;
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-button {
    transition: none;
  }
  .base-button:hover {
    transform: none;
  }
  .button-loading-icon {
    animation: none;
  }
}

@media print {
  .base-button {
    box-shadow: none;
    border: 1px solid var(--color-black);
  }
  .base-button--primary,
  .base-button--success,
  .base-button--info {
    background-color: var(--color-black);
    color: var(--color-white);
  }
  .base-button--danger {
    background-color: var(--color-error);
    color: var(--color-white);
  }
  .base-button--warning {
    background-color: var(--color-warning);
    color: var(--color-black);
  }
}
</style>
