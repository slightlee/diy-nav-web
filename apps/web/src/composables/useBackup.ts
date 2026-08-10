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
import { useAuthStore } from '@/stores/auth'
import { captureAccountSession, isCurrentAccountSession } from '@/utils/account-session'

interface CreateBackupOptions {
  silent?: boolean
  refresh?: boolean
}

export function useBackup() {
  const uiStore = useUIStore()
  const websiteStore = useWebsiteStore()
  const authStore = useAuthStore()

  /* State */
  const backups = ref<BackupItem[]>([])
  const loading = ref(false)
  const isCreating = ref(false)
  const isRestoring = ref(false)
  const isDeleting = ref(false)

  // Computed for backward compatibility or general busy state
  const operating = computed(() => isCreating.value || isRestoring.value || isDeleting.value)
  const captureAuthenticatedSession = () => {
    const session = captureAccountSession()
    return authStore.isAuthenticated && session.userId ? session : null
  }

  const fetchBackups = async () => {
    const session = captureAuthenticatedSession()
    if (!session) return

    loading.value = true
    try {
      const res = await getBackups()
      if (!isCurrentAccountSession(session)) return
      if (res.success && res.data) {
        backups.value = res.data
      } else {
        throw new Error(res.message || '获取备份列表失败')
      }
    } catch (e) {
      if (isCurrentAccountSession(session)) {
        logger.error({ err: e }, 'Failed to fetch backups')
        uiStore.showToast('获取备份列表失败', 'error')
      }
    } finally {
      if (isCurrentAccountSession(session)) loading.value = false
    }
  }

  const handleCreateBackup = async (
    data: BackupPayload,
    type: 'MANUAL' | 'AUTO' = 'MANUAL',
    options: CreateBackupOptions = {}
  ) => {
    if (operating.value) return false
    const session = captureAuthenticatedSession()
    if (!session?.userId) return false
    isCreating.value = true
    try {
      const res = await createBackup(data, type)
      if (!isCurrentAccountSession(session)) return false
      if (res.success) {
        if (!options.silent) {
          uiStore.showToast('备份成功', 'success')
        }
        if (options.refresh !== false) {
          await fetchBackups()
        }
        return true
      } else {
        throw new Error(res.message)
      }
    } catch (e) {
      if (isCurrentAccountSession(session)) {
        logger.error({ err: e }, 'Create backup failed')
        uiStore.showToast('备份失败，请重试', 'error')
      }
      return false
    } finally {
      if (isCurrentAccountSession(session)) isCreating.value = false
    }
  }

  const handleRestoreBackup = async (item: BackupItem): Promise<boolean | null> => {
    if (operating.value) return null
    const session = captureAuthenticatedSession()
    if (!session) return null
    isRestoring.value = true
    const loadingInstance = uiStore.showLoading('正在恢复数据...')

    try {
      // Restore should only load the chosen snapshot. Auto-saving current data first
      // pollutes the backup list and confuses users who explicitly asked to restore.
      const res = await restoreBackup(item.id)
      if (!isCurrentAccountSession(session)) return null
      if (res.success && res.data) {
        websiteStore.importData(res.data)
        await fetchBackups()
        uiStore.showToast('恢复成功', 'success')
        return true
      } else {
        throw new Error(res.message || '恢复失败')
      }
    } catch (e) {
      if (isCurrentAccountSession(session)) {
        logger.error({ err: e }, 'Restore backup failed')
        uiStore.showToast('恢复失败，请重试', 'error')
      }
      return null
    } finally {
      if (isCurrentAccountSession(session)) {
        loadingInstance.close()
        isRestoring.value = false
      }
    }
  }

  const handleDeleteBackup = async (backupId: string) => {
    if (operating.value) return false
    const session = captureAuthenticatedSession()
    if (!session) return false
    isDeleting.value = true
    try {
      const res = await deleteBackup(backupId)
      if (!isCurrentAccountSession(session)) return false
      if (res.success) {
        uiStore.showToast('删除成功', 'success')
        await fetchBackups()
        return true
      } else {
        throw new Error(res.message)
      }
    } catch (e) {
      if (isCurrentAccountSession(session)) {
        logger.error({ err: e }, 'Delete backup failed')
        uiStore.showToast('删除失败，请重试', 'error')
      }
      return false
    } finally {
      if (isCurrentAccountSession(session)) isDeleting.value = false
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
