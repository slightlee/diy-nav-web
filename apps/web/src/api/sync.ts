import type { SyncPayload } from '@/types'
import { request } from '@/utils/http'

export interface SyncState {
  enabled: boolean
  currentHash: string | null
  updatedAt: number | null
}

export const getSyncState = () => request.get<SyncState>('/api/sync/state')

export const getSyncSnapshot = () => request.get<SyncPayload | null>('/api/sync/snapshot')

export const enableSync = () => request.post<SyncState>('/api/sync/enable')

export const disableSync = () => request.post<SyncState>('/api/sync/disable')

export const updateSyncSnapshot = (snapshot: SyncPayload, expectedHash: string | null) =>
  request.put<SyncState, { snapshot: SyncPayload; expectedHash: string | null }>(
    '/api/sync/snapshot',
    { snapshot, expectedHash }
  )

export const recoverSyncSnapshot = (snapshot: SyncPayload, expectedHash: string) =>
  request.post<SyncState, { snapshot: SyncPayload; expectedHash: string }>('/api/sync/recover', {
    snapshot,
    expectedHash
  })
