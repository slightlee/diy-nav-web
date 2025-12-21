/**
 * AI Core Types
 * Core type definitions for the AI provider system
 */

// ============================================
// Provider Types
// ============================================

/**
 * Supported AI provider types
 * - openai: OpenAI API (GPT-4, GPT-4o, etc.)
 * - claude: Anthropic Claude API
 * - qwen: Alibaba Qwen (通义千问)
 * - ernie: Baidu ERNIE (文心一言)
 * - custom: Custom OpenAI-compatible endpoint
 */
export type ProviderType = 'openai' | 'claude' | 'qwen' | 'ernie' | 'custom'

/**
 * AI Provider configuration stored in database
 */
export interface AIProviderConfig {
  id: string
  userId: string
  name: string
  type: ProviderType
  apiKeyEncrypted: string // AES-256-GCM encrypted
  baseUrl?: string
  model?: string
  isDefault: boolean
  createdAt: number
  updatedAt: number
}

/**
 * AI Provider configuration for creating/updating
 */
export interface AIProviderInput {
  name: string
  type: ProviderType
  apiKey: string // Plain text, will be encrypted before storage
  baseUrl?: string
  model?: string
  isDefault?: boolean
}

/**
 * AI Provider configuration for display (without sensitive data)
 */
export interface AIProviderDTO {
  id: string
  name: string
  type: ProviderType
  baseUrl?: string
  model?: string
  isDefault: boolean
  createdAt: number
}

// ============================================
// Message Types
// ============================================

/**
 * Role in a conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant'

/**
 * A single message in a conversation
 */
export interface Message {
  role: MessageRole
  content: string
}

/**
 * Chat options for AI providers
 */
export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

/**
 * Response metadata from AI providers
 */
export interface ChatResponseMeta {
  model: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

// ============================================
// Description Generation Types
// ============================================

/**
 * Options for generating website descriptions
 */
export interface DescriptionOptions {
  maxLength?: number
  lang?: 'zh' | 'en'
}

/**
 * Result of description generation
 */
export interface DescriptionResult {
  description: string
  tokensUsed?: number
}

// ============================================
// Rate Limiting Types
// ============================================

/**
 * Rate limit configuration for a user
 */
export interface RateLimitConfig {
  userId: string
  dailyLimit: number
  usedToday: number
  lastReset: number
}

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

// ============================================
// Usage Tracking Types
// ============================================

/**
 * AI usage record
 */
export interface UsageRecord {
  id: number
  userId: string
  providerId: string
  action: 'chat' | 'generate_description'
  tokensUsed: number
  createdAt: number
}

/**
 * Usage statistics summary
 */
export interface UsageStats {
  totalTokens: number
  totalRequests: number
  todayTokens: number
  todayRequests: number
}

// ============================================
// Provider Presets
// ============================================

/**
 * Preset provider configurations
 */
export const PROVIDER_PRESETS: Record<
  Exclude<ProviderType, 'custom'>,
  { baseUrl: string; defaultModel: string; displayName: string }
> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    displayName: 'OpenAI'
  },
  claude: {
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-haiku-20240307',
    displayName: 'Claude (Anthropic)'
  },
  qwen: {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-turbo',
    displayName: '通义千问 (Qwen)'
  },
  ernie: {
    baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
    defaultModel: 'ernie-speed-128k',
    displayName: '文心一言 (ERNIE)'
  }
} as const

/**
 * System prompts for different tasks
 */
export const SYSTEM_PROMPTS = {
  generateDescription: `你是一个专业的网站内容分析师。根据提供的网站信息，生成一段简洁、准确的中文描述。
要求：
- 描述长度不超过100字
- 突出网站的核心功能和特点
- 使用专业但易懂的语言
- 不要包含任何广告或推广性质的内容`,

  assistant: `你是一个智能网站导航助手。你可以帮助用户管理他们的网站收藏，包括添加、编辑、删除网站，以及管理分类和标签。
请根据用户的指令执行相应操作，并用简洁友好的中文回复。`
} as const
