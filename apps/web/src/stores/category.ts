import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import type { Category } from '@/types'
import { generateId } from '@/utils/helpers'

export const useCategoryStore = defineStore('category', () => {
  const categories = ref<Category[]>([])
  const searchFilters = ref({ keyword: '', categoryIds: [] as string[] })

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

  const addCategory = (categoryData: Pick<Category, 'name' | 'description' | 'icon'>) => {
    const nameLower = categoryData.name.trim().toLowerCase()
    if (categories.value.some(c => c.name.trim().toLowerCase() === nameLower))
      throw new Error('DUPLICATE_NAME')
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
      categories.value[index] = { ...categories.value[index], ...updates, updatedAt: new Date() }
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
      if (category) category.order = newIndex
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

  const setSearchFilters = (filters: Partial<typeof searchFilters.value>) => {
    Object.assign(searchFilters.value, filters)
  }

  const clearSearchFilters = () => {
    searchFilters.value = { keyword: '', categoryIds: [] }
  }

  const getCategoryById = (id: string) => categories.value.find(c => c.id === id)

  const overwriteCategories = (data: unknown[]) => {
    if (Array.isArray(data)) {
      const now = new Date()
      categories.value = data.map((c: any) => ({
        id: c.id || generateId(),
        name: c.name || '',
        description: c.description,
        icon: c.icon,
        order: typeof c.order === 'number' ? c.order : 0,
        websiteCount: typeof c.websiteCount === 'number' ? c.websiteCount : 0,
        createdAt: c.createdAt ? new Date(c.createdAt) : now,
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : now
      }))
      saveToLocalStorage()
    }
  }

  return {
    categories: readonly(categories),
    searchFilters,
    initializeData,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    setSearchFilters,
    clearSearchFilters,
    getCategoryById,
    overwriteCategories
  }
})
