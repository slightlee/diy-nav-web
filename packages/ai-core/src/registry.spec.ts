import { describe, expect, it } from 'vitest'
import { AIProviderConfigError, AIProviderRegistry } from './registry.js'
import { encrypt } from './crypto.js'
import type { AIProviderConfig } from './types.js'

const createConfig = (overrides: Partial<AIProviderConfig> = {}): AIProviderConfig => ({
  id: 'provider-1',
  userId: 'user-1',
  name: 'Test Provider',
  type: 'openai',
  apiKeyEncrypted: encrypt('test-key', 'test-secret'),
  baseUrl: 'https://example.com/v1',
  model: 'test-model',
  isDefault: true,
  createdAt: 1,
  updatedAt: 1,
  ...overrides
})

describe('AIProviderRegistry', () => {
  it('allows the protocol default Base URL when a model is provided', () => {
    const registry = new AIProviderRegistry('test-secret')

    const provider = registry.getProvider(createConfig({ baseUrl: undefined }))

    expect(provider.model).toBe('test-model')
  })

  it('rejects saved provider config without a model', () => {
    const registry = new AIProviderRegistry('test-secret')

    expect(() => registry.getProvider(createConfig({ model: undefined }))).toThrowError(
      expect.objectContaining({
        name: 'AIProviderConfigError',
        code: 'AI_PROVIDER_CONFIG_INCOMPLETE'
      })
    )
    expect(() => registry.getProvider(createConfig({ model: undefined }))).toThrow(
      AIProviderConfigError
    )
  })
})
