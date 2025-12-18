import { logger } from '@nav/logger'

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  code?: string
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

type UnauthorizedHandler = () => void
type TokenRefreshedHandler = (token: string) => void

class HttpClient {
  private unauthorizedHandlers: UnauthorizedHandler[] = []
  private tokenRefreshedHandlers: TokenRefreshedHandler[] = []
  private defaultTimeout: number

  constructor(
    private baseUrl: string,
    timeout = TIMEOUT
  ) {
    this.defaultTimeout = timeout
  }

  public onUnauthorized(handler: UnauthorizedHandler) {
    this.unauthorizedHandlers.push(handler)
  }

  public onTokenRefreshed(handler: TokenRefreshedHandler) {
    this.tokenRefreshedHandlers.push(handler)
  }

  private handleUnauthorized() {
    this.unauthorizedHandlers.forEach(handler => handler())
  }

  private handleTokenRefreshed(token: string) {
    this.tokenRefreshedHandlers.forEach(handler => handler(token))
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit & { timeout?: number }
  ): Promise<Response> {
    const { timeout = this.defaultTimeout, ...init } = options

    // Use AbortSignal.timeout if available (recent browsers/Node), otherwise fallback
    const signal = AbortSignal.timeout(timeout)

    return fetch(url, {
      ...init,
      signal
    })
  }

  private getHeaders(options: RequestOptions): HeadersInit {
    const token = localStorage.getItem('auth_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  }

  private buildUrl(endpoint: string, params?: Record<string, string | undefined>): string {
    // Support relative base URL (e.g., /api) by resolving it against the current origin
    const base = this.baseUrl.startsWith('http')
      ? this.baseUrl
      : `${window.location.origin}${this.baseUrl.startsWith('/') ? '' : '/'}${this.baseUrl}`

    const url = new URL(endpoint, base)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, value)
        }
      })
    }
    return url.toString()
  }

  async http<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, retries = 0, retryDelay = 1000, ...init } = options
    const url = this.buildUrl(endpoint, params)

    let attempt = 0
    while (attempt <= retries) {
      try {
        const headers = this.getHeaders(options)
        const response = await this.fetchWithTimeout(url, { ...init, headers })

        // Constants
        const TOKEN_HEADER_NAME = 'x-nav-token'

        // ...
        // Auto-renew token from header
        const newToken = response.headers.get(TOKEN_HEADER_NAME)
        if (newToken) {
          localStorage.setItem('auth_token', newToken)
          this.handleTokenRefreshed(newToken)
        }

        if (response.status === 401) {
          this.handleUnauthorized()
          return {
            success: false,
            message: 'Unauthorized',
            code: 'UNAUTHORIZED'
          }
        }

        const data = await response.json()

        // Enhance: If success is explicitly false in data, we can log it here?
        // But for now, just return data as is, trusting server structure.
        return data as ApiResponse<T>
      } catch (e: unknown) {
        attempt++
        const isLastAttempt = attempt > retries

        if (isLastAttempt) {
          logger.error({ err: e }, `[HTTP] Request failed: ${endpoint}`)
          return {
            success: false,
            message: e instanceof Error ? e.message : 'Network error'
          }
        }

        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1)
        logger.warn(`[HTTP] Request failed, retrying in ${delay}ms... (${attempt}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return { success: false, message: 'Max retries exceeded' }
  }

  get<T>(
    endpoint: string,
    params?: Record<string, string | undefined>,
    options?: Omit<RequestOptions, 'method' | 'params'>
  ) {
    return this.http<T>(endpoint, { method: 'GET', params, ...options })
  }

  post<T, B = unknown>(
    endpoint: string,
    body?: B,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ) {
    return this.http<T>(endpoint, { method: 'POST', body: JSON.stringify(body), ...options })
  }

  put<T, B = unknown>(
    endpoint: string,
    body?: B,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ) {
    return this.http<T>(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options })
  }

  delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>) {
    return this.http<T>(endpoint, { method: 'DELETE', ...options })
  }
}

export const request = new HttpClient(baseURL)
