/**
 * ERNIE (文心一言) Provider Implementation
 * Baidu's ERNIE has a unique API format
 */

import { BaseAIProvider, type ProviderInitConfig } from './interface.js'
import type { Message, ChatOptions, ChatResponseMeta } from '../types.js'
import { PROVIDER_PRESETS } from '../types.js'

interface ERNIEMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ERNIEResponse {
  id: string
  object: string
  created: number
  result: string
  is_truncated: boolean
  need_clear_history: boolean
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface ERNIEStreamResponse {
  id: string
  object: string
  created: number
  sentence_id: number
  is_end: boolean
  result: string
  is_truncated: boolean
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class ERNIEProvider extends BaseAIProvider {
  readonly name = 'ernie'
  readonly displayName = '文心一言 (ERNIE)'

  constructor() {
    super()
    this._baseUrl = PROVIDER_PRESETS.ernie.baseUrl
    this._model = PROVIDER_PRESETS.ernie.defaultModel
  }

  override initialize(config: ProviderInitConfig): void {
    super.initialize(config)
    if (!this._baseUrl) {
      this._baseUrl = PROVIDER_PRESETS.ernie.baseUrl
    }
    if (!this._model) {
      this._model = PROVIDER_PRESETS.ernie.defaultModel
    }
  }

  private transformMessages(messages: Message[]): { system?: string; messages: ERNIEMessage[] } {
    const systemMessage = messages.find(m => m.role === 'system')
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))

    // ERNIE requires messages to start with user role
    if (chatMessages.length > 0 && chatMessages[0].role !== 'user') {
      chatMessages.unshift({ role: 'user', content: '你好' })
    }

    return {
      system: systemMessage?.content,
      messages: chatMessages
    }
  }

  private getEndpoint(): string {
    // ERNIE uses model-specific endpoints
    const modelEndpoints: Record<string, string> = {
      'ernie-speed-128k': 'ernie_speed',
      'ernie-4.0-8k': 'completions_pro',
      'ernie-3.5-8k': 'completions',
      'ernie-lite-8k': 'ernie-lite-8k'
    }
    const endpoint = modelEndpoints[this._model] || 'ernie_speed'
    return `${this._baseUrl}/${endpoint}`
  }

  async *chat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<string, ChatResponseMeta, unknown> {
    const { system, messages: chatMessages } = this.transformMessages(messages)

    const response = await fetch(`${this.getEndpoint()}?access_token=${this._apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: chatMessages,
        system,
        stream: true,
        temperature: options?.temperature ?? 0.7
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`ERNIE API error: ${response.status} - ${error}`)
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
            const json = JSON.parse(trimmed.slice(6)) as ERNIEStreamResponse
            if (json.result) {
              yield json.result
            }
            if (json.usage) {
              meta.promptTokens = json.usage.prompt_tokens
              meta.completionTokens = json.usage.completion_tokens
              meta.totalTokens = json.usage.total_tokens
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
      const response = await fetch(`${this.getEndpoint()}?access_token=${this._apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: chatMessages,
          system,
          stream: false,
          temperature: options?.temperature ?? 0.7
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`ERNIE API error: ${response.status} - ${error}`)
      }

      const data = (await response.json()) as ERNIEResponse

      return {
        content: data.result || '',
        meta: {
          model: this._model,
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout: ERNIE did not respond within 30 seconds')
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
