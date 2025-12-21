/**
 * OpenAI Compatible Protocol Provider
 * Base class for providers using OpenAI-compatible API format
 * Includes: OpenAI, Qwen, DeepSeek, Moonshot, GLM-4, most proxy services
 */

import { BaseAIProvider } from './interface.js'
import type { Message, ChatOptions, ChatResponseMeta } from '../types.js'

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAIChoice {
  index: number
  message?: { content: string }
  delta?: { content?: string }
  finish_reason: string | null
}

interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: OpenAIChoice[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Abstract base class for OpenAI-compatible providers
 * Handles: SSE streaming, timeout, multi-format response parsing
 */
export abstract class OpenAICompatibleProvider extends BaseAIProvider {
  /**
   * Timeout for API requests in milliseconds
   * Default: 30 seconds
   */
  protected readonly requestTimeout = 30000

  async *chat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<string, ChatResponseMeta, unknown> {
    const response = await fetch(`${this._baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildRequestBody(messages, options, true))
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`${this.displayName} API error: ${response.status} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    const meta: ChatResponseMeta = { model: this._model }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (!trimmed.startsWith('data: ')) continue

          try {
            const json = JSON.parse(trimmed.slice(6)) as OpenAIResponse
            const delta = json.choices[0]?.delta?.content
            if (delta) {
              yield delta
            }
            if (json.model) {
              meta.model = json.model
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return meta
  }

  async chatComplete(
    messages: Message[],
    options?: ChatOptions
  ): Promise<{ content: string; meta: ChatResponseMeta }> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout)

    try {
      const response = await fetch(`${this._baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(this.buildRequestBody(messages, options, false)),
        signal: controller.signal
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`${this.displayName} API error: ${response.status} - ${error}`)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await response.json()) as any

      // Extract content from various response formats
      const content = this.extractContent(data)

      return {
        content,
        meta: {
          model: data.model,
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `Request timeout: ${this.displayName} did not respond within ${this.requestTimeout / 1000} seconds`
        )
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Build HTTP headers for the request
   * Override in subclass for custom authentication
   */
  protected buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this._apiKey}`
    }
  }

  /**
   * Build request body
   * Override in subclass for custom parameters
   */
  protected buildRequestBody(
    messages: Message[],
    options?: ChatOptions,
    stream = false
  ): Record<string, unknown> {
    return {
      model: options?.model ?? this._model,
      messages: messages as OpenAIMessage[],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      stream
    }
  }

  /**
   * Extract content from API response
   * Handles multiple response formats for third-party compatibility
   */
  protected extractContent(data: Record<string, unknown>): string {
    // Standard format: choices[0].message.content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const choices = data.choices as any[] | undefined
    if (choices && choices[0]) {
      const choice = choices[0]
      if (choice.message && typeof choice.message.content === 'string') {
        return choice.message.content
      }
      // Alternative: choices[0].text (older API format)
      if (typeof choice.text === 'string') {
        return choice.text
      }
      // Alternative: direct content property
      if (typeof choice.content === 'string') {
        return choice.content
      }
    }

    // Fallback: direct content/text property
    if (typeof data.content === 'string') {
      return data.content
    }
    if (typeof data.text === 'string') {
      return data.text
    }

    return ''
  }
}
