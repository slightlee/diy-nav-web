// StorageClient and related types are now exported from @nav/storage
// Re-export for backwards compatibility
export type { StorageClient as StorageAdapter } from '@nav/storage'

export type IconSource =
  | 'google'
  | 'duckduckgo'
  | 'clearbit'
  | 'iconhorse'
  | 'bitwarden'
  | 'default'
  | 'storage'

export type IconFetchResult = {
  data: ArrayBuffer
  contentType: string
  extension: string
  source: IconSource
}

// From @nav/contracts
export interface GetIconRequest {
  domain: string
}

export interface GetIconResponse {
  url: string
  source: IconSource
  processedAt?: string
}
