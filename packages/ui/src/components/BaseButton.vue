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
    | 'neutral-ghost'
    | 'danger-ghost'
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

  // button 与链接的 Enter 激活由浏览器处理；仅为链接补齐空格键按钮语义。
  if (props.tag !== 'button' && event.key === ' ') {
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
  gap: $spacing-xs;
  white-space: nowrap;
  text-decoration: none;
  outline: none;
  user-select: none;
  cursor: pointer;
  transition:
    background-color $transition-fast,
    border-color $transition-fast,
    color $transition-fast;

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

  &--shadow {
    box-shadow: $shadow-md;
    &:hover {
      box-shadow: $shadow-lg;
    }
  }

  &--bordered {
    border: 1px solid $color-border;
  }
  &--rounded {
    border-radius: $border-radius-md;
  }
  &--square {
    border-radius: $border-radius-sm;
  }
  &--pill {
    border-radius: $border-radius-pill;
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
    padding: 0 $spacing-md;
    font-size: $font-size-xs;
    min-height: 24px;
  }
  &--sm {
    padding: 0 $spacing-lg;
    font-size: $font-size-sm;
    min-height: 32px;
  }
  &--md {
    padding: 0 $spacing-xl;
    font-size: $font-size-base;
    min-height: 40px;
  }
  &--lg {
    padding: 0 $spacing-2xl;
    font-size: $font-size-lg;
    min-height: 48px;
  }
  &--xl {
    padding: 0 $spacing-2xl;
    font-size: $font-size-xl;
    min-height: 56px;
  }

  // 纯图标按钮沿用对应尺寸的高度，避免横向内边距把按钮撑成长方形。
  &--icon-only {
    width: auto;
    padding: 0;
    aspect-ratio: 1;
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
    background-color: var(--color-primary, #{$color-primary});
    color: var(--color-white, #{$color-white});
    border-color: var(--color-primary, #{$color-primary});
    font-weight: $font-weight-medium;
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: var(--color-primary-dark, #{$color-primary-dark});
      border-color: var(--color-primary-dark, #{$color-primary-dark});
    }
  }

  &--secondary {
    background-color: var(--bg-tile, #{$color-neutral-100});
    color: var(--text-main, #{$color-neutral-800});
    border-color: transparent;
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: var(--bg-tile-hover, #{$color-neutral-200});
      color: var(--text-main, #{$color-neutral-900});
    }
  }

  &--outline {
    background-color: transparent;
    color: var(--color-primary, #{$color-primary});
    border-color: var(--color-primary, #{$color-primary});
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: var(--color-primary, #{$color-primary});
      color: var(--color-white, #{$color-white});
    }
  }

  &--neutral-outline {
    background-color: transparent;
    color: var(--text-secondary, #{$color-neutral-700});
    border-color: var(--color-border, #{$color-neutral-300});
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: var(--bg-tile, #{$color-neutral-100});
      color: var(--text-main, #{$color-neutral-900});
    }
  }

  &--danger-outline {
    background-color: transparent;
    color: var(--color-error, #{$color-error});
    border-color: var(--color-error, #{$color-error});
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: color-mix(in srgb, var(--color-error, #{$color-error}) 6%, transparent);
      color: var(--color-error, #{$color-error});
    }
  }

  &--ghost {
    background-color: transparent;
    color: var(--color-primary, #{$color-primary});
    border-color: transparent;
    font-weight: $font-weight-normal;
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: color-mix(
        in srgb,
        var(--color-primary, #{$color-primary}) 10%,
        transparent
      );
      color: var(--color-primary-dark, #{$color-primary-dark});
    }
  }

  &--neutral-ghost {
    background-color: transparent;
    color: var(--text-secondary, #{$color-neutral-700});
    border-color: transparent;
    font-weight: $font-weight-normal;
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: var(--bg-tile, #{$color-neutral-100});
      color: var(--text-main, #{$color-neutral-900});
    }
  }

  &--danger-ghost {
    background-color: transparent;
    color: var(--color-error, #{$color-error});
    border-color: transparent;
    font-weight: $font-weight-normal;
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: color-mix(in srgb, var(--color-error, #{$color-error}) 7%, transparent);
      color: var(--color-error, #{$color-error});
    }
  }

  &--danger {
    background-color: var(--color-error, #{$color-error});
    color: var(--color-white, #{$color-white});
    border-color: var(--color-error, #{$color-error});
    font-weight: $font-weight-medium;
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: color-mix(
        in srgb,
        var(--color-error, #{$color-error}) 88%,
        #{$color-black}
      );
      border-color: color-mix(in srgb, var(--color-error, #{$color-error}) 88%, #{$color-black});
    }
  }

  &--success {
    background-color: $color-success;
    color: $color-white;
    border-color: $color-success;
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: color.adjust($color-success, $lightness: -10%);
      border-color: color.adjust($color-success, $lightness: -10%);
    }
  }

  &--warning {
    background-color: $color-warning;
    color: $color-white;
    border-color: $color-warning;
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: color.adjust($color-warning, $lightness: -10%);
      border-color: color.adjust($color-warning, $lightness: -10%);
    }
  }

  &--info {
    background-color: $color-info;
    color: $color-white;
    border-color: $color-info;
    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: color.adjust($color-info, $lightness: -10%);
      border-color: color.adjust($color-info, $lightness: -10%);
    }
  }
}

.base-button__icon {
  flex-shrink: 0;
  transition: transform $transition-fast;
}
.base-button__icon--left {
  order: 0;
}
.base-button__icon--right {
  order: 2;
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
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-xs;
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
  .base-button--ghost,
  .base-button--neutral-ghost,
  .base-button--danger-ghost {
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
    border: 1px solid $color-black;
  }
  .base-button--primary,
  .base-button--success,
  .base-button--info {
    background-color: $color-black;
    color: $color-white;
  }
  .base-button--danger {
    background-color: $color-error;
    color: $color-white;
  }
  .base-button--warning {
    background-color: $color-warning;
    color: $color-black;
  }
}
</style>
