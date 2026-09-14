import { request } from '@/utils/http'

export interface ManagedUser {
  id: string
  email: string | null
  nickname: string | null
  avatar_url: string | null
  role: 'USER' | 'ADMIN'
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFY'
  created_at?: number
  lastLoginAt: number | null
}

export interface ManagedUserList {
  users: ManagedUser[]
  total: number
  adminCount: number
  activeCount?: number
  suspendedCount?: number
}

export interface AdminOAuthConfig {
  provider: 'github' | 'google' | 'linuxdo'
  enabled: boolean
  clientId: string
  redirectUri: string
  hasSecret: boolean
  createdAt: number
  updatedAt: number
}

export interface UpdateOAuthConfigPayload {
  enabled: boolean
  clientId: string
  clientSecret?: string
  redirectUri: string
}

export interface SystemInfo {
  appName: string
  nodeVersion: string
  env: string
  uptimeSeconds: number
  publicStorageProvider: string
  backupStorageProvider: string
  databaseType: string
  serverPort: number
}

// ─────────────────────────────────────────────
//  Purpose-based Storage Types
// ─────────────────────────────────────────────

export type StorageProviderType = 'r2' | 's3' | 'webdav'
export type StoragePurpose = 'public' | 'backup'

/** Config for a single storage purpose (public assets OR backup data) */
export interface AdminStoragePurposeConfig {
  purpose: StoragePurpose
  provider: StorageProviderType
  bucketName: string
  accountId: string
  accessKeyId: string
  hasSecret: boolean
  endpoint: string
  region: string
  publicBaseUrl: string
  webdavUrl: string
  webdavUsername: string
  storagePath: string
  maxRetainedBackups: number
  createdAt: number
  updatedAt: number
}

/** Full storage config returned by GET /admin/config/storage */
export interface AdminStorageAllConfig {
  public: AdminStoragePurposeConfig
  backup: AdminStoragePurposeConfig
}

/** Payload for updating one purpose */
export interface UpdateStoragePurposePayload {
  provider: StorageProviderType
  bucketName?: string
  accountId?: string
  accessKeyId?: string
  secretAccessKey?: string
  endpoint?: string
  region?: string
  publicBaseUrl?: string
  webdavUrl?: string
  webdavUsername?: string
  webdavPassword?: string
  storagePath?: string
  maxRetainedBackups?: number
}

/** Payload for testing a connection */
export interface TestStorageProviderPayload {
  purpose: StoragePurpose
  provider: StorageProviderType
  bucketName?: string
  accountId?: string
  accessKeyId?: string
  secretAccessKey?: string
  endpoint?: string
  region?: string
  publicBaseUrl?: string
  webdavUrl?: string
  webdavUsername?: string
  webdavPassword?: string
  storagePath?: string
}

export interface StorageTestResult {
  success: boolean
  latencyMs?: number
  message: string
  details?: string
}

// ─────────────────────────────────────────────
//  API functions
// ─────────────────────────────────────────────

export const getManagedUsers = (params: {
  query?: string
  role?: string
  status?: string
  limit?: number
  offset?: number
}) =>
  request.get<ManagedUserList>('/api/admin/users', {
    query: params.query,
    role: params.role,
    status: params.status,
    limit: params.limit?.toString(),
    offset: params.offset?.toString()
  })

export const updateManagedUserRole = (id: string, role: ManagedUser['role']) =>
  request.patch<ManagedUser>(`/api/admin/users/${id}/role`, { role })

export const updateManagedUserStatus = (id: string, status: ManagedUser['status']) =>
  request.patch<ManagedUser>(`/api/admin/users/${id}/status`, { status })

export const getOAuthConfigs = () => request.get<AdminOAuthConfig[]>('/api/admin/oauth-configs')

export const updateOAuthConfig = (
  provider: AdminOAuthConfig['provider'],
  payload: UpdateOAuthConfigPayload
) => request.patch<AdminOAuthConfig>(`/api/admin/oauth-configs/${provider}`, payload)

export const getSystemInfo = () => request.get<SystemInfo>('/api/admin/system-info')

/** GET /admin/config/storage → { public: {...}, backup: {...} } */
export const getStorageConfig = () =>
  request.get<AdminStorageAllConfig>('/api/admin/config/storage')

/** PATCH /admin/config/storage/:purpose */
export const updateStoragePurpose = (
  purpose: StoragePurpose,
  payload: UpdateStoragePurposePayload
) => request.patch<AdminStoragePurposeConfig>(`/api/admin/config/storage/${purpose}`, payload)

/** POST /admin/config/storage/test */
export const testStorageProvider = (payload: TestStorageProviderPayload) =>
  request.post<StorageTestResult>('/api/admin/config/storage/test', payload)

// ─────────────────────────────────────────────
//  Site Settings Types & API
// ─────────────────────────────────────────────

export interface AdminSiteSettingsConfig {
  siteName: string
  siteLogo: string
  webAppUrl: string
  smtpUser: string
  hasSmtpPassword: boolean
  registrationEnabled: boolean
  updatedAt: number
}

export interface PublicSiteConfig {
  siteName: string
  siteLogo?: string
  registrationEnabled: boolean
}

export interface UpdateSiteSettingsPayload {
  siteName?: string
  siteLogo?: string
  webAppUrl?: string
  smtpUser?: string
  smtpPassword?: string
  registrationEnabled?: boolean
}

/** GET /api/site/public-config */
export const getPublicSiteConfig = () => request.get<PublicSiteConfig>('/api/site/public-config')

/** GET /admin/config/site */
export const getSiteSettings = () => request.get<AdminSiteSettingsConfig>('/api/admin/config/site')

/** PATCH /admin/config/site */
export const updateSiteSettings = (payload: UpdateSiteSettingsPayload) =>
  request.patch<AdminSiteSettingsConfig>('/api/admin/config/site', payload)

// ─────────────────────────────────────────────
//  Admin Audit Logs
// ─────────────────────────────────────────────

/** 与后端 AUDIT_ACTIONS 对齐（登录成功/失败为日志型事件，默认不落表） */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  ADMIN_USER_ROLE_UPDATE: '用户角色变更',
  ADMIN_USER_STATUS_UPDATE: '用户状态变更',
  ADMIN_OAUTH_CONFIG_UPDATE: '第三方登录配置更新',
  ADMIN_STORAGE_CONFIG_UPDATE: '存储配置更新',
  ADMIN_STORAGE_CONNECTION_TEST: '存储连接测试',
  ADMIN_SITE_SETTINGS_UPDATE: '站点配置更新',
  AUTH_LOGIN_SUCCESS: '登录成功',
  AUTH_LOGIN_FAILED: '登录失败'
}

export interface AuditLogItem {
  id: number
  actorUserId: string | null
  actorEmail: string | null
  action: string
  targetType: string | null
  targetId: string | null
  summary: string
  detail: Record<string, unknown> | null
  ip: string | null
  createdAt: number
}

export interface AuditLogListResult {
  items: AuditLogItem[]
  total: number
}

/** GET /admin/audit-logs */
export const getAuditLogs = (params: { action?: string; limit?: number; offset?: number }) =>
  request.get<AuditLogListResult>('/api/admin/audit-logs', {
    action: params.action,
    limit: params.limit?.toString(),
    offset: params.offset?.toString()
  })
