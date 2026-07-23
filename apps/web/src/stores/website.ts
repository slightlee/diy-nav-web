import { defineStore } from 'pinia'
import { ref, computed, readonly, toRaw } from 'vue'
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
import { useCategoryStore } from './category'
import { useTagStore } from './tag'
import { cleanDataForHash } from '@nav/utils'

export const useWebsiteStore = defineStore('website', () => {
  const websites = ref<Website[]>([])
  const searchFilters = ref<SearchFilters>({ keyword: '', categoryIds: [], tagIds: [] })
  const sortField = ref<SortField>('order')
  const sortOrder = ref<SortOrder>('asc')
  const dataRevision = ref(0)
  const categoryStore = useCategoryStore()
  const tagStore = useTagStore()

  const bumpDataRevision = () => {
    dataRevision.value += 1
  }

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
    bumpDataRevision()
    return newWebsite
  }

  const updateWebsite = (id: string, updates: Partial<Website>) => {
    const now = new Date()
    let changed = false
    const next = websites.value.map(w => {
      if (w.id !== id) return w
      changed = true
      return { ...w, ...updates, updatedAt: now }
    })
    if (!changed) return
    websites.value = next
    saveToLocalStorage()
    bumpDataRevision()
  }

  const deleteWebsite = (id: string) => {
    const next = websites.value.filter(w => w.id !== id)
    if (next.length !== websites.value.length) {
      websites.value = next.map((w, i) => ({ ...w, order: i }))
      saveToLocalStorage()
      bumpDataRevision()
    }
  }

  const incrementVisitCount = (id: string) => {
    const now = new Date()
    const next = websites.value.map(w =>
      w.id === id ? { ...w, visitCount: (w.visitCount ?? 0) + 1, lastVisited: now } : w
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
    const now = new Date()
    const next = arr.map((w, i) => (w.order === i ? w : { ...w, order: i, updatedAt: now }))
    websites.value = next
    saveToLocalStorage()
    bumpDataRevision()
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
    const now = new Date()
    websites.value = websites.value.map(w => {
      if (!w.isFavorite) return w
      const favoriteOrder = orderMap.get(w.id) ?? w.favoriteOrder
      return favoriteOrder === w.favoriteOrder ? w : { ...w, favoriteOrder, updatedAt: now }
    })
    saveToLocalStorage()
    bumpDataRevision()
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
      categories: [...categoryStore.categories],
      tags: [...tagStore.tags]
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

  // Optimized data for collision detection (Ignore volatile fields)
  const getHashData = () => {
    // We only backup if critical data changes:
    // 1. Websites list (order, content) - excluding stats
    // 2. Categories / Tags
    // Use the same normalization as the server so timestamps and derived counts
    // cannot trigger backups when the actual synchronized data is unchanged.
    const normalized = cleanDataForHash({
      websites: [...toRaw(websites.value)],
      categories: [...toRaw(categoryStore.categories)],
      tags: [...toRaw(tagStore.tags)]
    }) as BackupData

    return {
      websites: normalized.websites,
      categories: normalized.categories,
      tags: normalized.tags
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
      bumpDataRevision()
    }

    if (data.categories) {
      categoryStore.overwriteCategories(data.categories as Partial<Category>[])
    }

    if (data.tags) {
      tagStore.overwriteTags(data.tags as Partial<Tag>[])
    }

    // Legacy backup payloads may still contain settings, but account settings
    // are now managed by the user preferences API and must not be restored here.
  }

  const overwriteWebsites = (data: Partial<Website>[]) => {
    importData({ websites: data })
  }

  return {
    websites,
    dataRevision: readonly(dataRevision),
    searchFilters: readonly(searchFilters),
    sortField: readonly(sortField),
    sortOrder: readonly(sortOrder),
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
    getHashData,
    importData,
    overwriteWebsites
  }
})
