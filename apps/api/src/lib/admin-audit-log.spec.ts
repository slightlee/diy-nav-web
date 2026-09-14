import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '@nav/database'
import { AdminAuditLogService, type AuditLogEvent } from './admin-audit-log.js'

const createDbMock = (): DatabaseClient => ({
  dialect: 'mysql',
  first: vi.fn(async () => null),
  all: vi.fn(async () => []),
  execute: vi.fn(async () => ({})),
  batch: vi.fn(async () => [])
})

const event: AuditLogEvent = {
  actorUserId: 'admin-1',
  actorEmail: 'admin@test.com',
  action: 'ADMIN_SITE_SETTINGS_UPDATE',
  targetType: 'site',
  summary: '更新站点配置',
  detail: { changedKeys: ['siteName'] },
  ip: '1.2.3.4'
}

describe('AdminAuditLogService', () => {
  let db: ReturnType<typeof createDbMock>
  let service: AdminAuditLogService

  beforeEach(() => {
    db = createDbMock()
    service = new AdminAuditLogService(db)
  })

  it('initTable 建表与索引', async () => {
    await service.initTable()
    const statements = db.execute.mock.calls.map(call => call[0] as string)
    expect(
      statements.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS admin_audit_logs'))
    ).toBe(true)
    // ensureIndex 走 information_schema 查询 + CREATE INDEX
    expect(statements.some(sql => sql.includes('idx_admin_audit_logs_created_at'))).toBe(true)
    expect(statements.some(sql => sql.includes('idx_admin_audit_logs_action'))).toBe(true)
  })

  it('log 落库：detail JSON 序列化，参数完整', async () => {
    await service.log(event)
    expect(db.execute).toHaveBeenCalledTimes(1)
    const [sql, params] = db.execute.mock.calls[0]
    expect(sql).toContain('INSERT INTO admin_audit_logs')
    expect(params).toEqual([
      'admin-1',
      'admin@test.com',
      'ADMIN_SITE_SETTINGS_UPDATE',
      'site',
      null,
      '更新站点配置',
      JSON.stringify({ changedKeys: ['siteName'] }),
      '1.2.3.4',
      expect.any(Number)
    ])
  })

  it('persist:false 只打日志不落库', async () => {
    await service.log({ ...event, action: 'AUTH_LOGIN_FAILED', persist: false })
    expect(db.execute).not.toHaveBeenCalled()
  })

  it('落库失败不抛出（审计不能拖垮业务）', async () => {
    db.execute.mockRejectedValueOnce(new Error('db down'))
    await expect(service.log(event)).resolves.toBeUndefined()
  })

  it('detail 超长截断', async () => {
    await service.log({ ...event, detail: { blob: 'x'.repeat(5000) } })
    const [, params] = db.execute.mock.calls[0]
    expect((params as unknown[])[6]).toBeTypeOf('string')
    expect((params as string[])[6].length).toBeLessThanOrEqual(2000)
  })

  it('list 支持按 action 筛选并映射 snake_case → camelCase', async () => {
    db.all.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([
      {
        id: 1,
        actor_user_id: 'admin-1',
        actor_email: 'a@b.c',
        action: 'ADMIN_SITE_SETTINGS_UPDATE',
        target_type: 'site',
        target_id: null,
        summary: '更新站点配置',
        detail: '{"changedKeys":["siteName"]}',
        ip: '1.2.3.4',
        created_at: 1700000000000
      }
    ])

    const result = await service.list({
      action: 'ADMIN_SITE_SETTINGS_UPDATE',
      limit: 20,
      offset: 0
    })

    expect(result.total).toBe(1)
    expect(result.items[0]).toMatchObject({
      actorUserId: 'admin-1',
      action: 'ADMIN_SITE_SETTINGS_UPDATE',
      summary: '更新站点配置',
      detail: { changedKeys: ['siteName'] },
      createdAt: 1700000000000
    })
    const [, filterParams] = db.all.mock.calls[0]
    expect(filterParams).toEqual(['ADMIN_SITE_SETTINGS_UPDATE'])
  })

  it('detail 非法 JSON 时返回 null 而不是抛错', async () => {
    db.all.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([
      {
        id: 1,
        actor_user_id: null,
        actor_email: null,
        action: 'AUTH_LOGIN_FAILED',
        target_type: null,
        target_id: null,
        summary: 's',
        detail: 'not-json',
        ip: null,
        created_at: 1
      }
    ])
    const result = await service.list({ limit: 20, offset: 0 })
    expect(result.items[0].detail).toBeNull()
  })
})
