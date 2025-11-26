import type { GetIconResponse, GetIconRequest } from '@nav/icon-core'

const API_BASE_URL = import.meta.env.VITE_ICON_API_URL || 'http://localhost:8787/api'

export class ApiClient {
  private static instance: ApiClient
  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient()
    }
    return ApiClient.instance
  }

  async getIcon(params: { domain?: string; url?: string }): Promise<GetIconResponse | null> {
    try {
      const url = new URL(`${API_BASE_URL}/icon`)
      if (params.domain) url.searchParams.append('domain', params.domain)
      if (params.url) url.searchParams.append('url', params.url)

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { accept: 'application/json' }
      })

      if (!res.ok) return null

      const data = (await res.json()) as GetIconResponse
      return data
    } catch (e) {
      console.error('Failed to fetch icon:', e)
      return null
    }
  }
}

export const apiClient = ApiClient.getInstance()
