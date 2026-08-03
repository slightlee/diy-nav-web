import { describe, expect, it } from 'vitest'
import { AI_PROTOCOLS, normalizeAIProtocol } from './types.js'

describe('AI protocols', () => {
  it('only exposes OpenAI and Claude protocols', () => {
    expect(AI_PROTOCOLS).toEqual(['openai', 'claude'])
  })

  it('preserves supported protocols', () => {
    expect(normalizeAIProtocol('openai')).toBe('openai')
    expect(normalizeAIProtocol('claude')).toBe('claude')
  })

  it('normalizes legacy provider records without accepting unknown protocols', () => {
    expect(normalizeAIProtocol('qwen')).toBe('openai')
    expect(normalizeAIProtocol('ernie')).toBe('openai')
    expect(normalizeAIProtocol('custom')).toBe('openai')
    expect(() => normalizeAIProtocol('unknown')).toThrow('Unsupported AI protocol')
  })
})
