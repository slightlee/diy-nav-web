export { IconService } from './iconService.js'
export { getProviders } from './providers/index.js'

// Re-export storage from @nav/storage for backwards compatibility
export {
  createStorageClientFromEnv as getStorageAdapter,
  type StorageClient as StorageAdapter,
  LocalClient as LocalStorageAdapter
} from '@nav/storage'

export type { IconFetchResult, GetIconRequest, GetIconResponse, IconSource } from './types.js'
