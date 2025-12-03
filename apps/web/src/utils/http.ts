export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

const BASE_URL = import.meta.env.VITE_ICON_API_URL || 'http://localhost:8787'
const TIMEOUT = 10000

interface RequestOptions extends RequestInit {
  params?: Record<string, string | undefined>
}

async function http<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { params, ...init } = options

  const url = new URL(endpoint, BASE_URL)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value)
      }
    })
  }

  try {
    const res = await fetch(url.toString(), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers
      },
      signal: AbortSignal.timeout(TIMEOUT)
    })

    const data = await res.json()
    return data as ApiResponse<T>
  } catch (e) {
    console.error(`[HTTP] Request failed: ${endpoint}`, e)
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Network error'
    }
  }
}

export const request = {
  get: <T>(endpoint: string, params?: Record<string, string | undefined>) =>
    http<T>(endpoint, { method: 'GET', params }),
  post: <T, B = unknown>(endpoint: string, body?: B) =>
    http<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T, B = unknown>(endpoint: string, body?: B) =>
    http<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => http<T>(endpoint, { method: 'DELETE' })
}
