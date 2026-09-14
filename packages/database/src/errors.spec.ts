import { describe, expect, it } from 'vitest'
import {
  DatabaseUnavailableError,
  isDatabaseConnectionFailure,
  isDatabaseUnavailableError,
  wrapDatabaseError
} from './errors.js'

describe('isDatabaseConnectionFailure', () => {
  it('识别 mysql2 连接/握手/认证类错误', () => {
    expect(isDatabaseConnectionFailure({ code: 'ECONNREFUSED' })).toBe(true)
    expect(isDatabaseConnectionFailure({ code: 'PROTOCOL_CONNECTION_LOST' })).toBe(true)
    expect(isDatabaseConnectionFailure({ code: 'HANDSHAKE_NO_SSL_SUPPORT' })).toBe(true)
    expect(isDatabaseConnectionFailure({ code: 'ER_ACCESS_DENIED_ERROR' })).toBe(true)
    expect(isDatabaseConnectionFailure({ code: 'ER_BAD_DB_ERROR' })).toBe(true)
  })

  it('识别仅携带 message 的连接失败错误', () => {
    expect(isDatabaseConnectionFailure(new Error('connect ETIMEDOUT 47.94.155.158:3306'))).toBe(
      true
    )
  })

  it('SQL 业务错误不属于数据库不可用', () => {
    expect(
      isDatabaseConnectionFailure({
        code: 'ER_DUP_ENTRY',
        message: "Duplicate entry 'a' for key 'x'"
      })
    ).toBe(false)
    expect(isDatabaseConnectionFailure(new Error('boom'))).toBe(false)
    expect(isDatabaseConnectionFailure(null)).toBe(false)
  })
})

describe('wrapDatabaseError', () => {
  it('连接类错误包装为 DatabaseUnavailableError 并保留 cause', () => {
    const original = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3306'), {
      code: 'ECONNREFUSED'
    })
    const wrapped = wrapDatabaseError(original)
    expect(wrapped).toBeInstanceOf(DatabaseUnavailableError)
    const dbError = wrapped as DatabaseUnavailableError
    expect(dbError.code).toBe('DATABASE_UNAVAILABLE')
    expect(dbError.cause).toBe(original)
  })

  it('普通错误原样返回', () => {
    const original = new Error('constraint failed')
    expect(wrapDatabaseError(original)).toBe(original)
  })
})

describe('isDatabaseUnavailableError', () => {
  it('识别包装后的错误实例', () => {
    const wrapped = wrapDatabaseError({ code: 'ETIMEDOUT' })
    expect(isDatabaseUnavailableError(wrapped)).toBe(true)
    expect(isDatabaseUnavailableError(new Error('boom'))).toBe(false)
  })

  it('跨模块实例按名称鸭子判断', () => {
    const foreign = { name: 'DatabaseUnavailableError', message: 'x' }
    expect(isDatabaseUnavailableError(foreign)).toBe(true)
  })
})
