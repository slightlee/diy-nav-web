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
  autoBackup: boolean
  /** 是否播放 AI 助手贴边小鸟动效 */
  aiAnimationEnabled?: boolean
  defaultHome?: 'home' | 'all'
  /** 顶部导航名称；显示宽度由各界面自行控制。 */
  navTitle?: string
  /**
   * 顶部导航图标：
   * - http(s)/data/相对路径 → 图片
   * - 其它短字符 → 文字徽标回退（历史兼容）
   */
  navIcon?: string
}

export interface UserPreferences {
  navTitle: string
  navIcon: string
  defaultHome: 'home' | 'all'
  aiAnimationEnabled: boolean
}

export interface BackupData {
  websites: Partial<Website>[]
  categories: Partial<Category>[]
  tags: Partial<Tag>[]
  /** @deprecated Kept only to parse legacy backup files; not exported or restored. */
  settings?: Partial<UserSettings>
}

/**
 * Cross-device sync intentionally excludes device preferences.
 */
export type SyncData = Pick<BackupData, 'websites' | 'categories' | 'tags'>

export interface BackupMetadata {
  version: string
  createdAt: string
  appVersion?: string
  platform?: string
}

export interface BackupPayload {
  meta: BackupMetadata
  data: BackupData
}

export interface SyncPayload {
  meta: BackupMetadata
  data: SyncData
}
