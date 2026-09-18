import { createPool, type Pool } from 'mysql2/promise'
import { logger } from '@nav/logger'
import { wrapDatabaseError } from '../errors.js'
import type {
  DatabaseClient,
  DatabaseDialect,
  DatabaseExecuteResult,
  DatabaseStatement
} from '../types.js'

export interface MysqlClientConfig {
  host: string
  port?: number
  user: string
  password?: string
  database: string
  /** 连接池大小，默认 10。自部署单实例足够。 */
  connectionLimit?: number
}

/**
 * 连接池稳定性参数。
 * 本地/云主机连远程 MySQL 时，中间设备（NAT、防火墙、云安全组）会静默
 * 掐断空闲 TCP 连接——死连接留在池里被复用就表现为请求级 read ETIMEDOUT，
 * 只能重启进程恢复。三层防御：
 * - enableKeepAlive：TCP 层心跳保活，穿越 NAT 并尽早感知断连
 * - keepAliveInitialDelay：心跳起始间隔
 * - maxIdle：池内常驻连接数收紧，空闲连接更少地暴露给中间设备
 */
const POOL_STABILITY_OPTIONS = {
  enableKeepAlive: true,
  keepAliveInitialDelay: 30_000,
  maxIdle: 5,
  idleTimeout: 60_000,
  connectTimeout: 10_000
} as const

/**
 * MySQL implementation of DatabaseClient (mysql2 connection pool).
 *
 * - 使用 pool.query（客户端侧参数转义）而非 prepare，保证 DDL 与各类语句通用
 * - batch 在单连接上以显式事务执行，保持 D1 batch 的原子语义
 */
export class MysqlClient implements DatabaseClient {
  readonly dialect: DatabaseDialect = 'mysql'

  private pool: Pool

  constructor(config: MysqlClientConfig) {
    this.pool = createPool({
      host: config.host,
      port: config.port ?? 3306,
      user: config.user,
      password: config.password ?? '',
      database: config.database,
      connectionLimit: config.connectionLimit ?? 10,
      charset: 'utf8mb4',
      ...POOL_STABILITY_OPTIONS
    })
  }

  async execute(sql: string, params: unknown[] = []): Promise<DatabaseExecuteResult> {
    try {
      const [header] = await this.pool.query(sql, params)
      const result = header as { affectedRows?: number; insertId?: number }
      return {
        changes: result.affectedRows,
        lastInsertRowid: result.insertId
      }
    } catch (error) {
      logger.error({ err: error, sql }, 'MySQL Execution Failed')
      throw wrapDatabaseError(error)
    }
  }

  async first<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.all<T>(sql, params)
    return rows.length > 0 ? rows[0] : null
  }

  async all<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    try {
      const [rows] = await this.pool.query(sql, params)
      return (Array.isArray(rows) ? rows : []) as T[]
    } catch (error) {
      logger.error({ err: error, sql }, 'MySQL Query Failed')
      throw wrapDatabaseError(error)
    }
  }

  /**
   * Execute multiple statements atomically in a single connection transaction,
   * matching the implicit-transaction semantics of the D1 batch API.
   */
  async batch(statements: DatabaseStatement[]): Promise<DatabaseExecuteResult[]> {
    if (statements.length === 0) return []

    let connection
    try {
      connection = await this.pool.getConnection()
    } catch (error) {
      logger.error({ err: error }, 'MySQL Connection Acquisition Failed')
      throw wrapDatabaseError(error)
    }
    try {
      await connection.beginTransaction()
      const results: DatabaseExecuteResult[] = []
      for (const statement of statements) {
        const [header] = await connection.query(statement.sql, statement.params ?? [])
        const result = header as { affectedRows?: number; insertId?: number }
        results.push({
          changes: result.affectedRows,
          lastInsertRowid: result.insertId
        })
      }
      await connection.commit()
      return results
    } catch (error) {
      await connection.rollback()
      logger.error({ err: error }, 'MySQL Batch Execution Failed')
      throw wrapDatabaseError(error)
    } finally {
      connection.release()
    }
  }
}
