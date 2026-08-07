/**
 * AI Provider Registry
 * Manages provider instances and configurations
 */

import type { AIProvider, ProviderInitConfig } from './provider/interface.js'
import type { AIProtocol, AIProviderConfig, AIProviderDTO } from './types.js'
import { OpenAIProvider } from './provider/openai.js'
import { ClaudeProvider } from './provider/claude.js'
import { decrypt } from './crypto.js'

/**
 * Factory function to create provider instances
 */
function createProvider(type: AIProtocol): AIProvider {
  switch (type) {
    case 'openai':
      return new OpenAIProvider()
    case 'claude':
      return new ClaudeProvider()
    default:
      throw new Error(`Unsupported AI protocol: ${type}`)
  }
}

export class AIProviderConfigError extends Error {
  readonly code = 'AI_PROVIDER_CONFIG_INCOMPLETE'

  constructor() {
    super('AI 服务配置不完整，请填写模型名称')
    this.name = 'AIProviderConfigError'
  }
}

/**
 * AI Provider Registry
 * Stores and manages provider instances for users
 */
export class AIProviderRegistry {
  private readonly encryptionSecret: string
  private readonly providerCache: Map<string, AIProvider> = new Map()

  constructor(encryptionSecret: string) {
    this.encryptionSecret = encryptionSecret
  }

  /**
   * Get an initialized provider instance from config
   * @param config - Provider configuration from database
   * @returns Initialized AI provider
   */
  getProvider(config: AIProviderConfig): AIProvider {
    if (!config.model?.trim()) {
      throw new AIProviderConfigError()
    }

    const cacheKey = `${config.userId}:${config.id}`

    // Check cache
    let provider = this.providerCache.get(cacheKey)
    if (provider) {
      return provider
    }

    // Create and initialize provider
    provider = createProvider(config.type)
    const apiKey = decrypt(config.apiKeyEncrypted, this.encryptionSecret)

    const initConfig: ProviderInitConfig = {
      apiKey,
      baseUrl: config.baseUrl,
      model: config.model
    }

    provider.initialize(initConfig)

    // Cache the provider
    this.providerCache.set(cacheKey, provider)

    return provider
  }

  /**
   * Clear cached provider instance
   * @param userId - User ID
   * @param providerId - Provider ID
   */
  clearCache(userId: string, providerId: string): void {
    const cacheKey = `${userId}:${providerId}`
    this.providerCache.delete(cacheKey)
  }

  /**
   * Clear all cached providers for a user
   * @param userId - User ID
   */
  clearUserCache(userId: string): void {
    for (const key of this.providerCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.providerCache.delete(key)
      }
    }
  }

  /**
   * Create a temporary provider for testing
   * @param type - Provider type
   * @param config - Provider configuration
   * @returns Initialized provider (not cached)
   */
  createTemporaryProvider(
    type: AIProtocol,
    config: { apiKey: string; baseUrl?: string; model?: string }
  ): AIProvider {
    const provider = createProvider(type)
    provider.initialize(config)
    return provider
  }
}

/**
 * Convert AIProviderConfig to safe DTO (without sensitive data)
 */
export function toProviderDTO(config: AIProviderConfig): AIProviderDTO {
  return {
    id: config.id,
    name: config.name,
    type: config.type,
    baseUrl: config.baseUrl,
    model: config.model,
    isDefault: config.isDefault,
    createdAt: config.createdAt
  }
}
