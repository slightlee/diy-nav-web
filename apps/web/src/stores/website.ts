import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { Website, SearchFilters, SortField, SortOrder } from '@/types'
import { generateId } from '@/utils/helpers'

export const useWebsiteStore = defineStore('website', () => {
  const websites = ref<Website[]>([])
  const searchFilters = ref<SearchFilters>({ keyword: '', categoryIds: [], tagIds: [] })
  const sortField = ref<SortField>('order')
  const sortOrder = ref<SortOrder>('asc')

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

  const exportData = () => {
    return {
      websites: websites.value,
      categories: JSON.parse(localStorage.getItem('categories') || '[]'),
      tags: JSON.parse(localStorage.getItem('tags') || '[]')
    }
  }

  const importData = (data: { websites?: Partial<Website>[] }) => {
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
  }

  const overwriteWebsites = (data: Partial<Website>[]) => {
    importData({ websites: data })
  }

  return {
    websites,
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
    importData,
    overwriteWebsites
  }
})
