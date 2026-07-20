import { logger } from '@nav/logger'
import { ref, computed } from 'vue'
import {
  getBackups,
  createBackup,
  restoreBackup,
  deleteBackup,
  type BackupItem
} from '@/api/backup'
import type { BackupPayload } from '@/types'
import { useUIStore } from '@/stores/ui'
import { useWebsiteStore } from '@/stores/website'

interface FetchBackupsOptions {
  force?: boolean
}

interface CreateBackupOptions {
  silent?: boolean
  refresh?: boolean
}

let backupCache: BackupItem[] | null = null

export function useBackup() {
  const uiStore = useUIStore()
  const websiteStore = useWebsiteStore()

  /* State */
  const backups = ref<BackupItem[]>([])
  const loading = ref(false)
  const isCreating = ref(false)
  const isRestoring = ref(false)
  const isDeleting = ref(false)

  // Computed for backward compatibility or general busy state
  const operating = computed(() => isCreating.value || isRestoring.value || isDeleting.value)

  const hasBackupData = (payload: BackupPayload) => {
    return (
      payload.data.websites.length > 0 ||
      payload.data.categories.length > 0 ||
      payload.data.tags.length > 0
    )
  }

  const fetchBackups = async (options: FetchBackupsOptions = {}) => {
    if (!options.force && backupCache) {
      backups.value = backupCache
      return
    }

    loading.value = true
    try {
      const res = await getBackups()
      if (res.success && res.data) {
        backups.value = res.data
        backupCache = res.data
      } else {
        throw new Error(res.message || '获取备份列表失败')
      }
    } catch (e) {
      logger.error({ err: e }, 'Failed to fetch backups')
      uiStore.showToast('获取备份列表失败', 'error')
    } finally {
      loading.value = false
    }
  }

  const handleCreateBackup = async (
    data: BackupPayload,
    type: 'MANUAL' | 'AUTO' = 'MANUAL',
    options: CreateBackupOptions = {}
  ) => {
    if (operating.value) return false
    isCreating.value = true
    try {
      const res = await createBackup(data, type)
      if (res.success) {
        if (!options.silent) {
          uiStore.showToast('备份成功', 'success')
        }
        if (options.refresh !== false) {
          await fetchBackups({ force: true })
        } else {
          backupCache = null
        }
        return true
      } else {
        throw new Error(res.message)
      }
    } catch (e) {
      logger.error({ err: e }, 'Create backup failed')
      uiStore.showToast('备份失败，请重试', 'error')
      return false
    } finally {
      isCreating.value = false
    }
  }

  const createSafetyBackup = async () => {
    const data = websiteStore.exportData()
    if (!hasBackupData(data)) return true

    try {
      const res = await createBackup(data, 'MANUAL')
      if (res.success) {
        backupCache = null
        return true
      }
      throw new Error(res.message)
    } catch (e) {
      logger.error({ err: e }, 'Create safety backup failed')
      uiStore.showToast('操作前备份失败，已取消本次操作', 'error')
      return false
    }
  }

  const handleRestoreBackup = async (item: BackupItem): Promise<boolean | null> => {
    if (operating.value) return null
    isRestoring.value = true
    const loadingInstance = uiStore.showLoading('正在恢复数据...')

    try {
      const backedUp = await createSafetyBackup()
      if (!backedUp) return false

      const res = await restoreBackup(item.id)
      if (res.success && res.data) {
        websiteStore.importData(res.data)
        await fetchBackups({ force: true })
        uiStore.showToast('恢复成功', 'success')
        return true
      } else {
        throw new Error(res.message || '恢复失败')
      }
    } catch (e) {
      logger.error({ err: e }, 'Restore backup failed')
      uiStore.showToast('恢复失败，请重试', 'error')
      return null
    } finally {
      loadingInstance.close()
      isRestoring.value = false
    }
  }

  const handleDeleteBackup = async (backupId: string) => {
    if (operating.value) return false
    isDeleting.value = true
    try {
      const res = await deleteBackup(backupId)
      if (res.success) {
        uiStore.showToast('删除成功', 'success')
        await fetchBackups({ force: true })
        return true
      } else {
        throw new Error(res.message)
      }
    } catch (e) {
      logger.error({ err: e }, 'Delete backup failed')
      uiStore.showToast('删除失败，请重试', 'error')
      return false
    } finally {
      isDeleting.value = false
    }
  }

  return {
    backups,
    loading,
    operating,
    isCreating,
    isRestoring,
    isDeleting,
    fetchBackups,
    createBackup: handleCreateBackup,
    createSafetyBackup,
    restoreBackup: handleRestoreBackup,
    deleteBackup: handleDeleteBackup
  }
}
