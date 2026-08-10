import { logger } from '@nav/logger'
import { captureAccountSession } from '@/utils/account-session'

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  code?: string
}

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787'
// Use 30s timeout to accommodate slow external OAuth API calls
const TIMEOUT = 30000

interface RequestOptions extends RequestInit {
  params?: Record<string, string | undefined>
  timeout?: number
  retries?: number
  retryDelay?: number
  keepalive?: boolean
  skipUnauthorizedHandler?: boolean
}

type UnauthorizedHandler = () => void

class HttpClient {
  private unauthorizedHandlers: UnauthorizedHandler[] = []
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

  private handleUnauthorized() {
    this.unauthorizedHandlers.forEach(handler => handler())
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit & { timeout?: number }
  ): Promise<Response> {
    const { timeout = this.defaultTimeout, ...init } = options

    const timeoutSignal = AbortSignal.timeout(timeout)
    const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal

    return fetch(url, {
      ...init,
      credentials: init.credentials ?? 'include',
      signal
    })
  }

  private getHeaders(options: RequestOptions): HeadersInit {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>)
    }

    // Only set Content-Type: application/json if there is a body
    // Fastify throws FST_ERR_CTP_EMPTY_JSON_BODY if Content-Type is json but body is empty
    if (options.body) {
      headers['Content-Type'] = 'application/json'
    }

    return headers
  }

  private waitForRetry(delay: number, signal: AbortSignal): Promise<void> {
    return new Promise(resolve => {
      const finish = () => {
        window.clearTimeout(timer)
        signal.removeEventListener('abort', finish)
        resolve()
      }

      const timer = window.setTimeout(finish, delay)
      signal.addEventListener('abort', finish, { once: true })
      if (signal.aborted) finish()
    })
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
    const {
      params,
      retries = 0,
      retryDelay = 1000,
      skipUnauthorizedHandler = false,
      ...init
    } = options
    const url = this.buildUrl(endpoint, params)
    const accountSession = captureAccountSession()
    const signal = init.signal
      ? AbortSignal.any([init.signal, accountSession.signal])
      : accountSession.signal

    let attempt = 0
    while (attempt <= retries) {
      try {
        const headers = this.getHeaders(options)
        const response = await this.fetchWithTimeout(url, { ...init, headers, signal })

        if (response.status === 401) {
          if (!skipUnauthorizedHandler) {
            this.handleUnauthorized()
          }
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
        if (accountSession.signal.aborted) {
          return {
            success: false,
            message: '账号已切换，请重新操作',
            code: 'ACCOUNT_CONTEXT_CHANGED'
          }
        }
        if (signal.aborted) {
          return {
            success: false,
            message: '请求已取消',
            code: 'REQUEST_ABORTED'
          }
        }

        attempt++
        const isLastAttempt = attempt > retries

        if (isLastAttempt) {
          logger.error({ err: e }, `[HTTP] Request failed: ${endpoint}`)
          if (
            (e instanceof DOMException && e.name === 'TimeoutError') ||
            (e instanceof Error && /timed out|timeout/i.test(e.message))
          ) {
            return {
              success: false,
              message: '请求超时，AI 服务暂时没有响应，请稍后重试'
            }
          }
          return {
            success: false,
            message: e instanceof Error ? e.message : 'Network error'
          }
        }

        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1)
        logger.warn(`[HTTP] Request failed, retrying in ${delay}ms... (${attempt}/${retries})`)
        await this.waitForRetry(delay, signal)
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

  patch<T, B = unknown>(
    endpoint: string,
    body?: B,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ) {
    return this.http<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body), ...options })
  }

  delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>) {
    return this.http<T>(endpoint, { method: 'DELETE', ...options })
  }
}

export const request = new HttpClient(baseURL)
