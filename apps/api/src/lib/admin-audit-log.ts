/**
 * AdminAuditLogService
 *
 * 后台管理操作的审计日志：写操作成功后落库（admin_audit_logs 表），
 * 同时输出一条 pino 结构化日志（level: info），双保险。
 *
 * 设计约束：
 * - 审计写入失败绝不影响业务操作：log() 内部吞错并降级为日志告警。
 * - detail 字段只允许放脱敏后的摘要（如开关状态、角色变化），
 *   禁止写入密码/密钥/secret 等敏感值。
 * - 表结构双方言兼容（MySQL / D1 sqlite），与 backup 表同款分支。
 */
import type { DatabaseClient } from '@nav/database'
import { ensureIndex } from '@nav/database'
import { logger } from '@nav/logger'

/** 审计动作全集：admin 侧写操作 + 登录安全事件。 */
export const AUDIT_ACTIONS = [
  'ADMIN_USER_ROLE_UPDATE',
  'ADMIN_USER_STATUS_UPDATE',
  'ADMIN_OAUTH_CONFIG_UPDATE',
  'ADMIN_STORAGE_CONFIG_UPDATE',
  'ADMIN_SITE_SETTINGS_UPDATE',
  'ADMIN_STORAGE_CONNECTION_TEST',
  'AUTH_LOGIN_SUCCESS',
  'AUTH_LOGIN_FAILED',
  'AUTH_PASSWORD_RESET'
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export interface AuditLogEvent {
  actorUserId: string | null
  actorEmail?: string | null
  action: AuditAction
  /** 操作对象类型：user / oauth / storage / site / auth */
  targetType?: string
  targetId?: string
  /** 人类可读摘要，用于列表展示 */
  summary: string
  /** 脱敏后的结构化细节（JSON 序列化存储） */
  detail?: Record<string, unknown>
  ip?: string | null
  /** 默认 true；置 false 时只输出 pino 日志、不落库（用于高频安全事件，避免刷表） */
  persist?: boolean
}

export interface AuditLogRow {
  id: number
  actor_user_id: string | null
  actor_email: string | null
  action: string
  target_type: string | null
  target_id: string | null
  summary: string
  detail: string | null
  ip: string | null
  created_at: number
}

export interface AuditLogListParams {
  action?: string
  limit: number
  offset: number
}

export interface AuditLogListResult {
  items: Array<{
    id: number
    actorUserId: string | null
    actorEmail: string | null
    action: AuditAction
    targetType: string | null
    targetId: string | null
    summary: string
    detail: Record<string, unknown> | null
    ip: string | null
    createdAt: number
  }>
  total: number
}

const MAX_DETAIL_LENGTH = 2000

export class AdminAuditLogService {
  constructor(private readonly db: DatabaseClient) {}

  async initTable(): Promise<void> {
    const idColumn =
      this.db.dialect === 'mysql'
        ? 'id BIGINT AUTO_INCREMENT PRIMARY KEY'
        : 'id INTEGER PRIMARY KEY AUTOINCREMENT'
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        ${idColumn},
        actor_user_id VARCHAR(64),
        actor_email   VARCHAR(255),
        action        VARCHAR(64) NOT NULL,
        target_type   VARCHAR(32),
        target_id     VARCHAR(128),
        summary       VARCHAR(512) NOT NULL,
        detail        TEXT,
        ip            VARCHAR(64),
        created_at    BIGINT NOT NULL
      )
    `)
    await ensureIndex(this.db, 'idx_admin_audit_logs_created_at', 'admin_audit_logs', [
      'created_at'
    ])
    await ensureIndex(this.db, 'idx_admin_audit_logs_action', 'admin_audit_logs', ['action'])
  }

  /**
   * 记录一条审计事件：落库 + 结构化日志。
   * 落库失败不抛出（审计不能让业务操作失败），只告警。
   */
  async log(event: AuditLogEvent): Promise<void> {
    logger.info(
      {
        audit: {
          actor: event.actorEmail || event.actorUserId || 'anonymous',
          action: event.action,
          targetType: event.targetType,
          targetId: event.targetId,
          summary: event.summary,
          ip: event.ip
        }
      },
      '[Audit]'
    )

    if (event.persist === false) return

    try {
      const detail = event.detail ? JSON.stringify(event.detail) : null
      await this.db.execute(
        `INSERT INTO admin_audit_logs
         (actor_user_id, actor_email, action, target_type, target_id, summary, detail, ip, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.actorUserId,
          event.actorEmail ?? null,
          event.action,
          event.targetType ?? null,
          event.targetId ?? null,
          event.summary.slice(0, 512),
          detail ? detail.slice(0, MAX_DETAIL_LENGTH) : null,
          event.ip ?? null,
          Date.now()
        ]
      )
    } catch (error) {
      logger.error({ err: error, action: event.action }, '[Audit] Failed to persist audit log')
    }
  }

  /** 分页查询审计日志（倒序），支持按动作筛选。 */
  async list(params: AuditLogListParams): Promise<AuditLogListResult> {
    const where = params.action ? 'WHERE action = ?' : ''
    const filterParams = params.action ? [params.action] : []

    const countRows = await this.db.all<{ count: number | string }>(
      `SELECT COUNT(*) AS count FROM admin_audit_logs ${where}`,
      filterParams
    )
    const total = Number(countRows[0]?.count ?? 0)

    const rows = await this.db.all<AuditLogRow>(
      `SELECT * FROM admin_audit_logs ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...filterParams, params.limit, params.offset]
    )

    return {
      items: rows.map(row => ({
        id: row.id,
        actorUserId: row.actor_user_id,
        actorEmail: row.actor_email,
        action: row.action as AuditAction,
        targetType: row.target_type,
        targetId: row.target_id,
        summary: row.summary,
        detail: this.parseDetail(row.detail),
        ip: row.ip,
        createdAt: row.created_at
      })),
      total
    }
  }

  private parseDetail(raw: string | null): Record<string, unknown> | null {
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as unknown
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }
}
