import { beforeEach, describe, expect, it, vi } from 'vitest'
import { R2Client } from '@nav/storage'
import { AvatarService } from './avatar.js'

const mockR2 = {
  exists: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn((key: string) => `https://cdn.example.com/${key}`)
} as unknown as R2Client

describe('AvatarService', () => {
  let avatarService: AvatarService

  beforeEach(() => {
    vi.clearAllMocks()
    avatarService = new AvatarService({
      storage: mockR2
    })
  })

  it('returns a shared public URL for a valid avatar', () => {
    expect(avatarService.getAvatarUrl('adventurer-01')).toBe(
      'https://cdn.example.com/avatars/v3/avatar_adventurer-01.svg'
    )
    expect(mockR2.getPublicUrl).toHaveBeenCalledWith('avatars/v3/avatar_adventurer-01.svg')
  })

  it('rejects unknown avatar keys', () => {
    expect(() => avatarService.getAvatarUrl('unknown')).toThrow('Invalid avatar selection')
    expect(() => avatarService.getPreviewDataUrl('unknown')).toThrow('Invalid avatar selection')
  })

  it('returns an inline SVG preview without uploading', () => {
    const preview = avatarService.getPreviewDataUrl('adventurer-02')

    expect(preview).toMatch(/^data:image\/svg\+xml,/)
    expect(mockR2.upload).not.toHaveBeenCalled()
  })

  it('seeds only missing shared assets', async () => {
    vi.mocked(mockR2.exists).mockResolvedValueOnce('existing')
    vi.mocked(mockR2.exists).mockResolvedValue(null)

    await avatarService.ensureLibraryUploaded()

    expect(mockR2.exists).toHaveBeenCalledTimes(12)
    expect(mockR2.upload).toHaveBeenCalledTimes(11)
    expect(mockR2.upload).toHaveBeenCalledWith(
      expect.stringContaining('avatars/v3/avatar_'),
      expect.stringContaining('<svg'),
      'image/svg+xml'
    )
  })
})
