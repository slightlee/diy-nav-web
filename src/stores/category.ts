import { defineStore } from 'pinia'
import { ref } from 'vue'
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
        console.log('📦 从 localStorage 加载分类数据:', categories.value.length, '个分类')
      } else {
        categories.value = []
        console.warn('⚠️ 分类数据格式错误，重置为空数组')
      }
    } catch (error) {
      console.error('Failed to load categories from localStorage:', error)
      categories.value = []
    }
  }

  // 操作方法
  const addCategory = (categoryData: Omit<Category, 'id'>) => {
    const now = new Date()
    const newCategory: Category = {
      ...categoryData,
      id: generateId(),
      order: categories.value.length + 1,
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
        category.order = newIndex + 1
      }
    })
    saveToLocalStorage()
  }

  const saveToLocalStorage = () => {
    try {
      localStorage.setItem('categories', JSON.stringify(categories.value))
    } catch (error) {
      console.error('Failed to save categories to localStorage:', error)
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
    categories,
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
