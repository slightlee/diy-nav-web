import { createClient, type WebDAVClient as WebDAVClientType } from 'webdav'
import { Readable } from 'stream'
import type { WebDAVConfig } from './types.js'
import { BaseStorageClient } from './base.js'
import { StorageError, isNotFoundError } from './errors.js'

/**
 * WebDAV Storage Client
 * Supports services like 坚果云, Nextcloud, etc.
 * Note: WebDAV is private storage, doesn't support public URLs
 */
export class WebDAVClient extends BaseStorageClient {
  private client: WebDAVClientType

  constructor(config: WebDAVConfig) {
    // Pass basePath to base class (will be normalized)
    super(config.basePath || 'nav-backup')

    this.client = createClient(config.url, {
      username: config.username,
      password: config.password
    })
  }

  /**
   * Get full path for WebDAV (always starts with /)
   * WebDAV requires absolute paths starting with /
   */
  protected override getFullKey(key: string): string {
    const fullKey = this.basePath ? `${this.basePath}/${key}` : key
    // Ensure path starts with /
    return fullKey.startsWith('/') ? fullKey : `/${fullKey}`
  }

  /**
   * Ensure directory exists (WebDAV requires parent directories)
   */
  private async ensureDirectory(filePath: string): Promise<void> {
    const parts = filePath.split('/')
    parts.pop() // Remove filename

    let currentPath = ''
    for (const part of parts) {
      if (!part) continue
      currentPath += '/' + part

      try {
        const exists = await this.client.exists(currentPath)
        if (!exists) {
          await this.client.createDirectory(currentPath)
        }
      } catch {
        // Directory might already exist, ignore error
      }
    }
  }

  /**
   * Upload a file to WebDAV
   */
  async upload(
    key: string,
    body: string | Buffer | Readable,
    contentType: string = 'application/json'
  ): Promise<void> {
    const fullPath = this.getFullKey(key)

    // Ensure parent directories exist
    await this.ensureDirectory(fullPath)

    // Use base class helper to normalize body
    const data = await this.normalizeBody(body)

    await this.client.putFileContents(fullPath, data, {
      contentLength: data.length,
      headers: { 'Content-Type': contentType }
    })
  }

  /**
   * Get a file from WebDAV
   */
  async get(key: string): Promise<string> {
    const fullPath = this.getFullKey(key)
    const content = await this.client.getFileContents(fullPath, { format: 'text' })
    return content as string
  }

  /**
   * Delete a file from WebDAV
   */
  async delete(key: string): Promise<void> {
    const fullPath = this.getFullKey(key)
    await this.client.deleteFile(fullPath)
  }

  /**
   * WebDAV doesn't support presigned URLs
   * @throws {StorageError} Always throws as this operation is not supported
   */
  async getDownloadUrl(_key: string, _expiresIn?: number): Promise<string> {
    throw StorageError.notSupported('getDownloadUrl', 'webdav')
  }

  /**
   * Check if a file exists
   * Note: WebDAV is private, returns path if exists, null otherwise
   * @throws {StorageError} When network or authentication fails
   */
  async exists(key: string): Promise<string | null> {
    try {
      const fullPath = this.getFullKey(key)
      const fileExists = await this.client.exists(fullPath)
      return fileExists ? fullPath : null
    } catch (error) {
      // If it's a 404-like error, the file doesn't exist
      if (isNotFoundError(error)) {
        return null
      }
      // For network/auth errors, throw to allow caller to handle
      throw StorageError.networkError(
        `Failed to check file existence: ${key}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Get the public URL for a file
   * @throws {StorageError} Always throws as WebDAV doesn't support public URLs
   */
  getPublicUrl(_key: string): string {
    throw StorageError.notSupported('getPublicUrl', 'webdav')
  }

  /**
   * Store a file (WebDAV doesn't return public URL)
   */
  async store(key: string, data: ArrayBuffer, contentType: string): Promise<string> {
    await this.upload(key, Buffer.from(data), contentType)
    // Return the path since WebDAV doesn't have public URLs
    return this.getFullKey(key)
  }
}
