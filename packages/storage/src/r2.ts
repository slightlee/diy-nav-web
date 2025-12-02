import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Readable } from 'stream'

export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
}

export class R2Client {
  private client: S3Client
  private bucket: string

  constructor(config: R2Config) {
    this.bucket = config.bucketName
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
      Key: key,
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
      Key: key
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
      Key: key
    })
    await this.client.send(command)
  }

  /**
   * Generate a presigned URL for downloading
   */
  async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    })
    return getSignedUrl(this.client, command, { expiresIn })
  }
}
