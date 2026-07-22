import type { DatabaseClient } from '@nav/database'
import type { StorageClient } from '@nav/storage'
import type { SyncData, SyncPayload } from '@nav/types'
import { canonicalizeSyncDataForHash, computeHash, sanitizeSyncData } from '@nav/utils'
import { AppError } from '../error.js'
import type { BackupService } from './backup.js'

export interface SyncServiceOptions {
  db: DatabaseClient
  storage: StorageClient
  backupService: BackupService
  syncRootDir?: string
}

interface SyncStateRecord {
  user_id: string
  enabled: number
  current_hash: string | null
  current_storage_key: string | null
  updated_at: number
}

export interface SyncState {
  enabled: boolean
  currentHash: string | null
  updatedAt: number | null
}

export class SyncService {
  private readonly db: DatabaseClient
  private readonly storage: StorageClient
  private readonly backupService: BackupService
  private readonly syncRootDir: string

  constructor(options: SyncServiceOptions) {
    this.db = options.db
    this.storage = options.storage
    this.backupService = options.backupService
    this.syncRootDir = options.syncRootDir || 'data-sync'
  }

  async initTable(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS user_sync_state (
        user_id TEXT PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 0,
        current_hash TEXT,
        current_storage_key TEXT,
        updated_at INTEGER NOT NULL
      );
    `)

    const columns = await this.db.all<{ name: string }>('PRAGMA table_info(user_sync_state)')
    const columnNames = new Set(columns.map(column => column.name))

    if (!columnNames.has('enabled')) {
      await this.db.execute(
        'ALTER TABLE user_sync_state ADD COLUMN enabled INTEGER NOT NULL DEFAULT 0'
      )
    }
    if (!columnNames.has('current_hash')) {
      await this.db.execute('ALTER TABLE user_sync_state ADD COLUMN current_hash TEXT')
    }
    if (!columnNames.has('current_storage_key')) {
      await this.db.execute('ALTER TABLE user_sync_state ADD COLUMN current_storage_key TEXT')
    }
    if (!columnNames.has('updated_at')) {
      await this.db.execute(
        'ALTER TABLE user_sync_state ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0'
      )
    }

    if (columnNames.has('data_hash')) {
      await this.db.execute(
        'UPDATE user_sync_state SET current_hash = COALESCE(current_hash, data_hash)'
      )
    }
    if (columnNames.has('storage_key')) {
      await this.db.execute(
        'UPDATE user_sync_state SET current_storage_key = COALESCE(current_storage_key, storage_key)'
      )
    }
  }

  async getState(userId: string): Promise<SyncState> {
    const record = await this.getStateRecord(userId)
    return this.toPublicState(record)
  }

  async setEnabled(userId: string, enabled: boolean): Promise<SyncState> {
    const now = Date.now()
    await this.db.execute(
      `INSERT INTO user_sync_state (user_id, enabled, current_hash, current_storage_key, updated_at)
       VALUES (?, ?, NULL, NULL, ?)
       ON CONFLICT(user_id) DO UPDATE SET enabled = excluded.enabled`,
      [userId, enabled ? 1 : 0, now]
    )
    return this.getState(userId)
  }

  async getSnapshot(userId: string): Promise<SyncPayload | null> {
    const record = await this.getStateRecord(userId)
    if (!record?.current_storage_key) return null

    return this.readSnapshot(record.current_storage_key)
  }

  async updateSnapshot(
    userId: string,
    payload: SyncPayload,
    expectedHash: string | null
  ): Promise<SyncState> {
    const current = await this.getStateRecord(userId)
    if (!current?.enabled) {
      throw new AppError('Data sync is disabled', 'SYNC_DISABLED', 409)
    }

    if (current.current_hash !== expectedHash) {
      throw new AppError('Remote data changed since the last sync', 'SYNC_CONFLICT', 409)
    }

    const normalizedPayload = this.normalizePayload(payload)
    const nextHash = computeHash(canonicalizeSyncDataForHash(normalizedPayload.data))
    if (current.current_hash === nextHash) {
      return this.ensureCurrentSnapshotStored(current, normalizedPayload)
    }

    // Archive previous cloud only on a *large* shrink (likely wipe / keep-local).
    // Deleting one bookmark (327→326) must not create a misleading "自动备份 · 327 网站"
    // entry that looks like the delete failed.
    if (current.current_storage_key) {
      try {
        const previousSnapshot = await this.getSnapshot(userId)
        if (previousSnapshot) {
          const previousCount = previousSnapshot.data.websites?.length || 0
          const nextCount = normalizedPayload.data.websites?.length || 0
          const removed = previousCount - nextCount
          const significantShrink =
            removed >= 10 || (previousCount > 0 && removed / previousCount >= 0.2)
          if (nextCount < previousCount && significantShrink) {
            await this.backupService.createBackup(userId, previousSnapshot, 'AUTO')
          }
        }
      } catch (error) {
        // Previous snapshot unreadable — proceed with the write; recovery flow handles this.
        if (!(error instanceof AppError) || error.code !== 'SYNC_SNAPSHOT_UNAVAILABLE') {
          throw error
        }
      }
    }

    const storageKey = `${this.syncRootDir}/${userId}/snapshots/${nextHash}.json`
    await this.storage.upload(storageKey, JSON.stringify(normalizedPayload))

    const now = Date.now()
    const updateResult = current.current_hash
      ? await this.db.execute(
          `UPDATE user_sync_state
           SET current_hash = ?, current_storage_key = ?, updated_at = ?
           WHERE user_id = ? AND enabled = 1 AND current_hash = ?`,
          [nextHash, storageKey, now, userId, current.current_hash]
        )
      : await this.db.execute(
          `UPDATE user_sync_state
           SET current_hash = ?, current_storage_key = ?, updated_at = ?
           WHERE user_id = ? AND enabled = 1 AND current_hash IS NULL`,
          [nextHash, storageKey, now, userId]
        )

    if (updateResult.changes === 0) {
      throw new AppError('Remote data changed during sync', 'SYNC_CONFLICT', 409)
    }

    return {
      enabled: true,
      currentHash: nextHash,
      updatedAt: now
    }
  }

  async recoverSnapshot(
    userId: string,
    payload: SyncPayload,
    expectedHash: string
  ): Promise<SyncState> {
    const current = await this.getStateRecord(userId)
    if (!current?.enabled) {
      throw new AppError('Data sync is disabled', 'SYNC_DISABLED', 409)
    }
    if (!current.current_hash || current.current_hash !== expectedHash) {
      throw new AppError('Remote data changed since recovery started', 'SYNC_CONFLICT', 409)
    }

    if (current.current_storage_key) {
      try {
        await this.readSnapshot(current.current_storage_key)
        throw new AppError(
          'Cloud snapshot no longer needs recovery',
          'SYNC_RECOVERY_NOT_REQUIRED',
          409
        )
      } catch (error) {
        if (!(error instanceof AppError) || error.code !== 'SYNC_SNAPSHOT_UNAVAILABLE') {
          throw error
        }
      }
    }

    const normalizedPayload = this.normalizePayload(payload)
    const nextHash = computeHash(canonicalizeSyncDataForHash(normalizedPayload.data))
    const storageKey = `${this.syncRootDir}/${userId}/snapshots/${nextHash}.json`
    await this.storage.upload(storageKey, JSON.stringify(normalizedPayload))

    const now = Date.now()
    const updateResult = await this.db.execute(
      `UPDATE user_sync_state
       SET current_hash = ?, current_storage_key = ?, updated_at = ?
       WHERE user_id = ? AND enabled = 1 AND current_hash = ? AND updated_at = ?`,
      [nextHash, storageKey, now, userId, expectedHash, current.updated_at]
    )

    if (updateResult.changes === 0) {
      throw new AppError('Remote data changed during recovery', 'SYNC_CONFLICT', 409)
    }

    return {
      enabled: true,
      currentHash: nextHash,
      updatedAt: now
    }
  }

  private async getStateRecord(userId: string): Promise<SyncStateRecord | null> {
    return this.db.first<SyncStateRecord>(
      `SELECT user_id, enabled, current_hash, current_storage_key, updated_at
       FROM user_sync_state WHERE user_id = ?`,
      [userId]
    )
  }

  private async readSnapshot(storageKey: string): Promise<SyncPayload> {
    try {
      const content = await this.storage.get(storageKey)
      const payload = JSON.parse(content) as Partial<SyncPayload> | null
      if (
        !payload?.meta ||
        !payload.data ||
        !Array.isArray(payload.data.websites) ||
        !Array.isArray(payload.data.categories) ||
        !Array.isArray(payload.data.tags)
      ) {
        throw new Error('Invalid sync snapshot payload')
      }
      return payload as SyncPayload
    } catch {
      throw new AppError('Cloud sync snapshot is unavailable', 'SYNC_SNAPSHOT_UNAVAILABLE', 409)
    }
  }

  private async ensureCurrentSnapshotStored(
    current: SyncStateRecord,
    payload: SyncPayload
  ): Promise<SyncState> {
    const currentHash = current.current_hash
    if (!currentHash) {
      throw new AppError('Current sync hash is missing', 'SYNC_STATE_INVALID', 409)
    }

    if (current.current_storage_key) {
      try {
        await this.readSnapshot(current.current_storage_key)
        return this.toPublicState(current)
      } catch (error) {
        if (!(error instanceof AppError) || error.code !== 'SYNC_SNAPSHOT_UNAVAILABLE') {
          throw error
        }
      }
    }

    const storageKey = `${this.syncRootDir}/${current.user_id}/snapshots/${currentHash}.json`
    await this.storage.upload(storageKey, JSON.stringify(payload))

    const now = Date.now()
    const updateResult = await this.db.execute(
      `UPDATE user_sync_state
       SET current_storage_key = ?, updated_at = ?
       WHERE user_id = ? AND enabled = 1 AND current_hash = ?`,
      [storageKey, now, current.user_id, currentHash]
    )

    if (updateResult.changes === 0) {
      throw new AppError('Remote data changed during sync', 'SYNC_CONFLICT', 409)
    }

    return {
      enabled: true,
      currentHash,
      updatedAt: now
    }
  }

  private toPublicState(record: SyncStateRecord | null): SyncState {
    return {
      enabled: record?.enabled === 1,
      currentHash: record?.current_hash || null,
      updatedAt: record?.updated_at || null
    }
  }

  private normalizePayload(payload: SyncPayload): SyncPayload {
    const data = sanitizeSyncData({
      websites: Array.isArray(payload.data.websites) ? payload.data.websites : [],
      categories: Array.isArray(payload.data.categories) ? payload.data.categories : [],
      tags: Array.isArray(payload.data.tags) ? payload.data.tags : []
    } satisfies SyncData)

    return {
      meta: {
        ...payload.meta,
        createdAt: new Date().toISOString()
      },
      data
    }
  }
}
