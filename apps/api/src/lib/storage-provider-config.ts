import type { DatabaseClient } from '@nav/database'
import {
  createStorageClient,
  LocalClient,
  type StorageClient,
  type StorageProviderType,
  type R2Config,
  type WebDAVConfig
} from '@nav/storage'
import { decrypt, encrypt } from '@nav/ai-core'

// ─────────────────────────────────────────────
//  Purpose = the "why" (what is stored)
//  Provider = the "how" (which engine stores it)
// ─────────────────────────────────────────────

export type StoragePurpose = 'public' | 'backup'
export type { StorageProviderType }

/** DB row shape for storage_purpose_configs */
export interface StoragePurposeRow {
  purpose: StoragePurpose
  provider: StorageProviderType
  bucket_name: string | null
  account_id: string | null
  access_key_id: string | null
  secret_access_key_encrypted: string | null
  endpoint: string | null
  region: string | null
  public_base_url: string | null
  webdav_url: string | null
  webdav_username: string | null
  webdav_password_encrypted: string | null
  storage_path: string | null
  max_retained_backups: number
  created_at: number
  updated_at: number
}

/** DTO returned to the admin frontend */
export interface AdminStoragePurposeConfig {
  purpose: StoragePurpose
  provider: StorageProviderType
  bucketName: string
  accountId: string
  accessKeyId: string
  hasSecret: boolean
  endpoint: string
  region: string
  publicBaseUrl: string
  webdavUrl: string
  webdavUsername: string
  storagePath: string
  maxRetainedBackups: number
  createdAt: number
  updatedAt: number
}

/** Payload for updating a purpose config */
export interface UpdateStoragePurposePayload {
  provider: StorageProviderType
  bucketName?: string
  accountId?: string
  accessKeyId?: string
  secretAccessKey?: string
  endpoint?: string
  region?: string
  publicBaseUrl?: string
  webdavUrl?: string
  webdavUsername?: string
  webdavPassword?: string
  storagePath?: string
  maxRetainedBackups?: number
}

/** Payload for testing a connection */
export interface TestStorageProviderPayload {
  purpose: StoragePurpose
  provider: StorageProviderType
  bucketName?: string
  accountId?: string
  accessKeyId?: string
  secretAccessKey?: string
  endpoint?: string
  region?: string
  publicBaseUrl?: string
  webdavUrl?: string
  webdavUsername?: string
  webdavPassword?: string
  storagePath?: string
}

export interface StorageTestResult {
  success: boolean
  latencyMs?: number
  message: string
  details?: string
}

/** In-memory path settings passed to services on hot-swap */
export interface StorageActivePaths {
  backupPath: string
  publicPath: string
  maxRetainedBackups: number
}

// Default path constants (hardcoded, not from env)
const DEFAULT_BACKUP_PATH = 'data-backups'
const DEFAULT_PUBLIC_PATH = 'icons'
const DEFAULT_MAX_RETAINED = 5

// ─────────────────────────────────────────────
//  Service
// ─────────────────────────────────────────────
export class StorageProviderConfigService {
  constructor(
    private readonly db: DatabaseClient,
    private readonly encryptionKey: string,
    private readonly onStorageUpdated?: (
      backupClient: StorageClient,
      publicClient: StorageClient,
      paths: StorageActivePaths
    ) => void
  ) {}

  // ── Table management ──────────────────────

  async initTable(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS storage_purpose_configs (
        purpose VARCHAR(16) PRIMARY KEY CHECK (purpose IN ('public', 'backup')),
        provider VARCHAR(16) NOT NULL DEFAULT 'r2' CHECK (provider IN ('r2', 's3', 'webdav')),
        bucket_name VARCHAR(255),
        account_id VARCHAR(128),
        access_key_id VARCHAR(255),
        secret_access_key_encrypted TEXT,
        endpoint VARCHAR(512),
        region VARCHAR(64),
        public_base_url VARCHAR(512),
        webdav_url VARCHAR(512),
        webdav_username VARCHAR(255),
        webdav_password_encrypted TEXT,
        storage_path VARCHAR(512),
        max_retained_backups INTEGER NOT NULL DEFAULT 5,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `)

    // Check if purpose configs need migration from legacy storage_provider_configs table
    const existing = await this.db.all<StoragePurposeRow>(
      `SELECT purpose FROM storage_purpose_configs LIMIT 1`
    )
    if (existing.length === 0) {
      try {
        const legacyRows = await this.db.all<any>(
          `SELECT * FROM storage_provider_configs WHERE provider = 'r2' OR enabled = 1 LIMIT 1`
        )
        if (legacyRows.length > 0) {
          const legacy = legacyRows[0]
          const now = Date.now()
          // Seed public storage from legacy config
          await this.db.execute(
            `
            INSERT OR IGNORE INTO storage_purpose_configs (
              purpose, provider, bucket_name, account_id, access_key_id,
              secret_access_key_encrypted, endpoint, region, public_base_url,
              storage_path, max_retained_backups, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              'public',
              legacy.provider || 'r2',
              legacy.bucket_name || '',
              legacy.account_id || '',
              legacy.access_key_id || '',
              legacy.secret_access_key_encrypted || null,
              legacy.endpoint || '',
              legacy.region || 'auto',
              legacy.public_base_url || '',
              legacy.public_path || DEFAULT_PUBLIC_PATH,
              DEFAULT_MAX_RETAINED,
              legacy.created_at || now,
              legacy.updated_at || now
            ]
          )

          // Seed backup storage from legacy config
          await this.db.execute(
            `
            INSERT OR IGNORE INTO storage_purpose_configs (
              purpose, provider, bucket_name, account_id, access_key_id,
              secret_access_key_encrypted, endpoint, region, public_base_url,
              webdav_url, webdav_username, webdav_password_encrypted,
              storage_path, max_retained_backups, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              'backup',
              legacy.webdav_url ? 'webdav' : legacy.provider || 'r2',
              legacy.bucket_name || '',
              legacy.account_id || '',
              legacy.access_key_id || '',
              legacy.secret_access_key_encrypted || null,
              legacy.endpoint || '',
              legacy.region || 'auto',
              legacy.public_base_url || '',
              legacy.webdav_url || null,
              legacy.webdav_username || null,
              legacy.webdav_password_encrypted || null,
              legacy.backup_path || DEFAULT_BACKUP_PATH,
              legacy.max_retained_backups || DEFAULT_MAX_RETAINED,
              legacy.created_at || now,
              legacy.updated_at || now
            ]
          )
        }
      } catch {
        // legacy table might not exist in fresh installs, safely ignore
      }
    }
  }

  // ── Admin read ────────────────────────────

  /** Returns the config for one or both purposes */
  async getAdminConfig(): Promise<{
    public: AdminStoragePurposeConfig
    backup: AdminStoragePurposeConfig
  }> {
    try {
      await this.initTable()
    } catch {
      // ignore
    }
    const rows = await this.db.all<StoragePurposeRow>(
      `SELECT * FROM storage_purpose_configs WHERE purpose IN ('public', 'backup')`
    )
    const rowMap = new Map(rows.map(r => [r.purpose, r]))
    return {
      public: this.toDto(rowMap.get('public'), 'public'),
      backup: this.toDto(rowMap.get('backup'), 'backup')
    }
  }

  private toDto(
    row: StoragePurposeRow | undefined,
    purpose: StoragePurpose
  ): AdminStoragePurposeConfig {
    const defaultPath = purpose === 'backup' ? DEFAULT_BACKUP_PATH : DEFAULT_PUBLIC_PATH

    if (!row) {
      return {
        purpose,
        provider: 'r2',
        bucketName: '',
        accountId: '',
        accessKeyId: '',
        hasSecret: false,
        endpoint: '',
        region: 'auto',
        publicBaseUrl: '',
        webdavUrl: '',
        webdavUsername: '',
        storagePath: defaultPath,
        maxRetainedBackups: DEFAULT_MAX_RETAINED,
        createdAt: 0,
        updatedAt: 0
      }
    }

    const hasSecret =
      row.provider === 'webdav'
        ? !!row.webdav_password_encrypted
        : !!row.secret_access_key_encrypted

    return {
      purpose,
      provider: row.provider,
      bucketName: row.bucket_name || '',
      accountId: row.account_id || '',
      accessKeyId: row.access_key_id || '',
      hasSecret,
      endpoint: row.endpoint || '',
      region: row.region || 'auto',
      publicBaseUrl: row.public_base_url || '',
      webdavUrl: row.webdav_url || '',
      webdavUsername: row.webdav_username || '',
      storagePath: row.storage_path || defaultPath,
      maxRetainedBackups: row.max_retained_backups || DEFAULT_MAX_RETAINED,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  // ── Admin write ───────────────────────────

  async updatePurposeConfig(
    purpose: StoragePurpose,
    payload: UpdateStoragePurposePayload
  ): Promise<AdminStoragePurposeConfig> {
    // Ensure table exists (idempotent guard)
    try {
      await this.initTable()
    } catch {
      throw new Error('存储配置表初始化失败，请确认数据库连接正常后重试')
    }

    const existingRow = await this.db.first<StoragePurposeRow>(
      `SELECT * FROM storage_purpose_configs WHERE purpose = ?`,
      [purpose]
    )

    // Encrypt secrets (preserve existing if not re-submitted)
    let secretAccessKeyEncrypted = existingRow?.secret_access_key_encrypted || null
    if (payload.secretAccessKey?.trim()) {
      secretAccessKeyEncrypted = encrypt(payload.secretAccessKey.trim(), this.encryptionKey)
    } // no env fallback — credential must be entered or already saved in DB

    let webdavPasswordEncrypted = existingRow?.webdav_password_encrypted || null
    if (payload.webdavPassword?.trim()) {
      webdavPasswordEncrypted = encrypt(payload.webdavPassword.trim(), this.encryptionKey)
    }

    const now = Date.now()
    const defaultPath = purpose === 'backup' ? DEFAULT_BACKUP_PATH : DEFAULT_PUBLIC_PATH

    const upsertClause =
      this.db.dialect === 'mysql'
        ? `ON DUPLICATE KEY UPDATE
        provider = VALUES(provider),
        bucket_name = VALUES(bucket_name),
        account_id = VALUES(account_id),
        access_key_id = VALUES(access_key_id),
        secret_access_key_encrypted = COALESCE(VALUES(secret_access_key_encrypted), secret_access_key_encrypted),
        endpoint = VALUES(endpoint),
        region = VALUES(region),
        public_base_url = VALUES(public_base_url),
        webdav_url = VALUES(webdav_url),
        webdav_username = VALUES(webdav_username),
        webdav_password_encrypted = COALESCE(VALUES(webdav_password_encrypted), webdav_password_encrypted),
        storage_path = VALUES(storage_path),
        max_retained_backups = VALUES(max_retained_backups),
        updated_at = VALUES(updated_at)`
        : `ON CONFLICT(purpose) DO UPDATE SET
        provider = excluded.provider,
        bucket_name = excluded.bucket_name,
        account_id = excluded.account_id,
        access_key_id = excluded.access_key_id,
        secret_access_key_encrypted = COALESCE(excluded.secret_access_key_encrypted, storage_purpose_configs.secret_access_key_encrypted),
        endpoint = excluded.endpoint,
        region = excluded.region,
        public_base_url = excluded.public_base_url,
        webdav_url = excluded.webdav_url,
        webdav_username = excluded.webdav_username,
        webdav_password_encrypted = COALESCE(excluded.webdav_password_encrypted, storage_purpose_configs.webdav_password_encrypted),
        storage_path = excluded.storage_path,
        max_retained_backups = excluded.max_retained_backups,
        updated_at = excluded.updated_at`
    await this.db.execute(
      `
      INSERT INTO storage_purpose_configs (
        purpose, provider, bucket_name, account_id, access_key_id,
        secret_access_key_encrypted, endpoint, region, public_base_url,
        webdav_url, webdav_username, webdav_password_encrypted,
        storage_path, max_retained_backups, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ${upsertClause}
      `,
      [
        purpose,
        payload.provider,
        payload.bucketName?.trim() || null,
        payload.accountId?.trim() || null,
        payload.accessKeyId?.trim() || null,
        secretAccessKeyEncrypted,
        payload.endpoint?.trim() || null,
        payload.region?.trim() || 'auto',
        payload.publicBaseUrl?.trim() || null,
        payload.webdavUrl?.trim() || null,
        payload.webdavUsername?.trim() || null,
        webdavPasswordEncrypted,
        payload.storagePath?.trim() || defaultPath,
        payload.maxRetainedBackups || DEFAULT_MAX_RETAINED,
        existingRow?.created_at || now,
        now
      ]
    )

    // Hot-swap storage clients and path configs (non-blocking)
    if (this.onStorageUpdated) {
      const paths: StorageActivePaths = {
        backupPath:
          payload.storagePath?.trim() ||
          (purpose === 'backup'
            ? payload.storagePath?.trim() || DEFAULT_BACKUP_PATH
            : DEFAULT_BACKUP_PATH),
        publicPath:
          payload.storagePath?.trim() ||
          (purpose === 'public'
            ? payload.storagePath?.trim() || DEFAULT_PUBLIC_PATH
            : DEFAULT_PUBLIC_PATH),
        maxRetainedBackups: payload.maxRetainedBackups || DEFAULT_MAX_RETAINED
      }
      this.buildStorageClientsFromDb()
        .then(({ backupClient, publicClient, resolvedPaths }) => {
          this.onStorageUpdated!(backupClient, publicClient, resolvedPaths)
        })
        .catch(() => {
          // Hot-swap failed — services keep previous clients
        })
    }

    const updated = await this.db.first<StoragePurposeRow>(
      `SELECT * FROM storage_purpose_configs WHERE purpose = ?`,
      [purpose]
    )
    return this.toDto(updated ?? undefined, purpose)
  }

  // ── Storage client building ───────────────

  /** Build storage clients from DB rows */
  async buildStorageClientsFromDb(): Promise<{
    backupClient: StorageClient
    publicClient: StorageClient
    resolvedPaths: StorageActivePaths
  }> {
    const rows = await this.db.all<StoragePurposeRow>(
      `SELECT * FROM storage_purpose_configs WHERE purpose IN ('public', 'backup')`
    )
    const rowMap = new Map(rows.map(r => [r.purpose, r]))

    const backupRow = rowMap.get('backup')
    const publicRow = rowMap.get('public')

    const backupClient = backupRow ? this.buildClientFromRow(backupRow) : this.buildDefaultClient()

    const publicClient = publicRow ? this.buildClientFromRow(publicRow) : this.buildDefaultClient()

    const resolvedPaths: StorageActivePaths = {
      backupPath: backupRow?.storage_path || DEFAULT_BACKUP_PATH,
      publicPath: publicRow?.storage_path || DEFAULT_PUBLIC_PATH,
      maxRetainedBackups: backupRow?.max_retained_backups || DEFAULT_MAX_RETAINED
    }

    return { backupClient, publicClient, resolvedPaths }
  }

  private buildClientFromRow(row: StoragePurposeRow): StorageClient {
    if (row.provider === 'webdav') {
      const password = row.webdav_password_encrypted
        ? decrypt(row.webdav_password_encrypted, this.encryptionKey)
        : ''
      const webdavConfig: WebDAVConfig = {
        url: row.webdav_url || '',
        username: row.webdav_username || '',
        password,
        basePath: row.storage_path || DEFAULT_BACKUP_PATH
      }
      return createStorageClient({ provider: 'webdav', webdav: webdavConfig })
    }

    const secretKey = row.secret_access_key_encrypted
      ? decrypt(row.secret_access_key_encrypted, this.encryptionKey)
      : ''

    const r2Config: R2Config = {
      accountId: row.account_id || '',
      accessKeyId: row.access_key_id || '',
      secretAccessKey: secretKey,
      bucketName: row.bucket_name || '',
      endpoint: row.endpoint || undefined,
      region: row.region || 'auto',
      publicBaseUrl: row.public_base_url || '',
      basePath: row.storage_path || undefined
    }
    return createStorageClient({ provider: row.provider, r2: r2Config })
  }

  private buildDefaultClient(): StorageClient {
    // No storage configured yet — use local filesystem as safe no-op fallback.
    // This client will be replaced from DB as soon as initServices completes.
    return new LocalClient({
      folderPath: './public/storage-fallback',
      publicBaseUrl: '/storage-fallback'
    })
  }

  // ── Connection test ───────────────────────

  async testConnection(payload: TestStorageProviderPayload): Promise<StorageTestResult> {
    // Resolve secrets: use submitted value or fall back to DB-stored encrypted value
    let secretAccessKey = payload.secretAccessKey?.trim() || ''
    let webdavPassword = payload.webdavPassword?.trim() || ''

    if (!secretAccessKey || !webdavPassword) {
      const row = await this.db
        .first<StoragePurposeRow>(`SELECT * FROM storage_purpose_configs WHERE purpose = ?`, [
          payload.purpose
        ])
        .catch(() => null)

      if (row?.secret_access_key_encrypted && !secretAccessKey) {
        try {
          secretAccessKey = decrypt(row.secret_access_key_encrypted, this.encryptionKey)
        } catch {
          /**/
        }
      }
      if (row?.webdav_password_encrypted && !webdavPassword) {
        try {
          webdavPassword = decrypt(row.webdav_password_encrypted, this.encryptionKey)
        } catch {
          /**/
        }
      }

      // Fallback: if no DB record, no env fallback (storage is unconfigured)
      if (!secretAccessKey && (payload.provider === 'r2' || payload.provider === 's3')) {
        // No fallback — require user to enter or have saved the key
      }
      if (!webdavPassword && payload.provider === 'webdav') {
        // No fallback — require user to enter or have saved the password
      }
    }

    let client: StorageClient
    try {
      if (payload.provider === 'webdav') {
        if (!webdavPassword) return { success: false, message: 'WebDAV 应用授权密码不能为空' }
        const webdavConfig: WebDAVConfig = {
          url: payload.webdavUrl || '',
          username: payload.webdavUsername || '',
          password: webdavPassword,
          basePath: payload.storagePath || DEFAULT_BACKUP_PATH
        }
        client = createStorageClient({ provider: 'webdav', webdav: webdavConfig })
      } else {
        if (!secretAccessKey) return { success: false, message: 'Secret Access Key 不能为空' }
        const accountId = payload.accountId?.trim() || ''
        const endpoint = payload.endpoint?.trim() || ''
        if (!accountId && !endpoint)
          return { success: false, message: '请填写 Account ID 或 Endpoint 地址' }

        const r2Config: R2Config = {
          accountId,
          accessKeyId: payload.accessKeyId?.trim() || '',
          secretAccessKey,
          bucketName: payload.bucketName?.trim() || '',
          endpoint: endpoint || undefined,
          region: payload.region?.trim() || 'auto',
          publicBaseUrl: payload.publicBaseUrl?.trim() || ''
        }
        client = createStorageClient({ provider: payload.provider, r2: r2Config })
      }
    } catch (e) {
      return { success: false, message: `配置错误：${e instanceof Error ? e.message : String(e)}` }
    }

    const testKey = `.nav-storage-test-${Date.now()}.txt`
    const start = Date.now()
    try {
      await client.upload(testKey, 'nav-storage-test', 'text/plain')
      await client.delete(testKey)
      const latencyMs = Date.now() - start
      return { success: true, message: `连接成功，延迟 ${latencyMs}ms`, latencyMs }
    } catch (e) {
      return {
        success: false,
        message: `连接失败：${e instanceof Error ? e.message : String(e)}`,
        latencyMs: Date.now() - start
      }
    }
  }
}
