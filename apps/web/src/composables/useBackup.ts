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
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'

export function useBackup() {
  const uiStore = useUIStore()
  const websiteStore = useWebsiteStore()
  const categoryStore = useCategoryStore()
  const tagStore = useTagStore()

  /* State */
  const backups = ref<BackupItem[]>([])
  const loading = ref(false)
  const isCreating = ref(false)
  const isRestoring = ref(false)
  const isDeleting = ref(false)

  // Computed for backward compatibility or general busy state
  const operating = computed(() => isCreating.value || isRestoring.value || isDeleting.value)

  const fetchBackups = async () => {
    loading.value = true
    try {
      const res = await getBackups()
      if (res.success && res.data) {
        backups.value = res.data
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

  const handleCreateBackup = async (data: BackupPayload, type: 'MANUAL' | 'AUTO' = 'MANUAL') => {
    if (operating.value) return false
    isCreating.value = true
    try {
      const res = await createBackup(data, type)
      if (res.success) {
        uiStore.showToast('备份成功', 'success')
        await fetchBackups()
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

  const handleRestoreBackup = async (item: BackupItem): Promise<boolean | null> => {
    if (operating.value) return null
    isRestoring.value = true
    const loadingInstance = uiStore.showLoading('正在恢复数据...')

    try {
      const res = await restoreBackup(item.id)
      if (res.success && res.data) {
        // res.data is BackupPayload
        websiteStore.importData(res.data)

        if (res.data.data.categories) {
          categoryStore.overwriteCategories(res.data.data.categories)
        }

        if (res.data.data.tags) {
          tagStore.overwriteTags(res.data.data.tags)
        }

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
        await fetchBackups()
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
    restoreBackup: handleRestoreBackup,
    deleteBackup: handleDeleteBackup
  }
}
