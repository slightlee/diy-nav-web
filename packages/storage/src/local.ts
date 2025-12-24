/**
 * Local File Storage Client
 * Stores files in the local filesystem with public URL support
 */
import { promises as fs } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'
import { BaseStorageClient } from './base.js'
import { StorageError } from './errors.js'

/**
 * Local Storage Configuration
 */
export interface LocalConfig {
  /** Directory to store files (default: ./public/icons) */
  folderPath?: string
  /** Base URL for public access (default: /icons) */
  publicBaseUrl?: string
  /** Optional base path prefix for all operations */
  basePath?: string
}

/**
 * Local File Storage Client
 */
export class LocalClient extends BaseStorageClient {
  private folderPath: string
  private publicBaseUrl: string

  constructor(config: LocalConfig = {}) {
    super(config.basePath)
    this.folderPath = config.folderPath ?? join(process.cwd(), 'public', 'icons')
    this.publicBaseUrl = (config.publicBaseUrl ?? '/icons').replace(/\/+$/, '')
  }

  /**
   * Get the full file path on disk
   */
  private getFilePath(key: string): string {
    const fullKey = this.getFullKey(key)
    return join(this.folderPath, fullKey)
  }

  /**
   * Get the public URL for a file
   */
  getPublicUrl(key: string): string {
    const fullKey = this.getFullKey(key)
    return `${this.publicBaseUrl}/${fullKey}`
  }

  /**
   * Check if a file exists and return its public URL
   */
  async exists(key: string): Promise<string | null> {
    try {
      await fs.access(this.getFilePath(key))
      return this.getPublicUrl(key)
    } catch {
      return null
    }
  }

  /**
   * Upload a file to local storage
   */
  async upload(
    key: string,
    body: string | Buffer | Readable,
    contentType: string = 'application/octet-stream'
  ): Promise<void> {
    void contentType // Local storage doesn't use content type

    const filePath = this.getFilePath(key)
    const dirPath = join(filePath, '..')
    await fs.mkdir(dirPath, { recursive: true })

    const data = await this.normalizeBody(body)
    await fs.writeFile(filePath, data)
  }

  /**
   * Get a file from local storage
   */
  async get(key: string): Promise<string> {
    const content = await fs.readFile(this.getFilePath(key), 'utf-8')
    return content
  }

  /**
   * Delete a file from local storage
   */
  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.getFilePath(key))
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Store a file and return its public URL
   */
  async store(key: string, data: ArrayBuffer, contentType: string): Promise<string> {
    await this.upload(key, Buffer.from(data), contentType)
    return this.getPublicUrl(key)
  }

  /**
   * Local storage doesn't support presigned URLs
   * @throws {StorageError} Always throws as this operation is not supported
   */
  async getDownloadUrl(_key: string, _expiresIn?: number): Promise<string> {
    throw StorageError.notSupported('getDownloadUrl', 'local')
  }
}
