import { LocalStorageAdapter } from './local.js'
import { S3StorageAdapter, CloudflareR2Adapter } from './s3.js'
import type { StorageAdapter } from '../types.js'
import type { RawConfig } from '@nav/config'

export function getStorageAdapter(config: RawConfig): StorageAdapter {
  const provider = config.STORAGE_PROVIDER
  const keyPrefix = config.STORAGE_KEY_PREFIX.replace(/^\/+|\/+$/g, '')

  if (provider === 'aws') {
    return new S3StorageAdapter({
      bucket: config.STORAGE_BUCKET!,
      publicBaseUrl: config.STORAGE_PUBLIC_BASE_URL!,
      region: config.STORAGE_S3_REGION,
      endpoint: config.STORAGE_S3_ENDPOINT,
      accessKeyId: config.STORAGE_S3_ACCESS_KEY_ID,
      secretAccessKey: config.STORAGE_S3_SECRET_ACCESS_KEY,
      keyPrefix
    })
  }
  if (provider === 'cloudflare') {
    return new CloudflareR2Adapter({
      bucket: config.STORAGE_BUCKET!,
      publicBaseUrl: config.STORAGE_PUBLIC_BASE_URL!,
      endpoint: config.STORAGE_R2_ENDPOINT,
      accessKeyId: config.STORAGE_R2_ACCESS_KEY_ID,
      secretAccessKey: config.STORAGE_R2_SECRET_ACCESS_KEY,
      keyPrefix
    })
  }
  return new LocalStorageAdapter({
    keyPrefix,
    publicBaseUrl: config.STORAGE_PUBLIC_BASE_URL
  })
}

export function getDefaultIconUrl(config: RawConfig): string {
  return config.ICON_DEFAULT_URL
}
