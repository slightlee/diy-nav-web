import type { AxiosInstance } from 'axios'
import type { DatabaseClient } from '@nav/database'
import { decrypt, encrypt } from '@nav/ai-core'
import {
  GitHubProvider,
  GoogleProvider,
  LinuxDoProvider,
  type IOAuthProvider
} from '@nav/auth-providers'

export const OAUTH_PROVIDER_NAMES = ['github', 'google', 'linuxdo'] as const

export type OAuthProviderName = (typeof OAUTH_PROVIDER_NAMES)[number]

type OAuthProviderConfigRow = {
  provider: OAuthProviderName
  enabled: number
  client_id: string
  client_secret_encrypted: string
  redirect_uri: string
  created_at: number
  updated_at: number
}

export interface PublicOAuthProviderConfig {
  provider: OAuthProviderName
  clientId: string
  redirectUri: string
}

export interface UpdateOAuthProviderConfig {
  enabled: boolean
  clientId: string
  clientSecret: string
  redirectUri: string
}

export class OAuthProviderConfigError extends Error {}

export class OAuthProviderConfigService {
  private publicConfigs: PublicOAuthProviderConfig[] | null = null
  private publicConfigsExpireAt = 0

  constructor(
    private readonly db: DatabaseClient,
    private readonly httpClient: AxiosInstance,
    private readonly encryptionKey: string
  ) {}

  async initTable(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS oauth_provider_configs (
        provider TEXT PRIMARY KEY CHECK (provider IN ('github', 'google', 'linuxdo')),
        enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
        client_id TEXT NOT NULL,
        client_secret_encrypted TEXT NOT NULL,
        redirect_uri TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `)
  }

  async listPublic(): Promise<PublicOAuthProviderConfig[]> {
    if (this.publicConfigs && Date.now() < this.publicConfigsExpireAt) {
      return this.publicConfigs
    }

    const rows = await this.listRows(true)
    return this.cachePublicConfigs(rows)
  }

  async validateEnabledProviders(): Promise<void> {
    const rows = await this.listRows(true)
    rows.forEach(row => this.createProvider(row))
    this.cachePublicConfigs(rows)
  }

  private cachePublicConfigs(rows: OAuthProviderConfigRow[]): PublicOAuthProviderConfig[] {
    this.publicConfigs = rows.map(row => ({
      provider: row.provider,
      clientId: row.client_id,
      redirectUri: row.redirect_uri
    }))
    this.publicConfigsExpireAt = Date.now() + 60_000
    return this.publicConfigs
  }

  async getEnabledProvider(provider: OAuthProviderName): Promise<IOAuthProvider | null> {
    const row = await this.findRow(provider)
    return row?.enabled === 1 ? this.createProvider(row) : null
  }

  async update(provider: OAuthProviderName, input: UpdateOAuthProviderConfig): Promise<void> {
    const clientId = input.clientId.trim()
    const redirectUri = input.redirectUri.trim()
    const clientSecret = input.clientSecret.trim()

    if (!clientId || !clientSecret || !redirectUri) {
      throw new OAuthProviderConfigError('Client ID、Client Secret 和回调地址不能为空')
    }

    const now = Date.now()
    const encryptedSecret = encrypt(clientSecret, this.encryptionKey)
    await this.db.execute(
      `INSERT INTO oauth_provider_configs
         (provider, enabled, client_id, client_secret_encrypted, redirect_uri, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(provider) DO UPDATE SET
         enabled = excluded.enabled,
         client_id = excluded.client_id,
         client_secret_encrypted = excluded.client_secret_encrypted,
         redirect_uri = excluded.redirect_uri,
         updated_at = excluded.updated_at`,
      [provider, input.enabled ? 1 : 0, clientId, encryptedSecret, redirectUri, now, now]
    )
  }

  private async listRows(enabledOnly: boolean): Promise<OAuthProviderConfigRow[]> {
    return this.db.all<OAuthProviderConfigRow>(
      `SELECT provider, enabled, client_id, client_secret_encrypted, redirect_uri, created_at, updated_at
       FROM oauth_provider_configs
       ${enabledOnly ? 'WHERE enabled = 1' : ''}
       ORDER BY CASE provider WHEN 'github' THEN 1 WHEN 'google' THEN 2 ELSE 3 END`
    )
  }

  private findRow(provider: OAuthProviderName): Promise<OAuthProviderConfigRow | null> {
    return this.db.first<OAuthProviderConfigRow>(
      `SELECT provider, enabled, client_id, client_secret_encrypted, redirect_uri, created_at, updated_at
       FROM oauth_provider_configs WHERE provider = ?`,
      [provider]
    )
  }

  private createProvider(row: OAuthProviderConfigRow): IOAuthProvider {
    const config = {
      clientId: row.client_id,
      clientSecret: decrypt(row.client_secret_encrypted, this.encryptionKey),
      redirectUri: row.redirect_uri
    }

    if (row.provider === 'github') return new GitHubProvider(config, this.httpClient)
    if (row.provider === 'google') return new GoogleProvider(config, this.httpClient)
    return new LinuxDoProvider(config, this.httpClient)
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    oauthProviderConfigService: OAuthProviderConfigService
  }
}
