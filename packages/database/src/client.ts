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
}
