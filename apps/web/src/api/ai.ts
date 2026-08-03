/**
 * AI API Client
 * Frontend API calls for AI features
 */

import { request } from '@/utils/http'

// Types
export type AIProtocol = 'openai' | 'claude'

export interface AIProvider {
  id: string
  name: string
  type: AIProtocol
  baseUrl?: string
  model?: string
  isDefault: boolean
  createdAt: number
}

export interface AIProviderDetail extends AIProvider {
  hasApiKey: boolean
}

export interface AIProviderInput {
  name: string
  type: AIProvider['type']
  apiKey?: string
  baseUrl?: string
  model?: string
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
 * Get AI provider detail without exposing the stored API key
 */
export async function getAIProvider(id: string): Promise<AIProviderDetail> {
  const res = await request.get<AIProviderDetail>(`/api/ai/providers/${id}`)
  if (res.success && res.data) {
    return res.data
  }
  throw new Error(res.message || 'Failed to get AI provider')
}

/**
 * Update an AI provider
 */
export async function updateAIProvider(id: string, provider: AIProviderInput): Promise<AIProvider> {
  const res = await request.patch<AIProvider>(`/api/ai/providers/${id}`, provider)
  if (res.success && res.data) {
    return res.data
  }
  throw new Error(res.message || 'Failed to update AI provider')
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

export async function setDefaultAIProvider(id: string): Promise<{ id: string }> {
  const res = await request.patch<{ id: string }>(`/api/ai/providers/${id}/default`)
  if (res.success && res.data) {
    return res.data
  }
  throw new Error(res.message || 'Failed to set default AI provider')
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

export async function testAIProviderConfig(
  provider: Pick<AIProviderInput, 'type' | 'apiKey' | 'baseUrl' | 'model'> & {
    providerId?: string
  }
): Promise<{ connected: boolean; error?: string }> {
  const res = await request.post<{ connected: boolean; error?: string }>(
    '/api/ai/providers/test',
    provider
  )
  if (res.success && res.data) {
    return res.data
  }
  throw new Error(res.message || 'Failed to test AI provider')
}

export async function fetchAIProviderModels(
  provider: Pick<AIProviderInput, 'type' | 'apiKey' | 'baseUrl' | 'model'> & {
    providerId?: string
  }
): Promise<string[]> {
  const res = await request.post<{ models: string[] }>('/api/ai/providers/models', provider)
  if (res.success && res.data) {
    return res.data.models
  }
  throw new Error(res.message || 'Failed to get AI models')
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
