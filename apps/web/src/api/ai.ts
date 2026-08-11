/**
 * AI API Client
 * Frontend API calls for AI features
 */

import { request } from '@/utils/http'
import type { Website } from '@/types'

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
  model: string
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

export interface WebsiteClassificationInput {
  name: string
  url: string
  description?: string
  categories: Array<{ id: string; name: string }>
  tags: Array<{ id: string; name: string }>
}

export interface WebsiteClassificationResult {
  description: string
  categoryId: string
  categoryName: string
  tagIds: string[]
  tagNames: string[]
}

export interface BookmarkTaxonomyRequest {
  total: number
  folders: Array<{ path: string; count: number }>
  domains: Array<{ host: string; count: number; titles: string[] }>
  samples: Array<{ name: string; host: string; folderPath: string }>
}

export interface BookmarkTaxonomyResult {
  categories: string[]
  tags: string[]
}

export interface BookmarkTaxonomyItem {
  id: string
  name: string
}

export interface BookmarkClassificationRequest {
  taxonomy: {
    categories: BookmarkTaxonomyItem[]
    tags: BookmarkTaxonomyItem[]
  }
  bookmarks: Array<{
    sourceId: string
    name: string
    url: string
    folderPath: string
  }>
}

export interface BookmarkClassificationResult {
  items: Array<{
    sourceId: string
    description: string
    categoryId: string
    tagIds: string[]
  }>
  errors: Array<{ sourceId: string; message: string }>
}

export class AIRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string
  ) {
    super(message)
    this.name = 'AIRequestError'
  }
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
  provider: Pick<AIProviderInput, 'type' | 'apiKey' | 'baseUrl'> & {
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

export async function classifyWebsite(
  input: WebsiteClassificationInput
): Promise<WebsiteClassificationResult> {
  const res = await request.post<WebsiteClassificationResult>('/api/ai/classify-website', input, {
    timeout: 60000
  })
  if (res.success && res.data) {
    return res.data
  }
  throw new Error(res.message || '自动归类失败')
}

export async function planBookmarkTaxonomy(
  input: BookmarkTaxonomyRequest,
  signal?: AbortSignal
): Promise<BookmarkTaxonomyResult> {
  const res = await request.post<BookmarkTaxonomyResult>(
    '/api/ai/bookmark-import/taxonomy',
    input,
    {
      timeout: 120000,
      signal
    }
  )
  if (res.success && res.data) return res.data
  throw new AIRequestError(res.message || '生成书签分类体系失败', res.code)
}

export async function classifyBookmarkBatch(
  input: BookmarkClassificationRequest,
  signal?: AbortSignal
): Promise<BookmarkClassificationResult> {
  const res = await request.post<BookmarkClassificationResult>(
    '/api/ai/bookmark-import/classify',
    input,
    { timeout: 180000, signal }
  )
  if (res.success && res.data) return res.data
  throw new AIRequestError(res.message || '批量分析书签失败', res.code)
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
  actionResult?: AIActionResult
}

export interface ChatResult {
  content: string
  tokensUsed?: number
}

export interface AIActionResult {
  kind: 'website-added' | 'website-deleted' | 'website-updated'
  website: Website
  classificationFailed?: boolean
  undoId?: string
}

/**
 * Send chat messages to AI
 */
export async function sendChatMessage(messages: ChatMessage[]): Promise<ChatResult> {
  const res = await request.post<ChatResult>('/api/ai/chat', { messages }, { timeout: 60000 })
  if (res.success && res.data) {
    return res.data
  }
  throw new Error(res.message || 'Failed to send chat message')
}
