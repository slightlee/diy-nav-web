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
  gap: var(--spacing-xl);
  overflow-y: auto;
}

// 区域样式
.settings-modal__section {
  padding: var(--spacing-lg);
  background-color: var(--color-neutral-100);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);

  &--danger {
    border-color: var(--color-error);
    background-color: var(--color-neutral-100);
  }
}

.settings-modal__section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-lg) 0;
}

// 数据管理区域
.settings-modal__data-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.settings-modal__data-action {
  padding: var(--spacing-md);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-primary);
    background-color: rgba(var(--color-primary-rgb), 0.06);
  }
}

.settings-modal__action-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-xs) 0;
}

.settings-modal__action-description {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-600);
  margin: 0 0 var(--spacing-md) 0;
  line-height: var(--line-height-normal);
}

.settings-modal__action-btn {
  width: 100%;
}

// 主题设置
.settings-modal__theme-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-md);
}

.settings-modal__theme-option {
  cursor: pointer;
}

.settings-modal__theme-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;

  &:checked + .settings-modal__theme-card {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
  }
}

.settings-modal__theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-neutral-300);
  }
}

.settings-modal__theme-preview {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);

  &--light {
    background-color: var(--color-white);
    color: var(--color-neutral-800);
    border: 1px solid var(--color-border);
  }

  &--dark {
    background-color: var(--color-neutral-800);
    color: var(--color-white);
  }

  &--auto {
    background: linear-gradient(135deg, var(--color-white) 50%, var(--color-neutral-800) 50%);
    color: var(--color-primary);
}
}

.settings-modal__theme-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
}

// 设置组
.settings-modal__setting-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.settings-modal__setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.settings-modal__setting-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
}

.settings-modal__setting-select {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-neutral-100);
  color: var(--color-neutral-700);
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);

  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

// 复选框设置
.settings-modal__checkbox-setting {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  cursor: pointer;
}

.settings-modal__checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
  margin-top: 2px;
}

.settings-modal__checkbox-text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
}

.settings-modal__checkbox-description {
  font-size: var(--font-size-xs);
  color: var(--color-neutral-500);
  margin-top: var(--spacing-xs);
}

// 快捷键
.settings-modal__shortcuts-section {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-neutral-200);
}

.settings-modal__shortcuts-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-md) 0;
}

.settings-modal__shortcuts-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-sm);
}

.settings-modal__shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-neutral-50);
  border-radius: var(--radius-sm);
}

.settings-modal__shortcut-name {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-700);
}

.settings-modal__shortcut-key {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-neutral-200);
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-family: var(--font-family-mono);
  color: var(--color-neutral-700);
}

// 危险操作
.settings-modal__danger-description {
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin: 0 0 var(--spacing-md) 0;
}

.settings-modal__danger-btn {
  background-color: var(--color-error);
  color: var(--color-white);

  &:hover {
    background-color: rgba(var(--color-error-rgb), 0.9);
}
}

// 操作按钮
.settings-modal__actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
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
