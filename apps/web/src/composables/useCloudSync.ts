import { readonly, ref } from 'vue'
import { logger } from '@nav/logger'
import { createBackup, getBackups, restoreBackup, type BackupItem } from '@/api/backup'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useUIStore } from '@/stores/ui'
import { useWebsiteStore } from '@/stores/website'
import { computeCanonicalHash } from '@/utils/hash'

const isSyncing = ref(false)
const SYNC_CONFLICT_PENDING_KEY = 'syncConflictPending'

const hasLocalData = () => {
  const websiteStore = useWebsiteStore()
  const categoryStore = useCategoryStore()
  const tagStore = useTagStore()

  return (
    websiteStore.websites.length > 0 ||
    categoryStore.categories.length > 0 ||
    tagStore.tags.length > 0
  )
}

const updateAutoBackupState = async (hashData: unknown) => {
  const now = Date.now()
  const hash = await computeCanonicalHash(hashData)
  localStorage.setItem('lastAutoBackupHash', hash)
  localStorage.setItem('lastAutoBackupTime', now.toString())
}

export const hasPendingSyncConflict = () => {
  return localStorage.getItem(SYNC_CONFLICT_PENDING_KEY) === 'true'
}

const markSyncConflictPending = () => {
  localStorage.setItem(SYNC_CONFLICT_PENDING_KEY, 'true')
}

const clearSyncConflictPending = () => {
  localStorage.removeItem(SYNC_CONFLICT_PENDING_KEY)
}

export function useCloudSync() {
  const websiteStore = useWebsiteStore()
  const uiStore = useUIStore()

  const migrateGuestData = async () => {
    if (!hasLocalData()) return

    logger.info('Migrating guest data to cloud...')
    try {
      const payload = websiteStore.exportData()
      await createBackup(payload, 'AUTO')
      await updateAutoBackupState(payload.data)
    } catch (e: unknown) {
      logger.error({ err: e }, 'Failed to migrate guest data')
    }
  }

  const autoRestoreLatestBackup = async (backupId: string) => {
    isSyncing.value = true
    const restoreRes = await restoreBackup(backupId)
    if (restoreRes.success && restoreRes.data) {
      logger.info('Auto-restoring cloud data...')
      websiteStore.importData(restoreRes.data)
      await updateAutoBackupState(websiteStore.getHashData())
    }
  }

  const openConflictModal = async (latestBackup: BackupItem) => {
    const localCount = websiteStore.websites.length
    let remoteCount = latestBackup.data?.websites?.length ?? 0

    if (remoteCount === 0) {
      try {
        logger.info('Fetching remote backup content to display sync stats...')
        const detailRes = await restoreBackup(latestBackup.id)
        if (detailRes.success && detailRes.data) {
          remoteCount = detailRes.data.data?.websites?.length ?? 0
        }
      } catch (e) {
        logger.warn({ err: e }, 'Failed to fetch remote details for stats')
      }
    }

    uiStore.openModal('syncConflict', {
      localCount,
      remoteCount,
      remoteDate: new Date(latestBackup.created_at)
    })
    markSyncConflictPending()
  }

  const checkOnLogin = async (isNewRegistration = false) => {
    // New users keep guest data by migrating local content to cloud.
    if (isNewRegistration) {
      await migrateGuestData()
      clearSyncConflictPending()
      return
    }

    try {
      const res = await getBackups()
      const backups = res.data || []
      const hasRemoteData = backups.length > 0

      if (!hasRemoteData) {
        clearSyncConflictPending()
        return
      }

      // Existing users with no local data can safely adopt the latest cloud backup.
      if (!hasLocalData()) {
        await autoRestoreLatestBackup(backups[0].id)
        clearSyncConflictPending()
        return
      }

      // Existing users with both local and remote data need hash-based conflict detection.
      const latest = backups[0]
      try {
        const localMd5 = await computeCanonicalHash(websiteStore.getHashData())

        if (latest.file_hash && localMd5 === latest.file_hash) {
          logger.info('Local and remote data are identical (MD5 match), skipping conflict check.')
          localStorage.setItem('lastAutoBackupHash', localMd5)
          clearSyncConflictPending()
          return
        }
      } catch (e) {
        logger.warn({ err: e }, 'Failed to compute hash for conflict check, falling back to modal')
      }

      await openConflictModal(latest)
    } catch (error: unknown) {
      logger.error({ err: error }, 'Failed to check cloud data')
    } finally {
      isSyncing.value = false
    }
  }

  const confirmUseCloud = async () => {
    isSyncing.value = true
    try {
      const res = await getBackups()
      if (res.success && res.data && res.data.length > 0) {
        const latest = res.data[0]
        const restoreRes = await restoreBackup(latest.id)
        if (restoreRes.success && restoreRes.data) {
          logger.info('User confirmed cloud restore')
          websiteStore.importData(restoreRes.data)
          await updateAutoBackupState(websiteStore.getHashData())
          clearSyncConflictPending()
          uiStore.closeModal('syncConflict')
        }
      }
    } catch (e: unknown) {
      logger.error({ err: e }, 'Failed to restore cloud data')
    } finally {
      isSyncing.value = false
    }
  }

  const confirmKeepLocal = () => {
    uiStore.closeModal('syncConflict')
    clearSyncConflictPending()
    logger.info('User ignored cloud data, updating cloud with local...')

    try {
      const payload = websiteStore.exportData()
      void createBackup(payload, 'AUTO')
        .then(() => updateAutoBackupState(payload.data))
        .catch(err => logger.error({ err }, 'Background backup failed'))
    } catch {
      // Keep the modal decision non-blocking even if local export fails.
    }
  }

  return {
    isSyncing: readonly(isSyncing),
    checkOnLogin,
    confirmUseCloud,
    confirmKeepLocal
  }
}
