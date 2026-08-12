import { describe, expect, it, vi } from 'vitest'
import type { AxiosInstance } from 'axios'
import type { DatabaseClient } from '@nav/database'
import { decrypt, encrypt } from '@nav/ai-core'

import { OAuthProviderConfigError, OAuthProviderConfigService } from './oauth-provider-config.js'

const ENCRYPTION_KEY = 'test-oauth-encryption-key-with-32-chars'

const createDatabaseMock = () =>
  ({
    first: vi.fn(),
    all: vi.fn(),
    execute: vi.fn(),
    batch: vi.fn()
  }) as unknown as DatabaseClient

describe('OAuthProviderConfigService', () => {
  it('creates the OAuth provider configuration table', async () => {
    const db = createDatabaseMock()
    const service = new OAuthProviderConfigService(db, {} as AxiosInstance, ENCRYPTION_KEY)

    await service.initTable()

    expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('oauth_provider_configs'))
  })

  it('warms and reuses the public provider configuration cache', async () => {
    const db = createDatabaseMock()
    vi.mocked(db.all).mockResolvedValue([
      {
        provider: 'github',
        enabled: 1,
        client_id: 'github-client',
        client_secret_encrypted: encrypt('github-secret', ENCRYPTION_KEY),
        redirect_uri: 'https://example.com/oauth2/callback',
        created_at: 1,
        updated_at: 1
      }
    ])
    const service = new OAuthProviderConfigService(db, {} as AxiosInstance, ENCRYPTION_KEY)

    await service.validateEnabledProviders()
    const configs = await service.listPublic()

    expect(configs).toEqual([
      {
        provider: 'github',
        clientId: 'github-client',
        redirectUri: 'https://example.com/oauth2/callback'
      }
    ])
    expect(db.all).toHaveBeenCalledTimes(1)
  })

  it('encrypts a new secret without exposing it in the result', async () => {
    const db = createDatabaseMock()
    let storedRow:
      | {
          provider: 'github'
          enabled: number
          client_id: string
          client_secret_encrypted: string
          redirect_uri: string
          created_at: number
          updated_at: number
        }
      | undefined

    vi.mocked(db.first)
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(async () => storedRow ?? null)
    vi.mocked(db.execute).mockImplementation(async (_sql, params = []) => {
      storedRow = {
        provider: 'github',
        enabled: params[1] as number,
        client_id: params[2] as string,
        client_secret_encrypted: params[3] as string,
        redirect_uri: params[4] as string,
        created_at: params[5] as number,
        updated_at: params[6] as number
      }
      return { changes: 1 }
    })

    const service = new OAuthProviderConfigService(db, {} as AxiosInstance, ENCRYPTION_KEY)
    await service.update('github', {
      enabled: true,
      clientId: 'github-client',
      clientSecret: 'github-secret',
      redirectUri: 'https://example.com/oauth2/callback'
    })

    if (!storedRow) throw new Error('Expected OAuth configuration to be stored')
    expect(storedRow?.client_secret_encrypted).not.toBe('github-secret')
    expect(decrypt(storedRow.client_secret_encrypted, ENCRYPTION_KEY)).toBe('github-secret')
  })

  it('builds an enabled provider from the latest database configuration', async () => {
    const db = createDatabaseMock()
    vi.mocked(db.first).mockResolvedValue({
      provider: 'google',
      enabled: 1,
      client_id: 'google-client',
      client_secret_encrypted: encrypt('google-secret', ENCRYPTION_KEY),
      redirect_uri: 'https://example.com/oauth2/callback',
      created_at: 1,
      updated_at: 2
    })
    const service = new OAuthProviderConfigService(db, {} as AxiosInstance, ENCRYPTION_KEY)

    const provider = await service.getEnabledProvider('google')

    expect(provider?.name).toBe('google')
    expect(db.first).toHaveBeenCalledWith(expect.stringContaining('WHERE provider = ?'), ['google'])
  })

  it('rejects a new configuration without a client secret', async () => {
    const db = createDatabaseMock()
    vi.mocked(db.first).mockResolvedValue(null)
    const service = new OAuthProviderConfigService(db, {} as AxiosInstance, ENCRYPTION_KEY)

    await expect(
      service.update('linuxdo', {
        enabled: true,
        clientId: 'linuxdo-client',
        clientSecret: '',
        redirectUri: 'https://example.com/oauth2/callback'
      })
    ).rejects.toBeInstanceOf(OAuthProviderConfigError)
    expect(db.execute).not.toHaveBeenCalled()
  })
})
