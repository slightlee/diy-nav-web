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
        <BaseInput
          v-model="formData.description"
          label="网站描述"
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
        <select v-model="formData.categoryId" class="add-site-modal__select" required>
          <option disabled value="">请选择分类</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
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
              <img
                v-if="finalFaviconUrl"
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
                @click="handleFaviconSourceChange('api')"
              >
                <i class="fas fa-search" />
                <span>自动获取图标</span>
              </button>

              <button
                type="button"
                class="favicon-btn favicon-btn--default"
                :class="{ 'favicon-btn--active': faviconSource === 'default' }"
                @click="handleFaviconSourceChange('default')"
              >
                <i class="fas fa-rotate-right" />
                <span>使用默认图标</span>
              </button>
            </div>
          </div>

          <div class="favicon-info">
            <div class="favicon-source-text">
              当前图标来源：{{ faviconSource === 'api' ? '自动获取' : '默认图标' }}
            </div>
            <div class="favicon-help-text">
              根据网站地址自动尝试获取 favicon，如失败，可使用默认首字母图标。
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
import { ref, computed, watch } from 'vue'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useUIStore } from '@/stores/ui'
import { formatUrl, isValidUrl, fetchIconFromApi } from '@/utils/helpers'
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
  const fetched = await fetchIconFromApi(formData.value.url)
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
      faviconLoading.value = true
      const fetched = await fetchIconFromApi(formData.value.url)
      apiFaviconUrl.value = fetched || ''
      iconUrl = fetched || undefined
      faviconLoading.value = false
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
    faviconSource.value =
      props.website.favicon && props.website.favicon.includes('google.com/s2') ? 'api' : 'default'
  } else {
    formData.value = {
      name: '',
      url: '',
      description: '',
      categoryId: props.contextCategoryId || '',
      tagIds: []
    }
    faviconSource.value = 'default'
  }

  errors.value = {}
}

watch(() => props.website, initializeForm, { immediate: true })
watch(() => props.contextCategoryId, initializeForm)
watch(
  () => faviconSource.value,
  async v => {
    if (v === 'api' && formData.value.url.trim()) {
      faviconLoading.value = true
      const fetched = await fetchIconFromApi(formData.value.url)
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

const handleFaviconSourceChange = (source: 'api' | 'default') => {
  faviconSource.value = source
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

.add-site-modal__label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.add-site-modal__label--required::after {
  content: ' *';
  color: var(--color-error);
}

.add-site-modal__select {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: #fff;
  color: var(--color-neutral-800);
  font-size: 14px;
  min-height: 42px;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-neutral-300);
  }

  &:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.12);
    outline: none;
  }
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
  background-color: #f3f4f6;
  color: #4b5563;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;

  &:hover {
    background-color: #e5e7eb;
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
  background-color: #fff;
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

.favicon-buttons {
  display: flex;
  gap: 12px;
}

.favicon-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.favicon-source-text {
  font-size: 13px;
  color: #6b7280;
}

.favicon-help-text {
  font-size: 12px;
  color: #9ca3af;
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
  border: 1px solid #e5e7eb;
  background-color: #fff;
  color: #4b5563;
  font-weight: 500;
  min-height: 36px;

  i {
    font-size: 14px;
  }

  &:hover {
    background-color: #f9fafb;
    border-color: #d1d5db;
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
    background-color: #fff;
    border-color: #3b82f6;
    color: #3b82f6;
    box-shadow: 0 0 0 1px #3b82f6;

    &:hover {
      background-color: #eff6ff;
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
  color: #6b7280 !important;

  &:hover {
    background-color: #f3f4f6 !important;
    color: #374151 !important;
  }
}

.modal-action-btn {
  height: 36px !important;
  min-height: 36px !important;
  padding: 0 16px !important;
  font-size: 14px !important;
}

@include mobile {
  .add-site-modal__select {
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
