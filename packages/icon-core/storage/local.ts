/**
 * 本地文件存储适配器
 *
 * 目标：将图标写入项目的 public/icons 目录，提供可公开访问的 URL
 * 配置：folderPath、publicBaseUrl、keyPrefix 可定制存储位置与 URL 前缀
 */
import { promises as fs } from 'fs'
import { join } from 'path'
import { StorageAdapter } from '../types.js'

type Options = {
  folderPath?: string
  publicBaseUrl?: string
  keyPrefix?: string
}

export class LocalStorageAdapter implements StorageAdapter {
  private folderPath: string
  private publicBaseUrl: string
  private keyPrefix: string

  constructor(opts: Options = {}) {
    this.folderPath = opts.folderPath ?? join(process.cwd(), 'public', 'icons')
    this.publicBaseUrl = opts.publicBaseUrl ?? '/icons'
    this.keyPrefix = (opts.keyPrefix || '').replace(/^\/+|\/+$/g, '')
  }

  /**
   * 返回公开访问 URL（可带前缀）
   */
  getPublicUrl(key: string): string {
    const prefix = this.keyPrefix ? `${this.keyPrefix}/` : ''
    return `${this.publicBaseUrl}/${prefix}${key}`
  }

  /**
   * 检查本地文件是否存在，存在则返回公开 URL
   */
  async exists(key: string): Promise<string | null> {
    const filePath = this.keyPrefix
      ? join(this.folderPath, this.keyPrefix, key)
      : join(this.folderPath, key)
    try {
      await fs.access(filePath)
      return this.getPublicUrl(key)
    } catch {
      return null
    }
  }

  /**
   * 写入图标文件并返回公开 URL
   */
  async store(key: string, data: ArrayBuffer, contentType: string): Promise<string> {
    const dirPath = this.keyPrefix ? join(this.folderPath, this.keyPrefix) : this.folderPath
    const filePath = this.keyPrefix ? join(dirPath, key) : join(this.folderPath, key)
    await fs.mkdir(dirPath, { recursive: true })
    const buffer = Buffer.from(data)
    void contentType
    await fs.writeFile(filePath, buffer)
    return this.getPublicUrl(key)
  }
}
