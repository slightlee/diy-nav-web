/**
 * AI API Client
 * Frontend API calls for AI features
 */

import { request } from '@/utils/http'

// Types
export interface AIProvider {
  id: string
  name: string
  type: 'openai' | 'claude' | 'qwen' | 'ernie' | 'custom'
  baseUrl?: string
  model?: string
  isDefault: boolean
  createdAt: number
}

export interface AIProviderInput {
  name: string
  type: AIProvider['type']
  apiKey: string
  baseUrl?: string
  model?: string
  isDefault?: boolean
}

export interface AIUsageStats {
  totalTokens: number
  totalRequests: number
  todayTokens: number
  todayRequests: number
  dailyLimit: number
  dailyRemaining: number
  resetAt: number
}

export interface GenerateDescriptionResult {
  description: string
  tokensUsed?: number
}

/**
 * Get all AI providers for current user
 */
export async function getAIProviders(): Promise<AIProvider[]> {
  const res = await request.get<AIProvider[]>('/api/ai/providers')
  if (res.success && res.data) {
    return res.data
  }
  throw new Error(res.message || 'Failed to get AI providers')
}

/**
 * Add a new AI provider
 */
export async function addAIProvider(provider: AIProviderInput): Promise<AIProvider> {
  const res = await request.post<AIProvider>('/api/ai/providers', provider)
  if (res.success && res.data) {
    return res.data
  }
  throw new Error(res.message || 'Failed to add AI provider')
}

/**
 * Delete an AI provider
 */
export async function deleteAIProvider(id: string): Promise<void> {
  const res = await request.delete<void>(`/api/ai/providers/${id}`)
  if (!res.success) {
    throw new Error(res.message || 'Failed to delete AI provider')
  }
}

/**
 * Test an AI provider connection
 */
export async function testAIProvider(id: string): Promise<{ connected: boolean; error?: string }> {
  const res = await request.post<{ connected: boolean; error?: string }>(
    `/api/ai/providers/${id}/test`
  )
  if (res.success && res.data) {
    return res.data
  }
  throw new Error(res.message || 'Failed to test AI provider')
}

/**
 * Generate website description using AI
 */
export async function generateDescription(
  name: string,
  url: string,
  providerId?: string
): Promise<GenerateDescriptionResult> {
  const res = await request.post<GenerateDescriptionResult>('/api/ai/generate-description', {
    name,
    url,
    providerId
  })
  if (res.success && res.data) {
    return res.data
  }
  throw new Error(res.message || 'Failed to generate description')
}

/**
 * Get AI usage statistics
 */
export async function getAIUsage(): Promise<AIUsageStats> {
  const res = await request.get<AIUsageStats>('/api/ai/usage')
  if (res.success && res.data) {
    return res.data
  }
  throw new Error(res.message || 'Failed to get AI usage')
}

// Chat types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatResult {
  content: string
  tokensUsed?: number
}

/**
 * Send chat messages to AI
 */
export async function sendChatMessage(messages: ChatMessage[]): Promise<ChatResult> {
  const res = await request.post<ChatResult>('/api/ai/chat', { messages })
  if (res.success && res.data) {
    return res.data
  }
  throw new Error(res.message || 'Failed to send chat message')
}
