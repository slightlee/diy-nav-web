import type { StorageClient, StorageProviderType, R2Config, WebDAVConfig } from './types.js'
import { isValidStorageProvider } from './types.js'
import { StorageError } from './errors.js'
import { R2Client } from './r2.js'
import { WebDAVClient } from './webdav.js'
import { LocalClient, type LocalConfig } from './local.js'

/**
 * Storage Factory Configuration
 */
export interface StorageFactoryConfig {
  provider: StorageProviderType
  r2?: R2Config
  webdav?: WebDAVConfig
  local?: LocalConfig
}

/**
 * Environment-based Storage Configuration
 */
export interface StorageEnvConfig {
  /** R2 configuration (required if using R2) */
  r2?: R2Config
  /** Local configuration (optional) */
  local?: LocalConfig
  /** Override default provider detection */
  defaultProvider?: StorageProviderType
}

/**
 * Validate WebDAV configuration from environment variables
 * @throws {StorageError} When required configuration is missing
 */
function validateWebDAVConfig(): WebDAVConfig {
  const url = process.env.WEBDAV_URL
  const username = process.env.WEBDAV_USERNAME
  const password = process.env.WEBDAV_PASSWORD

  if (!url) {
    throw StorageError.configInvalid('WEBDAV_URL is required when using webdav provider')
  }
  if (!username) {
    throw StorageError.configInvalid('WEBDAV_USERNAME is required when using webdav provider')
  }
  if (!password) {
    throw StorageError.configInvalid('WEBDAV_PASSWORD is required when using webdav provider')
  }

  return {
    url,
    username,
    password,
    basePath: process.env.WEBDAV_BASE_PATH || '/nav-backup/'
  }
}

/**
 * Validate R2 configuration
 * @throws {StorageError} When configuration is invalid or incomplete
 */
function validateR2Config(config?: R2Config): R2Config {
  if (!config) {
    throw StorageError.configInvalid('R2 configuration is required when using r2 provider')
  }
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
    throw StorageError.configInvalid(
      'R2 configuration is incomplete: accountId, accessKeyId, secretAccessKey, and bucketName are required'
    )
  }
  return config
}

/**
 * Create a storage client based on provider type
 *
 * @param config - Storage provider configuration
 * @returns Configured storage client instance
 * @throws {StorageError} When configuration is invalid
 *
 * @example
 * // R2 storage
 * const client = createStorageClient({
 *   provider: 'r2',
 *   r2: { accountId: '...', accessKeyId: '...', secretAccessKey: '...', bucketName: '...' }
 * })
 *
 * @example
 * // WebDAV storage
 * const client = createStorageClient({
 *   provider: 'webdav',
 *   webdav: { url: 'https://dav.example.com', username: '...', password: '...' }
 * })
 */
export function createStorageClient(config: StorageFactoryConfig): StorageClient {
  switch (config.provider) {
    case 'r2':
      return new R2Client(validateR2Config(config.r2))

    case 'webdav':
      if (!config.webdav) {
        throw StorageError.configInvalid(
          'WebDAV configuration is required when provider is "webdav"'
        )
      }
      return new WebDAVClient(config.webdav)

    case 'local':
      return new LocalClient(config.local)

    default:
      throw StorageError.configInvalid(`Unknown storage provider: ${config.provider}`)
  }
}

/**
 * Create storage client from environment variables
 * This is the recommended way to create storage clients in application code
 *
 * @param purpose - 'public' for avatars/icons, 'backup' for backup data
 * @param envConfig - Additional configuration (R2 config, etc.)
 * @returns Configured storage client instance
 * @throws {StorageError} When provider is invalid or configuration is missing
 *
 * @example
 * const publicStorage = createStorageClientFromEnv('public', { r2: r2Config })
 * const backupStorage = createStorageClientFromEnv('backup', { r2: r2Config })
 */
export function createStorageClientFromEnv(
  purpose: 'public' | 'backup',
  envConfig: StorageEnvConfig
): StorageClient {
  const envVar = purpose === 'public' ? 'PUBLIC_STORAGE_PROVIDER' : 'BACKUP_STORAGE_PROVIDER'
  const rawProvider = process.env[envVar] || envConfig.defaultProvider || 'r2'

  if (!isValidStorageProvider(rawProvider)) {
    throw StorageError.configInvalid(
      `Invalid ${envVar}: "${rawProvider}". Valid values are: r2, webdav, local`
    )
  }

  const provider: StorageProviderType = rawProvider

  switch (provider) {
    case 'webdav':
      return new WebDAVClient(validateWebDAVConfig())

    case 'local':
      return new LocalClient(envConfig.local)

    case 'r2':
    default:
      return new R2Client(validateR2Config(envConfig.r2))
  }
}
