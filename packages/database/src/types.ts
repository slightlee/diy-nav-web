/**
 * Provider-agnostic SQL statement used by database implementations.
 */
export interface DatabaseStatement {
  sql: string
  params?: unknown[]
}

/**
 * Normalized mutation metadata returned by database implementations.
 */
export interface DatabaseExecuteResult {
  changes?: number
  lastInsertRowid?: number
}

/** SQL 方言族：sqlite 系（D1）与 mysql 系语法差异由调用方按此分支。 */
export type DatabaseDialect = 'sqlite' | 'mysql'

/**
 * Minimal database contract consumed by business services.
 * Provider-specific clients should adapt their native response shape to this interface.
 */
export interface DatabaseClient {
  /** 语句方言；需要方言差异（upsert/DDL）的调用方据此分支。 */
  readonly dialect: DatabaseDialect
  first<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>
  execute(sql: string, params?: unknown[]): Promise<DatabaseExecuteResult>
  batch(statements: DatabaseStatement[]): Promise<DatabaseExecuteResult[]>
}
