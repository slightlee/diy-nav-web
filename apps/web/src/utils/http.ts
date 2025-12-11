/* eslint-disable no-console */
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787'
const TIMEOUT = 10000

interface RequestOptions extends RequestInit {
  params?: Record<string, string | undefined>
  timeout?: number
  retries?: number
  retryDelay?: number
  keepalive?: boolean
}

async function http<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { params, timeout = TIMEOUT, retries = 0, retryDelay = 1000, ...init } = options

  const url = new URL(endpoint, baseURL)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value)
      }
    })
  }

  let attempt = 0
  while (attempt <= retries) {
    try {
      const token = localStorage.getItem('auth_token')
      const headers: HeadersInit = {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers
      }

      const res = await fetch(url.toString(), {
        ...init,
        headers,
        signal: AbortSignal.timeout(timeout),
        keepalive: init.keepalive
      })

      const data = await res.json()
      return data as ApiResponse<T>
    } catch (e) {
      attempt++
      const isLastAttempt = attempt > retries
      if (isLastAttempt) {
        console.error(`[HTTP] Request failed: ${endpoint}`, e)
        return {
          success: false,
          message: e instanceof Error ? e.message : 'Network error'
        }
      }

      // Wait before retrying (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt - 1)
      console.warn(`[HTTP] Request failed, retrying in ${delay}ms... (${attempt}/${retries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return { success: false, message: 'Max retries exceeded' }
}

export const request = {
  get: <T>(
    endpoint: string,
    params?: Record<string, string | undefined>,
    options?: Omit<RequestOptions, 'method' | 'params'>
  ) => http<T>(endpoint, { method: 'GET', params, ...options }),
  post: <T, B = unknown>(
    endpoint: string,
    body?: B,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ) => http<T>(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: <T, B = unknown>(
    endpoint: string,
    body?: B,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ) => http<T>(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options }),
  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
    http<T>(endpoint, { method: 'DELETE', ...options })
}
