import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { Website, SearchFilters, SortField, SortOrder } from '@/types'
import { generateId } from '@/utils/helpers'

export const useWebsiteStore = defineStore('website', () => {
  // 状态
  const websites = ref<Website[]>([])
  const searchFilters = ref<SearchFilters>({
    keyword: '',
    categoryIds: [],
    tagIds: []
  })
  const sortField = ref<SortField>('order')
  const sortOrder = ref<SortOrder>('asc')

  // 初始化数据 - 根据需求文档，初始状态应该是空的
  const initializeData = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('websites') || '[]')
      if (Array.isArray(saved)) {
        websites.value = saved.map((item, index) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
          lastVisited: item.lastVisited ? new Date(item.lastVisited) : undefined
        })).map((w, i) => ({ ...w, order: typeof w.order === 'number' ? w.order : i }))
        console.log('📦 从 localStorage 加载数据:', websites.value.length, '个网站')
      } else {
        websites.value = []
        console.warn('⚠️ 数据格式错误，重置为空数组')
      }
    } catch (error) {
      console.error('Failed to load websites from localStorage:', error)
      websites.value = []
    }
  }

  // 计算属性
  const filteredWebsites = computed(() => {
    let result = [...websites.value]

    // 搜索过滤
    if (searchFilters.value.keyword) {
      const keyword = searchFilters.value.keyword.toLowerCase()
      result = result.filter(website =>
        website.name.toLowerCase().includes(keyword) ||
        website.url.toLowerCase().includes(keyword) ||
        (website.description && website.description.toLowerCase().includes(keyword))
      )
    }

    // 分类过滤
    if (searchFilters.value.categoryIds.length > 0) {
      result = result.filter(website =>
        searchFilters.value.categoryIds.includes(website.categoryId)
      )
    }

    // 标签过滤
    if (searchFilters.value.tagIds.length > 0) {
      result = result.filter(website =>
        website.tagIds.some(tagId => searchFilters.value.tagIds.includes(tagId))
      )
    }

    // 排序
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

  // 辅助函数
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

  // 操作方法
  const addWebsite = (website: Omit<Website, 'id'>) => {
    const now = new Date()
    const newWebsite: Website = {
      ...website,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      order: websites.value.length
    }

    websites.value.push(newWebsite)
    saveToLocalStorage()
    return newWebsite
  }

  const updateWebsite = (id: string, updates: Partial<Website>) => {
    const index = websites.value.findIndex(w => w.id === id)
    if (index !== -1) {
      websites.value[index] = {
        ...websites.value[index],
        ...updates,
        updatedAt: new Date()
      }
      saveToLocalStorage()
    }
  }

  const deleteWebsite = (id: string) => {
    const index = websites.value.findIndex(w => w.id === id)
    if (index !== -1) {
      websites.value.splice(index, 1)
      saveToLocalStorage()
    }
  }

  const incrementVisitCount = (id: string) => {
    const website = websites.value.find(w => w.id === id)
    if (website) {
      website.visitCount++
      website.lastVisited = new Date()
      website.updatedAt = new Date()
      saveToLocalStorage()
    }
  }

  const setSearchFilters = (filters: Partial<SearchFilters>) => {
    Object.assign(searchFilters.value, filters)
  }

  const clearSearch = () => {
    searchFilters.value = {
      keyword: '',
      categoryIds: [],
      tagIds: []
    }
  }

  const setSorting = (field: SortField, order: SortOrder) => {
    sortField.value = field
    sortOrder.value = order
  }

  const moveWebsiteBefore = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    const sourceIndex = websites.value.findIndex(w => w.id === sourceId)
    const targetIndex = websites.value.findIndex(w => w.id === targetId)
    if (sourceIndex === -1 || targetIndex === -1) return
    const [moved] = websites.value.splice(sourceIndex, 1)
    const newTargetIndex = websites.value.findIndex(w => w.id === targetId)
    websites.value.splice(newTargetIndex, 0, moved)
    websites.value.forEach((w, i) => { w.order = i })
    saveToLocalStorage()
  }

  const saveToLocalStorage = () => {
    try {
      localStorage.setItem('websites', JSON.stringify(websites.value))
    } catch (error) {
      console.error('Failed to save websites to localStorage:', error)
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
          order: typeof (w as any).order === 'number' ? (w as any).order : i
        }
      })
      saveToLocalStorage()
    }
  }

  return {
    // 状态
    websites,
    searchFilters: readonly(searchFilters),
    sortField: readonly(sortField),
    sortOrder: readonly(sortOrder),
    filteredWebsites,

    // 方法
    initializeData,
    addWebsite,
    updateWebsite,
    deleteWebsite,
    incrementVisitCount,
    setSearchFilters,
    clearSearch,
    setSorting,
    moveWebsiteBefore,
    exportData,
    importData
  }
})
