export interface Website {
  id: string;
  name: string;
  url: string;
  description?: string;
  categoryId: string;
  tagIds: string[];
  favicon?: string;
  visitCount: number;
  lastVisited?: Date;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
  websiteCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  order: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  gridDensity: 'compact' | 'normal' | 'loose';
  viewMode: 'card' | 'list';
  fontSize: 'small' | 'medium' | 'large';
  customBackground?: string;
  autoBackup: boolean;
  shortcuts: Record<string, string>;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface ModalState {
  addSite: boolean;
  manageCategories: boolean;
  manageTags: boolean;
  settings: boolean;
}

export interface SearchFilters {
  keyword: string;
  categoryIds: string[];
  tagIds: string[];
}

export type SortOrder = 'asc' | 'desc'
export type SortField = 'name' | 'createdAt' | 'visitCount' | 'lastVisited'

// 类型定义
// 类型定义
declare global {
  interface Window {
    generateId: () => string;
  }
}

export interface ModalPayloads {
  addSite?: Website
  manageCategories?: undefined
  manageTags?: undefined
  settings?: undefined
}
