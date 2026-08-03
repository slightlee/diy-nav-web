import { createAvatar } from '@dicebear/core'
import * as adventurerNeutral from '@dicebear/adventurer-neutral'
import type { StorageClient } from '@nav/storage'

export interface AvatarConfig {
  storage: StorageClient
  pathPrefix?: string // Storage path prefix (default: 'avatars')
}

export const AVATAR_LIBRARY = [
  { key: 'adventurer-01', label: '晨曦' },
  { key: 'adventurer-02', label: '海风' },
  { key: 'adventurer-03', label: '森林' },
  { key: 'adventurer-04', label: '暖阳' },
  { key: 'adventurer-05', label: '星夜' },
  { key: 'adventurer-06', label: '薄荷' },
  { key: 'adventurer-07', label: '云朵' },
  { key: 'adventurer-08', label: '琥珀' },
  { key: 'adventurer-09', label: '青柠' },
  { key: 'adventurer-10', label: '珊瑚' },
  { key: 'adventurer-11', label: '紫藤' },
  { key: 'adventurer-12', label: '麦穗' }
] as const

const AVATAR_ASSET_VERSION = 'v3'

export type AvatarKey = (typeof AVATAR_LIBRARY)[number]['key']

export const getRandomAvatarKey = (): AvatarKey => {
  const index = Math.floor(Math.random() * AVATAR_LIBRARY.length)
  return AVATAR_LIBRARY[index].key
}

const isAvatarKey = (value: string): value is AvatarKey =>
  AVATAR_LIBRARY.some(option => option.key === value)

export class AvatarService {
  private storage: StorageClient
  private pathPrefix: string

  constructor(config: AvatarConfig) {
    this.storage = config.storage
    this.pathPrefix = config.pathPrefix ?? 'avatars'
  }

  async ensureLibraryUploaded(): Promise<void> {
    // This method is only called by the one-time seed script, never by user-facing flows.
    await Promise.all(
      AVATAR_LIBRARY.map(async option => {
        const key = this.getAssetKey(option.key)
        const existing = await this.storage.exists(key)
        if (!existing) {
          await this.storage.upload(key, this.createSvg(option.key), 'image/svg+xml')
        }
      })
    )
  }

  getAvatarUrl(avatarKey: string): string {
    if (!isAvatarKey(avatarKey)) throw new Error('Invalid avatar selection')
    return this.storage.getPublicUrl(this.getAssetKey(avatarKey))
  }

  isValidKey(value: string): value is AvatarKey {
    return isAvatarKey(value)
  }

  getPreviewDataUrl(avatarKey: string): string {
    if (!isAvatarKey(avatarKey)) throw new Error('Invalid avatar selection')
    return `data:image/svg+xml,${encodeURIComponent(this.createSvg(avatarKey))}`
  }

  private createSvg(seed: AvatarKey): string {
    return createAvatar(adventurerNeutral, { seed, size: 128 }).toString()
  }

  private getAssetKey(avatarKey: AvatarKey): string {
    return `${this.pathPrefix}/${AVATAR_ASSET_VERSION}/avatar_${avatarKey}.svg`
  }
}
