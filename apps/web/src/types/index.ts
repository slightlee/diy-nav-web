export interface Website {
  id: string
  name: string
  url: string
  description?: string
  categoryId: string
  tagIds: string[]
  favicon?: string
  visitCount: number
  lastVisited?: Date
  isFavorite?: boolean
  isOnline: boolean
  createdAt: Date
  updatedAt: Date
  order?: number
  favoriteOrder?: number
}

export interface Category {
  id: string
  name: string
  description?: string
  icon?: string
  order: number
  websiteCount: number
  createdAt: Date
  updatedAt: Date
}

export interface Tag {
  id: string
  name: string
  color: string
  order: number
  usageCount: number
  createdAt: Date
  updatedAt: Date
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto'
  customBackground?: string
  autoBackup: boolean
  defaultHome?: 'home' | 'all'
}

export interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export interface ModalState {
  addSite: boolean
  manageCategories: boolean
  manageTags: boolean
  settings: boolean
  dataManagement: boolean
}

export interface SearchFilters {
  keyword: string
  categoryIds: string[]
  tagIds: string[]
}

export type SortOrder = 'asc' | 'desc'
export type SortField = 'order' | 'name' | 'createdAt' | 'visitCount' | 'lastVisited'

export interface ModalPayloads {
  addSite?: Website
  manageCategories?: undefined
  manageTags?: undefined
  settings?: undefined
  dataManagement?: undefined
}

export const ERROR_DUPLICATE_NAME = 'DUPLICATE_NAME'
