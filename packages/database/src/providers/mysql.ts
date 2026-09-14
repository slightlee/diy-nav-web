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
      charset: 'utf8mb4'
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
