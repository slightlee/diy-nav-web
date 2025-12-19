/**
 * @nav/config - Backup Namespace
 * 备份相关配置
 */
import { getConfig } from '../loader.js'

export function getBackupConfig() {
  return getConfig().backup
}

export type BackupConfig = ReturnType<typeof getBackupConfig>
