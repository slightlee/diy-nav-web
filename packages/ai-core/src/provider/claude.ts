/**
 * Claude (Anthropic) Provider Implementation
 */

import { BaseAIProvider, type ProviderInitConfig } from './interface.js'
import type { Message, ChatOptions, ChatResponseMeta } from '../types.js'
import { PROVIDER_PRESETS } from '../types.js'

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ClaudeResponse {
  id: string
  type: string
  role: string
  content: Array<{ type: string; text: string }>
  model: string
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

interface ClaudeStreamEvent {
  type: string
  delta?: { type: string; text?: string }
  message?: ClaudeResponse
  usage?: { input_tokens: number; output_tokens: number }
}

export class ClaudeProvider extends BaseAIProvider {
  readonly name = 'claude'
  readonly displayName = 'Claude (Anthropic)'

  constructor() {
    super()
    this._baseUrl = PROVIDER_PRESETS.claude.baseUrl
    this._model = PROVIDER_PRESETS.claude.defaultModel
  }

  override initialize(config: ProviderInitConfig): void {
    super.initialize(config)
    if (!this._baseUrl) {
      this._baseUrl = PROVIDER_PRESETS.claude.baseUrl
    }
    if (!this._model) {
      this._model = PROVIDER_PRESETS.claude.defaultModel
    }
  }

  private transformMessages(messages: Message[]): { system?: string; messages: ClaudeMessage[] } {
    const systemMessage = messages.find(m => m.role === 'system')
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))

    return {
      system: systemMessage?.content,
      messages: chatMessages
    }
  }

  async *chat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<string, ChatResponseMeta, unknown> {
    const { system, messages: chatMessages } = this.transformMessages(messages)

    const response = await fetch(`${this._baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this._apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options?.model ?? this._model,
        max_tokens: options?.maxTokens ?? 1024,
        system,
        messages: chatMessages,
        stream: true
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Claude API error: ${response.status} - ${error}`)
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
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          try {
            const event = JSON.parse(trimmed.slice(6)) as ClaudeStreamEvent

            if (event.type === 'content_block_delta' && event.delta?.text) {
              yield event.delta.text
            }

            if (event.type === 'message_start' && event.message?.model) {
              meta.model = event.message.model
            }

            if (event.type === 'message_delta' && event.usage) {
              meta.completionTokens = event.usage.output_tokens
            }
          } catch {
            // Skip invalid JSON
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
    const { system, messages: chatMessages } = this.transformMessages(messages)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      const response = await fetch(`${this._baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this._apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options?.model ?? this._model,
          max_tokens: options?.maxTokens ?? 1024,
          system,
          messages: chatMessages
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Claude API error: ${response.status} - ${error}`)
      }

      const data = (await response.json()) as ClaudeResponse
      const content = data.content[0]?.text || ''

      return {
        content,
        meta: {
          model: data.model,
          promptTokens: data.usage?.input_tokens,
          completionTokens: data.usage?.output_tokens,
          totalTokens: data.usage ? data.usage.input_tokens + data.usage.output_tokens : undefined
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout: Claude did not respond within 30 seconds')
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
