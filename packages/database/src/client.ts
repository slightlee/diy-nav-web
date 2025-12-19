import { ofetch } from 'ofetch'
import { logger } from '@nav/logger'

export interface D1Config {
  accountId: string
  databaseId: string
  apiToken: string
}

export interface D1Result<T = unknown> {
  success: boolean
  result: {
    meta: {
      changed_db: boolean
      changes: number
      duration: number
      last_row_id: number
      rows_read: number
      rows_written: number
      size_after: number
    }
    results: T[]
  }[]
  errors: {
    code: number
    message: string
  }[]
  messages: {
    code: number
    message: string
  }[]
}

export class D1Client {
  private config: D1Config
  private baseUrl: string

  constructor(config: D1Config) {
    this.config = config
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}`
  }

  /**
   * Execute a raw SQL query
   */
  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<D1Result<T>> {
    try {
      const response = await ofetch<D1Result<T>>(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: {
          sql,
          params
        }
      })

      if (!response.success) {
        throw new Error(`D1 Query Error: ${response.errors?.[0]?.message || 'Unknown error'}`)
      }

      return response
    } catch (error) {
      logger.error({ error }, 'D1 Execution Failed')
      throw error
    }
  }

  /**
   * Helper to get the first result from a query
   */
  async first<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
    const res = await this.query<T>(sql, params)
    const rows = res.result?.[0]?.results
    return rows && rows.length > 0 ? rows[0] : null
  }

  /**
   * Helper to get all results from a query
   */
  async all<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.query<T>(sql, params)
    return res.result?.[0]?.results || []
  }

  /**
   * Execute multiple SQL statements in a single batch (Transaction)
   * Note: Since D1 HTTP API does not support parameterized batch queries,
   * we perform client-side parameter inlining (Sanitization) here.
   */
  async batch<T = unknown>(
    statements: { sql: string; params?: unknown[] }[]
  ): Promise<D1Result<T>> {
    try {
      // Inline parameters for each statement
      const sql = statements
        .map(stmt => {
          const query = stmt.sql
          const params = stmt.params || []

          // Naive but effective replacement for named/positional params
          // We assume '?' matches the order of params
          let paramIdx = 0
          return query.replace(/\?/g, () => {
            if (paramIdx >= params.length) {
              throw new Error(`Parameter mismatch: Expected more params for statement: ${query}`)
            }
            const val = params[paramIdx++]
            return this.escapeSqlValue(val)
          })
        })
        .join('; ')

      const response = await ofetch<D1Result<T>>(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: {
          sql,
          params: [] // Params are already inlined
        }
      })

      if (!response.success) {
        throw new Error(`D1 Batch Error: ${response.errors?.[0]?.message || 'Unknown error'}`)
      }

      return response
    } catch (error: unknown) {
      const errorDetail = this.extractErrorDetail(error)
      logger.error({ error: errorDetail }, 'D1 Batch Execution Failed')
      throw error
    }
  }

  /**
   * Safe SQL Value Escaping
   * Handles check for null, number, string (single quote escape), etc.
   */
  private escapeSqlValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'NULL'
    }

    if (typeof value === 'number') {
      // Reject NaN, Infinity, -Infinity to prevent injection via special values
      if (!Number.isFinite(value)) {
        throw new Error('Invalid number value: must be finite')
      }
      return value.toString()
    }

    if (typeof value === 'boolean') {
      return value ? '1' : '0'
    }

    if (value instanceof Date) {
      return value.getTime().toString()
    }

    if (typeof value === 'string') {
      // Detect potentially dangerous SQL patterns
      if (/;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE)/i.test(value)) {
        throw new Error('Potentially dangerous SQL pattern detected in value')
      }
      // Standard SQL string escaping: replace ' with ''
      return `'${value.replace(/'/g, "''")}'`
    }

    // Fallback for objects/arrays -> JSON stringify
    if (typeof value === 'object') {
      const jsonStr = JSON.stringify(value)
      // Also check JSON string for dangerous patterns
      if (/;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE)/i.test(jsonStr)) {
        throw new Error('Potentially dangerous SQL pattern detected in object value')
      }
      return `'${jsonStr.replace(/'/g, "''")}'`
    }

    return `'${String(value).replace(/'/g, "''")}'`
  }

  /**
   * Safely extract error details from unknown error objects (e.g. ofetch errors)
   */
  private extractErrorDetail(error: unknown): unknown {
    if (typeof error === 'object' && error !== null) {
      // Use loose typing for extraction to avoid 'any' but handle potential shapes
      const err = error as { data?: unknown; response?: { _data?: unknown }; message?: string }
      return err.data || err.response?._data || err.message
    }
    return String(error)
  }
}
