/**
 * @nav/ai-core
 * AI Provider Core Package
 *
 * Provides a unified interface for OpenAI-compatible and Claude-compatible APIs.
 */

// Types
export * from './types.js'

// Crypto utilities
export { encrypt, decrypt, verifyEncryption } from './crypto.js'

// Providers
export {
  type AIProvider,
  type ProviderInitConfig,
  BaseAIProvider,
  OpenAIProvider,
  ClaudeProvider
} from './provider/index.js'

// Registry
export { AIProviderConfigError, AIProviderRegistry, toProviderDTO } from './registry.js'

// Rate limiter
export {
  checkRateLimit,
  consumeRateLimit,
  getRateLimitConfig,
  setDailyLimit,
  resetUsage
} from './rate-limiter.js'

// Usage tracker
export { recordUsage, getUserStats, getUserRecords, clearOldRecords } from './usage-tracker.js'
