import { describe, expect, it, vi } from 'vitest'
import { BaseAIProvider } from './interface.js'
import { OpenAIProvider } from './openai.js'
import type { ChatResponseMeta } from '../types.js'

class TestProvider extends BaseAIProvider {
  readonly name = 'test'
  readonly displayName = 'Test'

  constructor(private readonly connectionError?: Error) {
    super()
  }

  get baseUrl(): string {
    return this._baseUrl
  }

  async *chat(): AsyncGenerator<string, ChatResponseMeta, unknown> {
    yield* []
    return { model: 'test-model' }
  }

  async chatComplete(): Promise<{ content: string; meta: ChatResponseMeta }> {
    if (this.connectionError) throw this.connectionError
    return { content: 'ok', meta: { model: 'test-model' } }
  }
}

describe('BaseAIProvider', () => {
  it('normalizes trailing slashes in custom base URLs', () => {
    const provider = new TestProvider()
    provider.initialize({ apiKey: 'test-key', baseUrl: 'https://example.com/v1///' })

    expect(provider.baseUrl).toBe('https://example.com/v1')
  })

  it('reports a successful connection after a real completion request', async () => {
    await expect(new TestProvider().testConnection()).resolves.toBe(true)
  })

  it('preserves the provider error for the API response', async () => {
    await expect(new TestProvider(new Error('model not found')).testConnection()).rejects.toThrow(
      'model not found'
    )
  })

  it('lists models from an OpenAI-compatible endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'gpt-z' }, { id: 'gpt-a' }, { id: 42 }] })
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = new OpenAIProvider()
    provider.initialize({ apiKey: 'test-key', baseUrl: 'https://example.com/v1/' })

    await expect(provider.listModels()).resolves.toEqual(['gpt-a', 'gpt-z'])
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/v1/models',
      expect.objectContaining({ method: 'GET' })
    )

    vi.unstubAllGlobals()
  })

  it.each([
    ['https://example.com', 'https://example.com/models'],
    ['https://example.com/', 'https://example.com/models'],
    ['https://example.com/openai', 'https://example.com/openai/models'],
    ['https://example.com/openai?tenant=test', 'https://example.com/openai/models?tenant=test'],
    ['https://example.com/api/v3/', 'https://example.com/api/v3/models'],
    ['https://example.com/v1beta', 'https://example.com/v1beta/models']
  ])(
    'preserves the configured OpenAI-compatible API root %s',
    async (baseUrl, expectedModelsUrl) => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] })
      })
      vi.stubGlobal('fetch', fetchMock)

      const provider = new OpenAIProvider()
      provider.initialize({ apiKey: 'test-key', baseUrl })

      await provider.listModels()
      expect(fetchMock).toHaveBeenCalledWith(
        expectedModelsUrl,
        expect.objectContaining({ method: 'GET' })
      )

      vi.unstubAllGlobals()
    }
  )

  it('uses the versioned OpenAI preset when no custom base URL is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = new OpenAIProvider()
    provider.initialize({ apiKey: 'test-key', model: 'gpt-test' })

    await provider.listModels()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models',
      expect.objectContaining({ method: 'GET' })
    )

    vi.unstubAllGlobals()
  })

  it('preserves query parameters when building chat endpoints', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-test',
        choices: [{ message: { content: 'ok' } }]
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = new OpenAIProvider()
    provider.initialize({
      apiKey: 'test-key',
      baseUrl: 'https://example.com?tenant=test',
      model: 'gpt-test'
    })

    await expect(provider.chatComplete([{ role: 'user', content: 'Hi' }])).resolves.toMatchObject({
      content: 'ok'
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/chat/completions?tenant=test',
      expect.objectContaining({ method: 'POST' })
    )

    vi.unstubAllGlobals()
  })
})
