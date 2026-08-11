import type { SyncData } from '@/types'

export type WorkspaceStorageKey =
  | 'websites'
  | 'categories'
  | 'tags'
  | 'lastAutoBackupTime'
  | 'lastAutoBackupHash'
  | 'autoBackupLock'
  | 'bookmarkImportTask'

export type WorkspaceOwner = { kind: 'anonymous' } | { kind: 'user'; userId: string }

type WorkspaceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const CORE_DATA_KEYS: WorkspaceStorageKey[] = ['websites', 'categories', 'tags']
const ALL_WORKSPACE_KEYS: WorkspaceStorageKey[] = [
  ...CORE_DATA_KEYS,
  'lastAutoBackupTime',
  'lastAutoBackupHash',
  'autoBackupLock',
  'bookmarkImportTask'
]
const ACTIVE_WORKSPACE_OWNER_KEY = 'navData:workspaceOwner'
const LEGACY_CLAIM_PENDING_KEY = 'navData:workspaceClaimPending'
const LEGACY_LAST_OWNER_KEY = 'navData:lastLocalOwner'

export const normalizeDataOwnerId = (userId?: string | null) => userId?.trim() || null

const userScope = (userId: string) => {
  const normalizedUserId = normalizeDataOwnerId(userId)
  if (!normalizedUserId) throw new Error('用户数据归属不能为空')
  return `user:${encodeURIComponent(normalizedUserId)}`
}

const ownerScope = (owner: WorkspaceOwner) =>
  owner.kind === 'user' ? userScope(owner.userId) : 'anonymous'

export const getOwnerStorageKey = (owner: WorkspaceOwner, key: WorkspaceStorageKey) =>
  `navData:${ownerScope(owner)}:${key}`

const parseWorkspaceOwner = (raw: string | null): WorkspaceOwner => {
  if (raw?.startsWith('user:')) {
    const userId = normalizeDataOwnerId(raw.slice('user:'.length))
    if (userId) return { kind: 'user', userId }
  }
  return { kind: 'anonymous' }
}

export const getWorkspaceOwner = (storage: WorkspaceStorage = localStorage): WorkspaceOwner => {
  try {
    return parseWorkspaceOwner(storage.getItem(ACTIVE_WORKSPACE_OWNER_KEY))
  } catch {
    return { kind: 'anonymous' }
  }
}

export const setWorkspaceOwner = (
  owner: WorkspaceOwner,
  storage: WorkspaceStorage = localStorage
) => {
  storage.setItem(
    ACTIVE_WORKSPACE_OWNER_KEY,
    owner.kind === 'user' ? `user:${owner.userId}` : 'anonymous'
  )
}

/** Stores only resolve the active key; account switching stays outside Pinia stores. */
export const getWorkspaceStorageKey = (
  key: WorkspaceStorageKey,
  storage: WorkspaceStorage = localStorage
) => getOwnerStorageKey(getWorkspaceOwner(storage), key)

const claimPendingKey = (userId: string) => `navData:${userScope(userId)}:claimPending`

export const claimAnonymousWorkspace = (
  userId: string,
  storage: WorkspaceStorage = localStorage
) => {
  const normalizedUserId = normalizeDataOwnerId(userId)
  if (!normalizedUserId) throw new Error('用户数据归属不能为空')
  storage.setItem(claimPendingKey(normalizedUserId), 'true')
  setWorkspaceOwner({ kind: 'user', userId: normalizedUserId }, storage)
}

export const hasPendingWorkspaceClaim = (
  userId: string,
  storage: WorkspaceStorage = localStorage
) => {
  const normalizedUserId = normalizeDataOwnerId(userId)
  if (!normalizedUserId) return false
  return (
    storage.getItem(claimPendingKey(normalizedUserId)) === 'true' ||
    storage.getItem(LEGACY_CLAIM_PENDING_KEY) === normalizedUserId
  )
}

export const completeWorkspaceClaim = (
  userId: string,
  storage: WorkspaceStorage = localStorage
) => {
  const normalizedUserId = normalizeDataOwnerId(userId)
  if (!normalizedUserId) return
  storage.removeItem(claimPendingKey(normalizedUserId))
  if (storage.getItem(LEGACY_CLAIM_PENDING_KEY) === normalizedUserId) {
    storage.removeItem(LEGACY_CLAIM_PENDING_KEY)
  }
}

const readArray = (storage: WorkspaceStorage, key: string): unknown[] => {
  try {
    const parsed = JSON.parse(storage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const readWorkspaceData = (
  owner: WorkspaceOwner,
  storage: WorkspaceStorage = localStorage
): SyncData =>
  ({
    websites: readArray(storage, getOwnerStorageKey(owner, 'websites')),
    categories: readArray(storage, getOwnerStorageKey(owner, 'categories')),
    tags: readArray(storage, getOwnerStorageKey(owner, 'tags'))
  }) as SyncData

export const clearAnonymousWorkspace = (storage: WorkspaceStorage = localStorage) => {
  for (const key of ALL_WORKSPACE_KEYS) {
    storage.removeItem(getOwnerStorageKey({ kind: 'anonymous' }, key))
  }
}

const copyIfMissing = (storage: WorkspaceStorage, sourceKey: string, targetKey: string) => {
  if (storage.getItem(targetKey) !== null) return
  const value = storage.getItem(sourceKey)
  if (value !== null) storage.setItem(targetKey, value)
}

const mergeEntitiesById = <T extends { id?: string }>(existing: T[], current: T[]) => {
  const merged = [...existing]
  const indexById = new Map<string, number>()

  merged.forEach((item, index) => {
    if (item.id) indexById.set(item.id, index)
  })

  for (const item of current) {
    const index = item.id ? indexById.get(item.id) : undefined
    if (index === undefined) {
      if (item.id) indexById.set(item.id, merged.length)
      merged.push(item)
    } else {
      // The single-workspace snapshot is the latest active copy from the
      // short-lived implementation, so it wins when the same id exists.
      merged[index] = item
    }
  }

  return merged
}

const migrateSingleWorkspace = (owner: WorkspaceOwner, storage: WorkspaceStorage) => {
  const singleKeys = CORE_DATA_KEYS.map(key => `navData:workspace:${key}`)
  const hasSingleWorkspace = singleKeys.some(key => storage.getItem(key) !== null)
  if (!hasSingleWorkspace) return

  const existing = readWorkspaceData(owner, storage)
  const current = {
    websites: readArray(storage, 'navData:workspace:websites'),
    categories: readArray(storage, 'navData:workspace:categories'),
    tags: readArray(storage, 'navData:workspace:tags')
  } as SyncData

  storage.setItem(
    getOwnerStorageKey(owner, 'websites'),
    JSON.stringify(mergeEntitiesById(existing.websites, current.websites))
  )
  storage.setItem(
    getOwnerStorageKey(owner, 'categories'),
    JSON.stringify(mergeEntitiesById(existing.categories, current.categories))
  )
  storage.setItem(
    getOwnerStorageKey(owner, 'tags'),
    JSON.stringify(mergeEntitiesById(existing.tags, current.tags))
  )

  for (const key of ['lastAutoBackupTime', 'lastAutoBackupHash', 'autoBackupLock'] as const) {
    const value = storage.getItem(`navData:workspace:${key}`)
    if (value !== null) storage.setItem(getOwnerStorageKey(owner, key), value)
  }

  // Removal is the migration marker. If any write above fails, the outer
  // initializer keeps these keys so the migration can retry on next startup.
  for (const key of ALL_WORKSPACE_KEYS) storage.removeItem(`navData:workspace:${key}`)
}

/**
 * Keeps existing user partitions and migrates legacy/global/single-workspace
 * data once. The cached user id is only a hint; cookie verification still
 * decides which workspace becomes active after startup.
 */
export const initializeWorkspaceStorage = (
  cachedUserId?: string | null,
  storage: WorkspaceStorage = localStorage
) => {
  try {
    const storedOwner = storage.getItem(ACTIVE_WORKSPACE_OWNER_KEY)
    const legacyOwner = normalizeDataOwnerId(storage.getItem(LEGACY_LAST_OWNER_KEY))
    const hintedUserId = normalizeDataOwnerId(cachedUserId) || legacyOwner
    const owner = storedOwner
      ? parseWorkspaceOwner(storedOwner)
      : hintedUserId &&
          CORE_DATA_KEYS.some(key =>
            storage.getItem(getOwnerStorageKey({ kind: 'user', userId: hintedUserId }, key))
          )
        ? { kind: 'user' as const, userId: hintedUserId }
        : { kind: 'anonymous' as const }

    migrateSingleWorkspace(owner, storage)

    for (const key of ALL_WORKSPACE_KEYS) {
      const targetKey = getOwnerStorageKey(owner, key)

      if (owner.kind === 'anonymous') {
        copyIfMissing(storage, `navData:unclaimed:${key}`, targetKey)
        copyIfMissing(storage, key, targetKey)
      }
    }

    setWorkspaceOwner(owner, storage)
  } catch {
    // Existing data remains untouched when storage is unavailable or full.
  }
}

export const clearWorkspaceBackupState = (storage: WorkspaceStorage = localStorage) => {
  for (const key of ['lastAutoBackupTime', 'lastAutoBackupHash', 'autoBackupLock'] as const) {
    try {
      storage.removeItem(getWorkspaceStorageKey(key, storage))
    } catch {
      // Backup metadata can be recreated on the next successful backup.
    }
  }
}
