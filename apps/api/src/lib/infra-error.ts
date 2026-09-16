/**
 * 基础设施错误分类。
 *
 * 全局错误处理器把底层错误（外部依赖网络中断、Fastify 框架 4xx）
 * 归一化为面向客户端的状态码与文案；原始错误只进日志，不透传。
 * 数据库不可用的判定与包装在 @nav/database 内完成（见 DatabaseUnavailableError）。
 */

export interface NormalizedInfraError {
  statusCode: number
  code: string
  message: string
}

interface ErrorLike {
  code?: unknown
  message?: unknown
  statusCode?: unknown
}

const asErrorLike = (error: unknown): ErrorLike | null =>
  typeof error === 'object' && error !== null ? (error as ErrorLike) : null

const codeOf = (error: ErrorLike): string => (typeof error.code === 'string' ? error.code : '')

const messageOf = (error: ErrorLike): string =>
  typeof error.message === 'string' ? error.message : ''

/** TCP/网络层失败码，见 node net/dns。 */
const NETWORK_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
  'ESOCKET'
])

/** 非 DB 的外部依赖网络失败（SMTP、OAuth 上游等）。 */
export function isNetworkUnavailableError(error: unknown): boolean {
  const err = asErrorLike(error)
  if (!err) return false
  if (NETWORK_ERROR_CODES.has(codeOf(err))) return true
  const message = messageOf(err)
  if (/Failed to (fetch|lookup)|socket (hang up|closed)|network/i.test(message)) return true
  return false
}

/** Fastify 框架自带 4xx 错误 → 客户端可读文案；未收录的保留原始 message。 */
const FRAMEWORK_ERROR_MESSAGES: Record<string, string> = {
  FST_ERR_CTP_EMPTY_JSON_BODY: '请求体不能为空',
  FST_ERR_CTP_INVALID_MEDIA_TYPE: '请求的 Content-Type 不受支持',
  FST_ERR_CTP_INVALID_JSON: '请求体不是合法的 JSON',
  FST_ERR_CTP_INVALID_JSON_BODY: '请求体不是合法的 JSON',
  FST_ERR_RATE_LIMIT: '请求过于频繁，请稍后再试'
}

/**
 * 识别"框架产生的 4xx 错误"（有 4xx statusCode 但没有 validation 数组、
 * 也不是业务 AppError），返回统一信封所需字段；非框架错误返回 null。
 */
export function toFrameworkClientError(error: unknown): NormalizedInfraError | null {
  const err = asErrorLike(error)
  if (!err) return null
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : NaN
  if (!Number.isFinite(statusCode) || statusCode < 400 || statusCode >= 500) return null
  const code = codeOf(err) || 'REQUEST_ERROR'
  // @fastify/rate-limit 抛出的错误没有 code 字段，按状态码归中文文案
  const message =
    statusCode === 429
      ? '请求过于频繁，请稍后再试'
      : (FRAMEWORK_ERROR_MESSAGES[code] ?? messageOf(err) ?? '请求不合法')
  return {
    statusCode,
    code,
    message
  }
}
