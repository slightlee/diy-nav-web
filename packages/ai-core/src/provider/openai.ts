/**
 * OpenAI Provider Implementation
 */

import { OpenAICompatibleProvider } from './openai-compatible.js'
import type { ProviderInitConfig } from './interface.js'
import { PROVIDER_PRESETS } from '../types.js'

export class OpenAIProvider extends OpenAICompatibleProvider {
  readonly name = 'openai'
  readonly displayName = 'OpenAI'

  constructor() {
    super()
    this._baseUrl = PROVIDER_PRESETS.openai.baseUrl
  }

  override initialize(config: ProviderInitConfig): void {
    super.initialize(config)
    if (!this._baseUrl) {
      this._baseUrl = PROVIDER_PRESETS.openai.baseUrl
    }
  }
}
