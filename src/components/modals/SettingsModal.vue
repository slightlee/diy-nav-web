<template>
  <div class="settings-modal">
    <!-- 导入导出区域 -->
    <div class="settings-modal__section">
      <h3 class="settings-modal__section-title">
        <i class="fas fa-exchange-alt" />
        数据管理
      </h3>

      <div class="settings-modal__data-actions">
        <div class="settings-modal__data-action">
          <h4 class="settings-modal__action-title">
            导出数据
          </h4>
          <p class="settings-modal__action-description">
            将所有网站、分类和标签数据导出为JSON文件
          </p>
          <BaseButton
            variant="outline"
            :loading="exporting"
            class="settings-modal__action-btn"
            @click="handleExport"
          >
            <i class="fas fa-download" />
            导出数据
          </BaseButton>
        </div>

        <div class="settings-modal__data-action">
          <h4 class="settings-modal__action-title">
            导入数据
          </h4>
          <p class="settings-modal__action-description">
            从JSON文件导入网站、分类和标签数据
          </p>
          <input
            ref="fileInputRef"
            type="file"
            accept=".json"
            style="display: none"
            @change="handleFileImport"
          />
          <BaseButton
            variant="outline"
            :loading="importing"
            class="settings-modal__action-btn"
            @click="triggerFileImport"
          >
            <i class="fas fa-upload" />
            导入数据
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- 主题设置 -->
    <div class="settings-modal__section">
      <h3 class="settings-modal__section-title">
        <i class="fas fa-palette" />
        主题设置
      </h3>

      <div class="settings-modal__theme-options">
        <label class="settings-modal__theme-option">
          <input
            v-model="settings.theme"
            type="radio"
            value="light"
            class="settings-modal__theme-radio"
          />
          <div class="settings-modal__theme-card">
            <div class="settings-modal__theme-preview settings-modal__theme-preview--light">
              <i class="fas fa-sun" />
            </div>
            <span class="settings-modal__theme-name">浅色主题</span>
          </div>
        </label>

        <label class="settings-modal__theme-option">
          <input
            v-model="settings.theme"
            type="radio"
            value="dark"
            class="settings-modal__theme-radio"
          />
          <div class="settings-modal__theme-card">
            <div class="settings-modal__theme-preview settings-modal__theme-preview--dark">
              <i class="fas fa-moon" />
            </div>
            <span class="settings-modal__theme-name">深色主题</span>
          </div>
        </label>

        <label class="settings-modal__theme-option">
          <input
            v-model="settings.theme"
            type="radio"
            value="auto"
            class="settings-modal__theme-radio"
          />
          <div class="settings-modal__theme-card">
            <div class="settings-modal__theme-preview settings-modal__theme-preview--auto">
              <i class="fas fa-adjust" />
            </div>
            <span class="settings-modal__theme-name">跟随系统</span>
          </div>
        </label>
      </div>
    </div>

    <!-- 显示设置 -->
    <div class="settings-modal__section">
      <h3 class="settings-modal__section-title">
        <i class="fas fa-desktop" />
        显示设置
      </h3>

      <div class="settings-modal__setting-group">
        <div class="settings-modal__setting-item">
          <label class="settings-modal__setting-label">
            网格密度
          </label>
          <select
            v-model="settings.gridDensity"
            class="settings-modal__setting-select"
          >
            <option value="compact">
              紧凑
            </option>
            <option value="normal">
              标准
            </option>
            <option value="loose">
              宽松
            </option>
          </select>
        </div>

        <div class="settings-modal__setting-item">
          <label class="settings-modal__setting-label">
            视图模式
          </label>
          <select
            v-model="settings.viewMode"
            class="settings-modal__setting-select"
          >
            <option value="card">
              卡片视图
            </option>
            <option value="list">
              列表视图
            </option>
          </select>
        </div>

        <div class="settings-modal__setting-item">
          <label class="settings-modal__setting-label">
            字体大小
          </label>
          <select
            v-model="settings.fontSize"
            class="settings-modal__setting-select"
          >
            <option value="small">
              小
            </option>
            <option value="medium">
              中
            </option>
            <option value="large">
              大
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- 高级设置 -->
    <div class="settings-modal__section">
      <h3 class="settings-modal__section-title">
        <i class="fas fa-cog" />
        高级设置
      </h3>

      <div class="settings-modal__setting-group">
        <label class="settings-modal__checkbox-setting">
          <input
            v-model="settings.autoBackup"
            type="checkbox"
            class="settings-modal__checkbox"
          />
          <span class="settings-modal__checkbox-text">
            自动备份
          </span>
          <span class="settings-modal__checkbox-description">
            定期自动备份数据到本地存储
          </span>
        </label>
      </div>

      <!-- 快捷键设置 -->
      <div class="settings-modal__shortcuts-section">
        <h4 class="settings-modal__shortcuts-title">
          <i class="fas fa-keyboard" />
          快捷键
        </h4>
        <div class="settings-modal__shortcuts-list">
          <div
            v-for="shortcut in shortcuts"
            :key="shortcut.id"
            class="settings-modal__shortcut-item"
          >
            <span class="settings-modal__shortcut-name">{{ shortcut.name }}</span>
            <kbd class="settings-modal__shortcut-key">{{ shortcut.keybind }}</kbd>
          </div>
        </div>
      </div>
    </div>

    <!-- 危险操作 -->
    <div class="settings-modal__section settings-modal__section--danger">
      <h3 class="settings-modal__section-title">
        <i class="fas fa-exclamation-triangle" />
        危险操作
      </h3>

      <div class="settings-modal__danger-actions">
        <p class="settings-modal__danger-description">
          以下操作不可恢复，请谨慎操作
        </p>
        <BaseButton
          variant="danger"
          class="settings-modal__danger-btn"
          @click="handleClearData"
        >
          <i class="fas fa-trash-alt" />
          清除所有数据
        </BaseButton>
      </div>
    </div>

    <!-- 操作区域 -->
    <div class="settings-modal__actions">
      <BaseButton
        variant="ghost"
        @click="handleClose"
      >
        取消
      </BaseButton>
      <BaseButton
        variant="primary"
        :loading="saving"
        @click="handleSave"
      >
        <i class="fas fa-save" />
        保存设置
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useUIStore } from '@/stores/ui'
import BaseButton from '../base/BaseButton.vue'
import type { UserSettings } from '@/types'

interface Emits {
  (e: 'close'): void
}

const emit = defineEmits<Emits>()

// Store
const websiteStore = useWebsiteStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()
const uiStore = useUIStore()

// 组件引用
const fileInputRef = ref()

// 设置数据
const settings = ref<UserSettings>({
  theme: 'light',
  gridDensity: 'normal',
  viewMode: 'card',
  fontSize: 'medium',
  customBackground: '',
  autoBackup: true,
  shortcuts: {}
})

// 加载状态
const exporting = ref(false)
const importing = ref(false)
const saving = ref(false)

// 快捷键列表
const shortcuts = computed(() => [
  { id: 'add-website', name: '添加网站', keybind: 'Ctrl+N' },
  { id: 'quick-search', name: '快速搜索', keybind: 'Ctrl+K' },
  { id: 'manage-categories', name: '管理分类', keybind: 'Ctrl+Shift+C' },
  { id: 'manage-tags', name: '管理标签', keybind: 'Ctrl+Shift+T' },
  { id: 'settings', name: '设置', keybind: 'Ctrl+,' }
])

// 初始化设置
const initializeSettings = () => {
  const saved = localStorage.getItem('userSettings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      settings.value = { ...settings.value, ...parsed }
    } catch (error) {
      console.error('解析设置失败:', error)
    }
  }
}

// 保存设置
const saveSettings = () => {
  localStorage.setItem('userSettings', JSON.stringify(settings.value))
  applySettings()
}

// 应用设置
const applySettings = () => {
  // 应用主题
  const root = document.documentElement
  if (settings.value.theme === 'dark') {
    root.classList.add('dark-theme')
  } else if (settings.value.theme === 'light') {
    root.classList.remove('dark-theme')
  } else {
    // auto模式由CSS媒体查询处理
    root.classList.remove('dark-theme')
  }

  // 应用字体大小
  const fontSizeMap = {
    small: '14px',
    medium: '16px',
    large: '18px'
  }
  root.style.fontSize = fontSizeMap[settings.value.fontSize]

  // 应用网格密度
  root.classList.remove('grid-compact', 'grid-normal', 'grid-loose')
  root.classList.add(`grid-${settings.value.gridDensity}`)
}

// 处理导出数据
const handleExport = async () => {
  if (exporting.value) return

  exporting.value = true

  try {
    const data = websiteStore.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `diy-nav-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    uiStore.showToast('数据导出成功', 'success')
  } catch (error) {
    console.error('导出数据失败:', error)
    uiStore.showToast('导出失败，请重试', 'error')
  } finally {
    exporting.value = false
  }
}

// 触发文件导入
const triggerFileImport = () => {
  fileInputRef.value?.click()
}

// 处理文件导入
const handleFileImport = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (importing.value) return

  importing.value = true

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    // 验证数据格式
    if (!data.websites || !Array.isArray(data.websites)) {
      throw new Error('无效的数据格式')
    }

    // 确认导入
    const websiteCount = data.websites?.length || 0
    const categoryCount = data.categories?.length || 0
    const tagCount = data.tags?.length || 0

    if (!confirm(
      `即将导入 ${websiteCount} 个网站、${categoryCount} 个分类、${tagCount} 个标签。\n` +
      '这将覆盖现有数据，确定继续吗？'
    )) {
      return
    }

    // 执行导入
    websiteStore.importData(data)

    // 导入分类和标签
    if (data.categories) {
      localStorage.setItem('categories', JSON.stringify(data.categories))
    }
    if (data.tags) {
      localStorage.setItem('tags', JSON.stringify(data.tags))
    }

    uiStore.showToast('数据导入成功', 'success')
    emit('close')
  } catch (error) {
    console.error('导入数据失败:', error)
    uiStore.showToast('导入失败：' + (error as Error).message, 'error')
  } finally {
    importing.value = false
    // 清空文件输入
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}

// 处理清除数据
const handleClearData = () => {
  const confirmMessage =
    '⚠️ 警告：此操作将删除所有数据，包括：\n' +
    '• 所有网站\n' +
    '• 所有分类\n' +
    '• 所有标签\n' +
    '• 所有设置\n\n' +
    '此操作不可恢复，确定继续吗？'

  if (!confirm(confirmMessage)) {
    return
  }

  if (!confirm('再次确认：真的要删除所有数据吗？')) {
    return
  }

  try {
    // 清除所有localStorage数据
    localStorage.removeItem('websites')
    localStorage.removeItem('categories')
    localStorage.removeItem('tags')
    localStorage.removeItem('userSettings')

    // 重新初始化stores
    websiteStore.initializeData()
    categoryStore.initializeData()
    tagStore.initializeData()

    uiStore.showToast('所有数据已清除', 'success')
    emit('close')
  } catch (error) {
    console.error('清除数据失败:', error)
    uiStore.showToast('清除失败，请重试', 'error')
  }
}

// 处理保存设置
const handleSave = async () => {
  if (saving.value) return

  saving.value = true

  try {
    saveSettings()
    uiStore.showToast('设置保存成功', 'success')
    emit('close')
  } catch (error) {
    console.error('保存设置失败:', error)
    uiStore.showToast('保存失败，请重试', 'error')
  } finally {
    saving.value = false
  }
}

// 处理关闭
const handleClose = () => {
  emit('close')
}

// 生命周期
onMounted(() => {
  initializeSettings()
  applySettings()
})
</script>

<style scoped lang="scss">
@use 'sass:color';
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.settings-modal {
  width: 100%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;
  overflow-y: auto;
}

// 区域样式
.settings-modal__section {
  padding: $spacing-lg;
  background-color: $color-white;
  border: 1px solid $color-border;
  border-radius: $border-radius-lg;

  &--danger {
    border-color: $color-error;
    background-color: rgba($color-error, 0.02);
  }
}

.settings-modal__section-title {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-neutral-800;
  margin: 0 0 $spacing-lg 0;
}

// 数据管理区域
.settings-modal__data-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: $spacing-lg;
}

.settings-modal__data-action {
  padding: $spacing-md;
  border: 1px solid $color-neutral-200;
  border-radius: $border-radius-md;
  transition: all $transition-fast;

  &:hover {
    border-color: $color-primary;
    background-color: rgba($color-primary, 0.02);
  }
}

.settings-modal__action-title {
  font-size: $font-size-base;
  font-weight: $font-weight-medium;
  color: $color-neutral-800;
  margin: 0 0 $spacing-xs 0;
}

.settings-modal__action-description {
  font-size: $font-size-sm;
  color: $color-neutral-600;
  margin: 0 0 $spacing-md 0;
  line-height: $line-height-normal;
}

.settings-modal__action-btn {
  width: 100%;
}

// 主题设置
.settings-modal__theme-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: $spacing-md;
}

.settings-modal__theme-option {
  cursor: pointer;
}

.settings-modal__theme-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;

  &:checked + .settings-modal__theme-card {
    border-color: $color-primary;
    box-shadow: 0 0 0 2px rgba($color-primary, 0.2);
  }
}

.settings-modal__theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md;
  border: 2px solid $color-border;
  border-radius: $border-radius-md;
  transition: all $transition-fast;

  &:hover {
    border-color: $color-neutral-300;
  }
}

.settings-modal__theme-preview {
  width: 48px;
  height: 48px;
  border-radius: $border-radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-lg;

  &--light {
    background-color: $color-white;
    color: $color-neutral-800;
    border: 1px solid $color-border;
  }

  &--dark {
    background-color: $color-neutral-800;
    color: $color-white;
  }

  &--auto {
    background: linear-gradient(135deg, $color-white 50%, $color-neutral-800 50%);
    color: $color-primary;
  }
}

.settings-modal__theme-name {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-neutral-700;
}

// 设置组
.settings-modal__setting-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.settings-modal__setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
}

.settings-modal__setting-label {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-neutral-700;
}

.settings-modal__setting-select {
  padding: $spacing-xs $spacing-sm;
  border: 1px solid $color-border;
  border-radius: $border-radius-sm;
  background-color: $color-white;
  color: $color-neutral-700;
  font-size: $font-size-sm;
  transition: all $transition-fast;

  &:focus {
    outline: 2px solid $color-primary;
    outline-offset: 2px;
  }
}

// 复选框设置
.settings-modal__checkbox-setting {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
  cursor: pointer;
}

.settings-modal__checkbox {
  width: 16px;
  height: 16px;
  accent-color: $color-primary;
  margin-top: 2px;
}

.settings-modal__checkbox-text {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-neutral-700;
}

.settings-modal__checkbox-description {
  font-size: $font-size-xs;
  color: $color-neutral-500;
  margin-top: $spacing-xs;
}

// 快捷键
.settings-modal__shortcuts-section {
  margin-top: $spacing-lg;
  padding-top: $spacing-lg;
  border-top: 1px solid $color-neutral-200;
}

.settings-modal__shortcuts-title {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-base;
  font-weight: $font-weight-medium;
  color: $color-neutral-800;
  margin: 0 0 $spacing-md 0;
}

.settings-modal__shortcuts-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: $spacing-sm;
}

.settings-modal__shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-xs $spacing-sm;
  background-color: $color-neutral-50;
  border-radius: $border-radius-sm;
}

.settings-modal__shortcut-name {
  font-size: $font-size-sm;
  color: $color-neutral-700;
}

.settings-modal__shortcut-key {
  padding: $spacing-xs $spacing-sm;
  background-color: $color-neutral-200;
  border: 1px solid $color-neutral-300;
  border-radius: $border-radius-sm;
  font-size: $font-size-xs;
  font-family: $font-family-mono;
  color: $color-neutral-700;
}

// 危险操作
.settings-modal__danger-description {
  color: $color-error;
  font-size: $font-size-sm;
  margin: 0 0 $spacing-md 0;
}

.settings-modal__danger-btn {
  background-color: $color-error;
  color: $color-white;

  &:hover {
    background-color: color.mix(black, $color-error, 10%);
  }
}

// 操作按钮
.settings-modal__actions {
  display: flex;
  gap: $spacing-sm;
  justify-content: flex-end;
  padding-top: $spacing-lg;
  border-top: 1px solid $color-border;
}

// 响应式适配
@include mobile {
  .settings-modal {
    max-width: 100%;
  }

  .settings-modal__data-actions {
    grid-template-columns: 1fr;
  }

  .settings-modal__theme-options {
    grid-template-columns: 1fr;
  }

  .settings-modal__setting-item {
    flex-direction: column;
    align-items: stretch;
  }

  .settings-modal__shortcuts-list {
    grid-template-columns: 1fr;
  }

  .settings-modal__actions {
    flex-direction: column;
  }
}

// 高对比度模式
@media (prefers-contrast: high) {
  .settings-modal__section {
    border-width: 2px;
  }

  .settings-modal__theme-card {
    border-width: 2px;
  }

  .settings-modal__setting-select {
    border-width: 2px;
  }
}

// 减少动画偏好
@media (prefers-reduced-motion: reduce) {
  .settings-modal__theme-card,
  .settings-modal__data-action,
  .settings-modal__setting-select {
    transition: none;
  }
}
</style>
