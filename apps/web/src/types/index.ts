import type {
  Website,
  Category,
  Tag,
  UserSettings,
  BackupData,
  BackupMetadata,
  BackupPayload,
  SyncData,
  SyncPayload
} from '@nav/types'

export type {
  Website,
  Category,
  Tag,
  UserSettings,
  BackupData,
  BackupMetadata,
  BackupPayload,
  SyncData,
  SyncPayload
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
  accountPanel: boolean
  settings: boolean
  dataManagement: boolean
  aiSettings: boolean
  syncConflict: boolean
  syncRecovery: boolean
}

export type AccountPanelTab = 'account' | 'data' | 'ai' | 'settings'

export interface SearchFilters {
  keyword: string
  categoryIds: string[]
  tagIds: string[]
}

export type SortOrder = 'asc' | 'desc'
export type SortField = 'order' | 'name' | 'createdAt' | 'visitCount' | 'lastVisited'

export interface ModalPayloads {
  addSite?: { website?: Website; categoryId?: string }
  manageCategories?: undefined
  manageTags?: undefined
  accountPanel?: { tab?: AccountPanelTab }
  settings?: undefined
  dataManagement?: undefined
  aiSettings?: undefined
  syncConflict?: {
    localStats: { websites: number; categories: number; tags: number }
    remoteStats: { websites: number; categories: number; tags: number }
    remoteDate: Date
  }
  syncRecovery?: {
    localStats: { websites: number; categories: number; tags: number }
    failedAt: Date
  }
}

export const ERROR_DUPLICATE_NAME = 'DUPLICATE_NAME'
