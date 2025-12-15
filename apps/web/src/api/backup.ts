import { request } from '@/utils/http'
import type { BackupData, BackupPayload } from '@/types'

export interface BackupItem {
  id: string
  created_at: string
  type: 'AUTO' | 'MANUAL'
  size: number
  file_hash: string
  data?: BackupData
}

const BACKUP_TIMEOUT_MS = 60 * 1000
const AUTO_BACKUP_RETRIES = 3

export const getBackups = () => {
  return request.get<BackupItem[]>('/api/backups')
}

/**
 * 创建备份
 *
 * @param data - 备份数据载荷
 * @param type - 备份类型：'MANUAL' (手动) | 'AUTO' (自动)
 * @description
 * - 手动备份：立即执行，无重试，用户需等待结果。
 * - 自动备份：后台执行，失败会自动重试 3 次，以应对网络波动。
 */
export const createBackup = (data: BackupPayload, type: 'MANUAL' | 'AUTO' = 'MANUAL') => {
  const isAuto = type === 'AUTO'
  return request.post<void, { data: BackupPayload; type: string }>(
    '/api/backup',
    { data, type },
    {
      timeout: BACKUP_TIMEOUT_MS,
      retries: isAuto ? AUTO_BACKUP_RETRIES : 0
    }
  )
}

export const restoreBackup = (backupId: string) => {
  return request.post<BackupPayload>(
    '/api/backup/restore',
    { backupId },
    { timeout: BACKUP_TIMEOUT_MS }
  )
}

export const deleteBackup = (backupId: string) => {
  return request.delete<void>(`/api/backup/${backupId}`)
}
