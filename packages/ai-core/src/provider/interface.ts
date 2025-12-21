/**
 * AI Provider Interface
 * Abstract interface that all AI providers must implement
 */

import type {
  Message,
  ChatOptions,
  ChatResponseMeta,
  DescriptionOptions,
  DescriptionResult
} from '../types.js'

/**
 * Configuration for initializing a provider
 */
export interface ProviderInitConfig {
  apiKey: string
  baseUrl?: string
  model?: string
}

/**
 * Abstract AI Provider interface
 * All provider implementations must conform to this interface
 */
export interface AIProvider {
  /**
   * Provider name identifier
   */
  readonly name: string

  /**
   * Human-readable display name
   */
  readonly displayName: string

  /**
   * Current model being used
   */
  readonly model: string

  /**
   * Initialize the provider with configuration
   */
  initialize(config: ProviderInitConfig): void

  /**
   * Send a chat request and get a streaming response
   * @param messages - Array of conversation messages
   * @param options - Optional chat configuration
   * @returns AsyncGenerator yielding response chunks
   */
  chat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<string, ChatResponseMeta, unknown>

  /**
   * Send a chat request and get a complete response
   * @param messages - Array of conversation messages
   * @param options - Optional chat configuration
   * @returns Complete response text and metadata
   */
  chatComplete(
    messages: Message[],
    options?: ChatOptions
  ): Promise<{ content: string; meta: ChatResponseMeta }>

  /**
   * Generate a website description based on provided information
   * @param name - Website name
   * @param url - Website URL
   * @param content - Optional scraped content from the website
   * @param options - Generation options
   * @returns Generated description
   */
  generateDescription(
    name: string,
    url: string,
    content?: string,
    options?: DescriptionOptions
  ): Promise<DescriptionResult>

  /**
   * Test the provider connection
   * @returns true if connection is successful
   */
  testConnection(): Promise<boolean>
}

/**
 * Base class for AI providers with common functionality
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string
  abstract readonly displayName: string

  protected _apiKey: string = ''
  protected _baseUrl: string = ''
  protected _model: string = ''

  get model(): string {
    return this._model
  }

  initialize(config: ProviderInitConfig): void {
    this._apiKey = config.apiKey
    if (config.baseUrl) {
      this._baseUrl = config.baseUrl
    }
    if (config.model) {
      this._model = config.model
    }
  }

  abstract chat(
    messages: Message[],
    options?: ChatOptions
  ): AsyncGenerator<string, ChatResponseMeta, unknown>

  abstract chatComplete(
    messages: Message[],
    options?: ChatOptions
  ): Promise<{ content: string; meta: ChatResponseMeta }>

  async generateDescription(
    name: string,
    url: string,
    content?: string,
    options?: DescriptionOptions
  ): Promise<DescriptionResult> {
    const lang = options?.lang ?? 'zh'
    const maxLength = options?.maxLength ?? 100

    const systemPrompt =
      lang === 'zh'
        ? `你是一个专业的网站内容分析师。根据提供的网站信息，生成一段简洁、准确的中文描述。
要求：
- 描述长度不超过${maxLength}字
- 突出网站的核心功能和特点
- 使用专业但易懂的语言
- 直接输出描述内容，不要包含任何前缀或解释`
        : `You are a professional website content analyst. Generate a concise and accurate description based on the provided website information.
Requirements:
- Description should not exceed ${maxLength} characters
- Highlight the core features and characteristics
- Use professional but easy-to-understand language
- Output the description directly without any prefix or explanation`

    const userPrompt = content
      ? `网站名称：${name}\n网站地址：${url}\n网站内容摘要：${content}`
      : `网站名称：${name}\n网站地址：${url}`

    const result = await this.chatComplete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { temperature: 0.7, maxTokens: 200 }
    )

    return {
      description: result.content.trim(),
      tokensUsed: result.meta.totalTokens
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.chatComplete([{ role: 'user', content: 'Hi' }], { maxTokens: 10 })
      return true
    } catch {
      return false
    }
  }
}
