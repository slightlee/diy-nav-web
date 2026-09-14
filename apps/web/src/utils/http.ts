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

  /**
   * 解析响应体为统一信封。
   * 网关/代理故障时可能返回 HTML 错误页，直接 response.json() 会抛出
   * "Unexpected token '<'..."，这里按 HTTP 状态映射为可读的中文提示。
   */
  private async parseResponse<T>(response: Response, endpoint: string): Promise<ApiResponse<T>> {
    const text = await response.text()
    try {
      return JSON.parse(text) as ApiResponse<T>
    } catch {
      logger.warn(
        `[HTTP] Non-JSON response (${response.status}) from ${endpoint}: ${text.slice(0, 120)}`
      )
      if (response.status >= 500) {
        return { success: false, code: 'BAD_GATEWAY', message: '服务暂时不可用，请稍后重试' }
      }
      if (response.status === 401) {
        return { success: false, code: 'UNAUTHORIZED', message: '登录状态已失效，请重新登录' }
      }
      if (response.status === 404) {
        return { success: false, code: 'NOT_FOUND', message: '请求的接口不存在' }
      }
      return { success: false, code: 'HTTP_ERROR', message: `请求失败（HTTP ${response.status}）` }
    }
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
          // 登录失败与会话过期共用 401：响应体本身就是统一信封，
          // 保留服务端的真实 code 与文案，不要在这里覆盖
          return this.parseResponse<T>(response, endpoint)
        }

        const data = await this.parseResponse<T>(response, endpoint)

        // Enhance: If success is explicitly false in data, we can log it here?
        // But for now, just return data as is, trusting server structure.
        return data
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
              code: 'REQUEST_TIMEOUT',
              message: '请求超时，服务暂时没有响应，请稍后重试'
            }
          }
          // 浏览器网络层失败的 message（"Failed to fetch" 等）对用户没有意义
          return {
            success: false,
            code: 'NETWORK_ERROR',
            message: '网络连接失败，请检查网络后重试'
          }
        }

        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1)
        logger.warn(`[HTTP] Request failed, retrying in ${delay}ms... (${attempt}/${retries})`)
        await this.waitForRetry(delay, signal)
      }
    }

    return { success: false, code: 'MAX_RETRIES_EXCEEDED', message: '请求多次失败，请稍后重试' }
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
