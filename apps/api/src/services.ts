import { D1Client } from '@nav/database'
import { R2Client } from '@nav/storage'
import { BackupService } from '@nav/core'
import { config } from './config.js'
import { loadConfig } from '@nav/config'
import { IconService, getStorageAdapter, getProviders } from '@nav/icon-core'

// --- Backup Services ---
export const d1Client = new D1Client({
  accountId: config.cloudflare.accountId,
  databaseId: config.cloudflare.d1DatabaseId,
  apiToken: config.cloudflare.apiToken
})

export const r2Client = new R2Client({
  accountId: config.cloudflare.accountId,
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  bucketName: config.r2.bucketName
})

export const backupService = new BackupService({
  d1: d1Client,
  r2: r2Client,
  maxBackups: config.backup.maxRetained,
  backupRootDir: config.backup.rootDir
})

// --- Icon Services ---
const iconConfig = loadConfig()
const storage = getStorageAdapter(iconConfig)
const providers = getProviders(iconConfig)
export const iconService = new IconService(storage, providers, iconConfig.ICON_DEFAULT_URL)

// Initialize tables
export const initServices = async () => {
  try {
    await backupService.initTable()
    console.log('Backup table initialized')
  } catch (err) {
    console.error('Failed to init backup table:', err)
  }
}
