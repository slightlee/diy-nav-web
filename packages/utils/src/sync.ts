import type { Category, SyncData, Tag, Website } from '@nav/types'

type SyncEntity = Partial<Category> | Partial<Tag> | Partial<Website>

const normalizeName = (value?: string) => value?.trim().toLowerCase() || ''

const normalizeUrl = (value?: string) => {
  const raw = value?.trim()
  if (!raw) return ''

  try {
    const url = new URL(raw)
    url.hash = ''
    url.hostname = url.hostname.toLowerCase()
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
    return url.toString()
  } catch {
    return raw.toLowerCase().replace(/\/+$/, '')
  }
}

const timestamp = (value: unknown) => {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime()
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

const newerEntity = <T extends SyncEntity>(current: T, incoming: T): T =>
  timestamp(incoming.updatedAt) > timestamp(current.updatedAt) ? incoming : current

const newMergeId = () =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`

const str = (value: unknown) => (value == null ? '' : String(value).trim())
const num = (value: unknown, fallback = 0) =>
  typeof value === 'number' && !Number.isNaN(value) ? value : fallback

/**
 * Canonical wire shape for one website in cross-device sync.
 * Every field is always present — never "missing key" vs empty string.
 */
export type NormalizedSyncWebsite = {
  id: string
  name: string
  url: string
  description: string
  categoryId: string
  tagIds: string[]
  favicon: string
  order: number
  isFavorite: boolean
  /** null when not favorite — always present as null, never omitted */
  favoriteOrder: number | null
  visitCount: number
  lastVisited: null
  isOnline: boolean
}

export type NormalizedSyncCategory = {
  id: string
  name: string
  description: string
  icon: string
  order: number
}

export type NormalizedSyncTag = {
  id: string
  name: string
  color: string
  order: number
}

export type NormalizedSyncData = {
  websites: NormalizedSyncWebsite[]
  categories: NormalizedSyncCategory[]
  tags: NormalizedSyncTag[]
}

const normalizeWebsite = (website: Partial<Website>): NormalizedSyncWebsite => {
  const isFavorite = !!website.isFavorite
  return {
    id: str(website.id),
    name: str(website.name),
    url: str(website.url),
    description: str(website.description),
    categoryId: str(website.categoryId),
    tagIds: [...(website.tagIds || [])]
      .map(id => str(id))
      .filter(Boolean)
      .sort(),
    favicon: str(website.favicon),
    order: num(website.order, 0),
    isFavorite,
    favoriteOrder:
      isFavorite && typeof website.favoriteOrder === 'number' ? website.favoriteOrder : null,
    // Device-local — fixed on the wire so they never fork hashes
    visitCount: 0,
    lastVisited: null,
    isOnline: true
  }
}

const normalizeCategory = (category: Partial<Category>): NormalizedSyncCategory => ({
  id: str(category.id),
  name: str(category.name),
  description: str(category.description),
  icon: str(category.icon),
  order: num(category.order, 0)
})

const normalizeTag = (tag: Partial<Tag>): NormalizedSyncTag => ({
  id: str(tag.id),
  name: str(tag.name),
  color: str(tag.color),
  order: num(tag.order, 0)
})

/**
 * Normalize sync payload to a **complete, fixed schema**.
 * Missing fields become empty string / false / 0 / [] / null — never omitted.
 * Use this both when **writing to cloud** and when **hashing**, so local Pinia
 * defaults and sparse cloud JSON always produce the same structure.
 */
export function normalizeSyncData(
  data:
    | SyncData
    | { websites?: Partial<Website>[]; categories?: Partial<Category>[]; tags?: Partial<Tag>[] }
    | null
    | undefined
): NormalizedSyncData {
  return {
    websites: (data?.websites || []).map(normalizeWebsite),
    categories: (data?.categories || []).map(normalizeCategory),
    tags: (data?.tags || []).map(normalizeTag)
  }
}

/**
 * Persistable sync snapshot (same as normalize; kept for call-site clarity).
 */
export function sanitizeSyncData(data: SyncData): SyncData {
  return normalizeSyncData(data) as unknown as SyncData
}

const sortById = <T extends { id: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.id.localeCompare(b.id))

/**
 * Hash input: full fixed schema + stable entity order (by id).
 */
export function canonicalizeSyncDataForHash(
  data:
    | SyncData
    | { websites?: Partial<Website>[]; categories?: Partial<Category>[]; tags?: Partial<Tag>[] }
    | null
    | undefined
): NormalizedSyncData {
  const normalized = normalizeSyncData(data)
  return {
    websites: sortById(normalized.websites),
    categories: sortById(normalized.categories),
    tags: sortById(normalized.tags)
  }
}

// --- merge (works on partial entities, returns normalized SyncData) ---

const mergeNamedEntities = <T extends Partial<Category> | Partial<Tag>>(
  local: T[],
  remote: T[],
  referenceCounts: Map<string, number>
) => {
  const merged: T[] = []
  const indexById = new Map<string, number>()
  const indexByName = new Map<string, number>()
  const idAliases = new Map<string, string>()

  for (const item of [...local, ...remote]) {
    const id = item.id || ''
    const nameKey = normalizeName(item.name)
    const existingIndex =
      (id ? indexById.get(id) : undefined) ?? (nameKey ? indexByName.get(nameKey) : undefined)

    if (existingIndex === undefined) {
      const nextIndex = merged.length
      merged.push({ ...item })
      if (id) {
        indexById.set(id, nextIndex)
        idAliases.set(id, id)
      }
      if (nameKey) indexByName.set(nameKey, nextIndex)
      continue
    }

    const existing = merged[existingIndex]
    const existingId = existing.id || ''
    const canonicalId =
      existingId && id && (referenceCounts.get(id) || 0) > (referenceCounts.get(existingId) || 0)
        ? id
        : existingId || id
    const winner = newerEntity(existing, item)
    merged[existingIndex] = {
      ...winner,
      id: canonicalId,
      order: existing.order ?? winner.order
    }

    if (existingId && canonicalId && existingId !== canonicalId) {
      for (const [alias, target] of idAliases) {
        if (target === existingId) idAliases.set(alias, canonicalId)
      }
    }
    if (id && canonicalId) {
      indexById.set(id, existingIndex)
      idAliases.set(id, canonicalId)
    }
    if (existingId && canonicalId) idAliases.set(existingId, canonicalId)
    if (canonicalId) indexById.set(canonicalId, existingIndex)
    if (nameKey) indexByName.set(nameKey, existingIndex)
  }

  const ordered = merged
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    .map((item, order) => ({ ...item, order })) as T[]

  return { items: ordered, idAliases }
}

const mergeWebsites = (
  primary: Partial<Website>[],
  secondary: Partial<Website>[],
  categoryAliases: Map<string, string>,
  tagAliases: Map<string, string>,
  validCategoryIds: Set<string>,
  validTagIds: Set<string>
) => {
  const merged: Partial<Website>[] = []
  const indexById = new Map<string, number>()
  const usedIds = new Set<string>()

  const normalizeRelations = (website: Partial<Website>) => {
    const categoryId = website.categoryId
      ? categoryAliases.get(website.categoryId) || website.categoryId
      : ''
    const tagIds = [...new Set(website.tagIds || [])]
      .map(tagId => tagAliases.get(tagId) || tagId)
      .filter(tagId => validTagIds.has(tagId))

    return {
      ...website,
      categoryId: validCategoryIds.has(categoryId) ? categoryId : '',
      tagIds
    }
  }

  const allocateId = (preferred?: string) => {
    let id = preferred?.trim() || ''
    if (!id || usedIds.has(id)) {
      do {
        id = newMergeId()
      } while (usedIds.has(id))
    }
    usedIds.add(id)
    return id
  }

  const mergeFields = (existing: Partial<Website>, incoming: Partial<Website>) => {
    const winner = newerEntity(existing, incoming)
    const latestVisit =
      timestamp(incoming.lastVisited) > timestamp(existing.lastVisited)
        ? incoming.lastVisited
        : existing.lastVisited
    const tagIds = [...new Set([...(existing.tagIds || []), ...(incoming.tagIds || [])])].filter(
      tagId => validTagIds.has(tagId)
    )

    return {
      ...winner,
      id: existing.id || incoming.id,
      categoryId: winner.categoryId || existing.categoryId || '',
      order: existing.order ?? winner.order,
      favoriteOrder: existing.favoriteOrder ?? winner.favoriteOrder,
      tagIds,
      visitCount: Math.max(existing.visitCount || 0, incoming.visitCount || 0),
      lastVisited: latestVisit
    }
  }

  for (const rawItem of [...primary, ...secondary]) {
    const item = normalizeRelations(rawItem)
    const rawId = item.id?.trim() || ''
    const existingIndex = rawId ? indexById.get(rawId) : undefined

    if (existingIndex === undefined) {
      const id = allocateId(rawId || undefined)
      const nextIndex = merged.length
      merged.push({ ...item, id })
      indexById.set(id, nextIndex)
      continue
    }

    const existing = merged[existingIndex]
    const existingUrl = normalizeUrl(existing.url)
    const incomingUrl = normalizeUrl(item.url)
    const sameBookmark =
      !existingUrl || !incomingUrl || existingUrl === incomingUrl || !existing.url || !item.url

    if (sameBookmark) {
      merged[existingIndex] = mergeFields(existing, item)
      continue
    }

    const id = allocateId()
    const nextIndex = merged.length
    merged.push({ ...item, id })
    indexById.set(id, nextIndex)
  }

  const ordered = merged
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    .map((item, order) => ({ ...item, order }))
  const favoriteOrder = new Map(
    ordered
      .filter(website => website.isFavorite)
      .sort(
        (a, b) =>
          (a.favoriteOrder ?? a.order ?? Number.MAX_SAFE_INTEGER) -
          (b.favoriteOrder ?? b.order ?? Number.MAX_SAFE_INTEGER)
      )
      .map((website, index) => [website.id, index])
  )

  return ordered.map(website => ({
    ...website,
    favoriteOrder: website.isFavorite ? favoriteOrder.get(website.id) : undefined
  }))
}

/**
 * Non-destructive two-way merge used when no reliable per-field common ancestor exists.
 */
export function mergeSyncData(local: SyncData, remote: SyncData): SyncData {
  const localVolume = [
    local.websites?.length || 0,
    (local.categories?.length || 0) + (local.tags?.length || 0)
  ]
  const remoteVolume = [
    remote.websites?.length || 0,
    (remote.categories?.length || 0) + (remote.tags?.length || 0)
  ]
  const localIsRicher =
    localVolume[0] > remoteVolume[0] ||
    (localVolume[0] === remoteVolume[0] && localVolume[1] > remoteVolume[1])
  const [base, secondary] = localIsRicher ? [local, remote] : [remote, local]
  const categoryReferences = new Map<string, number>()
  const tagReferences = new Map<string, number>()

  for (const website of [...(local.websites || []), ...(remote.websites || [])]) {
    if (website.categoryId) {
      categoryReferences.set(
        website.categoryId,
        (categoryReferences.get(website.categoryId) || 0) + 1
      )
    }
    for (const tagId of new Set(website.tagIds || [])) {
      tagReferences.set(tagId, (tagReferences.get(tagId) || 0) + 1)
    }
  }

  const categories = mergeNamedEntities(
    base.categories || [],
    secondary.categories || [],
    categoryReferences
  )
  const tags = mergeNamedEntities(base.tags || [], secondary.tags || [], tagReferences)
  const validCategoryIds = new Set(categories.items.flatMap(item => (item.id ? [item.id] : [])))
  const validTagIds = new Set(tags.items.flatMap(item => (item.id ? [item.id] : [])))

  const websites = mergeWebsites(
    base.websites || [],
    secondary.websites || [],
    categories.idAliases,
    tags.idAliases,
    validCategoryIds,
    validTagIds
  )

  const localCount = local.websites?.length || 0
  const remoteCount = remote.websites?.length || 0
  if (websites.length < localCount || websites.length < remoteCount) {
    throw new Error(
      `mergeSyncData lost websites: local=${localCount} remote=${remoteCount} merged=${websites.length}`
    )
  }

  // Always return fully normalized shape for cloud write / subsequent hash.
  return sanitizeSyncData({
    categories: categories.items,
    tags: tags.items,
    websites
  })
}
