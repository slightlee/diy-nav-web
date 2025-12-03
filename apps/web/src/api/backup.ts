import { request } from '@/utils/http'
import type { BackupData, BackupPayload } from '@/types'

export interface BackupItem {
  id: string
  created_at: string
  type: 'AUTO' | 'MANUAL'
  size: number
  data: BackupData
}

export const getBackups = () => {
  return request.get<BackupItem[]>('/api/backups')
}

export const createBackup = (data: BackupPayload, type: 'MANUAL' | 'AUTO' = 'MANUAL') => {
  return request.post<void, { data: BackupPayload; type: string }>('/api/backup', { data, type })
}

export const restoreBackup = (backupId: string) => {
  return request.post<BackupPayload>('/api/backup/restore', { backupId })
}

export const deleteBackup = (backupId: string) => {
  return request.delete<void>(`/api/backup/${backupId}`)
}
