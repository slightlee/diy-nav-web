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
    <!-- 加载图标 -->
    <i v-if="loading" class="fas fa-spinner fa-spin button-loading-icon" />

    <!-- 图标 -->
    <i v-if="icon && !loading" :class="iconClasses" />

    <!-- 按钮内容 -->
    <span v-if="$slots.default || text" class="button-text">
      <slot>{{ text }}</slot>
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed, ref, type VNode } from 'vue'

interface Props {
  /** 按钮类型 */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning' | 'info'
  /** 按钮尺寸 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** 按钮形状 */
  shape?: 'rounded' | 'square' | 'pill'
  /** 是否禁用 */
  disabled?: boolean
  /** 是否加载中 */
  loading?: boolean
  /** 是否块级显示 */
  block?: boolean
  /** HTML按钮类型 */
  htmlType?: 'button' | 'submit' | 'reset'
  /** 渲染的HTML标签 */
  tag?: 'button' | 'a' | 'router-link'
  /** 链接地址（当tag为a时） */
  href?: string
  /** 图标类名 */
  icon?: string
  /** 图标位置 */
  iconPosition?: 'left' | 'right'
  /** 按钮文本 */
  text?: string
  /** 无障碍标签 */
  ariaLabel?: string
  /** 提示文本 */
  title?: string
  /** 是否有阴影 */
  shadow?: boolean
  /** 是否有边框 */
  bordered?: boolean
  /** 自定义类名 */
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

// 添加$slots类型
interface Slots {
  default: () => VNode[]
}

const slots = defineSlots<Slots>()

// 按钮引用
const buttonRef = ref<HTMLElement>()

// 计算按钮样式类
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

// 计算图标样式类
const iconClasses = computed(() => {
  return [
    'base-button__icon',
    {
      'base-button__icon--left': props.iconPosition === 'left',
      'base-button__icon--right': props.iconPosition === 'right'
    }
  ]
})

// 处理点击事件
const handleClick = (event: MouseEvent) => {
  if (props.disabled || props.loading) {
    event.preventDefault()
    return
  }
  emit('click', event)
}

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  if (props.disabled || props.loading) {
    return
  }

  // 空格键和回车键触发点击
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    emit('click', event)
  }

  emit('keydown', event)
}

// 聚焦方法（暴露给父组件）
const focus = () => {
  buttonRef.value?.focus()
}

// 暴露方法
defineExpose({
  focus
})
</script>

<style scoped lang="scss">
@use 'sass:color';
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

// 基础按钮样式
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
  transition: all $transition-fast;

  &:focus-visible {
    @include focus-visible;
  }

  // 禁用状态
  &--disabled {
    opacity: $opacity-disabled;
    cursor: not-allowed;
    pointer-events: none;

    &:hover {
      transform: none;
      box-shadow: none;
    }
  }

  // 加载状态
  &--loading {
    cursor: wait;
    pointer-events: none;
  }

  // 块级显示
  &--block {
    width: 100%;
    display: flex;
  }

  // 仅图标
  &--icon-only {
    padding: $spacing-sm;
    min-width: auto;
  }

  // 阴影
  &--shadow {
    box-shadow: $shadow-md;

    &:hover {
      box-shadow: $shadow-lg;
    }
  }

  // 边框
  &--bordered {
    border: 1px solid $color-border;
  }

  // 形状变体
  &--rounded {
    border-radius: $border-radius-md;
  }

  &--square {
    border-radius: $border-radius-sm;
  }

  &--pill {
    border-radius: $border-radius-pill;
  }

  // 尺寸变体
  &--xs {
    padding: $spacing-xs $spacing-sm;
    font-size: $font-size-xs;
    min-height: 24px;

    &--icon-only {
      width: 24px;
      height: 24px;
      padding: 0;
    }
  }

  &--sm {
    padding: $spacing-xs $spacing-sm;
    font-size: $font-size-sm;
    min-height: 32px;

    &--icon-only {
      width: 32px;
      height: 32px;
      padding: 0;
    }
  }

  &--md {
    padding: $spacing-sm $spacing-md;
    font-size: $font-size-base;
    min-height: 40px;

    &--icon-only {
      width: 40px;
      height: 40px;
      padding: 0;
    }
  }

  &--lg {
    padding: $spacing-md $spacing-lg;
    font-size: $font-size-lg;
    min-height: 48px;

    &--icon-only {
      width: 48px;
      height: 48px;
      padding: 0;
    }
  }

  &--xl {
    padding: $spacing-lg $spacing-xl;
    font-size: $font-size-xl;
    min-height: 56px;

    &--icon-only {
      width: 56px;
      height: 56px;
      padding: 0;
    }
  }

  // 颜色变体
  &--primary {
    background-color: $color-primary;
    color: $color-white;
    border-color: $color-primary;

    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: $color-primary-dark;
      border-color: $color-primary-dark;
      transform: translateY(-1px);
      box-shadow: $shadow-md;
    }

    &:active {
      transform: translateY(0);
    }
  }

  &--secondary {
    background-color: $color-neutral-100;
    color: $color-neutral-800;
    border-color: $color-neutral-200;

    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: $color-neutral-200;
      color: $color-neutral-900;
      transform: translateY(-1px);
      box-shadow: $shadow-sm;
    }
  }

  &--outline {
    background-color: transparent;
    color: $color-primary;
    border-color: $color-primary;

    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: $color-primary;
      color: $color-white;
      transform: translateY(-1px);
      box-shadow: $shadow-sm;
    }
  }

  &--ghost {
    background-color: transparent;
    color: $color-primary;
    border-color: transparent;

    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: rgba($color-primary, 0.1);
      color: $color-primary-dark;
      transform: translateY(-1px);
    }
  }

  &--danger {
    background-color: $color-error;
    color: $color-white;
    border-color: $color-error;

    &:hover:not(.base-button--disabled):not(.base-button--loading) {
        background-color: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.1);
      transform: translateY(-1px);
      box-shadow: $shadow-md;
    }
  }

  &--success {
    background-color: $color-success;
    color: $color-white;
    border-color: $color-success;

    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: color.mix(black, $color-success, 10%);
      border-color: rgba(59, 130, 246, 0.1);
      transform: translateY(-1px);
      box-shadow: $shadow-md;
    }
  }

  &--warning {
    background-color: $color-warning;
    color: $color-white;
    border-color: $color-warning;

    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: rgba(59, 130, 246, 0.1);
      border-color: color.mix(black, $color-warning, 10%);
      transform: translateY(-1px);
      box-shadow: $shadow-md;
    }
  }

  &--info {
    background-color: $color-info;
    color: $color-white;
    border-color: $color-info;

    &:hover:not(.base-button--disabled):not(.base-button--loading) {
      background-color: rgba(59, 130, 246, 0.1);
      border-color: color.mix(black, $color-info, 10%);
      transform: translateY(-1px);
      box-shadow: $shadow-md;
    }
  }
}

// 图标样式
.base-button__icon {
  flex-shrink: 0;
  transition: transform $transition-fast;

  &--left {
    margin-right: $spacing-xs;
  }

  &--right {
    margin-left: $spacing-xs;
  }
}

// 加载图标
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

// 文本内容
.button-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

// 响应式适配
@include mobile {
  .base-button {
    min-height: 44px; // 触摸友好的最小高度

    &--xs {
      min-height: 36px;
    }

    &--sm {
      min-height: 40px;
    }
  }
}

// 高对比度模式
@media (prefers-contrast: high) {
  .base-button {
    border-width: 2px;

    &--ghost {
      border-color: currentColor;
    }
  }
}

// 减少动画偏好
@media (prefers-reduced-motion: reduce) {
  .base-button {
    transition: none;

    &:hover {
      transform: none;
    }
  }

  .button-loading-icon {
    animation: none;
  }
}

// 打印样式
@media print {
  .base-button {
    box-shadow: none;
    border: 1px solid $color-black;

    &--primary,
    &--success,
    &--info {
      background-color: $color-black;
      color: $color-white;
    }

    &--danger {
      background-color: $color-error;
      color: $color-white;
    }

    &--warning {
      background-color: $color-warning;
      color: $color-black;
    }
  }
}
</style>
