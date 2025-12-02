<template>
  <div class="data-management-modal">
    <!-- Section 1: Backup Settings -->
    <div class="data-management-modal__section">
      <div class="section-header">
        <div class="section-icon blue">
          <i class="fas fa-shield-alt" />
        </div>
        <div class="section-info">
          <h3 class="section-title">备份设置</h3>
          <p class="section-description">确保数据定期备份，防止意外丢失</p>
        </div>
      </div>

      <div class="settings-container">
        <!-- Auto Backup -->
        <div class="setting-row">
          <div class="setting-main">
            <div class="setting-info">
              <span class="setting-title">自动备份</span>
              <span class="setting-desc">定期自动备份数据到本地存储。</span>
            </div>
          </div>
          <div class="setting-action">
            <label class="switch">
              <input v-model="autoBackup" type="checkbox" />
              <span class="slider round" />
            </label>
          </div>
        </div>

        <div class="divider" />

        <!-- Manual Backup -->
        <div class="setting-row">
          <div class="setting-main">
            <div class="setting-info">
              <span class="setting-title">手动备份</span>
              <span class="setting-desc">需要立即备份当前数据时，可手动触发一次备份。</span>
            </div>
          </div>
          <div class="setting-action">
            <BaseButton
              variant="primary"
              shape="pill"
              size="sm"
              :loading="backingUp"
              class="backup-btn"
              @click="handleManualBackup"
            >
              立即备份
            </BaseButton>
          </div>
        </div>

        <div class="divider" />

        <!-- History -->
        <div class="history-section">
          <h4 class="history-title">
            历史备份
            <span class="history-subtitle">（最近 3 条）</span>
          </h4>
          <div class="history-table-wrapper">
            <table class="history-table">
              <thead>
                <tr>
                  <th>备份时间</th>
                  <th class="text-center">类型</th>
                  <th class="text-center">存储位置</th>
                  <th class="text-center">大小</th>
                  <th class="text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in backupHistory" :key="item.id">
                  <td>{{ item.time }}</td>
                  <td class="text-center">
                    <span
                      class="badge"
                      :class="item.type === 'auto' ? 'badge-green' : 'badge-blue'"
                    >
                      {{ item.type === 'auto' ? '自动备份' : '手动备份' }}
                    </span>
                  </td>
                  <td class="text-center">{{ item.location }}</td>
                  <td class="text-center">{{ item.size }}</td>
                  <td class="text-center">
                    <div class="action-buttons">
                      <button class="restore-link" @click="handleRestore(item)">恢复</button>
                      <button class="delete-link" @click="handleDelete(item)">删除</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Data Management -->
    <div class="data-management-modal__section">
      <div class="section-header">
        <div class="section-icon blue">
          <i class="fas fa-database" />
        </div>
        <div class="section-info">
          <h3 class="section-title">数据管理</h3>
          <p class="section-description">导入 / 导出网站、分类和标签数据</p>
        </div>
      </div>

      <div class="data-actions-grid">
        <!-- Import Card -->
        <div class="action-card">
          <div class="action-card__content">
            <h4 class="action-card__title">导入数据</h4>
            <p class="action-card__description">从 JSON 文件导入网站、分类和标签数据。</p>
          </div>
          <div class="action-card__action">
            <input
              ref="fileInputRef"
              type="file"
              accept=".json"
              style="display: none"
              @change="handleFileImport"
            />
            <BaseButton
              variant="outline"
              shape="pill"
              size="sm"
              :loading="importing"
              class="action-btn outline-blue"
              @click="triggerFileImport"
            >
              <i class="fas fa-download" />
              导入数据
            </BaseButton>
          </div>
        </div>

        <!-- Export Card -->
        <div class="action-card">
          <div class="action-card__content">
            <h4 class="action-card__title">导出数据</h4>
            <p class="action-card__description">将当前网站、分类和标签数据导出为 JSON 文件。</p>
          </div>
          <div class="action-card__action">
            <BaseButton
              variant="outline"
              shape="pill"
              size="sm"
              :loading="exporting"
              class="action-btn outline-blue"
              @click="handleExport"
            >
              <i class="fas fa-upload" />
              导出数据
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 3: Danger Zone -->
    <div class="danger-zone">
      <div class="danger-content">
        <div class="danger-icon-wrapper">
          <i class="fas fa-exclamation-triangle" />
        </div>
        <div class="danger-info">
          <h3 class="danger-title">危险操作</h3>
          <p class="danger-desc">以下操作不可恢复，请务必谨慎执行</p>
        </div>
      </div>
      <BaseButton
        variant="danger"
        shape="pill"
        size="sm"
        class="danger-btn"
        @click="openClearConfirm"
      >
        <i class="fas fa-trash-alt" />
        清除所有数据
      </BaseButton>
    </div>

    <!-- Modals -->
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
          <BaseButton
            variant="secondary"
            size="sm"
            shape="pill"
            class="confirm-btn"
            @click="closeClearConfirm"
          >
            取消
          </BaseButton>
          <BaseButton
            variant="danger"
            size="sm"
            shape="pill"
            class="confirm-btn"
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

    <!-- Delete Backup Confirm Modal -->
    <BaseModal
      v-if="deleteConfirmOpen"
      :is-open="deleteConfirmOpen"
      title="删除备份"
      @close="closeDeleteConfirm"
    >
      <div class="danger-confirm__content">
        <div class="danger-confirm__header">
          <div class="danger-confirm__icon">
            <i class="fas fa-exclamation-triangle" />
          </div>
          <div class="danger-confirm__title">确定要删除此备份吗？</div>
        </div>
        <p v-if="backupToDelete" class="danger-confirm__list">
          备份时间：{{ backupToDelete.time }}
          <br />
          此操作无法撤销，删除后将无法恢复该备份数据。
        </p>
      </div>
      <template #footer>
        <div class="danger-confirm__actions">
          <BaseButton
            variant="secondary"
            size="sm"
            shape="pill"
            class="confirm-btn"
            @click="closeDeleteConfirm"
          >
            取消
          </BaseButton>
          <BaseButton
            variant="danger"
            size="sm"
            shape="pill"
            class="confirm-btn"
            :loading="deleting"
            @click="confirmDelete"
          >
            <i class="fas fa-trash" />
            删除
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Restore Backup Confirm Modal -->
    <BaseModal
      v-if="restoreConfirmOpen"
      :is-open="restoreConfirmOpen"
      title="恢复备份"
      @close="closeRestoreConfirm"
    >
      <div class="danger-confirm__content">
        <div class="danger-confirm__header">
          <div class="danger-confirm__icon" style="color: var(--color-primary)">
            <i class="fas fa-history" />
          </div>
          <div class="danger-confirm__title">确定要恢复此备份吗？</div>
        </div>
        <p v-if="backupToRestore" class="danger-confirm__list">
          备份时间：{{ backupToRestore.time }}
          <br />
          恢复后，当前的所有数据将被此备份覆盖。
        </p>
      </div>
      <template #footer>
        <div class="danger-confirm__actions">
          <BaseButton
            variant="secondary"
            size="sm"
            shape="pill"
            class="confirm-btn"
            @click="closeRestoreConfirm"
          >
            取消
          </BaseButton>
          <BaseButton
            variant="primary"
            size="sm"
            shape="pill"
            class="confirm-btn"
            :loading="restoring"
            @click="confirmRestore"
          >
            <i class="fas fa-undo" />
            恢复
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
import { BaseButton, BaseModal } from '@nav/ui'

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
const backingUp = ref(false)
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

const deleteConfirmOpen = ref(false)
const backupToDelete = ref<any>(null)
const deleting = ref(false)

const restoreConfirmOpen = ref(false)
const backupToRestore = ref<any>(null)
const restoring = ref(false)

// Real History Data
const backupHistory = ref<any[]>([])
const loadingHistory = ref(false)

const fetchBackups = async () => {
  loadingHistory.value = true
  try {
    const res = await fetch(`${import.meta.env.VITE_ICON_API_URL}/api/backups`)
    const json = await res.json()
    if (json.success) {
      backupHistory.value = json.data.map((item: any) => ({
        id: item.id,
        time: new Date(item.created_at).toLocaleString(),
        type: item.type === 'AUTO' ? 'auto' : 'manual',
        location: '云端 (R2)',
        size: formatSize(item.size)
      }))
    }
  } catch (e) {
    console.error('Failed to fetch backups:', e)
    uiStore.showToast('获取备份列表失败', 'error')
  } finally {
    loadingHistory.value = false
  }
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Load history on mount
import { onMounted } from 'vue'
onMounted(() => {
  fetchBackups()
})

const handleManualBackup = async () => {
  if (backingUp.value) return
  backingUp.value = true
  try {
    const data = websiteStore.exportData()
    const res = await fetch(`${import.meta.env.VITE_ICON_API_URL}/api/backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, type: 'MANUAL' })
    })
    const json = await res.json()

    if (json.success) {
      uiStore.showToast('备份成功', 'success')
      await fetchBackups() // Refresh list
    } else {
      throw new Error(json.message)
    }
  } catch (e) {
    console.error(e)
    uiStore.showToast('备份失败，请重试', 'error')
  } finally {
    backingUp.value = false
  }
}

const handleRestore = (item: any) => {
  backupToRestore.value = item
  restoreConfirmOpen.value = true
}

const closeRestoreConfirm = () => {
  restoreConfirmOpen.value = false
  backupToRestore.value = null
}

const confirmRestore = async () => {
  if (!backupToRestore.value || restoring.value) return

  restoring.value = true
  const item = backupToRestore.value
  const loading = uiStore.showLoading('正在恢复数据...')

  try {
    const res = await fetch(`${import.meta.env.VITE_ICON_API_URL}/api/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backupId: item.id })
    })
    const json = await res.json()

    if (json.success) {
      const data = json.data
      // Import data using store actions
      if (data.websites) websiteStore.overwriteWebsites(data.websites)
      if (data.categories) categoryStore.overwriteCategories(data.categories)
      if (data.tags) tagStore.overwriteTags(data.tags)

      uiStore.showToast('恢复成功', 'success')
      closeRestoreConfirm()
    } else {
      throw new Error(json.message)
    }
  } catch (e) {
    console.error(e)
    uiStore.showToast('恢复失败，请重试', 'error')
  } finally {
    loading.close()
    restoring.value = false
  }
}

const handleDelete = (item: any) => {
  backupToDelete.value = item
  deleteConfirmOpen.value = true
}

const closeDeleteConfirm = () => {
  deleteConfirmOpen.value = false
  backupToDelete.value = null
}

const confirmDelete = async () => {
  if (!backupToDelete.value || deleting.value) return

  deleting.value = true
  const item = backupToDelete.value

  try {
    const res = await fetch(`${import.meta.env.VITE_ICON_API_URL}/api/backup/${item.id}`, {
      method: 'DELETE'
    })
    const json = await res.json()

    if (json.success) {
      uiStore.showToast('删除成功', 'success')
      await fetchBackups() // Refresh list
      closeDeleteConfirm()
    } else {
      throw new Error(json.message)
    }
  } catch (e) {
    console.error(e)
    uiStore.showToast('删除失败，请重试', 'error')
  } finally {
    deleting.value = false
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

const handleExport = async () => {
  if (exporting.value) return
  exporting.value = true
  try {
    const data = websiteStore.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nav-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    uiStore.showToast('导出成功', 'success')
  } catch (e) {
    console.error(e)
    uiStore.showToast('导出失败', 'error')
  } finally {
    exporting.value = false
  }
}

const triggerFileImport = () => {
  fileInputRef.value?.click()
}

const handleFileImport = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const file = input.files[0]
  importFileName.value = file.name

  const reader = new FileReader()
  reader.onload = e => {
    try {
      const json = JSON.parse(e.target?.result as string)
      pendingImportData = json

      // Calculate preview stats
      importPreview.value = {
        websites: json.websites?.length || 0,
        categories: json.categories?.length || 0,
        tags: json.tags?.length || 0
      }

      importConfirmOpen.value = true
    } catch (e) {
      console.error(e)
      uiStore.showToast('文件格式错误', 'error')
    }
  }
  reader.readAsText(file)

  // Reset input
  input.value = ''
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
  max-width: 1000px;
  display: flex;
  flex-direction: column;
  gap: 16px; /* Reduced from var(--spacing-xl) to match design */
}

.data-management-modal__section {
  display: flex;
  flex-direction: column;
  gap: 6px; /* Further reduced from 12px for tighter spacing */
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-primary);
}

.section-icon {
  width: 40px; /* Increased from 32px */
  height: 40px; /* Increased from 32px */
  border-radius: 10px; /* Adjusted radius */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem; /* Increased icon size */
  flex-shrink: 0;

  &.blue {
    background-color: #eff6ff;
    color: #3b82f6;
  }
}

.section-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-title {
  font-size: 18px; /* Increased from 16px */
  font-weight: 600;
  color: var(--color-neutral-900);
  margin: 0;
  line-height: 1.4;
}

.section-description {
  font-size: 14px; /* Increased from 13px */
  color: var(--color-neutral-500);
  margin: 0;
}

/* Data Actions Grid */
.data-actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px; /* Reduced from var(--spacing-md) */
}

.action-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px 16px; /* Reduced padding */
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px; /* Reduced from var(--spacing-md) */
  background-color: var(--color-bg-primary);
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
}

.action-card__content {
  flex: 1;
}

.action-card__title {
  font-size: 14px; /* Reduced from 16px */
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 4px 0;
}

.action-card__description {
  font-size: 12px; /* Reduced from 13px */
  color: var(--color-neutral-500);
  margin: 0;
  line-height: 1.5;
}

.action-btn {
  white-space: nowrap;
  padding-left: 24px !important; /* Increased horizontal padding for pill buttons */
  padding-right: 24px !important; /* Increased horizontal padding for pill buttons */

  &.outline-blue {
    color: #3b82f6;
    border-color: #3b82f6;
    background-color: transparent;

    &:hover {
      background-color: rgba(59, 130, 246, 0.05);
    }
  }
}

/* Settings Container */

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0; /* Further reduced from 12px for tighter spacing */
}

.setting-main {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-title {
  font-size: 14px; /* Reduced from 16px */
  font-weight: 600;
  color: var(--color-neutral-800);
}

.setting-desc {
  font-size: 12px; /* Reduced from 13px */
  color: var(--color-neutral-500);
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 0; /* Remove margin, rely on section gap */
}

/* ... (intervening code) ... */

.divider {
  height: 0;
  border-top: 1px solid var(--color-border);
  background-color: transparent;
  margin: 0;
}

.setting-action {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0 0 0 0;
  background-color: var(--color-neutral-300);
  transition: 0.4s;
}

.slider::before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.4s;
}

input:checked + .slider {
  background-color: var(--color-primary);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--color-primary);
}

input:checked + .slider::before {
  transform: translateX(20px);
}

.slider.round {
  border-radius: 24px;
}

.slider.round::before {
  border-radius: 50%;
}

/* Time Select */
.time-select {
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  color: var(--color-neutral-700);
  font-size: var(--font-size-sm);
  outline: none;
  cursor: pointer;
  min-width: 140px;

  &:focus {
    border-color: var(--color-primary);
  }
}

/* History Table */
.history-section {
  margin-top: 12px; /* Reduced from 20px to match design */
}

.history-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-600);
  margin: 0 0 12px 0; /* Reduced from var(--spacing-md) */
}

.history-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-400);
  font-weight: normal;
}

.history-table-wrapper {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);

  th,
  td {
    padding: 12px; /* Reduced from var(--spacing-md) */
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }

  th {
    background-color: var(--color-neutral-50);
    color: var(--color-neutral-500);
    font-weight: var(--font-weight-medium);
  }

  tr:last-child td {
    border-bottom: none;
  }

  .text-right {
    text-align: right;
  }

  .text-center {
    text-align: center;
  }
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;

  &.badge-green {
    background-color: rgba(16, 185, 129, 0.1);
    color: #10b981;
  }

  &.badge-blue {
    background-color: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }
}

.backup-btn {
  padding-left: 24px !important; /* Increased horizontal padding for pill buttons */
  padding-right: 24px !important; /* Increased horizontal padding for pill buttons */
}

.restore-link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  padding: 0;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
}

.delete-link {
  color: var(--color-neutral-400);
  font-size: var(--font-size-sm);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;

  &:hover {
    color: var(--color-danger);
  }
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* Danger Zone */
.danger-zone {
  background-color: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl); /* Add bottom margin for spacing */
}

.danger-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.danger-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 50%; /* Changed to circle */
  background-color: rgba(245, 101, 101, 0.15); /* Lighter red background */
  color: #c53030;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.danger-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.danger-title {
  font-size: 14px; /* Matched to other card titles */
  font-weight: 600;
  color: #c53030;
  margin: 0;
}

.danger-desc {
  font-size: 12px; /* Matched to other descriptions */
  color: #e53e3e;
  margin: 0;
}

.danger-btn {
  padding-left: 24px !important; /* Increased horizontal padding for pill buttons */
  padding-right: 24px !important; /* Increased horizontal padding for pill buttons */
}

/* Responsive */
@media (max-width: 640px) {
  .data-actions-grid {
    grid-template-columns: 1fr;
  }

  .action-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-card__action {
    width: 100%;

    .action-btn {
      width: 100%;
    }
  }

  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .setting-action {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }

  .danger-zone {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }

  .danger-btn {
    width: 100%;
  }
}

/* Modal styles from original file */
.danger-confirm__content {
  padding: 12px 0; /* Reduced from var(--spacing-md) */
}
.danger-confirm__header {
  display: flex;
  align-items: center;
  gap: 8px; /* Reduced from var(--spacing-sm) */
}
.danger-confirm__icon {
  color: var(--color-error);
}
.danger-confirm__title {
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
}
.danger-confirm__list {
  margin: 12px 0 0 0; /* Reduced from var(--spacing-md) */
  padding-left: 1.2rem;
  color: var(--color-neutral-700);
  line-height: 1.6; /* Add line-height for better readability */
}
.danger-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px; /* Reduced from var(--spacing-md) */
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

.confirm-btn {
  min-width: 100px;
}
</style>
