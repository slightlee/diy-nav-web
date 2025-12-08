import { createAvatar } from '@dicebear/avatars'
import * as avataaars from '@dicebear/avatars-avataaars-sprites'
import { R2Client } from '@nav/storage'

export interface AvatarConfig {
  r2: R2Client
  publicUrlBase?: string // Optional custom base URL for assets (e.g. https://cdn.example.com)
}

export class AvatarService {
  private r2: R2Client
  private publicUrlBase?: string

  constructor(config: AvatarConfig) {
    this.r2 = config.r2
    this.publicUrlBase = config.publicUrlBase
  }

  /**
   * Generate a random avatar for the user and upload it to storage.
   * @param userId - Unique identifier for the user (used as seed)
   * @returns The public URL of the uploaded avatar
   * @throws Error if upload fails
   */
  async generateAndUpload(userId: string): Promise<string> {
    try {
      // Use userId base64 prefix as seed for deterministic avatar generation
      const seed = Buffer.from(userId).toString('base64').slice(0, 12)
      const svg = createAvatar(avataaars, { seed, size: 128 })

      const filename = `avatar_${seed}.svg`
      const key = `avatars/${filename}`

      // Upload directly from memory (no local FS write needed)
      await this.r2.upload(key, svg, 'image/svg+xml')

      // Construct public URL
      if (this.publicUrlBase) {
        const baseUrl = this.publicUrlBase.endsWith('/')
          ? this.publicUrlBase.slice(0, -1)
          : this.publicUrlBase
        return `${baseUrl}/${key}`
      }

      throw new Error('AvatarService: publicUrlBase configuration is missing')
    } catch (error) {
      // Wrap error to provide context, don't swallow it
      throw new Error(`Failed to generate avatar for user ${userId}: ${(error as Error).message}`)
    }
  }
}
