/**
 * Custom Provider Implementation
 * For user-configured OpenAI-compatible third-party endpoints
 */

import { OpenAICompatibleProvider } from './openai-compatible.js'
import type { ProviderInitConfig } from './interface.js'

export class CustomProvider extends OpenAICompatibleProvider {
  readonly name = 'custom'
  readonly displayName = 'Custom Provider'

  override initialize(config: ProviderInitConfig): void {
    super.initialize(config)
    // Custom provider must have user-provided baseUrl and model
    if (!this._baseUrl) {
      throw new Error('Custom provider requires baseUrl')
    }
    if (!this._model) {
      throw new Error('Custom provider requires model')
    }
  }
}
