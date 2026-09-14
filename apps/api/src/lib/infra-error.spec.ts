import { describe, expect, it } from 'vitest'
import { isNetworkUnavailableError, toFrameworkClientError } from './infra-error.js'
import { DatabaseUnavailableError } from '@nav/database'

// 数据库不可用的判定与包装在 @nav/database 内测试（errors.spec.ts），
// 这里只确认其类型不会被 api 侧的通用网络分类重复吞掉。
describe('api 与 database 错误分类的边界', () => {
  it('DatabaseUnavailableError 不属于 api 侧通用网络错误', () => {
    const wrapped = new DatabaseUnavailableError(
      '数据库连接失败: connect ECONNREFUSED 1.2.3.4:3306'
    )
    expect(isNetworkUnavailableError(wrapped)).toBe(false)
  })

  it('非 DB 外部依赖的 socket 错误归为网络不可用', () => {
    expect(isNetworkUnavailableError({ code: 'ESOCKET', message: 'socket hang up' })).toBe(true)
    expect(isNetworkUnavailableError(new Error('Failed to lookup address'))).toBe(true)
    expect(isNetworkUnavailableError(new Error('boom'))).toBe(false)
  })
})

describe('toFrameworkClientError', () => {
  it('把 Fastify 框架 4xx 错误映射为统一信封', () => {
    expect(
      toFrameworkClientError({
        statusCode: 400,
        code: 'FST_ERR_CTP_EMPTY_JSON_BODY',
        message: 'Body cannot be empty'
      })
    ).toEqual({
      statusCode: 400,
      code: 'FST_ERR_CTP_EMPTY_JSON_BODY',
      message: '请求体不能为空'
    })
  })

  it('未收录的框架错误保留原始 message', () => {
    expect(
      toFrameworkClientError({
        statusCode: 400,
        code: 'FST_ERR_SOMETHING_ELSE',
        message: 'raw detail'
      })
    ).toEqual({
      statusCode: 400,
      code: 'FST_ERR_SOMETHING_ELSE',
      message: 'raw detail'
    })
  })

  it('限流错误映射为中文提示', () => {
    expect(
      toFrameworkClientError({
        statusCode: 429,
        code: 'FST_ERR_RATE_LIMIT',
        message: 'rate limit exceeded'
      })
    ).toMatchObject({ statusCode: 429, message: '请求过于频繁，请稍后再试' })
  })

  it('忽略 5xx、无 statusCode 与非对象错误', () => {
    expect(toFrameworkClientError({ statusCode: 500, code: 'X', message: 'boom' })).toBeNull()
    expect(toFrameworkClientError(new Error('no status'))).toBeNull()
    expect(toFrameworkClientError('str')).toBeNull()
  })
})
