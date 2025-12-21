/**
 * Qwen (通义千问) Provider Implementation
 * Alibaba's Qwen uses OpenAI-compatible API
 */

import { OpenAICompatibleProvider } from './openai-compatible.js'
import type { ProviderInitConfig } from './interface.js'
import { PROVIDER_PRESETS } from '../types.js'

export class QwenProvider extends OpenAICompatibleProvider {
  readonly name = 'qwen'
  readonly displayName = '通义千问 (Qwen)'

  constructor() {
    super()
    this._baseUrl = PROVIDER_PRESETS.qwen.baseUrl
    this._model = PROVIDER_PRESETS.qwen.defaultModel
  }

  override initialize(config: ProviderInitConfig): void {
    super.initialize(config)
    if (!this._baseUrl) {
      this._baseUrl = PROVIDER_PRESETS.qwen.baseUrl
    }
    if (!this._model) {
      this._model = PROVIDER_PRESETS.qwen.defaultModel
    }
  }
}
