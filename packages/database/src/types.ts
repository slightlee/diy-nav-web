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

/**
 * Minimal database contract consumed by business services.
 * Provider-specific clients should adapt their native response shape to this interface.
 */
export interface DatabaseClient {
  first<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>
  execute(sql: string, params?: unknown[]): Promise<DatabaseExecuteResult>
  batch(statements: DatabaseStatement[]): Promise<DatabaseExecuteResult[]>
}
