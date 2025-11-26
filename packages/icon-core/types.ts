export interface StorageAdapter {
  exists(key: string): Promise<string | null>
  store(key: string, data: ArrayBuffer, contentType: string): Promise<string>
  getPublicUrl(key: string): string
}

export interface StorageConfig {
  provider: 'local' | 'aws' | 'cloudflare'
  bucket?: string
  publicBaseUrl?: string
  region?: string
  endpoint?: string
  accessKeyId?: string
  secretAccessKey?: string
  folderPath?: string
}

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
