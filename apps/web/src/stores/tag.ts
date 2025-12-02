import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { Tag } from '@/types'
import { generateId } from '@/utils/helpers'

const TAG_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280']

export const useTagStore = defineStore('tag', () => {
  const tags = ref<Tag[]>([])

  const initializeData = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('tags') || '[]')
      if (Array.isArray(saved)) {
        tags.value = saved.map(item => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }))
      } else {
        tags.value = []
      }
    } catch {
      tags.value = []
    }
  }

  const tagColors = computed(() => TAG_COLORS)

  const addTag = (tagData: Pick<Tag, 'name' | 'color'>) => {
    const nameLower = tagData.name.trim().toLowerCase()
    if (tags.value.some(t => t.name.trim().toLowerCase() === nameLower))
      throw new Error('DUPLICATE_NAME')
    const now = new Date()
    const newTag: Tag = {
      ...tagData,
      id: generateId(),
      order: tags.value.length,
      usageCount: 0,
      createdAt: now,
      updatedAt: now
    }
    tags.value.push(newTag)
    saveToLocalStorage()
    return newTag
  }

  const updateTag = (id: string, updates: Partial<Tag>) => {
    const index = tags.value.findIndex(tag => tag.id === id)
    if (index !== -1) {
      if (updates.name) {
        const nameLower = updates.name.trim().toLowerCase()
        const dup = tags.value.some(t => t.id !== id && t.name.trim().toLowerCase() === nameLower)
        if (dup) throw new Error('DUPLICATE_NAME')
      }
      tags.value[index] = { ...tags.value[index], ...updates, updatedAt: new Date() }
      saveToLocalStorage()
    }
  }

  const deleteTag = (id: string) => {
    const index = tags.value.findIndex(tag => tag.id === id)
    if (index !== -1) {
      tags.value.splice(index, 1)
      saveToLocalStorage()
    }
  }

  const reorderTags = (newOrder: string[]) => {
    newOrder.forEach((tagId, newIndex) => {
      const tag = tags.value.find(t => t.id === tagId)
      if (tag) tag.order = newIndex
    })
    saveToLocalStorage()
  }

  const getTagById = (id: string) => tags.value.find(tag => tag.id === id)

  const saveToLocalStorage = () => {
    try {
      localStorage.setItem('tags', JSON.stringify(tags.value))
    } catch {
      void 0
    }
  }

  const clearAllTags = () => {
    tags.value = []
    localStorage.removeItem('tags')
  }

  const overwriteTags = (data: unknown[]) => {
    if (Array.isArray(data)) {
      const now = new Date()
      tags.value = data.map((t: any) => ({
        id: t.id || generateId(),
        name: t.name || '',
        color: t.color || TAG_COLORS[0],
        order: typeof t.order === 'number' ? t.order : 0,
        usageCount: typeof t.usageCount === 'number' ? t.usageCount : 0,
        createdAt: t.createdAt ? new Date(t.createdAt) : now,
        updatedAt: t.updatedAt ? new Date(t.updatedAt) : now
      }))
      saveToLocalStorage()
    }
  }

  return {
    tags: readonly(tags),
    tagColors,
    addTag,
    updateTag,
    deleteTag,
    reorderTags,
    getTagById,
    saveToLocalStorage,
    clearAllTags,
    initializeData,
    overwriteTags
  }
})
