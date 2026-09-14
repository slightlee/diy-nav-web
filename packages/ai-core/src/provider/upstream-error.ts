/**
 * 上游 AI 服务（OpenAI/Anthropic 兼容协议）错误响应体的可读化。
 *
 * 上游返回的错误体通常是整段 JSON（如 {"error":{"message":"Incorrect API key..."}}），
 * 直接拼进 Error.message 会一路透传到前端界面上。这里只提取其中的
 * 人话 message 并截断，避免原始报文外泄。
 */

const MAX_LENGTH = 200

/** 从任意嵌套结构中取第一个非空 message 字段。 */
const pickErrorMessage = (payload: unknown): string => {
  if (typeof payload === 'string') return payload.trim()
  if (Array.isArray(payload)) {
    return payload.map(pickErrorMessage).filter(Boolean).join('; ')
  }
  if (typeof payload !== 'object' || payload === null) return ''
  const record = payload as Record<string, unknown>
  for (const key of ['message', 'error', 'errors', 'detail']) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (value && typeof value === 'object') {
      const nested = pickErrorMessage(value)
      if (nested) return nested
    }
  }
  return ''
}

const truncate = (text: string): string =>
  text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH)}…` : text

/**
 * 把上游错误响应体转成单行可读文本。
 * - JSON 体：提取 message 字段（OpenAI error.message / Anthropic error.message / detail 等）
 * - 非 JSON 体：压缩空白后原样保留
 * - 结果截断到 200 字符
 */
export function extractUpstreamErrorMessage(raw: string): string {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return ''
  try {
    const parsed = JSON.parse(text) as unknown
    const message = pickErrorMessage(parsed)
    if (message) return truncate(message.replace(/\s+/g, ' '))
  } catch {
    // 非 JSON：按纯文本处理
  }
  return truncate(text.replace(/\s+/g, ' '))
}
