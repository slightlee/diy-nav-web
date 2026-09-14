/**
 * 数据库不可用错误：连接失败、握手失败、认证被拒等"数据库本身无法访问"的场景。
 * SQL 语法/约束类错误不属于此列，保持原始错误向上抛。
 *
 * 由各 provider 在抛出前包装，全局错误处理器据此返回 503 + 明确文案，
 * 避免前端只能看到笼统的 500。
 */
export class DatabaseUnavailableError extends Error {
  public readonly code = 'DATABASE_UNAVAILABLE'

  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'DatabaseUnavailableError'
    if (options?.cause !== undefined) {
      this.cause = options.cause
    }
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

interface ErrorLike {
  code?: unknown
  name?: unknown
  message?: unknown
}

const codeOf = (error: ErrorLike): string => (typeof error.code === 'string' ? error.code : '')

/** TCP/网络层失败码（node net/dns 与 mysql2 共用）。 */
const NETWORK_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE'
])

/** mysql2 明确指向"数据库本身不可用"的错误：认证失败、库不存在、连接数耗尽。 */
const MYSQL_UNAVAILABLE_CODES = new Set([
  'ER_ACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
  'ER_HOST_NOT_PRIVILEGED',
  'ER_CON_COUNT_ERROR',
  'ER_TOO_MANY_CONNECTIONS'
])

/** 判断底层错误是否属于"数据库无法访问"。 */
export function isDatabaseConnectionFailure(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const err = error as ErrorLike
  // D1 走 Cloudflare HTTP API：ofetch 抛出 FetchError 即 API 层不可达/被拒/5xx
  if (err.name === 'FetchError') return true
  const code = codeOf(err)
  if (code.startsWith('PROTOCOL_') || code.startsWith('HANDSHAKE_')) return true
  if (NETWORK_ERROR_CODES.has(code)) return true
  if (MYSQL_UNAVAILABLE_CODES.has(code)) return true
  // mysql2 部分连接错误不带 code，message 形如 "connect ECONNREFUSED host:3306"
  const message = typeof err.message === 'string' ? err.message : ''
  return /connect (ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND)/.test(message)
}

/**
 * provider catch 块统一出口：连接类错误包装为 DatabaseUnavailableError，
 * 其余错误原样返回。保留 cause 供日志与调试。
 */
export function wrapDatabaseError(error: unknown): unknown {
  if (isDatabaseConnectionFailure(error)) {
    const message = error instanceof Error ? error.message : String(error)
    return new DatabaseUnavailableError(`数据库连接失败: ${message}`, { cause: error })
  }
  return error
}

/** 跨构建产物（dist/cjs 与 esm）instanceof 可能失效，这里按名称做鸭子判断。 */
export function isDatabaseUnavailableError(error: unknown): boolean {
  return (
    error instanceof DatabaseUnavailableError ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { name?: unknown }).name === 'DatabaseUnavailableError')
  )
}
