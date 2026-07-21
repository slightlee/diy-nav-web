<template>
  <div class="add-site-modal">
    <form class="add-site-modal__form" @submit.prevent="handleSubmit">
      <div class="add-site-modal__form-group">
        <BaseInput
          ref="nameInputRef"
          v-model="formData.name"
          label="网站名称"
          placeholder="请输入网站名称"
          required
          :error-message="errors.name"
          @blur="validateField('name')"
        />
      </div>

      <div class="add-site-modal__form-group">
        <BaseInput
          v-model="formData.url"
          label="网站地址"
          type="url"
          placeholder="https://example.com"
          required
          :error-message="errors.url"
          @blur="handleUrlBlur"
          @input="handleUrlInput"
        />
      </div>

      <div class="add-site-modal__form-group">
        <div class="description-header">
          <label class="add-site-modal__label">网站描述</label>
          <button
            v-if="isAIAvailable"
            type="button"
            class="ai-generate-btn"
            :disabled="!formData.url || !formData.name || aiGenerating"
            @click="handleAIGenerate"
          >
            <i :class="aiGenerating ? 'fas fa-spinner fa-spin' : 'fas fa-wand-magic-sparkles'" />
            {{ aiGenerating ? '生成中...' : 'AI 生成' }}
          </button>
        </div>
        <BaseInput
          v-model="formData.description"
          type="textarea"
          placeholder="简单描述这个网站的用途..."
          :maxlength="100"
          show-char-count
          :rows="2"
          autosize
        />
      </div>

      <div v-if="!props.contextCategoryId" class="add-site-modal__form-group">
        <label class="add-site-modal__label add-site-modal__label--required">分类</label>
        <div ref="categorySelectRef" class="category-select">
          <button
            ref="categoryTriggerRef"
            type="button"
            class="category-select__trigger"
            :class="{
              'category-select__trigger--open': categorySelectOpen,
              'category-select__trigger--error': errors.categoryId
            }"
            aria-haspopup="listbox"
            aria-controls="add-site-category-options"
            :aria-expanded="categorySelectOpen"
            :aria-invalid="Boolean(errors.categoryId)"
            aria-required="true"
            @click="toggleCategorySelect"
            @keydown="handleCategoryTriggerKeydown"
          >
            <span
              class="category-select__value"
              :class="{ 'category-select__value--placeholder': !selectedCategory }"
            >
              {{ selectedCategory?.name || '请选择分类' }}
            </span>
            <i
              class="fas fa-chevron-down category-select__chevron"
              :class="{ 'category-select__chevron--open': categorySelectOpen }"
              aria-hidden="true"
            />
          </button>

          <Transition name="category-select-menu">
            <div
              v-if="categorySelectOpen"
              id="add-site-category-options"
              class="category-select__menu"
              role="listbox"
              aria-label="选择分类"
              @keydown="handleCategoryOptionKeydown"
            >
              <button
                v-for="(category, index) in categories"
                :key="category.id"
                type="button"
                class="category-select__option"
                :class="{
                  'category-select__option--selected': category.id === formData.categoryId
                }"
                role="option"
                :aria-selected="category.id === formData.categoryId"
                :tabindex="activeCategoryIndex === index ? 0 : -1"
                @click="selectCategory(category.id)"
              >
                <span>{{ category.name }}</span>
                <i
                  v-if="category.id === formData.categoryId"
                  class="fas fa-check"
                  aria-hidden="true"
                />
              </button>
              <p v-if="categories.length === 0" class="category-select__empty">暂无分类</p>
            </div>
          </Transition>
        </div>
        <p v-if="errors.categoryId" class="add-site-modal__error">
          {{ errors.categoryId }}
        </p>
      </div>

      <div class="add-site-modal__form-group">
        <label class="add-site-modal__label">标签</label>
        <div class="tag-selector">
          <button
            v-for="tag in tags"
            :key="tag.id"
            type="button"
            class="tag-selector__item"
            :class="{ 'tag-selector__item--active': formData.tagIds.includes(tag.id) }"
            @click="toggleTag(tag.id)"
          >
            {{ tag.name }}
          </button>
        </div>
      </div>

      <div class="add-site-modal__form-group">
        <label class="add-site-modal__label">网站图标</label>
        <div class="favicon-section">
          <div class="favicon-main">
            <!-- Left: Preview -->
            <div class="favicon-preview-box">
              <div v-if="faviconLoading" class="favicon-preview-loading">
                <i class="fas fa-spinner fa-spin" />
              </div>
              <img
                v-else-if="finalFaviconUrl"
                :src="finalFaviconUrl"
                class="favicon-preview-img"
                alt="Favicon"
              />
              <div v-else class="favicon-preview-letter" :style="{ backgroundColor: '#111827' }">
                {{ letterFaviconChar }}
              </div>
            </div>

            <!-- Right: Controls -->
            <div class="favicon-buttons">
              <button
                type="button"
                class="favicon-btn favicon-btn--api"
                :class="{ 'favicon-btn--active': faviconSource === 'api' }"
                :disabled="faviconLoading || !formData.url.trim()"
                @click="handleFaviconSourceChange('api')"
              >
                <i class="fas fa-search" />
                <span>自动获取图标</span>
              </button>

              <button
                type="button"
                class="favicon-btn favicon-btn--default"
                :class="{ 'favicon-btn--active': faviconSource === 'default' }"
                :disabled="faviconLoading"
                @click="handleFaviconSourceChange('default')"
              >
                <i class="fas fa-rotate-right" />
                <span>使用默认图标</span>
              </button>
            </div>
          </div>

          <div class="favicon-info">
            <div class="favicon-help-text">
              输入网址后自动获取图标(优先使用缓存),点击"自动获取图标"按钮可强制刷新最新图标。
            </div>
          </div>
        </div>
      </div>

      <div class="add-site-modal__actions">
        <BaseButton
          variant="ghost"
          html-type="button"
          class="cancel-btn modal-action-btn"
          @click="handleClose"
        >
          取消
        </BaseButton>
        <BaseButton
          variant="primary"
          :loading="submitting"
          :disabled="!isFormValid"
          html-type="submit"
          class="modal-action-btn"
        >
          <i class="fas fa-save" />
          {{ '保存修改' }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { formatUrl, isValidUrl } from '@/utils/helpers'
import { getIcon } from '@/api/icon'
import { generateDescription } from '@/api/ai'
import { BaseInput, BaseButton } from '@nav/ui'
import type { Website } from '@/types'

interface Props {
  website?: Website
  contextCategoryId?: string
}

interface Emits {
  (e: 'close'): void
  (e: 'success', website: Website): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Store
const websiteStore = useWebsiteStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()
const uiStore = useUIStore()
const authStore = useAuthStore()

// AI state
const aiGenerating = ref(false)
const isAIAvailable = computed(() => authStore.isAuthenticated)

// AI description generation
const handleAIGenerate = async () => {
  if (!formData.value.url || !formData.value.name || aiGenerating.value) return

  aiGenerating.value = true
  try {
    const result = await generateDescription(formData.value.name, formData.value.url)
    formData.value.description = result.description
    uiStore.showToast('描述已生成', 'success')
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成失败，请稍后重试'
    uiStore.showToast(message, 'error')
  } finally {
    aiGenerating.value = false
  }
}

// 组件引用
const nameInputRef = ref()

// 表单数据
const formData = ref({
  name: '',
  url: '',
  description: '',
  categoryId: '',
  tagIds: [] as string[]
})

// 表单状态
const errors = ref<Record<string, string>>({})
const submitting = ref(false)
const categorySelectOpen = ref(false)
const activeCategoryIndex = ref(-1)
const categorySelectRef = ref<HTMLElement | null>(null)
const categoryTriggerRef = ref<HTMLButtonElement | null>(null)

// 计算属性
const isEditMode = computed(() => !!props.website)

const isFormValid = computed(() => {
  return (
    formData.value.name.trim() &&
    formData.value.url.trim() &&
    formData.value.categoryId &&
    Object.keys(errors.value).length === 0
  )
})

// 验证单个字段
const validateField = (field: string) => {
  switch (field) {
    case 'name':
      if (!formData.value.name.trim()) {
        errors.value.name = '网站名称不能为空'
      } else if (formData.value.name.length > 50) {
        errors.value.name = '网站名称不能超过50个字符'
      } else {
        delete errors.value.name
      }
      break
    case 'url':
      if (!formData.value.url.trim()) {
        errors.value.url = '网站地址不能为空'
      } else if (!isValidUrl(formData.value.url)) {
        errors.value.url = '请输入有效的网站地址'
      } else {
        delete errors.value.url
      }
      break
    case 'description':
      if (formData.value.description && formData.value.description.length > 100) {
        errors.value.description = '描述不能超过100个字符'
      } else {
        delete errors.value.description
      }
      break
  }
}

// 验证整个表单
const validateForm = () => {
  errors.value = {}
  categorySelectOpen.value = false
  activeCategoryIndex.value = -1
  validateField('name')
  validateField('url')
  validateField('description')

  if (!formData.value.categoryId) {
    errors.value.categoryId = '请选择一个分类'
  }

  return Object.keys(errors.value).length === 0
}

// URL校验统一使用工具函数

// 处理URL输入
const handleUrlInput = () => {
  // 处理URL输入逻辑
}

const faviconLoading = ref(false)
const apiFaviconUrl = ref('')

// 处理URL失焦自动补全
const handleUrlBlur = async () => {
  const raw = formData.value.url.trim()
  if (!raw) {
    validateField('url')
    return
  }
  let normalized = raw
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = normalized.startsWith('www.') ? `https://${normalized}` : `https://${normalized}`
  }
  formData.value.url = formatUrl(normalized)
  validateField('url')
  faviconLoading.value = true
  // 失焦自动获取,不带refresh,优先使用缓存
  const res = await getIcon({ url: formData.value.url, refresh: false })
  const fetched = res.data?.url
  apiFaviconUrl.value = fetched || ''
  faviconSource.value = fetched ? 'api' : 'default'
  faviconLoading.value = false
}

// 处理表单提交
const handleSubmit = async () => {
  if (!validateForm() || submitting.value) {
    return
  }

  submitting.value = true

  try {
    const existing = props.website
    let iconUrl: string | undefined
    if (faviconSource.value === 'api') {
      // 优先使用已获取的图标URL,避免重复调用API
      if (apiFaviconUrl.value) {
        iconUrl = apiFaviconUrl.value
      } else {
        // 只在没有缓存时才重新获取,不带refresh
        faviconLoading.value = true
        const res = await getIcon({ url: formData.value.url, refresh: false })
        const fetched = res.data?.url
        apiFaviconUrl.value = fetched || ''
        iconUrl = fetched || undefined
        faviconLoading.value = false
      }
    }

    const websiteData = {
      name: formData.value.name.trim(),
      url: formData.value.url.trim(),
      description: formData.value.description.trim(),
      categoryId: formData.value.categoryId,
      tagIds: [...formData.value.tagIds],
      favicon: iconUrl || undefined,
      visitCount: existing?.visitCount ?? 0,
      isOnline: true,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
      lastVisited: existing?.lastVisited
    }

    let savedWebsite: Website

    if (props.website) {
      websiteStore.updateWebsite(props.website.id, websiteData)
      savedWebsite = { ...props.website, ...websiteData }
    } else {
      savedWebsite = websiteStore.addWebsite(websiteData)
    }

    uiStore.showToast(isEditMode.value ? '网站修改成功' : '网站添加成功', 'success')

    emit('success', savedWebsite)
    handleClose()
  } catch {
    uiStore.showToast('保存失败，请重试', 'error')
  } finally {
    submitting.value = false
  }
}

// 处理关闭
const handleClose = () => {
  emit('close')
}

const faviconSource = ref<'default' | 'api'>('default')

const letterFaviconChar = computed(() => {
  const n = formData.value.name?.trim()
  if (n && n.length > 0) return n[0].toUpperCase()
  try {
    const u = new URL(formatUrl(formData.value.url))
    return u.hostname[0].toUpperCase()
  } catch {
    return 'W'
  }
})

const finalFaviconUrl = computed(() => {
  if (faviconSource.value === 'api' && apiFaviconUrl.value) {
    return apiFaviconUrl.value
  }
  return null
})

// 初始化表单数据
const initializeForm = () => {
  if (props.website) {
    formData.value = {
      name: props.website.name,
      url: props.website.url,
      description: props.website.description || '',
      categoryId: props.website.categoryId,
      tagIds: [...props.website.tagIds]
    }
    // 如果网站有favicon,说明是通过API获取的
    if (props.website.favicon) {
      faviconSource.value = 'api'
      apiFaviconUrl.value = props.website.favicon
    } else {
      faviconSource.value = 'default'
      apiFaviconUrl.value = ''
    }
  } else {
    formData.value = {
      name: '',
      url: '',
      description: '',
      categoryId: props.contextCategoryId || '',
      tagIds: []
    }
    faviconSource.value = 'api' // 默认选中自动获取图标
    apiFaviconUrl.value = ''
  }

  errors.value = {}
}

watch(() => props.website, initializeForm, { immediate: true })
watch(() => props.contextCategoryId, initializeForm)
watch(
  () => faviconSource.value,
  async v => {
    if (v === 'api' && formData.value.url.trim()) {
      // watch触发时不带refresh,使用缓存
      faviconLoading.value = true
      const res = await getIcon({ url: formData.value.url, refresh: false })
      const fetched = res.data?.url
      apiFaviconUrl.value = fetched || ''
      faviconSource.value = fetched ? 'api' : 'default'
      faviconLoading.value = false
    }
  }
)
// 标签选择
const toggleTag = (tagId: string) => {
  const i = formData.value.tagIds.indexOf(tagId)
  if (i > -1) formData.value.tagIds.splice(i, 1)
  else formData.value.tagIds.push(tagId)
}

const categories = computed(() => categoryStore.categories)
const tags = computed(() => tagStore.tags)
const selectedCategory = computed(() =>
  categories.value.find(category => category.id === formData.value.categoryId)
)

const focusCategoryOption = async (index: number) => {
  const optionCount = categories.value.length
  if (optionCount === 0) return

  activeCategoryIndex.value = (index + optionCount) % optionCount
  await nextTick()
  const options = categorySelectRef.value?.querySelectorAll<HTMLElement>('[role="option"]')
  options?.[activeCategoryIndex.value]?.focus()
}

const openCategorySelect = async (direction: 1 | -1 = 1) => {
  categorySelectOpen.value = true
  const selectedIndex = categories.value.findIndex(
    category => category.id === formData.value.categoryId
  )
  const initialIndex = selectedIndex >= 0 ? selectedIndex : direction === 1 ? 0 : -1
  await focusCategoryOption(initialIndex)
}

const closeCategorySelect = (restoreFocus = false) => {
  categorySelectOpen.value = false
  activeCategoryIndex.value = -1
  if (restoreFocus) categoryTriggerRef.value?.focus()
}

const toggleCategorySelect = () => {
  if (categorySelectOpen.value) closeCategorySelect()
  else void openCategorySelect()
}

const selectCategory = (categoryId: string) => {
  formData.value.categoryId = categoryId
  delete errors.value.categoryId
  closeCategorySelect(true)
}

const handleCategoryTriggerKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  void openCategorySelect(event.key === 'ArrowDown' ? 1 : -1)
}

const handleCategoryOptionKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    closeCategorySelect(true)
    return
  }

  if (event.key === 'Tab') {
    closeCategorySelect()
    return
  }

  const keyIndexes: Partial<Record<string, number>> = {
    ArrowDown: activeCategoryIndex.value + 1,
    ArrowUp: activeCategoryIndex.value - 1,
    Home: 0,
    End: categories.value.length - 1
  }
  const targetIndex = keyIndexes[event.key]
  if (targetIndex === undefined) return

  event.preventDefault()
  void focusCategoryOption(targetIndex)
}

const handleCategoryOutsideClick = (event: MouseEvent) => {
  if (!categorySelectOpen.value) return
  if (!categorySelectRef.value?.contains(event.target as Node)) closeCategorySelect()
}

onMounted(() => document.addEventListener('click', handleCategoryOutsideClick))
onUnmounted(() => document.removeEventListener('click', handleCategoryOutsideClick))

const handleFaviconSourceChange = async (source: 'api' | 'default') => {
  faviconSource.value = source

  // 点击按钮时,带refresh=true强制刷新最新图标
  if (source === 'api' && formData.value.url.trim()) {
    faviconLoading.value = true
    const res = await getIcon({ url: formData.value.url, refresh: true })
    const fetched = res.data?.url
    apiFaviconUrl.value = fetched || ''
    faviconSource.value = fetched ? 'api' : 'default'
    faviconLoading.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.add-site-modal {
  width: 100%;
  max-width: 640px;
}

.add-site-modal__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.add-site-modal__form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.description-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ai-generate-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  border: none;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);

  i {
    font-size: 11px;
  }

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
}

.add-site-modal__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-main);
}

.add-site-modal__label--required::after {
  content: ' *';
  color: var(--color-error);
}

.category-select {
  position: relative;
}

.category-select__trigger {
  width: 100%;
  min-height: 42px;
  padding: $spacing-sm $spacing-md;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  border: 1px solid var(--color-border);
  border-radius: $border-radius-md;
  background-color: var(--bg-tile);
  color: var(--text-main);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color $transition-fast,
    box-shadow $transition-fast;

  &:hover {
    border-color: var(--color-neutral-300);
  }

  &:focus-visible,
  &--open {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.12);
    outline: none;
  }

  &--error {
    border-color: var(--color-error);
  }
}

.category-select__value {
  min-width: 0;
  overflow: hidden;
  color: var(--text-main);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-select__value--placeholder {
  color: var(--text-muted);
}

.category-select__chevron {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: $font-size-xs;
  transition: transform $transition-fast;
}

.category-select__chevron--open {
  transform: rotate(180deg);
}

.category-select__menu {
  position: absolute;
  top: calc(100% + #{$spacing-xs});
  right: 0;
  left: 0;
  z-index: $z-index-dropdown;
  max-height: min(240px, 35vh);
  padding: $spacing-xs;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: $border-radius-md;
  background-color: var(--bg-panel);
  box-shadow: $shadow-lg;
}

.category-select__option {
  width: 100%;
  min-height: 38px;
  padding: $spacing-sm $spacing-md;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  border: none;
  border-radius: $border-radius-sm;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background-color $transition-fast,
    color $transition-fast;

  &:hover,
  &:focus-visible {
    background-color: var(--bg-tile-hover);
    color: var(--text-main);
    outline: none;
  }

  &--selected {
    background-color: var(--primary-soft);
    color: var(--color-primary);
  }

  i {
    flex-shrink: 0;
    font-size: $font-size-xs;
  }
}

.category-select__empty {
  margin: 0;
  padding: $spacing-md;
  color: var(--text-muted);
  text-align: center;
}

.category-select-menu-enter-active,
.category-select-menu-leave-active {
  transition:
    opacity $transition-fast,
    transform $transition-fast;
  transform-origin: top;
}

.category-select-menu-enter-from,
.category-select-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

.add-site-modal__error {
  color: var(--color-error);
  font-size: var(--font-size-xs);
  margin-top: 4px;
}

.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-selector__item {
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 13px;
  background-color: var(--bg-tile);
  color: var(--text-secondary);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;

  &:hover {
    background-color: var(--bg-tile-hover);
  }
}

.tag-selector__item--active {
  background-color: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border-color: rgba(59, 130, 246, 0.2);
  font-weight: 600;
}

.favicon-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.favicon-main {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.favicon-preview-box {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.favicon-preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: var(--bg-tile);
}

.favicon-preview-letter {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;
}

.favicon-preview-loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-tile);
  color: var(--color-primary);
  font-size: 18px;
}

.favicon-buttons {
  display: flex;
  gap: 12px;
}

.favicon-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.favicon-source-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.favicon-options {
  display: flex;
  align-items: center;
  gap: 12px;
}

.favicon-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;

  input[type='checkbox'] {
    cursor: pointer;
    width: 16px;
    height: 16px;
  }

  &:hover {
    color: var(--text-main);
  }
}

.favicon-help-text {
  font-size: 12px;
  color: var(--text-muted);
}

.favicon-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-tile);
  background-color: var(--bg-panel);
  color: var(--text-secondary);
  font-weight: 500;
  min-height: 36px;

  i {
    font-size: 14px;
  }

  &:hover:not(:disabled) {
    background-color: var(--bg-tile-hover);
    border-color: var(--border-tile-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.default-icon-symbol {
  font-family: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;
  font-weight: 700;
  font-size: 14px;
  line-height: 1;
}

.favicon-btn--active {
  &.favicon-btn--api {
    background-color: #3b82f6;
    border-color: #3b82f6;
    color: #fff;

    &:hover {
      background-color: #2563eb;
      border-color: #2563eb;
    }
  }

  &.favicon-btn--default {
    background-color: var(--bg-panel);
    border-color: #3b82f6;
    color: #3b82f6;
    box-shadow: 0 0 0 1px #3b82f6;

    &:hover {
      background-color: rgba(59, 130, 246, 0.05);
    }
  }
}

.add-site-modal__actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.cancel-btn {
  color: var(--text-secondary) !important;

  &:hover {
    background-color: var(--bg-tile-hover) !important;
    color: var(--text-main) !important;
  }
}

.modal-action-btn {
  height: 36px !important;
  min-height: 36px !important;
  padding: 0 16px !important;
  font-size: 14px !important;
}

@include mobile {
  .category-select__trigger {
    min-height: 44px;
  }

  .favicon-selector {
    flex-direction: column;
    align-items: stretch;
  }

  .favicon-btn {
    justify-content: center;
  }
}
</style>
