import type { GetIconResponse } from '@nav/icon-core'

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_ICON_API_URL || 'http://localhost:8787',
  ENDPOINTS: {
    ICON: '/api/icon'
  },
  TIMEOUT: 10000
} as const

export class ApiClient {
  private static instance: ApiClient
  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient()
    }
    return ApiClient.instance
  }

  async getIcon(params: {
    domain?: string
    url?: string
    refresh?: boolean
  }): Promise<GetIconResponse | null> {
    try {
      // Construct URL using config
      const url = new URL(API_CONFIG.ENDPOINTS.ICON, API_CONFIG.BASE_URL)

      // Clean and append search params
      const searchParams = new URLSearchParams()
      if (params.domain) searchParams.append('domain', params.domain)
      if (params.url) searchParams.append('url', params.url)
      if (params.refresh) searchParams.append('refresh', 'true')

      url.search = searchParams.toString()

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
      })

      if (!res.ok) {
        console.warn(`[ApiClient] API error: ${res.status} ${res.statusText}`)
        return null
      }

      return (await res.json()) as GetIconResponse
    } catch (e) {
      console.error('[ApiClient] Network request failed:', e)
      return null
    }
  }
}

export const apiClient = ApiClient.getInstance()
