/**
 * @nav/config - Storage Namespace
 * 存储相关配置
 */
import { getConfig } from '../loader.js'

export function getStorageConfig() {
  return getConfig().storage
}

export type StorageConfig = ReturnType<typeof getStorageConfig>
