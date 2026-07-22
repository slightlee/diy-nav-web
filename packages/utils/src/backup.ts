import { Website, BackupData, SyncData, Category, Tag } from '@nav/types'
import { normalizeSyncData } from './sync.js'

/**
 * Supported input types for backup data cleaning
 */
type BackupInput =
  | BackupData
  | SyncData
  | Partial<Website>[]
  | { websites: Partial<Website>[] }
  | null
  | undefined

/**
 * Clean data for semantic hashing / backup content hash.
 * For structured backup/sync data, uses {@link normalizeSyncData} so every field
 * is always present (empty string / 0 / false / [] / null) — never omitted.
 */
export function cleanDataForHash(data: BackupInput): BackupInput {
  if (!data) return data

  if (Array.isArray(data)) {
    // Legacy: website list only — still force a fixed subset of fields
    return data.map(w => ({
      id: w.id ?? '',
      name: (w.name ?? '').trim(),
      url: (w.url ?? '').trim(),
      description: (w.description ?? '').trim(),
      categoryId: w.categoryId ?? '',
      tagIds: [...(w.tagIds || [])].map(String).sort(),
      favicon: (w.favicon ?? '').trim(),
      order: typeof w.order === 'number' ? w.order : 0,
      isFavorite: !!w.isFavorite,
      favoriteOrder: w.isFavorite && typeof w.favoriteOrder === 'number' ? w.favoriteOrder : null,
      visitCount: 0,
      lastVisited: undefined,
      isOnline: true
    })) as Partial<Website>[]
  }

  if (isBackupData(data)) {
    const normalized = normalizeSyncData(data)
    return {
      websites: normalized.websites as unknown as Partial<Website>[],
      categories: normalized.categories as unknown as Partial<Category>[],
      tags: normalized.tags as unknown as Partial<Tag>[],
      ...(data.settings ? { settings: data.settings } : {})
    }
  }

  if ('websites' in data && Array.isArray(data.websites)) {
    return {
      ...data,
      websites: cleanDataForHash(data.websites) as Partial<Website>[]
    }
  }

  return data
}

function isBackupData(data: unknown): data is BackupData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'websites' in data &&
    Array.isArray((data as BackupData).websites)
  )
}
