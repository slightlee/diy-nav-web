<template>
  <div class="base-input" :class="containerClasses">
    <label
      v-if="label"
      :for="inputId"
      class="base-input__label"
      :class="{ 'base-input__label--required': required }"
    >
      {{ label }}
    </label>
    <div class="base-input__wrapper" :class="wrapperClasses">
      <div v-if="$slots.prefix" class="base-input__prefix-slot">
        <slot name="prefix" />
      </div>
      <i
        v-if="prefixIcon"
        class="base-input__icon base-input__icon--prefix"
        :class="[prefixIcon]"
      />
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
      <div class="base-input__suffix">
        <slot name="suffix" />
        <i
          v-if="clearable && modelValue && !disabled && !readonly"
          class="fas fa-times-circle base-input__clear-btn"
          @click="handleClear"
          @mousedown.prevent
        />
        <i v-if="loading" class="fas fa-spinner fa-spin base-input__loading-icon" />
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
    <div
      v-if="showCharCount ?? !!maxlength"
      class="base-input__char-count"
      :class="{ 'base-input__char-count--error': charCountError }"
    >
      {{ currentCharCount }}{{ maxlength ? `/${maxlength}` : '' }}
    </div>
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
import { computed, ref, watch, nextTick, useSlots } from 'vue'

export interface Props {
  type?: 'text' | 'password' | 'email' | 'url' | 'tel' | 'search' | 'number' | 'textarea'
  size?: 'sm' | 'md' | 'lg'
  modelValue: string | number | string[]
  label?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  maxlength?: number
  minlength?: number
  max?: number | string
  min?: number | string
  step?: number | string
  rows?: number
  cols?: number
  autocomplete?: string
  autofocus?: boolean
  prefixIcon?: string
  suffixIcon?: string
  clearable?: boolean
  showCharCount?: boolean
  helpText?: string
  errorMessage?: string
  loading?: boolean
  showPasswordToggle?: boolean
  shape?: 'rounded' | 'square'
  state?: 'default' | 'success' | 'warning' | 'error'
  id?: string
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
const slots = useSlots()

const inputRef = ref<HTMLInputElement | HTMLTextAreaElement>()
const isFocused = ref(false)
const passwordVisible = ref(false)

const inputId = computed(
  () => props.id || `input-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
)
const inputComponent = computed(() => (props.type === 'textarea' ? 'textarea' : 'input'))
const inputType = computed(() =>
  props.type === 'password' && passwordVisible.value ? 'text' : props.type
)

const containerClasses = computed(() => ({
  'base-input--focused': isFocused.value,
  'base-input--disabled': props.disabled,
  'base-input--readonly': props.readonly,
  [`base-input--${props.size}`]: props.size,
  [`base-input--${props.state}`]: props.state,
  [`base-input--${props.shape}`]: props.shape
}))

const wrapperClasses = computed(() => ({
  'base-input__wrapper--focused': isFocused.value,
  'base-input__wrapper--disabled': props.disabled,
  'base-input__wrapper--readonly': props.readonly,
  'base-input__wrapper--error': props.errorMessage || props.state === 'error',
  'base-input__wrapper--success': props.state === 'success',
  'base-input__wrapper--warning': props.state === 'warning'
}))

const inputClasses = computed(() => [
  'base-input__inner',
  props.type === 'textarea' ? 'base-input__textarea' : '',
  {
    'base-input__inner--with-prefix': props.prefixIcon || !!slots.prefix,
    'base-input__inner--with-suffix':
      props.suffixIcon || props.clearable || props.loading || !!slots.suffix
  }
])

const inputStyles = computed(() => {
  if (props.type === 'textarea' && props.autosize && typeof props.autosize === 'object') {
    return {
      minHeight: `${(props.autosize.minRows || 1) * 1.5}em`,
      maxHeight: `${(props.autosize.maxRows || 10) * 1.5}em`
    }
  }
  return {}
})

const currentCharCount = computed(() => String(props.modelValue || '').length)
const charCountError = computed(() => props.maxlength && currentCharCount.value > props.maxlength)

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  let value = target.value
  if (props.type === 'number') {
    value = value.replace(/[^\d.-]/g, '')
    if (value !== '-' && value !== '.' && value !== '-.') {
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        if (props.min !== undefined && numValue < Number(props.min)) value = String(props.min)
        else if (props.max !== undefined && numValue > Number(props.max)) value = String(props.max)
      }
    }
  }
  emit('update:modelValue', value)
  emit('input', value)
  if (props.type === 'textarea' && props.autosize) nextTick(() => adjustTextareaHeight())
}

const handleChange = (event: Event) =>
  emit('change', (event.target as HTMLInputElement | HTMLTextAreaElement).value)
const handleFocus = (event: FocusEvent) => {
  isFocused.value = true
  emit('focus', event)
}
const handleBlur = (event: FocusEvent) => {
  isFocused.value = false
  emit('blur', event)
}
const handleKeydown = (event: KeyboardEvent) => emit('keydown', event)
const handleKeyup = (event: KeyboardEvent) => emit('keyup', event)
const handlePaste = (event: ClipboardEvent) => emit('paste', event)
const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}
const togglePasswordVisibility = () => {
  passwordVisible.value = !passwordVisible.value
}

const adjustTextareaHeight = () => {
  if (props.type !== 'textarea' || !inputRef.value) return
  const textarea = inputRef.value as HTMLTextAreaElement
  const originalHeight = textarea.style.height
  textarea.style.height = 'auto'
  let newHeight = textarea.scrollHeight
  if (props.autosize && typeof props.autosize === 'object') {
    const computedStyle = window.getComputedStyle(textarea)
    const lineHeightStr = computedStyle.lineHeight
    const fallback = 24
    const lineHeight = parseFloat(lineHeightStr) || fallback
    if (props.autosize.minRows) newHeight = Math.max(newHeight, props.autosize.minRows * lineHeight)
    if (props.autosize.maxRows) newHeight = Math.min(newHeight, props.autosize.maxRows * lineHeight)
  }
  textarea.style.height = `${newHeight}px`
  if (newHeight === 0) textarea.style.height = originalHeight
}

watch(
  () => props.autosize,
  () => {
    if (props.autosize && props.type === 'textarea') nextTick(() => adjustTextareaHeight())
  },
  { immediate: true }
)

const focus = () => {
  inputRef.value?.focus()
}
const blur = () => {
  inputRef.value?.blur()
}
const select = () => {
  inputRef.value?.select()
}

defineExpose({ focus, blur, select, inputRef })
</script>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;
@use '../styles/mixins.scss' as *;
.base-input {
  width: 100%;
  position: relative;
}
.base-input--disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}
.base-input--readonly {
  cursor: default;
}
.base-input__label {
  display: block;
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
  margin-bottom: var(--spacing-xs);
  transition: color var(--transition-fast);
}
.base-input__label--required::after {
  content: ' *';
  color: var(--color-error);
}
.base-input__wrapper {
  position: relative;
  display: flex;
  align-items: stretch;
  background-color: var(--color-neutral-100);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}
.base-input--square .base-input__wrapper {
  border-radius: var(--radius-sm);
}
.base-input--rounded .base-input__wrapper {
  border-radius: var(--radius-md);
}
.base-input__wrapper--focused {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
}
.base-input__wrapper--disabled {
  background-color: var(--color-neutral-100);
  border-color: var(--color-neutral-200);
  cursor: not-allowed;
}
.base-input__wrapper--readonly {
  background-color: var(--color-neutral-100);
  border-color: var(--color-neutral-200);
}
.base-input__wrapper--error {
  border-color: var(--color-error);
}
.base-input__wrapper--success {
  border-color: var(--color-success);
}
.base-input__wrapper--warning {
  border-color: var(--color-warning);
}
.base-input__inner {
  flex: 1;
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-neutral-800);
  font-family: var(--font-family);
  padding: var(--spacing-sm) var(--spacing-md);
  resize: vertical;
  transition: all var(--transition-fast);
}
.base-input__inner::placeholder {
  color: var(--color-neutral-400);
}
.base-input__inner:disabled {
  cursor: not-allowed;
  color: var(--color-neutral-400);
}
.base-input__inner:read-only {
  cursor: default;
}
.base-input__inner--with-prefix {
  padding-left: 2.25rem;
}
.base-input__inner--with-suffix {
  padding-right: 2.25rem;
}
.base-input__textarea {
  line-height: var(--line-height-normal);
  padding: var(--spacing-sm) var(--spacing-md);
  min-height: 80px;
}
.base-input__icon {
  position: absolute;
  color: var(--text-muted);
  transition: color var(--transition-fast);
  pointer-events: none;
}
.base-input__icon--prefix {
  left: var(--spacing-sm);
  z-index: 1;
}
.base-input__prefix-slot {
  position: absolute;
  left: var(--spacing-sm);
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  display: flex;
  align-items: center;
}
.base-input__icon--suffix {
  right: var(--spacing-sm);
  z-index: 1;
}
.base-input__suffix {
  position: absolute;
  right: var(--spacing-sm);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  z-index: 1;
}
.base-input__clear-btn {
  color: var(--text-muted);
  cursor: pointer;
  transition: color var(--transition-fast);
}
.base-input__clear-btn:hover {
  color: var(--text-secondary);
}
.base-input__password-toggle {
  color: var(--text-muted);
  cursor: pointer;
  transition: color var(--transition-fast);
}
.base-input__password-toggle:hover {
  color: var(--text-secondary);
}
.base-input__loading-icon {
  color: var(--color-primary);
}
.base-input__char-count {
  text-align: right;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
  transition: color var(--transition-fast);
}
.base-input__char-count--error {
  color: var(--color-error);
}
.base-input__help-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
  transition: color var(--transition-fast);
}
.base-input__help-text--error {
  color: var(--color-error);
}
@include mobile {
  .base-input__inner {
    min-height: 44px;
  }
}
.base-input--sm .base-input__inner {
  min-height: 32px;
  font-size: var(--font-size-sm);
}
.base-input--md .base-input__inner {
  min-height: 40px;
}
.base-input--lg .base-input__inner {
  min-height: 48px;
  font-size: var(--font-size-lg);
}
.base-input--sm .base-input__wrapper {
  min-height: 32px;
}
.base-input--md .base-input__wrapper {
  min-height: 40px;
}
.base-input--lg .base-input__wrapper {
  min-height: 48px;
}
@media (prefers-contrast: high) {
  .base-input__wrapper {
    border-width: 2px;
  }
}
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
