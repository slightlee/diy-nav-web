<template>
  <div class="data-management-modal">
    <div class="data-management-modal__section">
      <h3 class="data-management-modal__section-title">
        <i class="fas fa-database" />
        数据管理
      </h3>

      <div class="data-management-modal__data-actions">
        <div class="data-management-modal__data-action">
          <h4 class="data-management-modal__action-title">导入数据</h4>
          <p class="data-management-modal__action-description">
            从 JSON 文件导入网站、分类和标签数据
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
            class="data-management-modal__action-btn"
            title="从本地文件导入数据"
            aria-label="导入数据"
            @click="triggerFileImport"
          >
            <i class="fas fa-download" />
            导入数据
          </BaseButton>
        </div>

        <div class="data-management-modal__data-action">
          <h4 class="data-management-modal__action-title">导出数据</h4>
          <p class="data-management-modal__action-description">
            将网站、分类和标签数据导出为 JSON 文件
          </p>
          <BaseButton
            variant="outline"
            :loading="exporting"
            class="data-management-modal__action-btn"
            title="导出数据到本地文件"
            aria-label="导出数据"
            @click="handleExport"
          >
            <i class="fas fa-upload" />
            导出数据
          </BaseButton>
        </div>
      </div>
    </div>

    <div class="data-management-modal__section">
      <h3 class="data-management-modal__section-title">
        <i class="fas fa-shield-alt" />
        备份设置
      </h3>

      <div class="data-management-modal__setting-group">
        <label class="data-management-modal__checkbox-setting">
          <input v-model="autoBackup" type="checkbox" class="data-management-modal__checkbox" />
          <span class="data-management-modal__checkbox-text">自动备份</span>
          <span class="data-management-modal__checkbox-description">
            定期自动备份数据到本地存储
          </span>
        </label>
      </div>
    </div>

    <div class="data-management-modal__section">
      <h3 class="data-management-modal__section-title">
        <i class="fas fa-exclamation-triangle" />
        危险操作
      </h3>

      <div class="data-management-modal__danger-actions">
        <p class="data-management-modal__danger-description">以下操作不可恢复，请谨慎操作</p>
        <BaseButton
          variant="danger"
          class="data-management-modal__danger-btn"
          @click="openClearConfirm"
        >
          <i class="fas fa-trash-alt" />
          清除所有数据
        </BaseButton>
      </div>
    </div>

    <BaseModal
      v-if="clearConfirmOpen"
      :is-open="clearConfirmOpen"
      title="清除所有数据"
      @close="closeClearConfirm"
    >
      <div class="danger-confirm__content">
        <div class="danger-confirm__header">
          <i class="fas fa-exclamation-triangle danger-confirm__icon" />
          <div class="danger-confirm__title">此操作不可恢复，确定要清除所有数据吗？</div>
        </div>
        <ul class="danger-confirm__list">
          <li>所有网站</li>
          <li>所有分类</li>
          <li>所有标签</li>
          <li>所有设置</li>
        </ul>
      </div>
      <template #footer>
        <div class="danger-confirm__actions">
          <BaseButton variant="secondary" @click="closeClearConfirm">取消</BaseButton>
          <BaseButton
            variant="danger"
            :disabled="countdown > 0 || clearing"
            :loading="clearing"
            @click="confirmClearData"
          >
            <i class="fas fa-trash" />
            {{ countdown > 0 ? `清除 (${countdown}s)` : '清除' }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
    <BaseModal
      v-if="importConfirmOpen"
      :is-open="importConfirmOpen"
      title="导入数据"
      @close="closeImportConfirm"
    >
      <div class="import-confirm__content">
        <div class="import-confirm__file">
          <i class="fas fa-file-import" />
          <span class="import-confirm__file-name">{{ importFileName }}</span>
        </div>
        <div class="import-confirm__summary">
          <div class="import-confirm__summary-item">
            <div class="import-confirm__summary-count">
              {{ importPreview.websites }}
            </div>
            <div class="import-confirm__summary-label">网站</div>
          </div>
          <div class="import-confirm__summary-item">
            <div class="import-confirm__summary-count">
              {{ importPreview.categories }}
            </div>
            <div class="import-confirm__summary-label">分类</div>
          </div>
          <div class="import-confirm__summary-item">
            <div class="import-confirm__summary-count">
              {{ importPreview.tags }}
            </div>
            <div class="import-confirm__summary-label">标签</div>
          </div>
        </div>
        <p class="import-confirm__warning">此操作将覆盖现有数据，确定继续吗？</p>
      </div>
      <template #footer>
        <div class="import-confirm__actions">
          <BaseButton variant="secondary" @click="closeImportConfirm">取消</BaseButton>
          <BaseButton variant="primary" :loading="importing" @click="confirmImportData">
            <i class="fas fa-download" />
            导入
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import type { Website } from '@/types'
import { useWebsiteStore } from '@/stores/website'
import { useUIStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseModal from '@/components/base/BaseModal.vue'

const emit = defineEmits(['close'])

const websiteStore = useWebsiteStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()

const autoBackup = computed({
  get: () => settingsStore.settings.autoBackup,
  set: (v: boolean) => settingsStore.updateSettings({ autoBackup: v })
})

const fileInputRef = ref<HTMLInputElement>()
const exporting = ref(false)
const importing = ref(false)
const clearConfirmOpen = ref(false)
const clearing = ref(false)
const countdown = ref(0)
let countdownTimer: number | null = null
const importConfirmOpen = ref(false)
const importFileName = ref('')
const importPreview = ref({ websites: 0, categories: 0, tags: 0 })
let pendingImportData: {
  websites?: Partial<Website>[]
  categories?: unknown[]
  tags?: unknown[]
} | null = null

const triggerFileImport = () => {
  fileInputRef.value?.click()
}

const handleFileImport = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  pendingImportData = null
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    importFileName.value = file.name
    importPreview.value = {
      websites: Array.isArray(data.websites) ? data.websites.length : 0,
      categories: Array.isArray(data.categories) ? data.categories.length : 0,
      tags: Array.isArray(data.tags) ? data.tags.length : 0
    }
    pendingImportData = data
    importConfirmOpen.value = true
  } catch {
    uiStore.showToast('导入失败，请重试', 'error')
  } finally {
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}

const handleExport = async () => {
  if (exporting.value) return
  exporting.value = true
  try {
    const data = websiteStore.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `diy-nav-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    uiStore.showToast('数据导出成功', 'success')
  } catch {
    uiStore.showToast('导出失败，请重试', 'error')
  } finally {
    exporting.value = false
  }
}

const closeImportConfirm = () => {
  importConfirmOpen.value = false
  importFileName.value = ''
  importPreview.value = { websites: 0, categories: 0, tags: 0 }
  pendingImportData = null
}

const confirmImportData = async () => {
  if (importing.value) return
  if (!pendingImportData) return
  importing.value = true
  try {
    const data = pendingImportData
    websiteStore.importData(data)
    if (data.categories) {
      localStorage.setItem('categories', JSON.stringify(data.categories))
    }
    if (data.tags) {
      localStorage.setItem('tags', JSON.stringify(data.tags))
    }
    categoryStore.initializeData()
    tagStore.initializeData()
    uiStore.showToast('数据导入成功', 'success')
    closeImportConfirm()
    emit('close')
  } catch {
    uiStore.showToast('导入失败，请重试', 'error')
  } finally {
    importing.value = false
  }
}

const openClearConfirm = () => {
  clearConfirmOpen.value = true
  countdown.value = 3
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  countdownTimer = window.setInterval(() => {
    countdown.value = Math.max(0, countdown.value - 1)
    if (countdown.value === 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

const closeClearConfirm = () => {
  clearConfirmOpen.value = false
  countdown.value = 0
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

const confirmClearData = async () => {
  if (countdown.value > 0) return
  if (clearing.value) return
  clearing.value = true
  try {
    localStorage.removeItem('websites')
    localStorage.removeItem('categories')
    localStorage.removeItem('tags')
    localStorage.removeItem('userSettings')

    websiteStore.initializeData()
    categoryStore.initializeData()
    tagStore.initializeData()

    uiStore.showToast('所有数据已清除', 'success')
    closeClearConfirm()
    emit('close')
  } catch {
    uiStore.showToast('清除失败，请重试', 'error')
  } finally {
    clearing.value = false
  }
}

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})
</script>

<style scoped lang="scss">
.data-management-modal {
  width: 100%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}
.data-management-modal__section {
  padding: var(--spacing-lg);
  background-color: var(--color-neutral-100);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.data-management-modal__section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-lg) 0;
}
.data-management-modal__setting-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.data-management-modal__checkbox-setting {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  cursor: pointer;
}
.data-management-modal__checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
  margin-top: 2px;
}
.data-management-modal__checkbox-text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
}
.data-management-modal__checkbox-description {
  font-size: var(--font-size-xs);
  color: var(--color-neutral-500);
  margin-top: var(--spacing-xs);
}
.data-management-modal__data-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}
.data-management-modal__data-action {
  padding: var(--spacing-md);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}
.data-management-modal__action-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-xs) 0;
}
.data-management-modal__action-description {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-600);
  margin: 0 0 var(--spacing-md) 0;
  line-height: var(--line-height-normal);
}
.data-management-modal__action-btn {
  width: 100%;
}

.data-management-modal__danger-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.data-management-modal__danger-description {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-600);
}
.data-management-modal__danger-btn {
  align-self: flex-start;
}

.danger-confirm__content {
  padding: var(--spacing-md) 0;
}
.danger-confirm__header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.danger-confirm__icon {
  color: var(--color-error);
}
.danger-confirm__title {
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
}
.danger-confirm__list {
  margin: var(--spacing-md) 0 0 0;
  padding-left: 1.2rem;
  color: var(--color-neutral-700);
}
.danger-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
}

.import-confirm__content {
  padding: var(--spacing-md) 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.import-confirm__file {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-neutral-700);
}
.import-confirm__file-name {
  font-weight: var(--font-weight-medium);
}
.import-confirm__summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}
.import-confirm__summary-item {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-md);
  text-align: center;
}
.import-confirm__summary-count {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
}
.import-confirm__summary-label {
  font-size: var(--font-size-xs);
  color: var(--color-neutral-600);
}
.import-confirm__warning {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-700);
}
.import-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
}
</style>
