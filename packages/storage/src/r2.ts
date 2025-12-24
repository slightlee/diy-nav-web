import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Readable } from 'stream'
import type { R2Config } from './types.js'
import { BaseStorageClient } from './base.js'

export { type R2Config } from './types.js'

/**
 * Cloudflare R2 / S3 Compatible Storage Client
 */
export class R2Client extends BaseStorageClient {
  private client: S3Client
  private bucket: string
  private publicBaseUrl: string

  constructor(config: R2Config) {
    super(config.basePath)
    this.bucket = config.bucketName
    this.publicBaseUrl = (config.publicBaseUrl || '').replace(/\/+$/, '')

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    })
  }

  /**
   * Upload a file to R2
   */
  async upload(
    key: string,
    body: string | Buffer | Readable,
    contentType: string = 'application/json'
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: this.getFullKey(key),
      Body: body,
      ContentType: contentType
    })
    await this.client.send(command)
  }

  /**
   * Get a file from R2
   */
  async get(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: this.getFullKey(key)
    })
    const response = await this.client.send(command)
    return response.Body?.transformToString() || ''
  }

  /**
   * Delete a file from R2
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: this.getFullKey(key)
    })
    await this.client.send(command)
  }

  /**
   * Generate a presigned URL for downloading
   */
  async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: this.getFullKey(key)
    })
    return getSignedUrl(this.client, command, { expiresIn })
  }

  /**
   * Get the public URL for a file (synchronous)
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
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: this.getFullKey(key)
      })
      await this.client.send(command)
      return this.getPublicUrl(key)
    } catch {
      return null
    }
  }

  /**
   * Store a file and return its public URL
   */
  async store(key: string, data: ArrayBuffer, contentType: string): Promise<string> {
    await this.upload(key, Buffer.from(data), contentType)
    return this.getPublicUrl(key)
  }
}
