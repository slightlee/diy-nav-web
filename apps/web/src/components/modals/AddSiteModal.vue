<template>
  <div class="add-site-modal">
    <form class="add-site-modal__form" @submit.prevent="handleSubmit">
      <section class="form-section form-section--basic">
        <div class="form-grid">
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
        </div>

        <div class="add-site-modal__form-group description-group">
          <div class="description-header">
            <label class="add-site-modal__label">网站描述</label>
          </div>
          <BaseInput
            v-model="formData.description"
            type="textarea"
            placeholder="简单描述这个网站的用途..."
            :maxlength="100"
            :show-char-count="false"
            :rows="2"
            autosize
          />
          <div class="description-meta">
            <BaseButton
              v-if="isAIAvailable"
              variant="ghost"
              size="xs"
              html-type="button"
              icon="fas fa-wand-magic-sparkles"
              class="ai-generate-btn"
              :disabled="!formData.url || !formData.name || aiGenerating"
              :loading="aiGenerating"
              @click="handleAIGenerate"
            >
              {{ aiGenerating ? '生成中...' : 'AI 生成' }}
            </BaseButton>
            <span class="description-count">{{ formData.description.length }}/100</span>
          </div>
        </div>
      </section>

      <section class="form-section form-section--organize">
        <div class="organize-grid">
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
                  <div v-if="categories.length === 0" class="category-select__empty">
                    <span v-if="!categoryCreating">还没有分类</span>
                    <div v-else class="category-select__create">
                      <input
                        ref="categoryCreateInputRef"
                        v-model="categoryCreateName"
                        class="category-select__create-input"
                        type="text"
                        maxlength="30"
                        placeholder="输入分类名称"
                        aria-label="分类名称"
                        @keydown.enter.prevent="createCategory"
                      />
                      <div class="category-select__create-actions">
                        <BaseButton
                          variant="primary"
                          size="xs"
                          html-type="button"
                          :disabled="!categoryCreateName.trim()"
                          @click.stop="createCategory"
                        >
                          确定
                        </BaseButton>
                        <BaseButton
                          variant="ghost"
                          size="xs"
                          html-type="button"
                          @click.stop="cancelCategoryCreate"
                        >
                          取消
                        </BaseButton>
                      </div>
                    </div>
                    <BaseButton
                      v-if="!categoryCreating"
                      variant="ghost"
                      size="xs"
                      html-type="button"
                      icon="fas fa-plus"
                      @click.stop="startCategoryCreate"
                    >
                      创建分类
                    </BaseButton>
                  </div>
                </div>
              </Transition>
            </div>
            <p v-if="errors.categoryId" class="add-site-modal__error">
              {{ errors.categoryId }}
            </p>
          </div>

          <div class="add-site-modal__form-group organize-grid__tags">
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
        </div>
      </section>

      <section class="form-section form-section--favicon">
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
                <div v-else class="favicon-preview-default" aria-label="默认网站图标">
                  <i class="fas fa-globe" aria-hidden="true" />
                </div>
              </div>

              <!-- Right: Controls -->
              <div class="favicon-buttons">
                <BaseButton
                  variant="ghost"
                  size="xs"
                  html-type="button"
                  icon="fas fa-search"
                  class="favicon-btn"
                  :class="{ 'favicon-btn--active': faviconSource === 'api' }"
                  :aria-pressed="faviconSource === 'api'"
                  :disabled="faviconLoading || !formData.url.trim()"
                  @click="handleFaviconSourceChange('api')"
                >
                  自动获取图标
                </BaseButton>

                <BaseButton
                  variant="ghost"
                  size="xs"
                  html-type="button"
                  icon="fas fa-rotate-right"
                  class="favicon-btn"
                  :class="{ 'favicon-btn--active': faviconSource === 'default' }"
                  :aria-pressed="faviconSource === 'default'"
                  :disabled="faviconLoading"
                  @click="handleFaviconSourceChange('default')"
                >
                  使用默认图标
                </BaseButton>
              </div>
            </div>

            <div class="favicon-info">
              <div class="favicon-help-text">
                输入网址后自动获取图标，点击“自动获取图标”可强制刷新。
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="add-site-modal__actions">
        <BaseButton variant="ghost" size="sm" html-type="button" @click="handleClose">
          取消
        </BaseButton>
        <BaseButton
          variant="primary"
          size="sm"
          :loading="submitting"
          :disabled="!isFormValid"
          html-type="submit"
        >
          {{ isEditMode ? '保存修改' : '添加网站' }}
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
  (e: 'dirtyChange', dirty: boolean): void
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
const categoryCreating = ref(false)
const categoryCreateName = ref('')
const categoryCreateInputRef = ref<HTMLInputElement | null>(null)
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

    initialFormSnapshot.value = serializeFormState()
    emit('dirtyChange', false)
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
const initialFormSnapshot = ref('')
const formInitialized = ref(false)

const finalFaviconUrl = computed(() => {
  if (faviconSource.value === 'api' && apiFaviconUrl.value) {
    return apiFaviconUrl.value
  }
  return null
})

const serializeFormState = () =>
  JSON.stringify({
    ...formData.value,
    tagIds: [...formData.value.tagIds],
    faviconSource: faviconSource.value,
    apiFaviconUrl: apiFaviconUrl.value
  })

const isFormDirty = computed(() => {
  return formInitialized.value && serializeFormState() !== initialFormSnapshot.value
})

watch(isFormDirty, dirty => emit('dirtyChange', dirty))

// 初始化表单数据
const initializeForm = () => {
  formInitialized.value = false

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
  initialFormSnapshot.value = serializeFormState()
  formInitialized.value = true
  emit('dirtyChange', false)
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

const startCategoryCreate = async () => {
  categoryCreating.value = true
  categoryCreateName.value = ''
  await nextTick()
  categoryCreateInputRef.value?.focus()
}

const cancelCategoryCreate = () => {
  categoryCreating.value = false
  categoryCreateName.value = ''
}

const createCategory = () => {
  const name = categoryCreateName.value.trim()
  if (!name) return

  try {
    const category = categoryStore.addCategory({
      name,
      icon: 'fas fa-folder'
    })
    formData.value.categoryId = category.id
    delete errors.value.categoryId
    cancelCategoryCreate()
    closeCategorySelect(true)
  } catch (error) {
    if (error instanceof Error && error.message === 'DUPLICATE_NAME') {
      uiStore.showToast('分类名称已存在', 'warning')
      return
    }
    uiStore.showToast('分类创建失败，请重试', 'error')
  }
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
  max-width: 680px;
}

.add-site-modal__form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-section {
  padding: 2px 0;
  margin-bottom: 12px;

  &:last-of-type {
    margin-bottom: 0;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.organize-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.add-site-modal__form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

:deep(.base-input__label) {
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

:deep(.base-input__wrapper) {
  min-height: 40px;
  border-radius: 10px;
  background-color: var(--bg-tile);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;
}

:deep(.base-input__wrapper--focused) {
  background-color: var(--bg-panel);
}

:deep(.base-input__inner) {
  font-size: 14px;
  line-height: 1.5;
}

:deep(.base-input__textarea) {
  min-height: 72px;
  line-height: 1.55;
}

.description-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.description-group {
  margin-top: 12px;
}

.description-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
}

.ai-generate-btn {
  margin-left: -6px;
}

.description-count {
  font-size: 12px;
  line-height: 1;
  color: var(--text-muted);
}

.add-site-modal__label {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
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
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
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
  min-height: 72px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  color: var(--text-muted);
  text-align: center;
}

.category-select__create {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-select__create-input {
  width: 100%;
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: $border-radius-sm;
  background: var(--bg-tile);
  color: var(--text-main);
  font: inherit;
  font-size: 13px;
  outline: none;

  &:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.12);
  }
}

.category-select__create-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
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
  gap: 7px;
}

.organize-grid__tags {
  gap: 6px;
}

.tag-selector__item {
  min-height: 30px;
  padding: 0 11px;
  border-radius: 9999px;
  font-size: 14px;
  line-height: 1.5;
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
  background-color: var(--primary-soft);
  color: var(--color-primary-dark);
  border-color: transparent;
  font-weight: 600;
}

.favicon-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-tile) 72%, transparent);
}

.favicon-main {
  display: flex;
  gap: 12px;
  align-items: center;
}

.favicon-preview-box {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 13px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.favicon-preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: var(--bg-tile);
}

.favicon-preview-default {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  background: var(--primary-soft);

  i {
    font-size: 19px;
  }
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
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.favicon-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  line-height: 1.5;
  color: var(--text-muted);
}

.default-icon-symbol {
  font-family: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;
  font-weight: 700;
  font-size: 14px;
  line-height: 1;
}

.favicon-btn--active {
  background-color: color-mix(in srgb, var(--color-primary) 7%, transparent) !important;
  color: var(--color-primary-dark) !important;

  &:hover {
    background-color: color-mix(in srgb, var(--color-primary) 10%, transparent) !important;
  }
}

.add-site-modal__actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 0;
  padding-top: 2px;
}

@include mobile {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .organize-grid {
    gap: 16px;
  }

  .form-section {
    margin-bottom: 20px;
  }

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

  .favicon-main {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
