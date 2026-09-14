import { describe, expect, it } from 'vitest'
import { extractUpstreamErrorMessage } from './upstream-error.js'

describe('extractUpstreamErrorMessage', () => {
  it('提取 OpenAI 风格 error.message', () => {
    const body = JSON.stringify({
      error: {
        message: 'Incorrect API key provided',
        type: 'invalid_request_error',
        code: 'invalid_api_key'
      }
    })
    expect(extractUpstreamErrorMessage(body)).toBe('Incorrect API key provided')
  })

  it('提取 Anthropic 风格 error.message', () => {
    const body = JSON.stringify({
      type: 'error',
      error: { type: 'authentication_error', message: 'invalid x-api-key' }
    })
    expect(extractUpstreamErrorMessage(body)).toBe('invalid x-api-key')
  })

  it('提取顶层 message / detail 字段', () => {
    expect(extractUpstreamErrorMessage('{"message":"rate limited"}')).toBe('rate limited')
    expect(extractUpstreamErrorMessage('{"detail":"Not Found"}')).toBe('Not Found')
  })

  it('非 JSON 文本压缩空白后原样保留', () => {
    expect(extractUpstreamErrorMessage('<html>\n  Gateway Error\n</html>')).toBe(
      '<html> Gateway Error </html>'
    )
  })

  it('超长内容截断到 200 字符', () => {
    const long = 'x'.repeat(500)
    const result = extractUpstreamErrorMessage(`{"error":{"message":"${long}"}}`)
    expect(result.length).toBe(201)
    expect(result.endsWith('…')).toBe(true)
  })

  it('空内容返回空字符串', () => {
    expect(extractUpstreamErrorMessage('')).toBe('')
    expect(extractUpstreamErrorMessage('   ')).toBe('')
  })
})
