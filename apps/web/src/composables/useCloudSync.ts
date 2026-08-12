import { computed, nextTick, readonly, ref } from 'vue'
import { logger } from '@nav/logger'
import { canonicalizeSyncDataForHash, mergeSyncData } from '@nav/utils'
import type { SyncPayload } from '@/types'
import { createBackup } from '@/api/backup'
import {
  disableSync,
  enableSync,
  getSyncSnapshot,
  getSyncState,
  recoverSyncSnapshot,
  updateSyncSnapshot,
  type SyncState
} from '@/api/sync'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useUIStore } from '@/stores/ui'
import { useWebsiteStore } from '@/stores/website'
import { computeCanonicalHash } from '@/utils/hash'
import {
  claimAnonymousWorkspace,
  clearAnonymousWorkspace,
  clearWorkspaceBackupState,
  completeWorkspaceClaim,
  getWorkspaceOwner,
  hasPendingWorkspaceClaim,
  readWorkspaceData,
  setWorkspaceOwner
} from '@/utils/user-data-storage'
import {
  beginAccountSession,
  captureAccountSession,
  isCurrentAccountSessionVersion
} from '@/utils/account-session'

const isSyncing = ref(false)
/** Only true while enable/disable sync API (and post-enable reconcile) runs. */
const isTogglingSync = ref(false)
/** Which conflict action is running — drives button/overlay copy. */
const resolvingAction = ref<'useCloud' | 'keepLocal' | 'merge' | null>(null)
const remoteState = ref<SyncState | null>(null)
let pendingRemoteSnapshot: SyncPayload | null = null
let checkPromise: Promise<void> | null = null
let syncWritePromise: Promise<void> | null = null
let syncWriteRequested = false
let pendingRecoveryHash: string | null = null
let checkPromiseUserId = ''
/** True while conflict/recovery UI owns the session — blocks all automatic pushes. */
let conflictGate = false
/**
 * Set as soon as a reconcile starts (synchronously) so auto-backup cannot race
 * ahead and snapshot a partial local fork before the conflict modal appears.
 */
let reconcileGuard = false

class SyncRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string
  ) {
    super(message)
  }
}

const pendingKey = (userId?: string) => `syncConflictPending:${userId || 'anonymous'}`
const baseHashKey = (userId: string) => `syncBaseHash:${userId}`

export const hasPendingSyncConflict = () => {
  if (conflictGate) return true
  const userId = useAuthStore().user?.id
  return !!userId && localStorage.getItem(pendingKey(userId)) === 'true'
}

/**
 * Auto-backup / background jobs must not run while sync is reconciling or a
 * conflict is waiting for the user — otherwise tiny local forks get archived.
 */
export const shouldBlockBackgroundDataOps = () => {
  if (reconcileGuard || conflictGate) return true
  if (hasPendingSyncConflict()) return true
  if (isSyncing.value) return true
  if (resolvingAction.value) return true
  return false
}

export function useCloudSync() {
  const authStore = useAuthStore()
  const websiteStore = useWebsiteStore()
  const uiStore = useUIStore()
  const settingsStore = useSettingsStore()

  const userId = () => authStore.user?.id || ''
  const isActiveSession = (expectedUserId: string, generation: number) =>
    isCurrentAccountSessionVersion(expectedUserId, generation) &&
    authStore.isAuthenticated &&
    userId() === expectedUserId

  const exportSyncPayload = (): SyncPayload => {
    const payload = websiteStore.exportData()
    return {
      meta: payload.meta,
      data: {
        websites: payload.data.websites,
        categories: payload.data.categories,
        tags: payload.data.tags
      }
    }
  }

  const hasSyncData = (payload: SyncPayload) =>
    payload.data.websites.length > 0 ||
    payload.data.categories.length > 0 ||
    payload.data.tags.length > 0

  const entityCount = (payload: SyncPayload) =>
    payload.data.websites.length + payload.data.categories.length + payload.data.tags.length

  const computePayloadHash = (payload: SyncPayload) =>
    computeCanonicalHash(canonicalizeSyncDataForHash(payload.data))

  const getBaseHash = () => {
    const id = userId()
    return id ? localStorage.getItem(baseHashKey(id)) : null
  }

  const setBaseHash = (hash: string | null, id = userId()) => {
    if (!id) return
    if (hash) localStorage.setItem(baseHashKey(id), hash)
    else localStorage.removeItem(baseHashKey(id))
  }

  const markConflictPending = () => {
    conflictGate = true
    reconcileGuard = true
    const id = userId()
    if (id) localStorage.setItem(pendingKey(id), 'true')
  }

  const clearConflictPending = () => {
    conflictGate = false
    reconcileGuard = false
    localStorage.removeItem(pendingKey(userId()))
    // Remove the legacy unscoped marker left by older clients.
    localStorage.removeItem('syncConflictPending')
    pendingRemoteSnapshot = null
  }

  const closeConflict = () => {
    clearConflictPending()
    uiStore.closeModal('syncConflict')
  }

  const closeRecovery = () => {
    clearConflictPending()
    pendingRecoveryHash = null
    uiStore.closeModal('syncRecovery')
  }

  const openRecoveryModal = (local: SyncPayload, state: SyncState) => {
    pendingRecoveryHash = state.currentHash
    markConflictPending()
    uiStore.openModal('syncRecovery', {
      localStats: {
        websites: local.data.websites.length,
        categories: local.data.categories.length,
        tags: local.data.tags.length
      },
      failedAt: new Date(state.updatedAt || Date.now())
    })
  }

  const refreshState = async () => {
    if (!authStore.isAuthenticated) {
      remoteState.value = null
      return null
    }

    const expectedUserId = userId()
    const generation = captureAccountSession().version
    const res = await getSyncState()
    if (!res.success || !res.data) {
      throw new Error(res.message || '获取同步状态失败')
    }
    if (!isActiveSession(expectedUserId, generation)) return null
    remoteState.value = res.data
    return res.data
  }

  const fetchRemoteSnapshot = async () => {
    const res = await getSyncSnapshot()
    if (!res.success) {
      throw new SyncRequestError(res.message || '获取云端同步数据失败', res.code)
    }
    return res.data || null
  }

  const freezeSnapshot = (snapshot: SyncPayload): SyncPayload =>
    JSON.parse(JSON.stringify(snapshot)) as SyncPayload

  const openConflictModal = async (snapshot: SyncPayload, state: SyncState) => {
    // Deep-clone so later store mutations / accidental pushes cannot shrink the
    // remote side the user is about to merge against.
    const local = exportSyncPayload()
    const frozen = freezeSnapshot(snapshot)
    pendingRemoteSnapshot = frozen
    markConflictPending()
    uiStore.openModal('syncConflict', {
      localStats: {
        websites: local.data.websites.length,
        categories: local.data.categories.length,
        tags: local.data.tags.length
      },
      remoteStats: {
        websites: frozen.data.websites.length,
        categories: frozen.data.categories.length,
        tags: frozen.data.tags.length
      },
      remoteDate: new Date(state.updatedAt || frozen.meta.createdAt)
    })
  }

  /**
   * Auto-push is only safe when this device was already in sync and made incremental edits.
   * If local looks like a wipe / different dataset (not a normal delete/edit), ask the user.
   *
   * Normal deletes (e.g. 327 → 326) must NOT open a conflict: all remaining local ids still
   * exist on remote, so we should just push the smaller snapshot.
   */
  const shouldRequireConflictInsteadOfPush = (local: SyncPayload, remote: SyncPayload) => {
    const remoteWebsites = remote.data.websites || []
    const localWebsites = local.data.websites || []
    if (remoteWebsites.length <= 1) return false
    if (localWebsites.length >= remoteWebsites.length) return false

    const remoteIds = new Set(remoteWebsites.map(website => website.id).filter(Boolean))
    const localIds = localWebsites.map(website => website.id).filter(Boolean)
    if (localIds.length === 0) return true

    // Pure deletion / reorder of a previously synced set: every local id is still on remote.
    const localIsSubset = localIds.every(id => remoteIds.has(id))
    if (localIsSubset) return false

    // Local has many foreign ids and is much smaller — likely a different fork.
    return localWebsites.length < Math.ceil(remoteWebsites.length * 0.5)
  }

  const applyRemoteSnapshot = (
    snapshot: SyncPayload,
    hash: string | null,
    expectedUserId: string,
    generation: number
  ) => {
    if (!isActiveSession(expectedUserId, generation)) return false

    const localById = new Map(websiteStore.websites.map(website => [website.id, website]))
    const localByUrl = new Map(
      websiteStore.websites.map(website => [website.url.trim().toLocaleLowerCase(), website])
    )
    const websites = snapshot.data.websites.map(website => {
      const local =
        (website.id ? localById.get(website.id) : undefined) ||
        (website.url ? localByUrl.get(website.url.trim().toLocaleLowerCase()) : undefined)

      return {
        ...website,
        visitCount: local?.visitCount ?? 0,
        lastVisited: local?.lastVisited,
        isOnline: local?.isOnline ?? true
      }
    })

    setBaseHash(hash, expectedUserId)
    websiteStore.importData({ data: { ...snapshot.data, websites } })
    return true
  }

  const pushSnapshot = async (snapshot: SyncPayload, expectedHash: string | null) => {
    const expectedUserId = userId()
    const generation = captureAccountSession().version
    const res = await updateSyncSnapshot(snapshot, expectedHash)
    if (!isActiveSession(expectedUserId, generation)) return false
    if (res.success && res.data) {
      remoteState.value = res.data
      // Always advance base after a successful CAS write. Client/server hash algorithms may
      // briefly differ (or order-only reindex after delete); the server accepted this snapshot.
      if (res.data.currentHash) {
        setBaseHash(res.data.currentHash, expectedUserId)
      }
      return true
    }

    if (res.code === 'SYNC_CONFLICT') {
      // Keep any frozen conflict snapshot; just refresh the modal with latest cloud if needed.
      try {
        const state = await refreshState()
        if (!isActiveSession(expectedUserId, generation)) return false
        const remote = await fetchRemoteSnapshot()
        if (!isActiveSession(expectedUserId, generation)) return false
        if (state?.currentHash && remote && !pendingRemoteSnapshot) {
          await openConflictModal(remote, state)
        } else if (state?.currentHash && remote && pendingRemoteSnapshot) {
          // Prefer the larger snapshot as the conflict "remote" side so we don't lose data.
          const frozen = pendingRemoteSnapshot
          const useRemote = entityCount(remote) >= entityCount(frozen) ? remote : frozen
          pendingRemoteSnapshot = useRemote
          markConflictPending()
          uiStore.openModal('syncConflict', {
            localStats: {
              websites: exportSyncPayload().data.websites.length,
              categories: exportSyncPayload().data.categories.length,
              tags: exportSyncPayload().data.tags.length
            },
            remoteStats: {
              websites: useRemote.data.websites.length,
              categories: useRemote.data.categories.length,
              tags: useRemote.data.tags.length
            },
            remoteDate: new Date(state.updatedAt || useRemote.meta.createdAt)
          })
        }
      } catch (error) {
        logger.error({ err: error }, 'Failed to re-open sync conflict after push conflict')
      }
      return false
    }

    throw new Error(res.message || '同步数据失败')
  }

  /**
   * Align local base hash with cloud when content is already the same.
   * Never open a conflict modal for pure hash-format / default-field noise.
   */
  const tryResolveEqualContent = async (
    local: SyncPayload,
    remote: SyncPayload,
    state: SyncState,
    expectedUserId: string,
    generation: number
  ): Promise<boolean> => {
    const localHash = await computePayloadHash(local)
    if (!isActiveSession(expectedUserId, generation)) return false
    const remoteContentHash = await computePayloadHash(remote)
    if (!isActiveSession(expectedUserId, generation)) return false

    if (localHash === state.currentHash || localHash === remoteContentHash) {
      if (localHash !== state.currentHash && state.currentHash) {
        // Content matches remote snapshot but server pointer used an older hash scheme.
        const repaired = await pushSnapshot(local, state.currentHash)
        if (repaired) {
          clearConflictPending()
          uiStore.closeModal('syncConflict')
          uiStore.closeModal('syncRecovery')
          return true
        }
        return false
      }
      setBaseHash(state.currentHash, expectedUserId)
      clearConflictPending()
      uiStore.closeModal('syncConflict')
      uiStore.closeModal('syncRecovery')
      logger.info(
        {
          localWebsites: local.data.websites.length,
          remoteWebsites: remote.data.websites.length,
          localHash,
          remoteContentHash,
          serverHash: state.currentHash
        },
        'Sync content equal — skipped conflict modal'
      )
      return true
    }

    logger.info(
      {
        localWebsites: local.data.websites.length,
        remoteWebsites: remote.data.websites.length,
        localHash,
        remoteContentHash,
        serverHash: state.currentHash,
        baseHash: getBaseHash()
      },
      'Sync content differs — conflict may open'
    )
    return false
  }

  const checkOnLogin = async () => {
    if (!authStore.isAuthenticated) return

    // Arm immediately (sync) so auto-backup cannot slip in before the modal opens.
    reconcileGuard = true

    // Allow re-entry only for the in-flight check promise, not other ops (merge/enable).
    if (isSyncing.value && !checkPromise) {
      reconcileGuard = false
      return
    }

    const expectedUserId = userId()
    const generation = captureAccountSession().version
    if (checkPromise && checkPromiseUserId === expectedUserId) return checkPromise
    const currentPromise = (async () => {
      isSyncing.value = true
      reconcileGuard = true
      try {
        const state = await refreshState()
        if (!isActiveSession(expectedUserId, generation)) return
        if (!state?.enabled) {
          clearConflictPending()
          uiStore.closeModal('syncConflict')
          uiStore.closeModal('syncRecovery')
          // Keep local autoBackup flag aligned when server says sync is off.
          if (settingsStore.settings.autoBackup) {
            settingsStore.updateSettings({ autoBackup: false })
          }
          return
        }

        // Sync on ⇒ auto backup on (single product concept).
        if (!settingsStore.settings.autoBackup) {
          settingsStore.updateSettings({ autoBackup: true })
        }

        const local = exportSyncPayload()
        const localHash = await computePayloadHash(local)
        if (!isActiveSession(expectedUserId, generation)) return

        // The state endpoint already carries the canonical cloud hash. Avoid
        // downloading the full snapshot when this device is already in sync.
        // A pending conflict still requires the frozen remote snapshot to
        // resolve the user's decision safely.
        if (state.currentHash && localHash === state.currentHash && !hasPendingSyncConflict()) {
          setBaseHash(state.currentHash, expectedUserId)
          if (hasPendingWorkspaceClaim(expectedUserId)) {
            completeWorkspaceClaim(expectedUserId)
          }
          clearConflictPending()
          return
        }

        let remote: SyncPayload | null = null
        if (state.currentHash) {
          try {
            remote = await fetchRemoteSnapshot()
          } catch (error) {
            if (error instanceof SyncRequestError && error.code === 'SYNC_SNAPSHOT_UNAVAILABLE') {
              const localHash = await computePayloadHash(local)
              if (!isActiveSession(expectedUserId, generation)) return
              if (hasSyncData(local) && localHash === state.currentHash) {
                const repaired = await pushSnapshot(local, state.currentHash)
                if (repaired) clearConflictPending()
                return
              }
              openRecoveryModal(local, state)
              return
            }
            throw error
          }
        }
        if (!isActiveSession(expectedUserId, generation)) return

        const localHasData = hasSyncData(local)
        const remoteHasData = !!remote && hasSyncData(remote)

        // Both empty: keep sync enabled and wait for the first local change.
        if (!localHasData && !remoteHasData) {
          setBaseHash(state.currentHash, expectedUserId)
          completeWorkspaceClaim(expectedUserId)
          clearConflictPending()
          uiStore.closeModal('syncConflict')
          return
        }

        // Local data + empty cloud: establish the first current cloud snapshot.
        if (!state.currentHash || !remote) {
          if (!localHasData) {
            setBaseHash(null, expectedUserId)
            completeWorkspaceClaim(expectedUserId)
            clearConflictPending()
            return
          }
          const pushed = await pushSnapshot(local, null)
          if (!pushed) return
          completeWorkspaceClaim(expectedUserId)
          clearConflictPending()
          uiStore.closeModal('syncConflict')
          return
        }

        if (!remote) return

        // Both sides have data: same content is already synchronized.
        const contentResolved = await tryResolveEqualContent(
          local,
          remote,
          state,
          expectedUserId,
          generation
        )
        if (!isActiveSession(expectedUserId, generation)) return
        if (contentResolved) {
          completeWorkspaceClaim(expectedUserId)
          return
        }

        // An unresolved choice owns both snapshots. Background checks must keep presenting
        // that same conflict instead of silently overwriting either side on a later pass.
        if (hasPendingSyncConflict() || conflictGate) {
          await openConflictModal(remote, state)
          return
        }

        const baseHash = getBaseHash()

        // A new browser has no common base. Empty local takes cloud; otherwise ask the user.
        if (!baseHash) {
          if (!localHasData) {
            if (!applyRemoteSnapshot(remote, state.currentHash, expectedUserId, generation)) return
            completeWorkspaceClaim(expectedUserId)
            clearConflictPending()
            return
          }
          await openConflictModal(remote, state)
          return
        }

        // Local stayed at the common base while another device advanced cloud: pull silently.
        if (localHash === baseHash && state.currentHash !== baseHash) {
          if (!applyRemoteSnapshot(remote, state.currentHash, expectedUserId, generation)) return
          completeWorkspaceClaim(expectedUserId)
          clearConflictPending()
          return
        }

        // Cloud stayed at the common base while only this device changed: push silently.
        if (state.currentHash === baseHash && localHash !== baseHash) {
          // A full local wipe is destructive enough to keep the existing safety confirmation.
          if (shouldRequireConflictInsteadOfPush(local, remote)) {
            await openConflictModal(remote, state)
            return
          }
          const pushed = await pushSnapshot(local, state.currentHash)
          if (!pushed) return
          completeWorkspaceClaim(expectedUserId)
          clearConflictPending()
          return
        }

        // Both sides advanced from the same base: this is a real concurrent conflict.
        await openConflictModal(remote, state)
      } catch (error) {
        if (isActiveSession(expectedUserId, generation)) {
          logger.error({ err: error }, 'Failed to reconcile sync state')
        }
        throw error
      } finally {
        if (isActiveSession(expectedUserId, generation)) {
          isSyncing.value = false
          checkPromise = null
          checkPromiseUserId = ''
          // Conflict/recovery still needs the guard until the user finishes.
          if (!conflictGate) reconcileGuard = false
        }
      }
    })()
    checkPromise = currentPromise
    checkPromiseUserId = expectedUserId

    return currentPromise
  }

  const syncLocalChanges = async () => {
    syncWriteRequested = true
    if (syncWritePromise) return syncWritePromise

    const expectedUserId = userId()
    const generation = captureAccountSession().version
    if (!isActiveSession(expectedUserId, generation)) {
      syncWriteRequested = false
      return
    }
    const currentPromise = (async () => {
      while (syncWriteRequested) {
        if (!isActiveSession(expectedUserId, generation)) return
        syncWriteRequested = false
        if (hasPendingSyncConflict()) return
        if (isSyncing.value) return

        // Always refresh the lightweight state before writing. The cached state may be stale
        // when another browser has already advanced the cloud snapshot.
        const state = await refreshState()
        if (!isActiveSession(expectedUserId, generation)) return
        if (!state?.enabled) return
        if (hasPendingSyncConflict()) return

        const baseHash = getBaseHash()
        // Reconcile first whenever cloud moved away from this device's common base.
        if (state.currentHash !== baseHash) {
          try {
            await checkOnLogin()
          } catch {
            // checkOnLogin already records the reconciliation error.
          }
          if (!isActiveSession(expectedUserId, generation)) return
          return
        }

        const local = exportSyncPayload()
        const localHash = await computePayloadHash(local)
        if (!isActiveSession(expectedUserId, generation)) return
        if (localHash === state.currentHash) {
          setBaseHash(state.currentHash, expectedUserId)
          continue
        }

        // If we can still fetch remote and local is a drastic shrink, force conflict.
        if (state.currentHash) {
          try {
            const remote = await fetchRemoteSnapshot()
            if (!isActiveSession(expectedUserId, generation)) return
            if (remote && shouldRequireConflictInsteadOfPush(local, remote)) {
              await openConflictModal(remote, state)
              return
            }
          } catch {
            // Fall through to normal push attempt when remote is unreadable.
          }
        }

        if (hasPendingSyncConflict()) return

        try {
          await pushSnapshot(local, baseHash)
          if (!isActiveSession(expectedUserId, generation)) return
        } catch (error) {
          if (isActiveSession(expectedUserId, generation)) {
            logger.error({ err: error }, 'Failed to push local sync changes')
          }
        }
      }
    })().finally(() => {
      if (isActiveSession(expectedUserId, generation)) {
        syncWritePromise = null
      }
    })
    syncWritePromise = currentPromise

    return currentPromise
  }

  const setSyncEnabled = async (enabled: boolean) => {
    if (isTogglingSync.value) return false
    const expectedUserId = userId()
    const generation = captureAccountSession().version
    if (!isActiveSession(expectedUserId, generation)) return false
    isTogglingSync.value = true
    try {
      const res = enabled ? await enableSync() : await disableSync()
      if (!isActiveSession(expectedUserId, generation)) return false
      if (!res.success || !res.data) throw new Error(res.message || '更新同步状态失败')
      remoteState.value = res.data

      // One product switch: cloud sync + periodic safety backups stay coupled.
      settingsStore.updateSettings({ autoBackup: enabled })

      if (enabled) {
        // Reconcile after enable (uses its own isSyncing).
        try {
          await checkOnLogin()
        } catch (error) {
          if (isActiveSession(expectedUserId, generation)) {
            logger.error({ err: error }, 'Sync enabled but initial reconciliation failed')
            uiStore.showToast('云同步已开启，但数据同步失败，请重试', 'error')
          }
          return false
        }
        if (!isActiveSession(expectedUserId, generation)) return false
        uiStore.showToast('云同步已开启：各设备登录后将自动对齐数据', 'success')
      } else {
        closeConflict()
        closeRecovery()
        uiStore.showToast('云同步已关闭；历史备份仍保留，可手动恢复', 'success')
      }
      return true
    } catch (error) {
      if (isActiveSession(expectedUserId, generation)) {
        logger.error({ err: error }, 'Failed to update sync state')
        uiStore.showToast('云同步设置更新失败，请重试', 'error')
      }
      return false
    } finally {
      if (isActiveSession(expectedUserId, generation)) {
        isTogglingSync.value = false
      }
    }
  }

  const resetSession = (nextUserId?: string | null) => {
    beginAccountSession(nextUserId)
    conflictGate = false
    reconcileGuard = false
    isSyncing.value = false
    isTogglingSync.value = false
    resolvingAction.value = null
    // Keep the old account's scoped conflict marker. If that account returns,
    // reconciliation must resume instead of treating an unresolved fork as safe.
    localStorage.removeItem('syncConflictPending')
    checkPromise = null
    checkPromiseUserId = ''
    syncWriteRequested = false
    syncWritePromise = null
    remoteState.value = null
    pendingRemoteSnapshot = null
    pendingRecoveryHash = null
    uiStore.setLoading(false)
    uiStore.closeModal('syncConflict')
    uiStore.closeModal('syncRecovery')
  }

  /** Activates the authenticated user's local partition, then reconciles cloud data. */
  const activateWorkspace = async () => {
    const expectedUserId = userId()
    const generation = captureAccountSession().version
    if (!isActiveSession(expectedUserId, generation)) return false

    const owner = getWorkspaceOwner()
    if (owner.kind === 'anonymous') {
      const anonymousData = exportSyncPayload().data
      const userOwner = { kind: 'user' as const, userId: expectedUserId }
      const userData = readWorkspaceData(userOwner)
      const anonymousHasData =
        anonymousData.websites.length > 0 ||
        anonymousData.categories.length > 0 ||
        anonymousData.tags.length > 0
      if (anonymousHasData) claimAnonymousWorkspace(expectedUserId)
      else setWorkspaceOwner(userOwner)
      websiteStore.importData({ data: mergeSyncData(anonymousData, userData) })
      clearAnonymousWorkspace()
      clearWorkspaceBackupState()
    } else if (owner.userId !== expectedUserId) {
      const userOwner = { kind: 'user' as const, userId: expectedUserId }
      const userData = readWorkspaceData(userOwner)
      setWorkspaceOwner(userOwner)
      websiteStore.importData({ data: userData })
    }

    await checkOnLogin()
    return isActiveSession(expectedUserId, generation)
  }

  const confirmRepairCloud = async () => {
    if (isSyncing.value || !pendingRecoveryHash) return
    const expectedUserId = userId()
    const generation = captureAccountSession().version
    if (!isActiveSession(expectedUserId, generation)) return
    isSyncing.value = true
    try {
      const state = await refreshState()
      if (!isActiveSession(expectedUserId, generation)) return
      if (!state?.currentHash || state.currentHash !== pendingRecoveryHash) {
        throw new Error('云端同步状态已发生变化')
      }

      const res = await recoverSyncSnapshot(exportSyncPayload(), state.currentHash)
      if (!isActiveSession(expectedUserId, generation)) return
      if (!res.success || !res.data) {
        throw new SyncRequestError(res.message || '修复云端同步数据失败', res.code)
      }

      remoteState.value = res.data
      setBaseHash(res.data.currentHash, expectedUserId)
      closeRecovery()
      uiStore.showToast('云端同步数据已使用当前本地数据修复', 'success')
    } catch (error) {
      if (isActiveSession(expectedUserId, generation)) {
        logger.error({ err: error }, 'Failed to recover cloud sync snapshot')
        uiStore.showToast('云端同步数据修复失败，请重试', 'error')
      }
    } finally {
      if (isActiveSession(expectedUserId, generation)) {
        isSyncing.value = false
      }
    }
  }

  const confirmDisableBrokenSync = async () => {
    if (isSyncing.value) return
    const expectedUserId = userId()
    const generation = captureAccountSession().version
    if (!isActiveSession(expectedUserId, generation)) return
    isSyncing.value = true
    try {
      const res = await disableSync()
      if (!isActiveSession(expectedUserId, generation)) return
      if (!res.success || !res.data) throw new Error(res.message || '关闭同步失败')
      remoteState.value = res.data
      settingsStore.updateSettings({ autoBackup: false })
      closeRecovery()
      uiStore.showToast('云同步已关闭，本地数据不受影响', 'success')
    } catch (error) {
      if (isActiveSession(expectedUserId, generation)) {
        logger.error({ err: error }, 'Failed to disable broken cloud sync')
        uiStore.showToast('关闭云同步失败，请重试', 'error')
      }
    } finally {
      if (isActiveSession(expectedUserId, generation)) {
        isSyncing.value = false
      }
    }
  }

  /** Only when local is about to be discarded (use cloud). Merge does not need this. */
  const createLocalSafetyBackup = async (expectedUserId: string, generation: number) => {
    if (!isActiveSession(expectedUserId, generation)) return false
    const local = websiteStore.exportData()
    if (!hasSyncData(exportSyncPayload())) return true

    const res = await createBackup(local, 'AUTO')
    if (!isActiveSession(expectedUserId, generation)) return false
    if (res.success) {
      return true
    }
    uiStore.showToast('操作前自动备份失败，已取消同步', 'error')
    return false
  }

  /** Let Vue paint loading UI before CPU/network heavy work blocks the main thread. */
  const yieldForLoadingPaint = async () => {
    await nextTick()
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })
  }

  const beginResolve = async (
    action: 'useCloud' | 'keepLocal' | 'merge',
    loadingMessage: string
  ) => {
    resolvingAction.value = action
    isSyncing.value = true
    uiStore.showLoading(loadingMessage)
    await yieldForLoadingPaint()
  }

  const endResolve = (expectedUserId: string, generation: number) => {
    if (!isActiveSession(expectedUserId, generation)) return
    resolvingAction.value = null
    isSyncing.value = false
    uiStore.setLoading(false)
  }

  /**
   * Resolve conflict against the frozen remote snapshot from when the modal opened.
   * If cloud hash advanced (e.g. a bug pushed local), still merge with the frozen
   * full snapshot and write using the *current* hash so we can repair the cloud.
   */
  const getCurrentPendingSnapshot = async (expectedUserId: string, generation: number) => {
    const state = await refreshState()
    if (!isActiveSession(expectedUserId, generation)) return null
    if (!state?.currentHash) throw new Error('云端同步状态不存在')

    if (pendingRemoteSnapshot) {
      return {
        state,
        snapshot: pendingRemoteSnapshot,
        // Always CAS against live cloud hash so a post-conflict local wipe can be repaired.
        writeExpectedHash: state.currentHash
      }
    }

    const snapshot = await fetchRemoteSnapshot()
    if (!isActiveSession(expectedUserId, generation)) return null
    if (!snapshot) throw new Error('云端同步数据不存在')
    return { state, snapshot, writeExpectedHash: state.currentHash }
  }

  const confirmUseCloud = async () => {
    if (isSyncing.value) return
    const expectedUserId = userId()
    const generation = captureAccountSession().version
    if (!isActiveSession(expectedUserId, generation)) return
    await beginResolve('useCloud', '正在应用云端数据…')
    if (!isActiveSession(expectedUserId, generation)) return
    try {
      const current = await getCurrentPendingSnapshot(expectedUserId, generation)
      if (!current) return
      if (!(await createLocalSafetyBackup(expectedUserId, generation))) return
      if (!isActiveSession(expectedUserId, generation)) return
      const currentHash = current.state.currentHash
      if (!currentHash) throw new Error('云端同步状态不存在')

      if (!applyRemoteSnapshot(current.snapshot, currentHash, expectedUserId, generation)) return
      // If live cloud was already corrupted to a smaller set, re-upload the frozen full snapshot.
      if (current.writeExpectedHash) {
        const pushed = await pushSnapshot(exportSyncPayload(), current.writeExpectedHash)
        if (!pushed) return
      }
      completeWorkspaceClaim(expectedUserId)
      closeConflict()
      uiStore.showToast('已使用云端数据', 'success')
    } catch (error) {
      if (isActiveSession(expectedUserId, generation)) {
        logger.error({ err: error }, 'Failed to use cloud sync data')
        uiStore.showToast('云端数据同步失败，请重试', 'error')
      }
    } finally {
      endResolve(expectedUserId, generation)
    }
  }

  const confirmKeepLocal = async () => {
    if (isSyncing.value) return
    const expectedUserId = userId()
    const generation = captureAccountSession().version
    if (!isActiveSession(expectedUserId, generation)) return
    await beginResolve('keepLocal', '正在上传本地数据…')
    if (!isActiveSession(expectedUserId, generation)) return
    try {
      const current = await getCurrentPendingSnapshot(expectedUserId, generation)
      if (!current) return
      const succeeded = await pushSnapshot(exportSyncPayload(), current.writeExpectedHash)
      if (!succeeded) return

      setBaseHash(remoteState.value?.currentHash ?? null, expectedUserId)
      completeWorkspaceClaim(expectedUserId)
      closeConflict()
      uiStore.showToast('本地数据已同步到云端', 'success')
    } catch (error) {
      if (isActiveSession(expectedUserId, generation)) {
        logger.error({ err: error }, 'Failed to overwrite cloud sync data')
        uiStore.showToast('本地数据同步失败，请重试', 'error')
      }
    } finally {
      endResolve(expectedUserId, generation)
    }
  }

  const confirmMerge = async () => {
    if (isSyncing.value) return
    const expectedUserId = userId()
    const generation = captureAccountSession().version
    if (!isActiveSession(expectedUserId, generation)) return
    await beginResolve('merge', '正在合并数据，请稍候…')
    if (!isActiveSession(expectedUserId, generation)) return
    try {
      const current = await getCurrentPendingSnapshot(expectedUserId, generation)
      if (!current) return

      const expectedHash = current.writeExpectedHash
      if (!expectedHash) throw new Error('云端同步状态不存在')

      const local = exportSyncPayload()
      const remoteCount = current.snapshot.data.websites.length
      const localCount = local.data.websites.length

      // Always merge against the frozen remote snapshot from conflict open time.
      const mergedData = mergeSyncData(local.data, current.snapshot.data)

      // Hard guard: merge must not shrink either side's website set.
      if (mergedData.websites.length < localCount || mergedData.websites.length < remoteCount) {
        throw new Error(
          `合并结果异常：本地 ${localCount} / 云端 ${remoteCount} → 合并后 ${mergedData.websites.length}`
        )
      }

      const merged: SyncPayload = {
        meta: { ...local.meta, createdAt: new Date().toISOString() },
        data: mergedData
      }

      logger.info(
        {
          localWebsites: localCount,
          remoteWebsites: remoteCount,
          mergedWebsites: merged.data.websites.length,
          localNames: local.data.websites.map(w => w.name),
          remoteNames: current.snapshot.data.websites.map(w => w.name),
          mergedNames: merged.data.websites.map(w => w.name)
        },
        'Merging sync data'
      )

      // Apply first so concurrent auto-sync cannot push pre-merge local data.
      if (!applyRemoteSnapshot(merged, expectedHash, expectedUserId, generation)) return

      if (websiteStore.websites.length < merged.data.websites.length) {
        throw new Error(
          `写入本地后数量不对：期望 ${merged.data.websites.length}，实际 ${websiteStore.websites.length}`
        )
      }

      const succeeded = await pushSnapshot(exportSyncPayload(), expectedHash)
      if (!succeeded || !remoteState.value?.currentHash) return

      setBaseHash(remoteState.value.currentHash, expectedUserId)
      completeWorkspaceClaim(expectedUserId)
      closeConflict()
      uiStore.showToast(
        `已合并：本地 ${localCount} + 云端 ${remoteCount} → ${merged.data.websites.length} 个网站`,
        'success'
      )
    } catch (error) {
      if (isActiveSession(expectedUserId, generation)) {
        logger.error({ err: error }, 'Failed to merge sync data')
        uiStore.showToast(error instanceof Error ? error.message : '数据合并失败，请重试', 'error')
      }
    } finally {
      endResolve(expectedUserId, generation)
    }
  }

  return {
    isSyncing: readonly(isSyncing),
    isTogglingSync: readonly(isTogglingSync),
    resolvingAction: readonly(resolvingAction),
    remoteState: readonly(remoteState),
    isEnabled: computed(() => remoteState.value?.enabled === true),
    refreshState,
    resetSession,
    activateWorkspace,
    setSyncEnabled,
    checkOnLogin,
    syncLocalChanges,
    confirmUseCloud,
    confirmKeepLocal,
    confirmMerge,
    confirmRepairCloud,
    confirmDisableBrokenSync
  }
}
