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
          :maxlength="200"
          show-char-count
          :rows="3"
          autosize
        />
      </div>

      <div v-if="!props.contextCategoryId" class="add-site-modal__form-group">
        <label class="add-site-modal__label add-site-modal__label--required">分类</label>
        <select
          v-model="formData.categoryId"
          class="add-site-modal__select"
          required
        >
          <option disabled value="">
            请选择分类
          </option>
          <option
            v-for="c in categories"
            :key="c.id"
            :value="c.id"
          >
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
            :style="formData.tagIds.includes(tag.id) ? { backgroundColor: tag.color, color: '#fff' } : undefined"
            @click="toggleTag(tag.id)"
          >
            {{ tag.name }}
          </button>
        </div>
      </div>

      <div class="add-site-modal__form-group">
        <label class="add-site-modal__label">网站图标</label>
        <div class="favicon-selector">
          <label class="favicon-option">
            <input v-model="faviconSource" type="radio" value="api" />
            <div class="favicon-card">
              <img
                v-if="serviceFavicon"
                :src="serviceFavicon"
                alt="接口图标"
                class="favicon-img"
                @error="onFaviconError('api')"
              />
              <i v-else class="fas fa-icons favicon-placeholder" />
              <span class="favicon-text">接口获取图标</span>
            </div>
          </label>
          <label class="favicon-option">
            <input v-model="faviconSource" type="radio" value="default" />
            <div class="favicon-card">
              <img :src="letterFavicon" alt="默认图标" class="favicon-img" />
              <span class="favicon-text">默认图标</span>
            </div>
          </label>
        </div>
      </div>

      <div class="add-site-modal__actions">
        <BaseButton
          variant="ghost"
          type="button"
          @click="handleClose"
        >
          取消
        </BaseButton>
        <BaseButton
          variant="primary"
          :loading="submitting"
          :disabled="!isFormValid"
          type="submit"
        >
          <i class="fas fa-save" />
          {{ isEditMode ? '保存修改' : '添加网站' }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useUIStore } from '@/stores/ui'
import { formatUrl, getServiceFaviconUrl, getLetterFavicon } from '@/utils/helpers'
import BaseInput from '../base/BaseInput.vue'
import BaseButton from '../base/BaseButton.vue'
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
  return formData.value.name.trim() &&
         formData.value.url.trim() &&
         formData.value.categoryId &&
         Object.keys(errors.value).length === 0
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
      if (formData.value.description && formData.value.description.length > 200) {
        errors.value.description = '描述不能超过200个字符'
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

// URL验证辅助函数
const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

// 处理URL输入
const handleUrlInput = () => {
  // 处理URL输入逻辑
}

const faviconLoading = ref(false)
const probeImage = (src: string) => new Promise<boolean>(resolve => {
  if (!src) return resolve(false)
  const img = new Image()
  img.onload = () => resolve(true)
  img.onerror = () => resolve(false)
  img.src = src
})

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
  const apiUrl = getServiceFaviconUrl(formData.value.url, 64)
  const ok = await probeImage(apiUrl)
  faviconSource.value = ok ? 'api' : 'default'
  faviconLoading.value = false
}

// 处理表单提交
const handleSubmit = async () => {
  if (!validateForm() || submitting.value) {
    return
  }

  submitting.value = true

  try {
    const websiteData = {
      name: formData.value.name.trim(),
      url: formData.value.url.trim(),
      description: formData.value.description.trim(),
      categoryId: formData.value.categoryId,
      tagIds: [...formData.value.tagIds],
      favicon: selectedFavicon.value || undefined,
      visitCount: isEditMode.value ? props.website!.visitCount : 0,
      isOnline: true,
      createdAt: isEditMode.value ? props.website!.createdAt : new Date(),
      updatedAt: new Date(),
      lastVisited: isEditMode.value ? props.website!.lastVisited : undefined
    }

    let savedWebsite: Website

    if (isEditMode.value) {
      websiteStore.updateWebsite(props.website!.id, websiteData)
      savedWebsite = { ...props.website!, ...websiteData }
    } else {
      savedWebsite = websiteStore.addWebsite(websiteData)
    }

    uiStore.showToast(
      isEditMode.value ? '网站修改成功' : '网站添加成功',
      'success'
    )

    emit('success', savedWebsite)
    handleClose()
  } catch (error) {
    console.error('保存网站失败:', error)
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
const serviceFavicon = computed(() => formData.value.url ? getServiceFaviconUrl(formData.value.url, 64) : '')
const letterFavicon = computed(() => {
  const n = formData.value.name?.trim()
  if (n && n.length > 0) return getLetterFavicon(n, 64)
  try {
    const u = new URL(formatUrl(formData.value.url))
    return getLetterFavicon(u.hostname, 64)
  } catch {
    return getLetterFavicon('W', 64)
  }
})
const selectedFavicon = computed(() => {
  return faviconSource.value === 'api' && serviceFavicon.value
    ? serviceFavicon.value
    : letterFavicon.value
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
    faviconSource.value = props.website.favicon && props.website.favicon.includes('google.com/s2') ? 'api' : 'default'
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
// 标签选择
const toggleTag = (tagId: string) => {
  const i = formData.value.tagIds.indexOf(tagId)
  if (i > -1) formData.value.tagIds.splice(i, 1)
  else formData.value.tagIds.push(tagId)
}

// favicon错误处理
const onFaviconError = (type: 'default' | 'api') => {
  if (type === 'api') {
    faviconSource.value = 'default'
  }
}

const categories = computed(() => categoryStore.categories)
const tags = computed(() => tagStore.tags)
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.add-site-modal {
  width: 100%;
  max-width: 600px;
}

.add-site-modal__form {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.add-site-modal__form-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.add-site-modal__label {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-neutral-800;
}

.add-site-modal__label--required::after {
  content: ' *';
  color: $color-error;
}

.add-site-modal__select {
  padding: $spacing-sm $spacing-md;
  border: 1px solid $color-border;
  border-radius: $border-radius-md;
  background-color: $color-white;
  color: $color-neutral-800;
  font-size: $font-size-base;
  min-height: 40px;
  transition: all $transition-fast;

  &:hover {
    border-color: $color-neutral-300;
  }

  &:focus {
    border-color: $color-primary;
    box-shadow: 0 0 0 3px rgba($color-primary, 0.1);
    outline: none;
  }
}

.add-site-modal__error {
  color: $color-error;
  font-size: $font-size-xs;
}

.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.tag-selector__item {
  padding: 6px 12px;
  border-radius: $border-radius-pill;
  font-size: $font-size-sm;
  background-color: $color-neutral-100;
  color: $color-neutral-800;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background-color: $color-neutral-200;
  }
}

.tag-selector__item--active {
  color: $color-white;
}

.favicon-selector {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: $spacing-sm;
}

.favicon-option {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
  cursor: pointer;
}

.favicon-option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.favicon-card {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm;
  border: 1px solid $color-border;
  border-radius: $border-radius-md;
  transition: all $transition-fast;
}

.favicon-option input:checked + .favicon-card {
  border-color: $color-primary;
  box-shadow: 0 0 0 3px rgba($color-primary, 0.12);
  background-color: rgba($color-primary, 0.02);
}

.favicon-card:hover {
  border-color: $color-neutral-300;
}

.favicon-img {
  width: 24px;
  height: 24px;
  border-radius: 4px;
}

.favicon-placeholder {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: $color-neutral-600;
}

.favicon-text {
  font-size: $font-size-sm;
  color: $color-neutral-700;
}

.add-site-modal__actions {
  display: flex;
  gap: $spacing-md;
  justify-content: flex-end;
}
</style>
