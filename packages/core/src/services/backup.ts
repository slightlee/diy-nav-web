import type { DatabaseClient } from '@nav/database'
import type { StorageClient } from '@nav/storage'
import { logger as defaultLogger, type Logger } from '@nav/logger'
import { cleanDataForHash, computeHash } from '@nav/utils'

export interface BackupServiceOptions {
  db: DatabaseClient
  storage: StorageClient
  maxBackups?: number
  backupRootDir?: string
  logger?: Logger
}

export interface BackupRecord {
  id: number
  user_id: string
  name: string
  type: 'MANUAL' | 'AUTO'
  storage_key: string
  file_hash: string
  size: number
  created_at: number
}

export class BackupService {
  private db: DatabaseClient
  private storage: StorageClient
  private maxBackups: number
  private backupRootDir: string
  private logger: Logger

  constructor(config: BackupServiceOptions) {
    this.db = config.db
    this.storage = config.storage
    this.maxBackups = config.maxBackups || 5
    this.backupRootDir = config.backupRootDir || 'backups'
    this.logger = config.logger || defaultLogger
  }

  /**
   * Initialize the database table if it doesn't exist
   */
  async initTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS data_backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        storage_key TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
    `
    await this.db.execute(sql)
  }

  /**
   * Create a new backup
   */
  async createBackup(
    userId: string,
    data: any,
    type: 'MANUAL' | 'AUTO' = 'MANUAL'
  ): Promise<BackupRecord | null> {
    const jsonContent = JSON.stringify(data)

    // Calculate semantic hash (ignoring volatile stats)
    // Calculate semantic hash (ignoring volatile stats)
    const coreContent = cleanDataForHash(data?.data || data)
    const fileHash = computeHash(coreContent)

    const size = Buffer.byteLength(jsonContent)
    const timestamp = Date.now()

    // For auto backups, check if content has changed since last auto backup
    if (type === 'AUTO') {
      const lastBackup = await this.db.first<BackupRecord>(
        `SELECT * FROM data_backups WHERE user_id = ? AND type = 'AUTO' ORDER BY created_at DESC LIMIT 1`,
        [userId]
      )

      if (lastBackup && lastBackup.file_hash === fileHash) {
        this.logger.info({ userId }, 'Skipped auto backup: content unchanged')
        return null
      }
    }

    // Upload to R2
    const fileName = `backup_${userId}_${timestamp}.json`
    const storageKey = `${this.backupRootDir}/${userId}/${fileName}`
    await this.storage.upload(storageKey, jsonContent)

    // Record in database
    const name =
      type === 'AUTO'
        ? `自动备份-${new Date(timestamp).toISOString().split('T')[0]}`
        : `手动备份-${new Date(timestamp).toISOString().split('T')[0]}`

    await this.db.execute(
      `INSERT INTO data_backups (user_id, name, type, storage_key, file_hash, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, type, storageKey, fileHash, size, timestamp]
    )

    // Cleanup old backups
    await this.cleanupOldBackups(userId, type)

    // Return the new record
    return this.db.first<BackupRecord>(`SELECT * FROM data_backups WHERE storage_key = ?`, [
      storageKey
    ])
  }

  /**
   * List backups for a user
   */
  async listBackups(userId: string): Promise<BackupRecord[]> {
    return this.db.all<BackupRecord>(
      `SELECT * FROM data_backups WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    )
  }

  /**
   * Get backup content for restoration
   */
  async getBackupContent(userId: string, backupId: number): Promise<any> {
    const backup = await this.db.first<BackupRecord>(
      `SELECT * FROM data_backups WHERE id = ? AND user_id = ?`,
      [backupId, userId]
    )

    if (!backup) {
      throw new Error('Backup not found')
    }

    const content = await this.storage.get(backup.storage_key)
    return JSON.parse(content)
  }

  /**
   * Delete a backup
   */
  async deleteBackup(userId: string, backupId: number): Promise<void> {
    const backup = await this.db.first<BackupRecord>(
      `SELECT * FROM data_backups WHERE id = ? AND user_id = ?`,
      [backupId, userId]
    )

    if (!backup) {
      throw new Error('Backup not found')
    }

    // Delete from storage
    try {
      await this.storage.delete(backup.storage_key)
    } catch (e) {
      this.logger.error({ err: e, storageKey: backup.storage_key }, 'Failed to delete storage file')
      // Continue to delete from DB even if storage fails (to keep DB clean)
    }

    // Delete from database
    await this.db.execute(`DELETE FROM data_backups WHERE id = ?`, [backupId])
  }

  /**
   * Cleanup old backups
   */
  private async cleanupOldBackups(userId: string, type: 'MANUAL' | 'AUTO'): Promise<void> {
    const backups = await this.db.all<BackupRecord>(
      `SELECT * FROM data_backups WHERE user_id = ? AND type = ? ORDER BY created_at DESC`,
      [userId, type]
    )

    if (backups.length > this.maxBackups) {
      const toDelete = backups.slice(this.maxBackups)

      for (const backup of toDelete) {
        // Delete from storage
        try {
          await this.storage.delete(backup.storage_key)
        } catch (e) {
          this.logger.error(
            { err: e, storageKey: backup.storage_key },
            'Failed to delete storage file'
          )
        }

        // Delete from database
        await this.db.execute(`DELETE FROM data_backups WHERE id = ?`, [backup.id])
      }
    }
  }
}
