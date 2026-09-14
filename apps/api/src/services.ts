import type { FastifyBaseLogger } from 'fastify'
import type { Readable } from 'stream'

import { createDatabaseClient, type DatabaseClient } from '@nav/database'
import { LocalClient, type StorageClient } from '@nav/storage'
import {
  BackupService,
  AuthService,
  AvatarService,
  EmailBindingService,
  PreferencesService,
  SyncService
} from '@nav/core'
import { config, loadRawConfig } from '@nav/config'
import { NAVIGATION_BRAND_CONFIG } from '@nav/config/brand'
import { IconService, getProviders } from '@nav/icon-core'
import { initAIProviderTable } from './lib/ai-provider-store.js'
import { SmtpVerificationEmailSender } from './lib/verification-email.js'
import {
  StorageProviderConfigService,
  type StorageActivePaths
} from './lib/storage-provider-config.js'
import { SiteSettingsService } from './lib/site-settings.js'
import { AdminAuditLogService } from './lib/admin-audit-log.js'
import { logger } from '@nav/logger'

// --- Database Client ---
// 通过 DB_PROVIDER 环境变量选择数据库：d1（默认，Cloudflare）或 mysql（自建）。
function createConfiguredDatabaseClient(): DatabaseClient {
  const { provider, d1, mysql } = config.database
  if (provider === 'mysql') {
    if (!mysql.host || !mysql.user || !mysql.database) {
      throw new Error(
        'DB_PROVIDER=mysql 需要同时配置 DB_MYSQL_HOST、DB_MYSQL_USER 和 DB_MYSQL_DATABASE'
      )
    }
    return createDatabaseClient({
      provider: 'mysql',
      config: {
        host: mysql.host,
        port: mysql.port,
        user: mysql.user,
        password: mysql.password,
        database: mysql.database,
        connectionLimit: mysql.connectionLimit
      }
    })
  }
  return createDatabaseClient({
    provider: 'd1',
    config: {
      accountId: config.cloudflare.accountId,
      databaseId: config.cloudflare.d1DatabaseId,
      apiToken: config.cloudflare.apiToken
    }
  })
}

export const databaseClient = createConfiguredDatabaseClient()

// --- Dynamic Storage Client Proxy ---
export class DynamicStorageClient implements StorageClient {
  private client: StorageClient

  constructor(initialClient: StorageClient) {
    this.client = initialClient
  }

  setClient(newClient: StorageClient): void {
    this.client = newClient
  }

  getClient(): StorageClient {
    return this.client
  }

  upload(key: string, body: string | Buffer | Readable, contentType?: string): Promise<void> {
    return this.client.upload(key, body, contentType)
  }

  get(key: string): Promise<string> {
    return this.client.get(key)
  }

  delete(key: string): Promise<void> {
    return this.client.delete(key)
  }

  getDownloadUrl(key: string, expiresIn?: number): Promise<string> {
    if (this.client.getDownloadUrl) {
      return this.client.getDownloadUrl(key, expiresIn)
    }
    return Promise.reject(
      new Error('Presigned URLs are not supported by the current storage driver')
    )
  }

  exists(key: string): Promise<string | null> {
    return this.client.exists(key)
  }

  getPublicUrl(key: string): string {
    return this.client.getPublicUrl(key)
  }

  store(key: string, data: ArrayBuffer, contentType: string): Promise<string> {
    return this.client.store(key, data, contentType)
  }
}

// Dynamic proxies allowing runtime hot-swap when admin updates storage config.
// Initial value is a LocalClient placeholder — replaced from DB during initServices.
export const dynamicPublicStorage = new DynamicStorageClient(
  new LocalClient({ folderPath: './public/storage-fallback', publicBaseUrl: '/storage-fallback' })
)
export const dynamicBackupStorage = new DynamicStorageClient(
  new LocalClient({ folderPath: './public/storage-fallback', publicBaseUrl: '/storage-fallback' })
)

export const publicStorage: StorageClient = dynamicPublicStorage
export const backupStorage: StorageClient = dynamicBackupStorage

// Storage Provider Configuration Service
export const storageProviderConfigService = new StorageProviderConfigService(
  databaseClient,
  config.auth.oauthConfigEncryptionKey || config.auth.jwtSecret,
  (backupClient, publicClient, paths: StorageActivePaths) => {
    // Hot-swap storage clients in-place
    dynamicBackupStorage.setClient(backupClient)
    dynamicPublicStorage.setClient(publicClient)
    // Hot-swap path configs — no extra DB query needed
    backupService.setBackupRootDir(paths.backupPath)
    backupService.setMaxBackups(paths.maxRetainedBackups)
    avatarService.setPathPrefix(paths.publicPath)
    iconService.setPathPrefix(paths.publicPath)
  }
)

// --- Services ---
export const backupService = new BackupService({
  db: databaseClient,
  storage: backupStorage,
  maxBackups: 5, // replaced from DB during initServices
  backupRootDir: 'data-backups' // replaced from DB during initServices
})

export const syncService = new SyncService({
  db: databaseClient,
  storage: backupStorage,
  backupService
})

export const avatarService = new AvatarService({
  storage: publicStorage,
  pathPrefix: 'avatars' // replaced from DB during initServices
})

export const authService = new AuthService({
  db: databaseClient,
  avatarService
})

// --- Site Settings Service ---
export const siteSettingsService = new SiteSettingsService(
  databaseClient,
  config.auth.oauthConfigEncryptionKey || config.auth.jwtSecret
)

// --- Admin Audit Log Service ---
export const adminAuditLogService = new AdminAuditLogService(databaseClient)

// --- Email Sender (credentials loaded from DB during initServices) ---
export const verificationEmailSender = new SmtpVerificationEmailSender({
  user: undefined,
  password: undefined,
  fromName: NAVIGATION_BRAND_CONFIG.defaultTitle,
  environment: config.server.env,
  logger
})

export const emailBindingService = new EmailBindingService({
  db: databaseClient,
  sender: verificationEmailSender,
  webAppUrl: 'http://localhost:3000', // replaced from DB during initServices
  exposeVerificationUrl: config.server.env !== 'production'
})

export const preferencesService = new PreferencesService(databaseClient)

// --- Icon Services ---
const iconConfig = loadRawConfig()
const providers = getProviders(iconConfig)
export const iconService = new IconService(
  publicStorage,
  providers,
  iconConfig.ICON_DEFAULT_URL,
  'icons' // replaced from DB during initServices
)

/**
 * Initialize database tables and load dynamic storage clients + site settings
 */
export const initServices = async (logger: FastifyBaseLogger): Promise<void> => {
  try {
    await backupService.initTable()
    await syncService.initTable()
    await authService.initTable()
    await emailBindingService.initTable()
    await preferencesService.initTable()
    await initAIProviderTable(databaseClient)
    await storageProviderConfigService.initTable()
    await siteSettingsService.initTable()
    await adminAuditLogService.initTable()

    // Hydrate per-purpose storage clients and path configs from DB
    try {
      const { backupClient, publicClient, resolvedPaths } =
        await storageProviderConfigService.buildStorageClientsFromDb()
      dynamicBackupStorage.setClient(backupClient)
      dynamicPublicStorage.setClient(publicClient)
      backupService.setBackupRootDir(resolvedPaths.backupPath)
      backupService.setMaxBackups(resolvedPaths.maxRetainedBackups)
      avatarService.setPathPrefix(resolvedPaths.publicPath)
      iconService.setPathPrefix(resolvedPaths.publicPath)
    } catch (e) {
      logger.warn({ err: e }, 'Using default storage clients (storage not configured yet)')
    }

    // Hydrate site settings (SMTP, web app URL, site name) from DB
    try {
      await siteSettingsService.hydrateCache()
      const settings = siteSettingsService.getSettings()
      verificationEmailSender.setCredentials(
        settings.smtpUser || undefined,
        siteSettingsService.getSmtpPassword() || undefined
      )
      verificationEmailSender.setFromName(settings.siteName)
      emailBindingService.setWebAppUrl(settings.webAppUrl)
      logger.info(
        { webAppUrl: settings.webAppUrl, smtpConfigured: settings.hasSmtpPassword },
        'Site settings loaded from DB'
      )
    } catch (e) {
      logger.warn({ err: e }, 'Could not load site settings from DB, using defaults')
    }

    logger.info('Services initialized')
  } catch (err) {
    logger.error({ err }, 'Failed to init services')
    throw err
  }
}
