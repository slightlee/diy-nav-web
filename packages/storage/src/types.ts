import { Readable } from 'stream'

/**
 * Storage Client Interface
 * Abstract interface for storage providers (R2, WebDAV, Local, etc.)
 */
export interface StorageClient {
  /**
   * Upload a file to storage
   */
  upload(key: string, body: string | Buffer | Readable, contentType?: string): Promise<void>

  /**
   * Get a file from storage
   */
  get(key: string): Promise<string>

  /**
   * Delete a file from storage
   */
  delete(key: string): Promise<void>

  /**
   * Generate a presigned download URL (optional, not all providers support this)
   */
  getDownloadUrl?(key: string, expiresIn?: number): Promise<string>

  /**
   * Check if a file exists and return its public URL if it does
   * @returns Public URL if file exists, null otherwise
   */
  exists(key: string): Promise<string | null>

  /**
   * Get the public URL for a file (synchronous, doesn't check existence)
   */
  getPublicUrl(key: string): string

  /**
   * Store a file and return its public URL (convenience method for upload + getPublicUrl)
   */
  store(key: string, data: ArrayBuffer, contentType: string): Promise<string>
}

/**
 * R2/S3 Storage Configuration
 */
export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  /** Public base URL for accessing stored files */
  publicBaseUrl?: string
  /** Optional base path prefix for all operations */
  basePath?: string
}

/**
 * WebDAV Storage Configuration
 */
export interface WebDAVConfig {
  url: string
  username: string
  password: string
  basePath?: string
}

/**
 * Storage Provider Constants
 * Using const assertion for type-safe provider validation
 */
export const STORAGE_PROVIDERS = ['r2', 'webdav', 'local'] as const
export type StorageProviderType = (typeof STORAGE_PROVIDERS)[number]

/**
 * Type guard to validate storage provider
 */
export function isValidStorageProvider(provider: string): provider is StorageProviderType {
  return STORAGE_PROVIDERS.includes(provider as StorageProviderType)
}
