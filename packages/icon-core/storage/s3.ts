/**
 * S3/R2 兼容存储适配器
 *
 * 目标：在 S3 兼容存储（含 Cloudflare R2）中检查/写入对象并生成公共 URL
 * 配置：bucket、publicBaseUrl、region/endpoint、accessKeyId/secretAccessKey、keyPrefix
 */
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import type { StorageAdapter } from '../types.js'

type Options = {
  bucket: string
  publicBaseUrl: string
  region?: string
  endpoint?: string
  accessKeyId?: string
  secretAccessKey?: string
  forcePathStyle?: boolean
  keyPrefix?: string
}

export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client
  private bucket: string
  private publicBaseUrl: string
  private keyPrefix: string

  constructor(opts: Options) {
    this.client = new S3Client({
      region: opts.region ?? 'us-east-1',
      endpoint: opts.endpoint,
      forcePathStyle: opts.forcePathStyle ?? !!opts.endpoint,
      credentials:
        opts.accessKeyId && opts.secretAccessKey
          ? { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey }
          : undefined
    })
    this.bucket = opts.bucket
    this.publicBaseUrl = opts.publicBaseUrl
    this.keyPrefix = (opts.keyPrefix || '').replace(/^\/+|\/+$/g, '')
  }

  /**
   * 生成公共访问 URL（带前缀）
   */
  getPublicUrl(key: string): string {
    const prefix = this.keyPrefix ? `${this.keyPrefix}/` : ''
    return `${this.publicBaseUrl}/${prefix}${key}`
  }

  /**
   * 判断对象是否存在，存在则返回公共 URL
   */
  async exists(key: string): Promise<string | null> {
    try {
      const fullKey = this.keyPrefix ? `${this.keyPrefix}/${key}` : key
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: fullKey }))
      return this.getPublicUrl(key)
    } catch {
      return null
    }
  }

  /**
   * 上传对象并返回公共 URL
   */
  async store(key: string, data: ArrayBuffer, contentType: string): Promise<string> {
    const fullKey = this.keyPrefix ? `${this.keyPrefix}/${key}` : key
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
        Body: Buffer.from(data),
        ContentType: contentType
      })
    )
    return this.getPublicUrl(key)
  }
}

/**
 * Cloudflare R2 适配器（S3 兼容）
 * 强制使用 path-style，region 设置为 auto
 */
export class CloudflareR2Adapter extends S3StorageAdapter {
  constructor(opts: Omit<Options, 'region'>) {
    super({ ...opts, region: 'auto', forcePathStyle: true })
  }
}
