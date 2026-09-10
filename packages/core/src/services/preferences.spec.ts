import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '@nav/database'
import { PreferencesService } from './preferences.js'

const mockDb = {
  first: vi.fn(),
  execute: vi.fn(),
  all: vi.fn(),
  batch: vi.fn()
} as unknown as DatabaseClient

describe('PreferencesService', () => {
  let service: PreferencesService

  beforeEach(() => {
    vi.resetAllMocks()
    service = new PreferencesService(mockDb)
  })

  it('returns neutral defaults for a user without a record', async () => {
    vi.mocked(mockDb.first).mockResolvedValueOnce(null)

    const result = await service.get('user-1')

    expect(result).toEqual({
      defaultHome: 'home',
      aiAnimationEnabled: true,
      initialized: false,
      updatedAt: 0
    })
  })

  it('normalizes stored values on read', async () => {
    vi.mocked(mockDb.first).mockResolvedValueOnce({
      user_id: 'user-1',
      default_home: 'invalid',
      ai_animation_enabled: 0,
      updated_at: 1234
    })

    const result = await service.get('user-1')

    expect(result).toEqual({
      defaultHome: 'home',
      aiAnimationEnabled: false,
      initialized: true,
      updatedAt: 1234
    })
  })

  it('creates preferences on first update and persists booleans as 0/1', async () => {
    vi.mocked(mockDb.first).mockResolvedValueOnce(null)

    const result = await service.update('user-1', { defaultHome: 'all', aiAnimationEnabled: false })

    expect(mockDb.execute).toHaveBeenCalledTimes(1)
    const [, params] = vi.mocked(mockDb.execute).mock.calls[0]
    expect(params).toEqual(['user-1', 'all', 0, expect.any(Number)])
    expect(result).toMatchObject({
      defaultHome: 'all',
      aiAnimationEnabled: false,
      initialized: true
    })
  })

  it('merges updates over the stored record and keeps untouched fields', async () => {
    vi.mocked(mockDb.first).mockResolvedValueOnce({
      user_id: 'user-1',
      default_home: 'all',
      ai_animation_enabled: 0,
      updated_at: 100
    })

    const result = await service.update('user-1', { aiAnimationEnabled: true })

    const [, params] = vi.mocked(mockDb.execute).mock.calls[0]
    expect(params).toEqual(['user-1', 'all', 1, expect.any(Number)])
    expect(result).toMatchObject({ defaultHome: 'all', aiAnimationEnabled: true })
  })

  it('ignores removed brand fields instead of persisting them', async () => {
    vi.mocked(mockDb.first).mockResolvedValueOnce(null)

    // 旧客户端仍可能提交品牌字段；schema 已剥离，这里验证服务层本身不落库。
    const legacyInput = { navTitle: '我的导航', navIcon: 'X', defaultHome: 'home' } as Record<
      string,
      unknown
    >
    await service.update('user-1', legacyInput)

    const [, params] = vi.mocked(mockDb.execute).mock.calls[0]
    expect(params).toEqual(['user-1', 'home', 1, expect.any(Number)])
  })
})
