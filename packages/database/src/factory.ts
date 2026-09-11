import { D1Client, type D1ClientConfig } from './providers/d1.js'
import { MysqlClient, type MysqlClientConfig } from './providers/mysql.js'
import type { DatabaseClient } from './types.js'

export type CreateDatabaseClientOptions = D1DatabaseClientOptions | MysqlDatabaseClientOptions

export interface D1DatabaseClientOptions {
  provider: 'd1'
  config: D1ClientConfig
}

export interface MysqlDatabaseClientOptions {
  provider: 'mysql'
  config: MysqlClientConfig
}

/**
 * Create a database client from provider-specific options.
 * Add new providers by extending CreateDatabaseClientOptions and this switch.
 */
export function createDatabaseClient(options: CreateDatabaseClientOptions): DatabaseClient {
  switch (options.provider) {
    case 'd1':
      return new D1Client(options.config)
    case 'mysql':
      return new MysqlClient(options.config)
    default: {
      const exhaustive: never = options
      throw new Error(`Unsupported database provider: ${JSON.stringify(exhaustive)}`)
    }
  }
}
