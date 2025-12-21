/**
 * @nav/ai-core
 * AI Provider Core Package
 *
 * Provides unified AI provider interface with support for:
 * - OpenAI (GPT-4, GPT-4o)
 * - Claude (Anthropic)
 * - Qwen (通义千问)
 * - ERNIE (文心一言)
 * - Custom OpenAI-compatible endpoints
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
  ClaudeProvider,
  QwenProvider,
  ERNIEProvider,
  CustomProvider
} from './provider/index.js'

// Registry
export { AIProviderRegistry, toProviderDTO } from './registry.js'

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
