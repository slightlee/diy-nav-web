<template>
  <div class="base-input" :class="containerClasses">
    <!-- 标签 -->
    <label
      v-if="label"
      :for="inputId"
      class="base-input__label"
      :class="{ 'base-input__label--required': required }"
    >
      {{ label }}
    </label>

    <!-- 输入框容器 -->
    <div class="base-input__wrapper" :class="wrapperClasses">
      <!-- 前置图标 -->
      <i
        v-if="prefixIcon"
        class="base-input__icon base-input__icon--prefix"
        :class="[prefixIcon]"
      />

      <!-- 输入框 -->
      <component
        :is="inputComponent"
        :id="inputId"
        ref="inputRef"
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        :minlength="minlength"
        :min="min"
        :max="max"
        :step="step"
        :rows="rows"
        :cols="cols"
        :autocomplete="autocomplete"
        :autofocus="autofocus"
        :class="inputClasses"
        :style="inputStyles"
        @input="handleInput"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
        @keyup="handleKeyup"
        @paste="handlePaste"
      />

      <!-- 后置图标 -->
      <div class="base-input__suffix">
        <!-- 清除按钮 -->
        <i
          v-if="clearable && modelValue && !disabled && !readonly"
          class="fas fa-times-circle base-input__clear-btn"
          @click="handleClear"
          @mousedown.prevent
        />

        <!-- 加载图标 -->
        <i v-if="loading" class="fas fa-spinner fa-spin base-input__loading-icon" />

        <!-- 后置图标 -->
        <i
          v-if="suffixIcon"
          class="base-input__icon base-input__icon--suffix"
          :class="[suffixIcon]"
        />
        <i
          v-if="type === 'password' && showPasswordToggle"
          class="base-input__password-toggle fas"
          :class="[passwordVisible ? 'fa-eye-slash' : 'fa-eye']"
          @click="togglePasswordVisibility"
        />
      </div>
    </div>

    <!-- 字符计数 -->
    <div
      v-if="showCharCount ?? !!maxlength"
      class="base-input__char-count"
      :class="{ 'base-input__char-count--error': charCountError }"
    >
      {{ currentCharCount }}{{ maxlength ? `/${maxlength}` : '' }}
    </div>

    <!-- 帮助文本 -->
    <div
      v-if="helpText || errorMessage"
      class="base-input__help-text"
      :class="{ 'base-input__help-text--error': errorMessage }"
    >
      {{ errorMessage || helpText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'

interface Props {
  /** 输入框类型 */
  type?: 'text' | 'password' | 'email' | 'url' | 'tel' | 'search' | 'number' | 'textarea'
  /** 输入框尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 绑定值 */
  modelValue: string | number | string[]
  /** 标签文本 */
  label?: string
  /** 占位符 */
  placeholder?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否只读 */
  readonly?: boolean
  /** 是否必填 */
  required?: boolean
  /** 最大长度 */
  maxlength?: number
  /** 最小长度 */
  minlength?: number
  /** 最大值（number类型） */
  max?: number | string
  /** 最小值（number类型） */
  min?: number | string
  /** 步长（number类型） */
  step?: number | string
  /** 行数（textarea类型） */
  rows?: number
  /** 列数（textarea类型） */
  cols?: number
  /** 自动完成 */
  autocomplete?: string
  /** 自动聚焦 */
  autofocus?: boolean
  /** 前置图标 */
  prefixIcon?: string
  /** 后置图标 */
  suffixIcon?: string
  /** 是否可清空 */
  clearable?: boolean
  /** 是否显示字符计数 */
  showCharCount?: boolean
  /** 帮助文本 */
  helpText?: string
  /** 错误信息 */
  errorMessage?: string
  /** 是否显示加载状态 */
  loading?: boolean
  /** 是否显示密码切换按钮 */
  showPasswordToggle?: boolean
  /** 输入框形状 */
  shape?: 'rounded' | 'square'
  /** 输入框状态 */
  state?: 'default' | 'success' | 'warning' | 'error'
  /** 自定义ID */
  id?: string
  /** 是否自动调整大小（textarea） */
  autosize?: boolean | { minRows?: number; maxRows?: number }
}

interface Emits {
  (e: 'update:modelValue', value: string | number | string[]): void
  (e: 'input', value: string | number | string[]): void
  (e: 'change', value: string | number | string[]): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  (e: 'keydown', event: KeyboardEvent): void
  (e: 'keyup', event: KeyboardEvent): void
  (e: 'paste', event: ClipboardEvent): void
  (e: 'clear'): void
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
  shape: 'rounded',
  state: 'default',
  showPasswordToggle: true,
  autosize: false
})

const emit = defineEmits<Emits>()

// 输入框引用
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement>()

// 内部状态
const isFocused = ref(false)
const passwordVisible = ref(false)

// 生成唯一ID
const inputId = computed(() => {
  return props.id || `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
})

// 输入框组件类型
const inputComponent = computed(() => {
  return props.type === 'textarea' ? 'textarea' : 'input'
})

const inputType = computed(() => {
  return props.type === 'password' && passwordVisible.value ? 'text' : props.type
})

// 容器样式类
const containerClasses = computed(() => ({
  'base-input--focused': isFocused.value,
  'base-input--disabled': props.disabled,
  'base-input--readonly': props.readonly,
  [`base-input--${props.size}`]: props.size,
  [`base-input--${props.state}`]: props.state,
  [`base-input--${props.shape}`]: props.shape
}))

// 包装器样式类
const wrapperClasses = computed(() => ({
  'base-input__wrapper--focused': isFocused.value,
  'base-input__wrapper--disabled': props.disabled,
  'base-input__wrapper--readonly': props.readonly,
  'base-input__wrapper--error': props.errorMessage || props.state === 'error',
  'base-input__wrapper--success': props.state === 'success',
  'base-input__wrapper--warning': props.state === 'warning'
}))

// 输入框样式类
const inputClasses = computed(() => [
  'base-input__inner',
  {
    'base-input__inner--with-prefix': props.prefixIcon,
    'base-input__inner--with-suffix': props.suffixIcon || props.clearable || props.loading
  }
])

// 输入框样式
const inputStyles = computed(() => {
  if (props.type === 'textarea' && props.autosize && typeof props.autosize === 'object') {
    return {
      minHeight: `${(props.autosize.minRows || 1) * 1.5}em`,
      maxHeight: `${(props.autosize.maxRows || 10) * 1.5}em`
    }
  }
  return {}
})

// 当前字符计数
const currentCharCount = computed(() => {
  return String(props.modelValue || '').length
})

// 字符计数错误
const charCountError = computed(() => {
  return props.maxlength && currentCharCount.value > props.maxlength
})

// 处理输入
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  let value = target.value

  // 数字类型处理
  if (props.type === 'number') {
    value = value.replace(/[^\d.-]/g, '')
    if (value !== '-' && value !== '.' && value !== '-.') {
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        if (props.min !== undefined && numValue < Number(props.min)) {
          value = String(props.min)
        } else if (props.max !== undefined && numValue > Number(props.max)) {
          value = String(props.max)
        }
      }
    }
  }

  emit('update:modelValue', value)
  emit('input', value)

  // 自动调整textarea高度
  if (props.type === 'textarea' && props.autosize) {
    nextTick(() => {
      adjustTextareaHeight()
    })
  }
}

// 处理变化
const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  emit('change', target.value)
}

// 处理聚焦
const handleFocus = (event: FocusEvent) => {
  isFocused.value = true
  emit('focus', event)
}

// 处理失焦
const handleBlur = (event: FocusEvent) => {
  isFocused.value = false
  emit('blur', event)
}

// 处理键盘按下
const handleKeydown = (event: KeyboardEvent) => {
  emit('keydown', event)
}

// 处理键盘释放
const handleKeyup = (event: KeyboardEvent) => {
  emit('keyup', event)
}

// 处理粘贴
const handlePaste = (event: ClipboardEvent) => {
  emit('paste', event)
}

// 处理清除
const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}

// 切换密码可见性
const togglePasswordVisibility = () => {
  passwordVisible.value = !passwordVisible.value
}
// 调整textarea高度
const adjustTextareaHeight = () => {
  if (props.type !== 'textarea' || !inputRef.value) return

  const textarea = inputRef.value as HTMLTextAreaElement
  const originalHeight = textarea.style.height

  // 重置高度以获取正确的scrollHeight
  textarea.style.height = 'auto'

  let newHeight = textarea.scrollHeight

  // 应用最小和最大高度限制
  if (props.autosize && typeof props.autosize === 'object') {
    const computedStyle = window.getComputedStyle(textarea)
    const lineHeightStr = computedStyle.lineHeight
    const fallback = 24
    const lineHeight = parseFloat(lineHeightStr) || fallback
    if (props.autosize.minRows) {
      const minHeight = props.autosize.minRows * lineHeight
      newHeight = Math.max(newHeight, minHeight)
    }
    if (props.autosize.maxRows) {
      const maxHeight = props.autosize.maxRows * lineHeight
      newHeight = Math.min(newHeight, maxHeight)
    }
  }

  textarea.style.height = `${newHeight}px`

  // 如果高度没有变化，恢复原始高度
  if (newHeight === 0) {
    textarea.style.height = originalHeight
  }
}

// 监听autosize变化
watch(
  () => props.autosize,
  () => {
    if (props.autosize && props.type === 'textarea') {
      nextTick(() => {
        adjustTextareaHeight()
      })
    }
  },
  { immediate: true }
)

// 暴露方法
const focus = () => {
  inputRef.value?.focus()
}

const blur = () => {
  inputRef.value?.blur()
}

const select = () => {
  inputRef.value?.select()
}

defineExpose({
  focus,
  blur,
  select,
  inputRef
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

// 基础输入框容器
.base-input {
  width: 100%;
  position: relative;

  &--focused {
    // 聚焦状态在wrapper中处理
  }

  &--disabled {
    opacity: var(--opacity-disabled);
    cursor: not-allowed;
  }

  &--readonly {
    cursor: default;
  }

  // 尺寸变体
  &--sm {
    .base-input__inner {
      padding: var(--spacing-xs) var(--spacing-sm);
      font-size: var(--font-size-sm);
      min-height: 32px;
    }

    .base-input__label {
      font-size: var(--font-size-sm);
      margin-bottom: var(--spacing-xs);
    }
  }

  &--md {
    .base-input__inner {
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-base);
      min-height: 40px;
    }

    .base-input__label {
      font-size: var(--font-size-base);
      margin-bottom: var(--spacing-xs);
    }
  }

  &--lg {
    .base-input__inner {
      padding: var(--spacing-md) var(--spacing-lg);
      font-size: var(--font-size-lg);
      min-height: 48px;
    }

    .base-input__label {
      font-size: var(--font-size-lg);
      margin-bottom: var(--spacing-sm);
    }
  }

  // 状态变体
  &--success {
    .base-input__wrapper {
      border-color: var(--color-success);
    }
  }

  &--warning {
    .base-input__wrapper {
      border-color: var(--color-warning);
    }
  }

  &--error {
    .base-input__wrapper {
      border-color: var(--color-error);
    }
  }

  // 形状变体
  &--rounded {
    .base-input__wrapper {
      border-radius: var(--radius-md);
    }
  }

  &--square {
    .base-input__wrapper {
      border-radius: var(--radius-sm);
    }
  }
}

// 标签
.base-input__label {
  display: block;
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
  margin-bottom: var(--spacing-xs);
  transition: color var(--transition-fast);

  &--required::after {
    content: ' *';
    color: var(--color-error);
  }

  .base-input--focused & {
    color: var(--color-primary);
  }

  .base-input--disabled & {
    color: var(--color-neutral-400);
  }

  .base-input--error & {
    color: var(--color-error);
  }
}

// 输入框包装器
.base-input__wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background-color: var(--color-neutral-100);
  border: 1px solid var(--color-border);
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-neutral-300);
  }

  &--focused {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
  }

  &--disabled {
    background-color: var(--color-neutral-100);
    border-color: var(--color-neutral-200);
    cursor: not-allowed;
  }

  &--readonly {
    background-color: var(--color-neutral-100);
    border-color: var(--color-neutral-200);
  }

  &--error {
    border-color: var(--color-error);

    &:focus {
      box-shadow: 0 0 0 3px rgba(var(--color-error-rgb), 0.1);
    }
  }

  &--success {
    border-color: var(--color-success);

    &:focus {
      box-shadow: 0 0 0 3px rgba(var(--color-success-rgb), 0.1);
    }
  }

  &--warning {
    border-color: var(--color-warning);

    &:focus {
      box-shadow: 0 0 0 3px rgba(var(--color-warning-rgb), 0.1);
    }
  }
}

// 输入框
.base-input__inner {
  flex: 1;
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-neutral-800);
  font-family: var(--font-family);
  resize: vertical;
  transition: all var(--transition-fast);

  &::placeholder {
    color: var(--color-neutral-400);
  }

  &:disabled {
    cursor: not-allowed;
    color: var(--color-neutral-400);
  }

  &:read-only {
    cursor: default;
  }

  // 有前置图标的输入框
  &--with-prefix {
    padding-left: var(--spacing-xl);
  }

  // 有后置图标的输入框
  &--with-suffix {
    padding-right: var(--spacing-xl);
  }

  // Textarea特殊样式
  &.base-input__textarea {
    line-height: var(--line-height-normal);
    padding-top: var(--spacing-sm);
    padding-bottom: var(--spacing-sm);
    min-height: 80px;
  }
}

// 图标
.base-input__icon {
  position: absolute;
  color: var(--color-neutral-400);
  transition: color var(--transition-fast);
  pointer-events: none;

  &--prefix {
    left: var(--spacing-sm);
    z-index: 1;
  }

  &--suffix {
    right: var(--spacing-sm);
    z-index: 1;
  }
}

// 后置区域
.base-input__suffix {
  position: absolute;
  right: var(--spacing-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  z-index: 1;
}

// 清除按钮
.base-input__clear-btn {
  color: var(--color-neutral-400);
  cursor: pointer;
  transition: color $transition-fast;

  &:hover {
    color: var(--color-neutral-600);
  }
}

// 密码切换按钮
.base-input__password-toggle {
  color: var(--color-neutral-400);
  cursor: pointer;
  transition: color $transition-fast;

  &:hover {
    color: var(--color-neutral-600);
  }
}

// 加载图标
.base-input__loading-icon {
  color: var(--color-primary);
}

// 字符计数
.base-input__char-count {
  text-align: right;
  font-size: var(--font-size-xs);
  color: var(--color-neutral-500);
  margin-top: var(--spacing-xs);
  transition: color $transition-fast;

  &--error {
    color: var(--color-error);
  }
}

// 帮助文本
.base-input__help-text {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-500);
  margin-top: var(--spacing-xs);
  transition: color $transition-fast;

  &--error {
    color: var(--color-error);
  }
}

// 响应式适配
@include mobile {
  .base-input__inner {
    min-height: 44px; // 触摸友好的最小高度
  }
}

// 高对比度模式
@media (prefers-contrast: high) {
  .base-input__wrapper {
    border-width: 2px;
  }
}

// 减少动画偏好
@media (prefers-reduced-motion: reduce) {
  .base-input__wrapper,
  .base-input__inner,
  .base-input__label,
  .base-input__char-count,
  .base-input__help-text,
  .base-input__icon,
  .base-input__clear-btn,
  .base-input__password-toggle {
    transition: none;
  }
}
</style>
