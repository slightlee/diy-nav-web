import type { FastifyBaseLogger } from 'fastify'

import { createDatabaseClient } from '@nav/database'
import { createStorageClientFromEnv, type R2Config } from '@nav/storage'
import { BackupService, AuthService, AvatarService, SyncService } from '@nav/core'
import { config, loadRawConfig } from '@nav/config'
import { IconService, getProviders } from '@nav/icon-core'
import { initAIProviderTable } from './lib/ai-provider-store.js'

// --- Database Client ---
export const databaseClient = createDatabaseClient({
  provider: 'd1',
  config: {
    accountId: config.cloudflare.accountId,
    databaseId: config.cloudflare.d1DatabaseId,
    apiToken: config.cloudflare.apiToken
  }
})

// --- Storage Clients ---
// R2 configuration (shared between public and backup when using R2)
const r2Config: R2Config = {
  accountId: config.cloudflare.accountId,
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  bucketName: config.r2.bucketName,
  publicBaseUrl: config.storage.publicBaseUrl
}

// Public storage (avatars, icons) - requires public URL access
export const publicStorage = createStorageClientFromEnv('public', { r2: r2Config })

// Backup storage - private data, supports WebDAV
export const backupStorage = createStorageClientFromEnv('backup', { r2: r2Config })

// --- Services ---
export const backupService = new BackupService({
  db: databaseClient,
  storage: backupStorage,
  maxBackups: config.backup.maxRetained,
  backupRootDir: config.storage.paths.backups
})

export const syncService = new SyncService({
  db: databaseClient,
  storage: backupStorage,
  backupService
})

export const avatarService = new AvatarService({
  storage: publicStorage,
  publicUrlBase: config.storage.publicBaseUrl,
  pathPrefix: config.storage.paths.avatars
})

export const authService = new AuthService({
  db: databaseClient,
  avatarService
})

// --- Icon Services ---
const iconConfig = loadRawConfig()
const providers = getProviders(iconConfig)
export const iconService = new IconService(
  publicStorage,
  providers,
  iconConfig.ICON_DEFAULT_URL,
  config.storage.paths.icons
)

/**
 * Initialize database tables
 */
export const initServices = async (logger: FastifyBaseLogger): Promise<void> => {
  try {
    await backupService.initTable()
    await syncService.initTable()
    await authService.initTable()
    await initAIProviderTable(databaseClient)
    logger.info('Services initialized')
  } catch (err) {
    logger.error({ err }, 'Failed to init services')
    throw err
  }
}
