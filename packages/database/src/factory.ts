import { D1Client, type D1ClientConfig } from './providers/d1.js'
import type { DatabaseClient } from './types.js'

export type CreateDatabaseClientOptions = D1DatabaseClientOptions

export interface D1DatabaseClientOptions {
  provider: 'd1'
  config: D1ClientConfig
}

/**
 * Create a database client from provider-specific options.
 * Add new providers by extending CreateDatabaseClientOptions and this switch.
 */
export function createDatabaseClient(options: CreateDatabaseClientOptions): DatabaseClient {
  switch (options.provider) {
    case 'd1':
      return new D1Client(options.config)
    default: {
      const exhaustive: never = options.provider
      throw new Error(`Unsupported database provider: ${exhaustive}`)
    }
  }
}
