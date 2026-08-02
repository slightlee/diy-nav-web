import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '@nav/database'
import type { StorageClient } from '@nav/storage'
import type { BackupService } from './backup.js'
import { SyncService } from './sync.js'
import { cleanDataForHash, computeHash, mergeSyncData } from '@nav/utils'

const mockDb = {
  execute: vi.fn(),
  first: vi.fn(),
  all: vi.fn(),
  batch: vi.fn()
} as unknown as DatabaseClient

const mockStorage = {
  upload: vi.fn(),
  get: vi.fn(),
  delete: vi.fn()
} as unknown as StorageClient

const mockBackupService = {
  createBackup: vi.fn()
} as unknown as BackupService

const payload = {
  meta: {
    version: '1.0.0',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  data: {
    websites: [{ id: 'website-1', name: 'Example', url: 'https://example.com' }],
    categories: [],
    tags: []
  }
}

describe('SyncService', () => {
  let service: SyncService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SyncService({
      db: mockDb,
      storage: mockStorage,
      backupService: mockBackupService,
      syncRootDir: 'data-sync'
    })
  })

  it('migrates legacy sync pointer columns without dropping existing data', async () => {
    vi.spyOn(mockDb, 'all').mockResolvedValue([
      { name: 'user_id' },
      { name: 'enabled' },
      { name: 'data_hash' },
      { name: 'storage_key' },
      { name: 'updated_at' }
    ])
    vi.spyOn(mockDb, 'execute').mockResolvedValue({})

    await service.initTable()

    const statements = vi.mocked(mockDb.execute).mock.calls.map(([sql]) => sql)
    expect(statements).toContain('ALTER TABLE user_sync_state ADD COLUMN current_hash TEXT')
    expect(statements).toContain('ALTER TABLE user_sync_state ADD COLUMN current_storage_key TEXT')
    expect(statements).toContain(
      'UPDATE user_sync_state SET current_hash = COALESCE(current_hash, data_hash)'
    )
    expect(statements).toContain(
      'UPDATE user_sync_state SET current_storage_key = COALESCE(current_storage_key, storage_key)'
    )
  })

  it('returns a disabled empty state when the user has no sync record', async () => {
    vi.spyOn(mockDb, 'first').mockResolvedValue(null)

    await expect(service.getState('user-1')).resolves.toEqual({
      enabled: false,
      currentHash: null,
      updatedAt: null
    })
  })

  it('updates an existing sync switch without replacing its snapshot pointers', async () => {
    vi.spyOn(mockDb, 'execute').mockResolvedValue({ changes: 1 })
    vi.spyOn(mockDb, 'first').mockResolvedValue({
      user_id: 'user-1',
      enabled: 0,
      current_hash: 'remote-hash',
      current_storage_key: 'remote.json',
      updated_at: 1
    })

    await expect(service.setEnabled('user-1', false)).resolves.toMatchObject({
      enabled: false,
      currentHash: 'remote-hash'
    })

    expect(mockDb.execute).toHaveBeenCalledOnce()
    expect(mockDb.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE user_sync_state SET enabled = ?'),
      [0, expect.any(Number), 'user-1']
    )
  })

  it('creates a sync switch record using only schema-stable fields', async () => {
    vi.spyOn(mockDb, 'execute')
      .mockResolvedValueOnce({ changes: 0 })
      .mockResolvedValueOnce({ changes: 1 })
    vi.spyOn(mockDb, 'first').mockResolvedValue({
      user_id: 'user-1',
      enabled: 1,
      current_hash: null,
      current_storage_key: null,
      updated_at: 1
    })

    await expect(service.setEnabled('user-1', true)).resolves.toMatchObject({
      enabled: true,
      currentHash: null
    })

    expect(mockDb.execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO user_sync_state (user_id, enabled, updated_at)'),
      ['user-1', 1, expect.any(Number)]
    )
  })

  it('returns an operational conflict when the current snapshot object is unavailable', async () => {
    vi.spyOn(mockDb, 'first').mockResolvedValue({
      user_id: 'user-1',
      enabled: 1,
      current_hash: 'remote-hash',
      current_storage_key: 'missing.json',
      updated_at: 1
    })
    vi.spyOn(mockStorage, 'get').mockRejectedValue({ name: 'NoSuchKey' })

    await expect(service.getSnapshot('user-1')).rejects.toMatchObject({
      code: 'SYNC_SNAPSHOT_UNAVAILABLE',
      statusCode: 409
    })
  })

  it('repairs a missing snapshot only when local data matches the current hash', async () => {
    const currentHash = computeHash(cleanDataForHash(payload.data))
    vi.spyOn(mockDb, 'first').mockResolvedValue({
      user_id: 'user-1',
      enabled: 1,
      current_hash: currentHash,
      current_storage_key: 'missing.json',
      updated_at: 1
    })
    vi.spyOn(mockStorage, 'get').mockRejectedValue({ name: 'NoSuchKey' })
    vi.spyOn(mockDb, 'execute').mockResolvedValue({ changes: 1 })

    const result = await service.updateSnapshot('user-1', payload, currentHash)

    expect(mockStorage.upload).toHaveBeenCalledWith(
      `data-sync/user-1/snapshots/${currentHash}.json`,
      expect.any(String)
    )
    expect(mockBackupService.createBackup).not.toHaveBeenCalled()
    expect(result).toMatchObject({ enabled: true, currentHash })
  })

  it('replaces an unavailable snapshot with explicitly confirmed local data', async () => {
    vi.spyOn(mockDb, 'first').mockResolvedValue({
      user_id: 'user-1',
      enabled: 1,
      current_hash: 'missing-hash',
      current_storage_key: 'missing.json',
      updated_at: 123
    })
    vi.spyOn(mockStorage, 'get').mockRejectedValue({ name: 'NoSuchKey' })
    vi.spyOn(mockDb, 'execute').mockResolvedValue({ changes: 1 })

    const result = await service.recoverSnapshot('user-1', payload, 'missing-hash')

    expect(mockStorage.upload).toHaveBeenCalledOnce()
    expect(mockDb.execute).toHaveBeenCalledWith(
      expect.stringContaining('AND current_hash = ? AND updated_at = ?'),
      expect.arrayContaining(['user-1', 'missing-hash', 123])
    )
    expect(result.currentHash).not.toBe('missing-hash')
  })

  it('does not recover when the referenced cloud snapshot is readable again', async () => {
    vi.spyOn(mockDb, 'first').mockResolvedValue({
      user_id: 'user-1',
      enabled: 1,
      current_hash: 'remote-hash',
      current_storage_key: 'remote.json',
      updated_at: 123
    })
    vi.spyOn(mockStorage, 'get').mockResolvedValue(JSON.stringify(payload))

    await expect(service.recoverSnapshot('user-1', payload, 'remote-hash')).rejects.toMatchObject({
      code: 'SYNC_RECOVERY_NOT_REQUIRED',
      statusCode: 409
    })
    expect(mockStorage.upload).not.toHaveBeenCalled()
  })

  it('rejects a stale write instead of overwriting newer remote data', async () => {
    vi.spyOn(mockDb, 'first').mockResolvedValue({
      user_id: 'user-1',
      enabled: 1,
      current_hash: 'remote-newer',
      current_storage_key: 'snapshot.json',
      updated_at: 1
    })

    await expect(service.updateSnapshot('user-1', payload, 'stale-base')).rejects.toMatchObject({
      code: 'SYNC_CONFLICT',
      statusCode: 409
    })
    expect(mockStorage.upload).not.toHaveBeenCalled()
  })

  it('does not persist device-local website activity in a sync snapshot', async () => {
    vi.spyOn(mockDb, 'first').mockResolvedValue({
      user_id: 'user-1',
      enabled: 1,
      current_hash: null,
      current_storage_key: null,
      updated_at: 1
    })
    vi.spyOn(mockDb, 'execute').mockResolvedValue({ changes: 1 })

    await service.updateSnapshot(
      'user-1',
      {
        ...payload,
        data: {
          ...payload.data,
          websites: [
            {
              ...payload.data.websites[0],
              visitCount: 12,
              lastVisited: new Date('2026-03-01'),
              isOnline: false
            }
          ]
        }
      },
      null
    )

    const uploaded = JSON.parse(vi.mocked(mockStorage.upload).mock.calls[0][1])
    // Fixed wire schema: device-local fields are always present with defaults.
    expect(uploaded.data.websites[0]).toMatchObject({
      visitCount: 0,
      isOnline: true,
      lastVisited: null,
      description: '',
      favicon: ''
    })
  })

  it('backs up the previous cloud snapshot only on a significant shrink', async () => {
    const richPrevious = {
      ...payload,
      data: {
        ...payload.data,
        websites: Array.from({ length: 20 }, (_, index) => ({
          id: `website-${index + 1}`,
          name: `Site ${index + 1}`,
          url: `https://example.com/${index + 1}`
        }))
      }
    }
    // Drop more than 20% (20 → 1) so a safety archive is created.
    const smallerNext = payload

    vi.spyOn(mockDb, 'first').mockResolvedValue({
      user_id: 'user-1',
      enabled: 1,
      current_hash: 'old-hash',
      current_storage_key: 'old.json',
      updated_at: 1
    })
    vi.spyOn(mockStorage, 'get').mockResolvedValue(JSON.stringify(richPrevious))
    vi.spyOn(mockDb, 'execute').mockResolvedValue({ changes: 1 })

    const result = await service.updateSnapshot('user-1', smallerNext, 'old-hash')

    expect(mockBackupService.createBackup).toHaveBeenCalledWith('user-1', richPrevious, 'AUTO')
    expect(mockStorage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^data-sync\/user-1\/snapshots\/.+\.json$/),
      expect.any(String)
    )
    expect(result.currentHash).not.toBe('old-hash')
  })

  it('does not archive previous cloud data when only a few websites were deleted', async () => {
    // 20 → 19 is a normal single delete: should not create a safety AUTO backup.
    const previous = {
      ...payload,
      data: {
        ...payload.data,
        websites: Array.from({ length: 20 }, (_, index) => ({
          id: `website-${index + 1}`,
          name: `Site ${index + 1}`,
          url: `https://example.com/${index + 1}`
        }))
      }
    }
    const next = {
      ...payload,
      data: {
        ...payload.data,
        websites: previous.data.websites.slice(0, 19)
      }
    }

    vi.spyOn(mockDb, 'first').mockResolvedValue({
      user_id: 'user-1',
      enabled: 1,
      current_hash: 'old-hash',
      current_storage_key: 'old.json',
      updated_at: 1
    })
    vi.spyOn(mockStorage, 'get').mockResolvedValue(JSON.stringify(previous))
    vi.spyOn(mockDb, 'execute').mockResolvedValue({ changes: 1 })

    await service.updateSnapshot('user-1', next, 'old-hash')

    expect(mockBackupService.createBackup).not.toHaveBeenCalled()
  })

  it('does not archive previous cloud data when the new snapshot is not smaller', async () => {
    vi.spyOn(mockDb, 'first').mockResolvedValue({
      user_id: 'user-1',
      enabled: 1,
      current_hash: 'old-hash',
      current_storage_key: 'old.json',
      updated_at: 1
    })
    vi.spyOn(mockStorage, 'get').mockResolvedValue(JSON.stringify(payload))
    vi.spyOn(mockDb, 'execute').mockResolvedValue({ changes: 1 })

    const richer = {
      ...payload,
      data: {
        ...payload.data,
        websites: [
          payload.data.websites[0],
          { id: 'website-2', name: 'Added', url: 'https://added.example.com' }
        ]
      }
    }

    await service.updateSnapshot('user-1', richer, 'old-hash')

    expect(mockBackupService.createBackup).not.toHaveBeenCalled()
    expect(mockStorage.upload).toHaveBeenCalledOnce()
  })

  it('rejects the pointer update when another device wins the concurrent write', async () => {
    vi.spyOn(mockDb, 'first').mockResolvedValue({
      user_id: 'user-1',
      enabled: 1,
      current_hash: 'remote-newer',
      current_storage_key: 'remote.json',
      updated_at: 1
    })
    vi.spyOn(mockStorage, 'get').mockResolvedValue(JSON.stringify(payload))
    vi.spyOn(mockDb, 'execute').mockResolvedValue({ changes: 0 })

    await expect(service.updateSnapshot('user-1', payload, 'remote-newer')).rejects.toMatchObject({
      code: 'SYNC_CONFLICT',
      statusCode: 409
    })
    // Same-size overwrite is not archived; write still fails on CAS.
    expect(mockBackupService.createBackup).not.toHaveBeenCalled()
  })
})

describe('mergeSyncData', () => {
  it('uses the richer remote data as the ID base and remaps smaller local relations', () => {
    const result = mergeSyncData(
      {
        categories: [
          { id: 'local-category', name: '开发', order: 0, updatedAt: new Date('2026-01-01') }
        ],
        tags: [{ id: 'local-tag', name: '常用', order: 0, updatedAt: new Date('2026-01-01') }],
        websites: [
          {
            id: 'local-site',
            name: 'Local name',
            url: 'https://example.com/',
            categoryId: 'local-category',
            tagIds: ['local-tag'],
            updatedAt: new Date('2026-01-01'),
            visitCount: 2
          }
        ]
      },
      {
        categories: [
          {
            id: 'remote-category',
            name: '开发',
            description: 'Remote newer',
            order: 0,
            updatedAt: new Date('2026-02-01')
          }
        ],
        tags: [{ id: 'remote-tag', name: '常用', order: 0, updatedAt: new Date('2026-02-01') }],
        websites: [
          {
            id: 'remote-site',
            name: 'Remote newer name',
            url: 'https://example.com',
            categoryId: 'remote-category',
            tagIds: ['remote-tag'],
            updatedAt: new Date('2026-02-01'),
            visitCount: 5
          },
          {
            id: 'remote-only',
            name: 'Remote only',
            url: 'https://remote.example.com',
            categoryId: 'remote-category',
            tagIds: [],
            updatedAt: new Date('2026-02-01')
          }
        ]
      }
    )

    expect(result.categories).toHaveLength(1)
    expect(result.categories[0]).toMatchObject({
      id: 'remote-category',
      description: 'Remote newer'
    })
    expect(result.tags).toHaveLength(1)
    // Different website ids are always kept, even when URLs match after normalize.
    expect(result.websites).toHaveLength(3)
    expect(result.websites.map(website => website.id).sort()).toEqual(
      ['local-site', 'remote-only', 'remote-site'].sort()
    )
    expect(result.websites.find(website => website.id === 'remote-site')).toMatchObject({
      name: 'Remote newer name',
      categoryId: 'remote-category',
      tagIds: ['remote-tag'],
      // Sync wire format always zeros device-local visit stats
      visitCount: 0,
      description: '',
      favicon: ''
    })
    expect(result.websites.find(website => website.id === 'local-site')).toMatchObject({
      categoryId: 'remote-category',
      tagIds: ['remote-tag']
    })
  })

  it('keeps richer local IDs and unions tags from duplicate websites', () => {
    const result = mergeSyncData(
      {
        categories: [{ id: 'local-category', name: '开发', order: 0 }],
        tags: [
          { id: 'local-common', name: '常用', order: 0 },
          { id: 'local-only-tag', name: '本地标签', order: 1 }
        ],
        websites: [
          {
            id: 'local-site',
            name: 'Example',
            url: 'https://example.com',
            categoryId: 'local-category',
            tagIds: ['local-common', 'local-only-tag']
          },
          {
            id: 'local-only-site',
            name: 'Local only',
            url: 'https://local.example.com',
            categoryId: 'local-category',
            tagIds: []
          }
        ]
      },
      {
        categories: [{ id: 'remote-category', name: '开发', order: 0 }],
        tags: [
          { id: 'remote-common', name: '常用', order: 0 },
          { id: 'remote-only-tag', name: '云端标签', order: 1 }
        ],
        websites: [
          {
            id: 'remote-site',
            name: 'Example',
            url: 'https://example.com/',
            categoryId: 'remote-category',
            tagIds: ['remote-common', 'remote-only-tag']
          }
        ]
      }
    )

    expect(result.categories).toEqual([expect.objectContaining({ id: 'local-category' })])
    expect(result.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'local-common' }),
        expect.objectContaining({ id: 'local-only-tag' }),
        expect.objectContaining({ id: 'remote-only-tag' })
      ])
    )
    // Same URL + different ids → both kept; tags stay on each record (no URL collapse).
    expect(result.websites).toHaveLength(3)
    expect(result.websites.map(website => website.id).sort()).toEqual(
      ['local-only-site', 'local-site', 'remote-site'].sort()
    )
    expect(result.websites.find(website => website.id === 'local-site')).toMatchObject({
      categoryId: 'local-category'
    })
    expect(result.websites.find(website => website.id === 'local-site')?.tagIds).toEqual(
      expect.arrayContaining(['local-common', 'local-only-tag'])
    )
  })

  it('keeps the category ID with more actual website references', () => {
    const result = mergeSyncData(
      {
        categories: [{ id: 'local-shared', name: '共享分类', order: 0 }],
        tags: [],
        websites: [
          {
            id: 'local-1',
            name: 'Local 1',
            url: 'https://local-1.example.com',
            categoryId: 'local-shared',
            tagIds: []
          },
          {
            id: 'local-2',
            name: 'Local 2',
            url: 'https://local-2.example.com',
            categoryId: 'local-shared',
            tagIds: []
          }
        ]
      },
      {
        categories: [
          { id: 'remote-shared', name: '共享分类', order: 0 },
          { id: 'remote-other', name: '其他分类', order: 1 }
        ],
        tags: [],
        websites: [
          {
            id: 'remote-1',
            name: 'Remote 1',
            url: 'https://remote-1.example.com',
            categoryId: 'remote-shared',
            tagIds: []
          },
          {
            id: 'remote-2',
            name: 'Remote 2',
            url: 'https://remote-2.example.com',
            categoryId: 'remote-other',
            tagIds: []
          },
          {
            id: 'remote-3',
            name: 'Remote 3',
            url: 'https://remote-3.example.com',
            categoryId: 'remote-other',
            tagIds: []
          }
        ]
      }
    )

    expect(result.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'local-shared', name: '共享分类' }),
        expect.objectContaining({ id: 'remote-other', name: '其他分类' })
      ])
    )
    expect(result.websites.filter(website => website.categoryId === 'local-shared')).toHaveLength(3)
  })

  it('normalizes duplicate favorite ordering after merging unique websites', () => {
    const result = mergeSyncData(
      {
        categories: [],
        tags: [],
        websites: [
          {
            id: 'local-favorite',
            name: 'Local favorite',
            url: 'https://local.example.com',
            categoryId: '',
            tagIds: [],
            isFavorite: true,
            favoriteOrder: 0,
            order: 0
          }
        ]
      },
      {
        categories: [],
        tags: [],
        websites: [
          {
            id: 'remote-favorite',
            name: 'Remote favorite',
            url: 'https://remote.example.com',
            categoryId: '',
            tagIds: [],
            isFavorite: true,
            favoriteOrder: 0,
            order: 0
          }
        ]
      }
    )

    expect(
      result.websites
        .filter(website => website.isFavorite)
        .map(website => website.favoriteOrder)
        .sort()
    ).toEqual([0, 1])
  })

  it('keeps all unique remote websites when merging a smaller local snapshot', () => {
    // Incognito: 1 new category + 1 site; cloud category already has 2 sites → must become 3.
    const result = mergeSyncData(
      {
        categories: [
          { id: 'local-cat', name: '新分类', order: 0, updatedAt: new Date('2026-07-20') }
        ],
        tags: [],
        websites: [
          {
            id: 'local-only',
            name: '本地新建',
            url: 'https://local-new.example.com',
            categoryId: 'local-cat',
            tagIds: [],
            order: 0,
            updatedAt: new Date('2026-07-20')
          }
        ]
      },
      {
        categories: [
          { id: 'remote-cat', name: '云端分类', order: 0, updatedAt: new Date('2026-01-01') }
        ],
        tags: [],
        websites: [
          {
            id: 'remote-1',
            name: '云1',
            url: 'https://a.example.com',
            categoryId: 'remote-cat',
            tagIds: [],
            order: 0,
            updatedAt: new Date('2026-01-01')
          },
          {
            id: 'remote-2',
            name: '云2',
            url: 'https://b.example.com',
            categoryId: 'remote-cat',
            tagIds: [],
            order: 1,
            updatedAt: new Date('2026-01-01')
          }
        ]
      }
    )

    expect(result.categories).toHaveLength(2)
    expect(result.websites).toHaveLength(3)
    expect(result.websites.map(website => website.id).sort()).toEqual(
      ['local-only', 'remote-1', 'remote-2'].sort()
    )
    expect(result.websites.filter(website => website.categoryId === 'remote-cat')).toHaveLength(2)
    expect(result.websites.filter(website => website.categoryId === 'local-cat')).toHaveLength(1)
  })

  it('keeps the same URL in different categories instead of collapsing them', () => {
    const result = mergeSyncData(
      {
        categories: [{ id: 'local-cat', name: '学习', order: 0 }],
        tags: [],
        websites: [
          {
            id: 'local-site',
            name: 'Docs local',
            url: 'https://docs.example.com',
            categoryId: 'local-cat',
            tagIds: [],
            updatedAt: new Date('2026-07-20')
          }
        ]
      },
      {
        categories: [{ id: 'remote-cat', name: '工作', order: 0 }],
        tags: [],
        websites: [
          {
            id: 'remote-site',
            name: 'Docs remote',
            url: 'https://docs.example.com/',
            categoryId: 'remote-cat',
            tagIds: [],
            updatedAt: new Date('2026-01-01')
          },
          {
            id: 'remote-other',
            name: 'Other',
            url: 'https://other.example.com',
            categoryId: 'remote-cat',
            tagIds: [],
            updatedAt: new Date('2026-01-01')
          }
        ]
      }
    )

    expect(result.websites).toHaveLength(3)
    expect(result.websites.map(website => website.id).sort()).toEqual(
      ['local-site', 'remote-other', 'remote-site'].sort()
    )
    expect(
      result.websites.filter(website => (website.url || '').includes('docs.example.com'))
    ).toHaveLength(2)
  })

  it('keeps all sites when local and remote share the same category name 梯子', () => {
    const result = mergeSyncData(
      {
        categories: [
          { id: 'local-cat', name: '梯子', order: 0, updatedAt: new Date('2026-07-22') }
        ],
        tags: [],
        websites: [
          {
            id: 'local-baidu',
            name: '百度',
            url: 'https://www.baidu.com',
            categoryId: 'local-cat',
            tagIds: [],
            updatedAt: new Date('2026-07-22')
          }
        ]
      },
      {
        categories: [
          { id: 'remote-cat', name: '梯子', order: 0, updatedAt: new Date('2026-01-01') }
        ],
        tags: [],
        websites: [
          {
            id: 'remote-feng',
            name: '风佬订阅',
            url: 'https://feng.example.com',
            categoryId: 'remote-cat',
            tagIds: [],
            updatedAt: new Date('2026-01-01')
          },
          {
            id: 'remote-xiao',
            name: '风萧萧公益机场',
            url: 'https://xiao.example.com',
            categoryId: 'remote-cat',
            tagIds: [],
            updatedAt: new Date('2026-01-01')
          }
        ]
      }
    )

    expect(result.categories).toHaveLength(1)
    expect(result.categories[0]?.name).toBe('梯子')
    expect(result.websites).toHaveLength(3)
    expect(result.websites.map(website => website.name).sort()).toEqual(
      ['百度', '风佬订阅', '风萧萧公益机场'].sort()
    )
    // All websites should sit under the single merged category.
    const categoryId = result.categories[0]?.id
    expect(result.websites.every(website => website.categoryId === categoryId)).toBe(true)
  })

  it('preserves cloud category order when merging a same-named local category at order 0', () => {
    // Incognito creates「梯子」as the only local category (order 0). Cloud already has it
    // mid-list — merge must not yank it to the top.
    const result = mergeSyncData(
      {
        categories: [
          { id: 'local-cat', name: '梯子', order: 0, updatedAt: new Date('2026-07-22') }
        ],
        tags: [],
        websites: [
          {
            id: 'local-baidu',
            name: '百度',
            url: 'https://www.baidu.com',
            categoryId: 'local-cat',
            tagIds: []
          }
        ]
      },
      {
        categories: [
          { id: 'c-work', name: '工作', order: 0, updatedAt: new Date('2026-01-01') },
          { id: 'c-life', name: '生活', order: 1, updatedAt: new Date('2026-01-01') },
          { id: 'c-proxy', name: '梯子', order: 2, updatedAt: new Date('2026-01-01') },
          { id: 'c-tools', name: '工具', order: 3, updatedAt: new Date('2026-01-01') }
        ],
        tags: [],
        websites: [
          {
            id: 'remote-feng',
            name: '风佬订阅',
            url: 'https://feng.example.com',
            categoryId: 'c-proxy',
            tagIds: []
          }
        ]
      }
    )

    expect(result.categories.map(category => category.name)).toEqual([
      '工作',
      '生活',
      '梯子',
      '工具'
    ])
    expect(result.categories.find(category => category.name === '梯子')?.order).toBe(2)
  })

  it('keeps both bookmarks when two sides reuse the same id for different URLs', () => {
    const result = mergeSyncData(
      {
        categories: [{ id: 'local-cat', name: '梯子', order: 0 }],
        tags: [],
        websites: [
          {
            id: 'shared-id',
            name: '百度',
            url: 'https://www.baidu.com',
            categoryId: 'local-cat',
            tagIds: [],
            updatedAt: new Date('2026-07-22')
          }
        ]
      },
      {
        categories: [{ id: 'remote-cat', name: '梯子', order: 0 }],
        tags: [],
        websites: [
          {
            id: 'remote-feng',
            name: '风佬订阅',
            url: 'https://feng.example.com',
            categoryId: 'remote-cat',
            tagIds: [],
            updatedAt: new Date('2026-01-01')
          },
          {
            id: 'shared-id',
            name: '风萧萧公益机场',
            url: 'https://xiao.example.com',
            categoryId: 'remote-cat',
            tagIds: [],
            updatedAt: new Date('2026-01-01')
          }
        ]
      }
    )

    expect(result.websites).toHaveLength(3)
    expect(result.websites.map(website => website.name).sort()).toEqual(
      ['百度', '风佬订阅', '风萧萧公益机场'].sort()
    )
  })
})
