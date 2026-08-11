<template>
  <div class="data-management-modal">
    <section class="data-management-modal__section">
      <div class="section-heading">
        <div>
          <h3 class="section-title">云同步与备份</h3>
          <p class="section-description">同一账号登录后自动对齐数据，并支持历史恢复与导入导出</p>
        </div>
      </div>

      <div v-if="authStore.isAuthenticated" class="settings-container">
        <div class="sync-control-card">
          <div class="backup-control-card__copy">
            <div class="backup-control-card__title-row">
              <span class="setting-title">云同步</span>
              <span class="state-pill" :class="{ enabled: syncEnabled }">
                {{ syncEnabled ? '已开启' : '未开启' }}
              </span>
            </div>
            <span class="setting-desc">
              开启后，同一账号在任意浏览器登录都会自动同步网站、分类和标签，并定期备份便于恢复。主题、默认首页等偏好仍仅保存在本机。
            </span>
          </div>
          <label class="switch" :class="{ 'is-busy': isTogglingSync }" title="开启或关闭云同步">
            <input
              type="checkbox"
              :checked="syncEnabled"
              :disabled="isTogglingSync"
              @change="handleSyncToggle"
            />
            <span class="slider round" />
          </label>
        </div>

        <div class="backup-control-card backup-control-card--solo">
          <div class="backup-control-card__copy">
            <span class="setting-title">手动备份</span>
            <div class="setting-desc current-data-row">
              <span class="current-data-row__label">当前本地数据</span>
              <div class="data-stats">
                <span class="data-stat">
                  <span class="data-stat__label">网站</span>
                  <strong class="data-stat__value">
                    {{ websiteStore.websites.length }}
                  </strong>
                </span>
                <span class="data-stat">
                  <span class="data-stat__label">分类</span>
                  <strong class="data-stat__value">
                    {{ categoryStore.categories.length }}
                  </strong>
                </span>
                <span class="data-stat">
                  <span class="data-stat__label">标签</span>
                  <strong class="data-stat__value">{{ tagStore.tags.length }}</strong>
                </span>
              </div>
            </div>
          </div>
          <BaseButton
            variant="primary"
            shape="rounded"
            size="sm"
            :loading="isCreating"
            class="backup-btn"
            @click="handleManualBackup"
          >
            立即备份
          </BaseButton>
        </div>
      </div>
      <div v-else class="login-prompt">
        <div class="login-prompt__content">
          <i class="fas fa-cloud-upload-alt login-prompt__icon" />
          <h4 class="login-prompt__title">登录后开启云同步</h4>
          <p class="login-prompt__desc">
            登录同一账号即可在各设备间自动同步导航数据，并支持历史备份与恢复。
          </p>
          <BaseButton variant="primary" shape="rounded" size="md" @click="handleGoLogin">
            去登录
          </BaseButton>
        </div>
      </div>
    </section>

    <section
      v-if="authStore.isAuthenticated"
      class="data-management-modal__section data-management-modal__section--history"
    >
      <div class="section-heading history-heading">
        <div>
          <h3 class="section-title">历史备份</h3>
          <p class="section-description">选择一份备份恢复，或删除不再需要的记录</p>
        </div>
        <div class="history-actions">
          <span v-if="!loading" class="history-count">{{ backupHistory.length }} 条记录</span>
          <BaseButton
            variant="neutral-ghost"
            size="sm"
            icon="fas fa-sync-alt"
            :loading="loading"
            title="刷新备份列表"
            aria-label="刷新备份列表"
            @click="refreshBackups"
          />
        </div>
      </div>

      <div v-if="loading" class="table-state">
        <i class="fas fa-spinner fa-spin" />
        <span>加载中...</span>
      </div>
      <div v-else-if="backupHistory.length === 0" class="table-state text-muted">暂无备份记录</div>
      <div v-else class="backup-list">
        <div v-for="item in formattedBackupHistory" :key="item.id" class="backup-list__row">
          <div class="backup-list__main">
            <div class="backup-list__copy">
              <div class="backup-list__title-row">
                <span class="backup-type-tag" :class="item.type === 'AUTO' ? 'auto' : 'manual'">
                  {{ item.type === 'AUTO' ? '自动备份' : '手动备份' }}
                </span>
                <span class="backup-list__time">{{ item.createdAtText }}</span>
                <span class="backup-list__size" :title="item.sizeText">
                  {{ item.sizeText }}
                </span>
              </div>
            </div>
            <div class="backup-list__stats data-stats" :title="item.statsTitle">
              <span class="data-stat">
                <span class="data-stat__label">网站</span>
                <strong class="data-stat__value">{{ item.websiteCountText }}</strong>
              </span>
              <span class="data-stat">
                <span class="data-stat__label">分类</span>
                <strong class="data-stat__value">{{ item.categoryCountText }}</strong>
              </span>
              <span class="data-stat">
                <span class="data-stat__label">标签</span>
                <strong class="data-stat__value">{{ item.tagCountText }}</strong>
              </span>
            </div>
          </div>
          <div class="action-buttons">
            <BaseButton variant="ghost" size="xs" @click="handleRestore(item)">恢复</BaseButton>
            <BaseButton variant="danger-ghost" size="xs" @click="handleDelete(item)">
              删除
            </BaseButton>
          </div>
        </div>
      </div>
    </section>

    <section class="data-management-modal__section data-management-modal__section--compact">
      <div class="section-heading">
        <div>
          <h3 class="section-title">导入 / 导出</h3>
          <p class="section-description">以 JSON 文件迁移网站、分类和标签数据</p>
        </div>
      </div>

      <div class="data-actions-grid">
        <div class="action-card action-card--chrome">
          <div class="action-card__content">
            <div class="action-card__title-row">
              <h4 class="action-card__title">Chrome 书签</h4>
              <span class="action-card__badge">AI 整理</span>
              <span v-if="bookmarkImportSummary" class="action-card__task-state">
                {{ bookmarkImportSummaryText }}
              </span>
            </div>
            <p class="action-card__description">
              导入 bookmarks.html，统一生成描述、精简分类和公共标签，支持暂停后继续。
            </p>
          </div>
          <div class="action-card__action">
            <BaseButton
              variant="ghost"
              shape="rounded"
              size="sm"
              class="action-btn"
              @click="handleChromeBookmarkImport"
            >
              {{
                bookmarkImportSummary
                  ? '继续导入'
                  : authStore.isAuthenticated
                    ? '导入书签'
                    : '登录后导入'
              }}
            </BaseButton>
          </div>
        </div>

        <div class="action-card">
          <div class="action-card__content">
            <h4 class="action-card__title">导入数据</h4>
            <p class="action-card__description">
              从 JSON 文件导入数据，只覆盖文件中包含的对应内容。
            </p>
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
              variant="ghost"
              shape="rounded"
              size="sm"
              :loading="false"
              class="action-btn"
              @click="triggerFileImport"
            >
              导入数据
            </BaseButton>
          </div>
        </div>

        <div class="action-card">
          <div class="action-card__content">
            <h4 class="action-card__title">导出数据</h4>
            <p class="action-card__description">将当前数据导出为 JSON 文件，便于本地保存或迁移。</p>
          </div>
          <div class="action-card__action">
            <BaseButton
              variant="ghost"
              shape="rounded"
              size="sm"
              :loading="exporting"
              class="action-btn"
              @click="handleExport"
            >
              导出数据
            </BaseButton>
          </div>
        </div>
      </div>
    </section>

    <div class="danger-zone">
      <div class="danger-content">
        <div class="danger-info">
          <h3 class="danger-title">清除本地数据</h3>
          <p class="danger-desc">会清除本浏览器中的网站、分类、标签和设置。</p>
        </div>
      </div>
      <BaseButton
        variant="danger-ghost"
        shape="rounded"
        size="sm"
        class="action-btn danger-btn"
        @click="openClearConfirm"
      >
        清除所有数据
      </BaseButton>
    </div>

    <!-- Modals -->
    <BaseModal
      v-if="chromeImportOpen"
      :is-open="chromeImportOpen"
      title="导入 Chrome 书签"
      size="lg"
      modal-class="chrome-bookmark-import-modal"
      :close-on-overlay="false"
      scrollable
      @close="closeChromeBookmarkImport"
    >
      <ChromeBookmarkImportModal
        @close="closeChromeBookmarkImport"
        @imported="handleChromeImportCompleted"
        @configure-ai="handleConfigureAI"
        @task-change="refreshBookmarkImportSummary"
      />
    </BaseModal>

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
          <li v-if="syncEnabled">云同步将关闭，云端同步数据与历史备份会保留</li>
        </ul>
      </div>
      <template #footer>
        <div class="danger-confirm__actions">
          <BaseButton
            variant="ghost"
            size="sm"
            shape="rounded"
            class="confirm-btn"
            @click="closeClearConfirm"
          >
            取消
          </BaseButton>
          <BaseButton
            variant="danger"
            size="sm"
            shape="rounded"
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
        <p class="import-confirm__warning">
          文件中包含的数据会覆盖当前对应内容，未包含的数据保持不变。不会自动新建备份；如需保留当前数据，请先手动备份。
        </p>
      </div>
      <template #footer>
        <div class="import-confirm__actions">
          <BaseButton variant="ghost" size="sm" @click="closeImportConfirm">取消</BaseButton>
          <BaseButton variant="primary" size="sm" :loading="importing" @click="confirmImportData">
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
          备份时间：{{ new Date(backupToDelete.created_at).toLocaleString() }}
          <br />
          此操作无法撤销，删除后将无法恢复该备份数据。
        </p>
      </div>
      <template #footer>
        <div class="danger-confirm__actions">
          <BaseButton
            variant="ghost"
            size="sm"
            shape="rounded"
            class="confirm-btn"
            @click="closeDeleteConfirm"
          >
            取消
          </BaseButton>
          <BaseButton
            variant="danger"
            size="sm"
            shape="rounded"
            class="confirm-btn"
            :loading="isDeleting"
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
          备份时间：{{ new Date(backupToRestore.created_at).toLocaleString() }}
          <br />
          恢复后，当前设备上的网站、分类、标签和设置会被这份备份覆盖。
          <br />
          不会自动新建备份；若还需要当前数据，请先点「立即备份」。
        </p>
      </div>
      <template #footer>
        <div class="danger-confirm__actions">
          <BaseButton
            variant="ghost"
            size="sm"
            shape="rounded"
            class="confirm-btn"
            @click="closeRestoreConfirm"
          >
            取消
          </BaseButton>
          <BaseButton
            variant="primary"
            size="sm"
            shape="rounded"
            class="confirm-btn"
            :loading="isRestoring"
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
import { ref, computed, onUnmounted, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { BackupData } from '@/types'
import { useWebsiteStore } from '@/stores/website'
import { useUIStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useAuthStore } from '@/stores/auth'
import { BaseButton, BaseModal } from '@nav/ui'
import { useBackup } from '@/composables/useBackup'
import { useCloudSync } from '@/composables/useCloudSync'
import { logger } from '@nav/logger'
import type { BackupItem } from '@/api/backup'
import { clearWorkspaceBackupState, getWorkspaceStorageKey } from '@/utils/user-data-storage'
import ChromeBookmarkImportModal from '@/components/modals/ChromeBookmarkImportModal.vue'
import {
  getBookmarkImportTaskSummary,
  type BookmarkImportTaskSummary
} from '@/composables/useBookmarkImport'

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'openAiSettings'): void
}>()
const router = useRouter()

const websiteStore = useWebsiteStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()
const {
  isEnabled: syncEnabled,
  isSyncing: syncOperating,
  isTogglingSync,
  refreshState: refreshSyncState,
  setSyncEnabled
} = useCloudSync()

const handleGoLogin = () => {
  emit('close')
  router.push('/login')
}

const fileInputRef = ref<HTMLInputElement>()
const {
  backups: backupHistory,
  loading,
  isCreating,
  isRestoring,
  isDeleting,
  fetchBackups,
  createBackup: doCreateBackup,
  restoreBackup: doRestoreBackup,
  deleteBackup: doDeleteBackup
} = useBackup()

// Load history on mount
onMounted(() => {
  bookmarkImportSummary.value = getBookmarkImportTaskSummary()
  if (authStore.isAuthenticated) {
    // Always hit the network when opening data management so the list matches server.
    void fetchBackups()
    void refreshSyncState().catch(error => {
      logger.error({ err: error }, 'Failed to load sync state')
    })
  }
})

const handleSyncToggle = async () => {
  const next = !syncEnabled.value
  const ok = await setSyncEnabled(next)
  if (!ok) {
    // Checkbox is controlled by syncEnabled; failed toggle leaves UI unchanged.
  }
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatCount = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? String(value) : '—'

const formattedBackupHistory = computed(() =>
  backupHistory.value.map(item => {
    const websiteCountText = formatCount(item.website_count)
    const categoryCountText = formatCount(item.category_count)
    const tagCountText = formatCount(item.tag_count)
    const hasStats =
      typeof item.website_count === 'number' ||
      typeof item.category_count === 'number' ||
      typeof item.tag_count === 'number'

    return {
      ...item,
      createdAtText: new Date(item.created_at).toLocaleString(),
      sizeText: formatSize(item.size),
      websiteCountText,
      categoryCountText,
      tagCountText,
      statsTitle: hasStats
        ? `网站 ${websiteCountText} · 分类 ${categoryCountText} · 标签 ${tagCountText}`
        : '旧备份未记录数量'
    }
  })
)

const exporting = ref(false)
const importing = ref(false)
const clearConfirmOpen = ref(false)
const clearing = ref(false)
const countdown = ref(0)
let countdownTimer: number | null = null
const importConfirmOpen = ref(false)
const importFileName = ref('')
const importPreview = ref({ websites: 0, categories: 0, tags: 0 })
let pendingImportData: Partial<BackupData> | null = null
const chromeImportOpen = ref(false)
const bookmarkImportSummary = ref<BookmarkImportTaskSummary | null>(null)

const bookmarkImportSummaryText = computed(() => {
  const summary = bookmarkImportSummary.value
  if (!summary) return ''
  if (summary.phase === 'completed') return '已完成'
  return `${summary.success}/${summary.total} 已分析`
})

const deleteConfirmOpen = ref(false)
const backupToDelete = ref<BackupItem | null>(null)

const restoreConfirmOpen = ref(false)
const backupToRestore = ref<BackupItem | null>(null)

const handleManualBackup = async () => {
  const data = websiteStore.exportData()
  await doCreateBackup(data, 'MANUAL')
}

const refreshBookmarkImportSummary = () => {
  bookmarkImportSummary.value = getBookmarkImportTaskSummary()
}

const handleChromeBookmarkImport = () => {
  if (!authStore.isAuthenticated) {
    handleGoLogin()
    return
  }
  chromeImportOpen.value = true
}

const closeChromeBookmarkImport = () => {
  chromeImportOpen.value = false
  refreshBookmarkImportSummary()
}

const handleChromeImportCompleted = () => {
  refreshBookmarkImportSummary()
  uiStore.showToast('Chrome 书签导入成功', 'success')
}

const handleConfigureAI = () => {
  chromeImportOpen.value = false
  emit('openAiSettings')
}

const refreshBackups = () => {
  void fetchBackups()
}

const handleRestore = (item: BackupItem) => {
  backupToRestore.value = item
  restoreConfirmOpen.value = true
}

const closeRestoreConfirm = () => {
  restoreConfirmOpen.value = false
  backupToRestore.value = null
}

const confirmRestore = async () => {
  if (!backupToRestore.value) return

  const item = backupToRestore.value
  const success = await doRestoreBackup(item)

  if (success) {
    closeRestoreConfirm()
  }
}

const handleDelete = (item: BackupItem) => {
  backupToDelete.value = item
  deleteConfirmOpen.value = true
}

const closeDeleteConfirm = () => {
  deleteConfirmOpen.value = false
  backupToDelete.value = null
}

const confirmDelete = async () => {
  if (!backupToDelete.value) return

  const item = backupToDelete.value
  const success = await doDeleteBackup(item.id)

  if (success) {
    closeDeleteConfirm()
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
    // Import overwrites local data on purpose; do not silently create a cloud backup first.
    websiteStore.importData(pendingImportData)
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
  if (syncOperating.value || isTogglingSync.value) {
    uiStore.showToast('同步正在处理中，请稍后再试', 'warning')
    return
  }
  clearing.value = true
  try {
    if (syncEnabled.value && !(await setSyncEnabled(false))) return

    clearWorkspaceBackupState()
    localStorage.removeItem(getWorkspaceStorageKey('bookmarkImportTask'))
    bookmarkImportSummary.value = null
    localStorage.removeItem('userSettings')
    settingsStore.clearPreferencesCache(authStore.user?.id)

    websiteStore.overwriteWebsites([])
    categoryStore.overwriteCategories([])
    tagStore.overwriteTags([])
    settingsStore.resetSettings()

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
    logger.error({ err: e }, 'Export failed')
    uiStore.showToast('导出失败', 'error')
  } finally {
    exporting.value = false
  }
}

const triggerFileImport = () => {
  fileInputRef.value?.click()
}

const getImportData = (raw: unknown): Partial<BackupData> | null => {
  if (!raw || typeof raw !== 'object') return null

  const candidate = raw as { data?: unknown }
  const data = candidate.data && typeof candidate.data === 'object' ? candidate.data : raw
  if (!data || typeof data !== 'object') return null

  const parsed = data as Partial<BackupData>
  const hasWebsites = Array.isArray(parsed.websites)
  const hasCategories = Array.isArray(parsed.categories)
  const hasTags = Array.isArray(parsed.tags)
  const hasSettings =
    !!parsed.settings && typeof parsed.settings === 'object' && !Array.isArray(parsed.settings)

  if (!hasWebsites && !hasCategories && !hasTags && !hasSettings) return null

  return {
    ...(hasWebsites ? { websites: parsed.websites } : {}),
    ...(hasCategories ? { categories: parsed.categories } : {}),
    ...(hasTags ? { tags: parsed.tags } : {}),
    ...(hasSettings ? { settings: parsed.settings } : {})
  }
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
      const data = getImportData(json)
      if (!data) {
        uiStore.showToast('文件内容不符合导入格式', 'error')
        return
      }
      pendingImportData = data

      importPreview.value = {
        websites: Array.isArray(data.websites) ? data.websites.length : 0,
        categories: Array.isArray(data.categories) ? data.categories.length : 0,
        tags: Array.isArray(data.tags) ? data.tags.length : 0
      }

      importConfirmOpen.value = true
    } catch (e) {
      logger.error({ err: e }, 'Import parsing failed')
      uiStore.showToast('文件格式错误', 'error')
    }
  }
  reader.onerror = () => {
    uiStore.showToast('读取文件失败，请重试', 'error')
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
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.data-management-modal__section {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  background: var(--account-surface-bg, var(--bg-panel));
  overflow: hidden;
  box-shadow: none;
  contain: layout paint;
}

.data-management-modal__section--compact {
  gap: 0;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.section-title {
  margin: 0;
  color: var(--text-main);
  font-size: 16px;
  font-weight: 740;
  line-height: 1.35;
}

.section-description {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.current-data-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 18px;
}

.current-data-row__label {
  flex: 0 0 auto;
  white-space: nowrap;
}

.data-stats {
  display: grid;
  grid-template-columns: repeat(3, 72px);
  gap: 16px;
}

.data-stat {
  display: grid;
  grid-template-columns: 2em 4ch;
  align-items: baseline;
  gap: 8px;
}

.data-stat__label {
  white-space: nowrap;
}

.data-stat__value {
  color: var(--text-main);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: left;
}

.settings-container {
  display: flex;
  flex-direction: column;
}

.backup-control-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.sync-control-card {
  min-height: 82px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 18px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.backup-control-card {
  min-width: 0;
  min-height: 78px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 0;

  &:first-child {
    border-right: 1px solid rgba(148, 163, 184, 0.1);
  }

  &:last-child {
    border-right: 0;
  }

  &--solo {
    width: 100%;
    border-right: 0 !important;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  }
}

.backup-control-card__copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.backup-control-card__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.state-pill {
  padding: 2px 7px;
  border-radius: 999px;
  color: var(--text-muted);
  background: rgba(148, 163, 184, 0.12);
  font-size: 11px;
  font-weight: 700;

  &.enabled {
    color: var(--color-primary);
    background: rgba(var(--color-primary-rgb), 0.1);
  }
}

.setting-title {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 740;
}

.setting-desc {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.history-section {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-top: 0;
}

.history-heading {
  align-items: center;
}

.history-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-count {
  color: var(--text-muted);
  font-size: 12px;
}

.backup-list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--account-surface-bg, var(--bg-panel));
}

.backup-list__row {
  min-height: 54px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);

  &:last-child {
    border-bottom: 0;
  }
}

.backup-list__main {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}

.backup-list__copy {
  min-width: 0;
  flex: 0 1 auto;
}

.backup-list__stats {
  min-width: 0;
  flex: 0 0 auto;
  padding: 0 8px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.backup-list__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.backup-type-tag {
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;

  &.auto {
    color: var(--color-primary);
    background: rgba(var(--color-primary-rgb), 0.1);
  }

  &.manual {
    color: var(--text-secondary);
    background: rgba(148, 163, 184, 0.12);
  }
}

.backup-list__size {
  flex: 0 0 64px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.backup-list__time {
  color: var(--text-secondary);
  font-size: 12px;
}

.table-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 88px;
  padding: 22px;
  color: var(--text-secondary);
  font-size: 13px;

  i {
    color: var(--color-primary);
  }

  &.text-muted {
    color: var(--text-muted);
  }
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;

  &.is-busy {
    opacity: 0.65;
    pointer-events: none;
  }
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch input:disabled + .slider {
  cursor: wait;
  opacity: 0.85;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0 0 0 0;
  background-color: rgba(148, 163, 184, 0.42);
  transition: 0.2s;
}

.slider::before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
  transition: 0.2s;
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

.data-actions-grid {
  display: flex;
  flex-direction: column;
}

.action-card {
  min-width: 0;
  min-height: 74px;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);

  &:last-child {
    border-bottom: 0;
  }
}

.action-card__content {
  min-width: 0;
}

.action-card--chrome {
  background: color-mix(in srgb, var(--color-primary) 3.5%, transparent);
}

.action-card__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
}

.action-card__badge,
.action-card__task-state {
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.5;
}

.action-card__badge {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  color: var(--color-primary);
}

.action-card__task-state {
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
  color: var(--color-success);
}

.action-card__title {
  margin: 0;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 740;
}

.action-card__description {
  margin: 3px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.action-card__action {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.action-btn,
.backup-btn {
  min-width: 92px;
  white-space: nowrap;
}

.action-btn {
  font-weight: var(--font-weight-normal);
}

.backup-btn {
  font-weight: var(--font-weight-medium);
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.danger-zone {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 14px;
  background: var(--account-surface-bg, var(--bg-panel));
}

.danger-content {
  display: flex;
  align-items: center;
  min-width: 0;
}

.danger-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.danger-title {
  margin: 0;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 740;
}

.danger-desc {
  margin: 3px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.danger-btn {
  flex-shrink: 0;
}

.login-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 36px 20px;
  border: 1px dashed rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  background: var(--bg-tile);
}

.login-prompt__content {
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.login-prompt__icon {
  margin-bottom: 14px;
  color: var(--color-primary);
  font-size: 40px;
  opacity: 0.86;
}

.login-prompt__title {
  margin: 0 0 6px;
  color: var(--text-main);
  font-size: 16px;
  font-weight: 740;
}

.login-prompt__desc {
  margin: 0 0 20px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .backup-control-grid {
    grid-template-columns: 1fr;
  }

  .backup-control-card,
  .sync-control-card,
  .action-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .backup-control-card:first-child {
    border-right: 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  }

  .switch {
    align-self: flex-end;
  }

  .backup-list__row {
    align-items: flex-start;
    flex-direction: column;
  }

  .backup-list__main {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .backup-list__stats {
    padding: 0;
    flex: none;
  }

  .danger-zone {
    flex-direction: column;
    align-items: flex-start;
  }

  .danger-btn {
    width: 100%;
  }

  .action-card__action,
  .action-btn,
  .backup-btn {
    width: 100%;
  }

  .action-card__action {
    justify-content: stretch;
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
  min-width: 92px;
}
</style>
