import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import type { Category } from '@/types'
import { generateId } from '@/utils/helpers'

export const useCategoryStore = defineStore('category', () => {
  // 状态
  const categories = ref<Category[]>([])
  const searchFilters = ref({
    keyword: '',
    categoryIds: [] as string[]
  })

  // 初始化数据 - 根据需求文档，初始状态应该是空的
  const initializeData = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('categories') || '[]')
      if (Array.isArray(saved)) {
        categories.value = saved.map(item => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }))
      } else {
        categories.value = []
      }
    } catch {
      categories.value = []
    }
  }

  // 操作方法
  const addCategory = (categoryData: Pick<Category, 'name' | 'description' | 'icon'>) => {
    const nameLower = categoryData.name.trim().toLowerCase()
    if (categories.value.some(c => c.name.trim().toLowerCase() === nameLower)) {
      throw new Error('DUPLICATE_NAME')
    }
    const now = new Date()
    const newCategory: Category = {
      ...categoryData,
      id: generateId(),
      order: categories.value.length,
      websiteCount: 0,
      createdAt: now,
      updatedAt: now
    }

    categories.value.push(newCategory)
    saveToLocalStorage()
    return newCategory
  }

  const updateCategory = (id: string, updates: Partial<Category>) => {
    const index = categories.value.findIndex(c => c.id === id)
    if (index !== -1) {
      if (updates.name) {
        const nameLower = updates.name.trim().toLowerCase()
        const dup = categories.value.some(
          c => c.id !== id && c.name.trim().toLowerCase() === nameLower
        )
        if (dup) throw new Error('DUPLICATE_NAME')
      }
      categories.value[index] = {
        ...categories.value[index],
        ...updates,
        updatedAt: new Date()
      }
      saveToLocalStorage()
    }
  }

  const deleteCategory = (id: string) => {
    const index = categories.value.findIndex(c => c.id === id)
    if (index !== -1) {
      categories.value.splice(index, 1)
      saveToLocalStorage()
    }
  }

  const reorderCategories = (newOrder: string[]) => {
    newOrder.forEach((categoryId, newIndex) => {
      const category = categories.value.find(c => c.id === categoryId)
      if (category) {
        category.order = newIndex
      }
    })
    saveToLocalStorage()
  }

  const saveToLocalStorage = () => {
    try {
      localStorage.setItem('categories', JSON.stringify(categories.value))
    } catch {
      void 0
    }
  }

  // 搜索相关方法
  const setSearchFilters = (filters: Partial<typeof searchFilters.value>) => {
    Object.assign(searchFilters.value, filters)
  }

  const clearSearchFilters = () => {
    searchFilters.value = {
      keyword: '',
      categoryIds: []
    }
  }

  // 辅助方法
  const getCategoryById = (id: string) => {
    return categories.value.find(c => c.id === id)
  }

  return {
    // 状态
    categories: readonly(categories),
    searchFilters,

    // 方法
    initializeData,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,

    // 搜索相关方法
    setSearchFilters,
    clearSearchFilters,

    // 辅助方法
    getCategoryById
  }
})
