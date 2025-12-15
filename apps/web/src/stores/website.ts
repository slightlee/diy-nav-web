import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type {
  Website,
  SearchFilters,
  SortField,
  SortOrder,
  BackupPayload,
  BackupData,
  Category,
  Tag
} from '@/types'
import { generateId } from '@/utils/helpers'
import { useSettingsStore } from './settings'
import { useCategoryStore } from './category'
import { useTagStore } from './tag'
import { useUIStore } from './ui'
import { getBackups, restoreBackup, createBackup as saveBackup } from '@/api/backup'
import { computeCanonicalHash } from '@/utils/hash'
import { logger } from '@nav/logger'

export const useWebsiteStore = defineStore('website', () => {
  const websites = ref<Website[]>([])
  const searchFilters = ref<SearchFilters>({ keyword: '', categoryIds: [], tagIds: [] })
  const sortField = ref<SortField>('order')
  const sortOrder = ref<SortOrder>('asc')
  const isSyncing = ref(false)
  const settingsStore = useSettingsStore()
  const categoryStore = useCategoryStore()
  const tagStore = useTagStore()
  const uiStore = useUIStore()

  const initializeData = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('websites') || '[]')
      if (Array.isArray(saved)) {
        websites.value = saved
          .map(item => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
            lastVisited: item.lastVisited ? new Date(item.lastVisited) : undefined
          }))
          .map((w, i) => ({ ...w, order: typeof w.order === 'number' ? w.order : i }))
        const favs = websites.value.filter(w => !!w.isFavorite)
        if (favs.length > 0) {
          const sortedFavs = [...favs].sort(
            (a, b) => (a.favoriteOrder ?? a.order ?? 0) - (b.favoriteOrder ?? b.order ?? 0)
          )
          sortedFavs.forEach((w, idx) => {
            w.favoriteOrder = typeof w.favoriteOrder === 'number' ? w.favoriteOrder : idx
          })
        }
      } else {
        websites.value = []
      }
    } catch {
      websites.value = []
    }
  }

  const filteredWebsites = computed(() => {
    let result = [...websites.value]
    if (searchFilters.value.keyword) {
      const keyword = searchFilters.value.keyword.toLowerCase()
      result = result.filter(
        website =>
          website.name.toLowerCase().includes(keyword) ||
          website.url.toLowerCase().includes(keyword) ||
          (website.description && website.description.toLowerCase().includes(keyword))
      )
    }
    if (searchFilters.value.categoryIds.length > 0) {
      result = result.filter(website =>
        searchFilters.value.categoryIds.includes(website.categoryId)
      )
    }
    if (searchFilters.value.tagIds.length > 0) {
      result = result.filter(website =>
        website.tagIds.some(tagId => searchFilters.value.tagIds.includes(tagId))
      )
    }
    result.sort((a, b) => {
      if (sortField.value === 'name') {
        const comp = a.name.localeCompare(b.name)
        return sortOrder.value === 'asc' ? comp : -comp
      }
      const aValue = getSortValue(a, sortField.value)
      const bValue = getSortValue(b, sortField.value)
      return sortOrder.value === 'asc' ? aValue - bValue : bValue - aValue
    })
    return result
  })

  const getSortValue = (website: Website, field: SortField): number => {
    switch (field) {
      case 'order':
        return typeof website.order === 'number' ? website.order : 0
      case 'createdAt':
        return website.createdAt.getTime()
      case 'visitCount':
        return website.visitCount
      case 'lastVisited':
        return website.lastVisited ? website.lastVisited.getTime() : 0
      default:
        return 0
    }
  }

  const addWebsite = (website: Omit<Website, 'id'>) => {
    const now = new Date()
    const newWebsite: Website = {
      ...website,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      order: websites.value.length
    }
    websites.value = [...websites.value, newWebsite]
    saveToLocalStorage()
    return newWebsite
  }

  const updateWebsite = (id: string, updates: Partial<Website>) => {
    const now = new Date()
    const next = websites.value.map(w => (w.id === id ? { ...w, ...updates, updatedAt: now } : w))
    if (next !== websites.value) {
      websites.value = next
      saveToLocalStorage()
    }
  }

  const deleteWebsite = (id: string) => {
    const next = websites.value.filter(w => w.id !== id)
    if (next.length !== websites.value.length) {
      websites.value = next.map((w, i) => ({ ...w, order: i }))
      saveToLocalStorage()
    }
  }

  const incrementVisitCount = (id: string) => {
    const now = new Date()
    const next = websites.value.map(w =>
      w.id === id
        ? { ...w, visitCount: (w.visitCount ?? 0) + 1, lastVisited: now, updatedAt: now }
        : w
    )
    if (next !== websites.value) {
      websites.value = next
      saveToLocalStorage()
    }
  }

  const setSearchFilters = (filters: Partial<SearchFilters>) => {
    Object.assign(searchFilters.value, filters)
  }

  const clearSearch = () => {
    searchFilters.value = { keyword: '', categoryIds: [], tagIds: [] }
  }

  const setSorting = (field: SortField, order: SortOrder) => {
    sortField.value = field
    sortOrder.value = order
  }

  const moveWebsiteBefore = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    const list = websites.value
    const sourceIndex = list.findIndex(w => w.id === sourceId)
    const targetIndex = list.findIndex(w => w.id === targetId)
    if (sourceIndex === -1 || targetIndex === -1) return
    const arr = [...list]
    const [moved] = arr.splice(sourceIndex, 1)
    const newTargetIndex = arr.findIndex(w => w.id === targetId)
    arr.splice(newTargetIndex, 0, moved)
    const next = arr.map((w, i) => ({ ...w, order: i }))
    websites.value = next
    saveToLocalStorage()
  }

  const moveFavoriteBefore = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    const favs = websites.value
      .filter(w => !!w.isFavorite)
      .sort((a, b) => (a.favoriteOrder ?? a.order ?? 0) - (b.favoriteOrder ?? b.order ?? 0))
    const favIds = favs.map(w => w.id)
    const from = favIds.indexOf(sourceId)
    const to = favIds.indexOf(targetId)
    if (from === -1 || to === -1) return
    const ids = [...favIds]
    ids.splice(from, 1)
    ids.splice(to, 0, sourceId)
    const orderMap = new Map<string, number>(ids.map((id, idx) => [id, idx]))
    websites.value = websites.value.map(w =>
      w.isFavorite ? { ...w, favoriteOrder: orderMap.get(w.id) ?? w.favoriteOrder } : w
    )
    saveToLocalStorage()
  }

  const saveToLocalStorage = () => {
    try {
      localStorage.setItem('websites', JSON.stringify(websites.value))
    } catch {
      void 0
    }
  }

  const exportData = (): BackupPayload => {
    const data: BackupData = {
      websites: websites.value,
      categories: JSON.parse(localStorage.getItem('categories') || '[]'),
      tags: JSON.parse(localStorage.getItem('tags') || '[]'),
      settings: settingsStore.settings
    }

    return {
      meta: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        appVersion: '0.0.1',
        platform: 'web'
      },
      data
    }
  }

  const importData = (payload: Partial<BackupPayload> | { websites?: Partial<Website>[] }) => {
    // Handle legacy format (direct object with websites) or new format (BackupPayload)
    let data: Partial<BackupData>

    if ('data' in payload && payload.data) {
      data = payload.data
    } else {
      // Legacy support or direct partial update
      data = payload as unknown as Partial<BackupData>
    }

    if (data.websites) {
      const now = new Date()
      websites.value = data.websites.map((w: Partial<Website>, i: number) => {
        const createdAt = w.createdAt ? new Date(w.createdAt) : now
        const updatedAt = w.updatedAt ? new Date(w.updatedAt) : createdAt
        const lastVisited = w.lastVisited ? new Date(w.lastVisited) : undefined
        return {
          id: w.id ?? generateId(),
          name: w.name ?? '',
          url: w.url ?? '',
          description: w.description ?? '',
          categoryId: w.categoryId ?? '',
          tagIds: Array.isArray(w.tagIds) ? w.tagIds : [],
          favicon: w.favicon,
          visitCount: typeof w.visitCount === 'number' ? w.visitCount : 0,
          isOnline: typeof w.isOnline === 'boolean' ? w.isOnline : true,
          createdAt,
          updatedAt,
          lastVisited,
          order: typeof w.order === 'number' ? w.order : i,
          favoriteOrder: typeof w.favoriteOrder === 'number' ? w.favoriteOrder : undefined,
          isFavorite: typeof w.isFavorite === 'boolean' ? w.isFavorite : false
        }
      })
      saveToLocalStorage()
    }

    if (data.categories) {
      categoryStore.overwriteCategories(data.categories as Partial<Category>[])
    }

    if (data.tags) {
      tagStore.overwriteTags(data.tags as Partial<Tag>[])
    }

    if (data.settings) {
      settingsStore.updateSettings(data.settings)
    }
  }

  const overwriteWebsites = (data: Partial<Website>[]) => {
    importData({ websites: data })
  }

  const checkAndRestoreCloudData = async (isNewRegistration = false) => {
    const hasLocalData =
      websites.value.length > 0 || categoryStore.categories.length > 0 || tagStore.tags.length > 0

    // SCENARIO 1 & 3: Empty Local, Empty Remote (implicitly handled)
    // SCENARIO 2: New User + Local Data -> Auto Backup (Migrate Guest Data)
    if (isNewRegistration) {
      if (hasLocalData) {
        logger.info('Migrating guest data to cloud...')
        try {
          const payload = exportData()
          await saveBackup(payload, 'AUTO') // Mark as AUTO for migration

          // Update local storage to prevent useAutoBackup from running immediately
          const now = Date.now()
          localStorage.setItem('lastAutoBackupTime', now.toString())
          const hash = await import('@/utils/hash').then(m => m.computeCanonicalHash(payload.data))
          localStorage.setItem('lastAutoBackupHash', hash)
        } catch (e: unknown) {
          logger.error({ err: e }, 'Failed to migrate guest data')
        }
      }
      return // Skip sync check for new users
    }

    // SCENARIO 4: Old User + Local Data (Potential Conflict or Manual Sync needed)
    // We check remote data to see if we need to show conflict modal.

    // NOTE: We do NOT set isSyncing.value = true here, to keep the check silent.
    try {
      const res = await getBackups()
      const backups = res.data || []
      const hasRemoteData = backups.length > 0

      if (!hasRemoteData) {
        // Case 4: Local Data Only -> Do nothing (wait for manual backup)
        // Case 3: Empty/Empty -> Do nothing
        return
      }

      // Case 5: Empty Local + Has Remote -> Auto Restore
      if (!hasLocalData && hasRemoteData) {
        isSyncing.value = true // Show syncing pill now that we are actually restoring
        const latestBackup = backups[0]
        const restoreRes = await restoreBackup(latestBackup.id)
        if (restoreRes.success && restoreRes.data) {
          logger.info('Auto-restoring cloud data...')
          importData(restoreRes.data)
        }
        return
      }

      // Case 6: Local Data + Remote Data -> CONFLICT
      if (hasLocalData && hasRemoteData) {
        const latest = backups[0]

        // Hash Check: If content is identical, we consider it synced and skip conflict
        // NOTE: Server now stores 'file_hash' as the hash of CORE DATA (ignoring metadata).
        // So we can safely compare it with our local payload data hash.
        try {
          const localPayload = exportData()
          const localMd5 = await computeCanonicalHash(localPayload.data)

          if (latest.file_hash && localMd5 === latest.file_hash) {
            logger.info('Local and remote data are identical (MD5 match), skipping conflict check.')

            // Sync local auto-backup state to prevent redundant upload
            const localSha = await computeCanonicalHash(localPayload.data)
            localStorage.setItem('lastAutoBackupHash', localSha)

            return
          }
        } catch (e) {
          logger.warn(
            { err: e },
            'Failed to compute hash for conflict check, falling back to modal'
          )
        }

        const localCount = websites.value.length
        let remoteCount = latest.data?.websites?.length ?? 0

        // If remote count is unknown (List API), fetch details to improve UX
        if (remoteCount === 0) {
          try {
            logger.info('Fetching remote backup content to display sync stats...')
            const detailRes = await restoreBackup(latest.id)
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
          remoteDate: new Date(latest.created_at)
        })
      }
    } catch (error: unknown) {
      logger.error({ err: error }, 'Failed to check cloud data')
    } finally {
      isSyncing.value = false
    }
  }

  const confirmRestoreCloud = async () => {
    isSyncing.value = true
    try {
      const res = await getBackups()
      if (res.success && res.data && res.data.length > 0) {
        const latest = res.data[0]
        const restoreRes = await restoreBackup(latest.id)
        if (restoreRes.success && restoreRes.data) {
          logger.info('User confirmed cloud restore')
          // Clear local components first? importData handles overwrites mostly.
          // But strict overwrite might need clearing.
          // Current logic: overwriteWebsites calls importData.
          // Let's assume importData overwrites by ID match but new items stay?
          // To be pure Sync (Overwrite), we should clear first?
          // "Use Cloud Data" implies Replace. `websites.value = ...` in importData handles it?
          // importData map: `websites.value = data.websites.map...` -> YES it replaces the array.
          importData(restoreRes.data)
          uiStore.closeModal('syncConflict')
        }
      }
    } catch (e: unknown) {
      logger.error({ err: e }, 'Failed to restore cloud data')
    } finally {
      isSyncing.value = false
    }
  }

  const ignoreCloudData = () => {
    uiStore.closeModal('syncConflict')
    // creating a backup of current local state might be smart here to become the new "Latest"
    // preventing the modal from showing again next time.
    logger.info('User ignored cloud data, updating cloud with local...')
    try {
      const payload = exportData()
      // We don't await this to keep UI snappy
      saveBackup(payload, 'AUTO')
        .then(async () => {
          // Update local status so auto-backup doesn't run again immediately
          const now = Date.now()
          localStorage.setItem('lastAutoBackupTime', now.toString())
          const hash = await computeCanonicalHash(payload.data)
          localStorage.setItem('lastAutoBackupHash', hash)
        })
        .catch(err => logger.error({ err }, 'Background backup failed'))
    } catch {
      // ignore
    }
  }

  return {
    websites,
    searchFilters: readonly(searchFilters),
    sortField: readonly(sortField),
    sortOrder: readonly(sortOrder),
    isSyncing: readonly(isSyncing),
    filteredWebsites,
    initializeData,
    addWebsite,
    updateWebsite,
    deleteWebsite,
    incrementVisitCount,
    setSearchFilters,
    clearSearch,
    setSorting,
    moveWebsiteBefore,
    moveFavoriteBefore,
    exportData,
    importData,
    overwriteWebsites,
    checkAndRestoreCloudData,
    confirmRestoreCloud,
    ignoreCloudData
  }
})
