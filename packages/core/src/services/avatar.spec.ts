import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AvatarService } from './avatar.js'
import { R2Client } from '@nav/storage'

// Mock dependencies
const mockR2 = {
  upload: vi.fn()
} as unknown as R2Client

describe('AvatarService', () => {
  let avatarService: AvatarService

  beforeEach(() => {
    vi.clearAllMocks()
    avatarService = new AvatarService({
      storage: mockR2,
      publicUrlBase: 'https://cdn.example.com'
    })
  })

  it('should generate and upload avatar', async () => {
    const userId = 'user1'

    const result = await avatarService.generateAndUpload(userId)

    expect(mockR2.upload).toHaveBeenCalledWith(
      expect.stringContaining('avatars/avatar_'),
      expect.stringContaining('<svg'),
      'image/svg+xml'
    )
    expect(result).toContain('https://cdn.example.com/avatars/avatar_')
  })

  it('should throw error if publicUrlBase is missing', async () => {
    const serviceWithoutUrl = new AvatarService({
      storage: mockR2
    })

    await expect(serviceWithoutUrl.generateAndUpload('user1')).rejects.toThrow(
      'publicUrlBase configuration is missing'
    )
  })

  it('should throw error if upload fails', async () => {
    vi.spyOn(mockR2, 'upload').mockRejectedValue(new Error('Upload failed'))

    await expect(avatarService.generateAndUpload('user1')).rejects.toThrow(
      'Failed to generate avatar'
    )
  })
})
