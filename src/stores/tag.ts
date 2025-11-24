import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { Tag } from '@/types'
import { generateId } from '@/utils/helpers'

// 颜色常量 - 与 CSS 变量保持一致
const TAG_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // yellow
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6B7280' // info/gray
]

export const useTagStore = defineStore('tag', () => {
  // 状态
  const tags = ref<Tag[]>([])

  // 初始化数据 - 根据需求文档，初始状态应该是空的
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

  // 计算属性
  const tagColors = computed(() => TAG_COLORS)

  // 操作方法
  const addTag = (tagData: Pick<Tag, 'name' | 'color'>) => {
    const nameLower = tagData.name.trim().toLowerCase()
    if (tags.value.some(t => t.name.trim().toLowerCase() === nameLower)) {
      throw new Error('DUPLICATE_NAME')
    }
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

  const getTagById = (id: string) => {
    return tags.value.find(tag => tag.id === id)
  }

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

  return {
    // 状态
    tags: readonly(tags),
    tagColors,

    // 操作方法
    addTag,
    updateTag,
    deleteTag,
    reorderTags,
    getTagById,
    saveToLocalStorage,
    clearAllTags,

    // 初始化
    initializeData
  }
})
