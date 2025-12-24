import { Readable } from 'stream'
import type { StorageClient } from './types.js'
import { StorageError } from './errors.js'

/**
 * Abstract base class for storage clients
 * Provides common functionality for all storage implementations
 */
export abstract class BaseStorageClient implements StorageClient {
  protected readonly basePath: string

  constructor(basePath?: string) {
    this.basePath = (basePath || '').replace(/^\/+|\/+$/g, '')
  }

  /**
   * Get the full key/path with base path prefix
   */
  protected getFullKey(key: string): string {
    return this.basePath ? `${this.basePath}/${key}` : key
  }

  /**
   * Convert a Readable stream to Buffer
   */
  protected async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  /**
   * Normalize body to Buffer for upload operations
   */
  protected async normalizeBody(body: string | Buffer | Readable): Promise<Buffer> {
    if (body instanceof Readable) {
      return this.streamToBuffer(body)
    }
    if (typeof body === 'string') {
      return Buffer.from(body)
    }
    return body
  }

  // Abstract methods that must be implemented by subclasses
  abstract upload(
    key: string,
    body: string | Buffer | Readable,
    contentType?: string
  ): Promise<void>
  abstract get(key: string): Promise<string>
  abstract delete(key: string): Promise<void>
  abstract exists(key: string): Promise<string | null>
  abstract getPublicUrl(key: string): string
  abstract store(key: string, data: ArrayBuffer, contentType: string): Promise<string>

  // Optional method with default implementation that throws
  async getDownloadUrl(_key: string, _expiresIn?: number): Promise<string> {
    throw StorageError.notSupported('getDownloadUrl', 'base')
  }
}
