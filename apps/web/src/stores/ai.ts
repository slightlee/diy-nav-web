/**
 * AI Store
 * Manages AI-related state for the application
 */

import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import {
  getAIProviders,
  addAIProvider,
  deleteAIProvider,
  getAIUsage,
  sendChatMessage,
  type AIProvider,
  type AIProviderInput,
  type AIUsageStats,
  type ChatMessage
} from '@/api/ai'
import { useAuthStore } from './auth'

export const useAIStore = defineStore('ai', () => {
  const authStore = useAuthStore()

  // State
  const providers = ref<AIProvider[]>([])
  const usage = ref<AIUsageStats | null>(null)
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isChatLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const isAvailable = computed(() => authStore.isAuthenticated)
  const defaultProvider = computed(() => providers.value.find(p => p.isDefault))
  const hasProviders = computed(() => providers.value.length > 0)

  /**
   * Load user's AI providers
   */
  async function loadProviders() {
    if (!authStore.isAuthenticated) return

    isLoading.value = true
    error.value = null
    try {
      providers.value = await getAIProviders()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Add a new AI provider
   */
  async function addProvider(input: AIProviderInput) {
    isLoading.value = true
    error.value = null
    try {
      const provider = await addAIProvider(input)
      providers.value.push(provider)
      return provider
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Remove an AI provider
   */
  async function removeProvider(id: string) {
    isLoading.value = true
    error.value = null
    try {
      await deleteAIProvider(id)
      const index = providers.value.findIndex(p => p.id === id)
      if (index !== -1) {
        providers.value.splice(index, 1)
      }
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load usage statistics
   */
  async function loadUsage() {
    if (!authStore.isAuthenticated) return

    try {
      usage.value = await getAIUsage()
    } catch (e) {
      error.value = (e as Error).message
    }
  }

  /**
   * Clear all AI state (e.g., on logout)
   */
  function clearState() {
    providers.value = []
    usage.value = null
    messages.value = []
    error.value = null
  }

  /**
   * Add a message to the chat
   */
  function addMessage(message: ChatMessage) {
    messages.value.push(message)
  }

  /**
   * Clear chat messages
   */
  function clearMessages() {
    messages.value = []
  }

  /**
   * Send chat to AI and get response
   * Parses response for action commands in format: [ACTION:name:args_json]
   */
  async function sendChat() {
    if (messages.value.length === 0) return

    isChatLoading.value = true
    error.value = null
    try {
      const result = await sendChatMessage(messages.value)
      const content = result.content

      // Parse action commands from response: [ACTION:name:{...json...}]
      // Uses bracket counting to support nested JSON (arrays, nested objects)
      const actions: { name: string; args: Record<string, unknown> }[] = []
      const actionPattern = /\[ACTION:(\w+):/g
      let actionMatch

      while ((actionMatch = actionPattern.exec(content)) !== null) {
        const actionName = actionMatch[1]
        const jsonStart = actionMatch.index + actionMatch[0].length

        // Find matching closing brace using bracket counting
        let depth = 0
        let jsonEnd = jsonStart
        let inString = false
        let escape = false

        for (let i = jsonStart; i < content.length; i++) {
          const char = content[i]

          if (escape) {
            escape = false
            continue
          }

          if (char === '\\' && inString) {
            escape = true
            continue
          }

          if (char === '"' && !escape) {
            inString = !inString
            continue
          }

          if (!inString) {
            if (char === '{' || char === '[') depth++
            if (char === '}' || char === ']') depth--

            if (depth === 0 && char === '}') {
              jsonEnd = i + 1
              break
            }
          }
        }

        if (jsonEnd > jsonStart) {
          const jsonStr = content.substring(jsonStart, jsonEnd)
          try {
            actions.push({
              name: actionName,
              args: JSON.parse(jsonStr)
            })
          } catch {
            // Invalid JSON, skip
          }
        }
      }

      // Remove action tags from display content (also using bracket-aware matching)
      let displayContent = content
      for (const action of actions) {
        const tag = `[ACTION:${action.name}:${JSON.stringify(action.args)}]`
        displayContent = displayContent.replace(tag, '')
      }
      // Also try to remove any remaining [ACTION:...] patterns
      displayContent = displayContent.replace(/\[ACTION:\w+:\{[\s\S]*?\}\]/g, '').trim()

      // Execute actions
      if (actions.length > 0) {
        const { executeToolCall } = await import('@/lib/ai-tools')
        const results: string[] = []

        for (const action of actions) {
          const toolResult = await executeToolCall(action.name, action.args)
          let resultText = toolResult.success
            ? `✅ ${toolResult.message}`
            : `❌ ${toolResult.message}`

          // Add data details if available
          if (toolResult.success && toolResult.data) {
            if (Array.isArray(toolResult.data)) {
              // Format array data (backups, categories, tags, search results)
              const items = toolResult.data.slice(0, 10) // Limit to 10 items
              if (items.length > 0) {
                const formatItem = (item: Record<string, unknown>) => {
                  if ('time' in item && 'type' in item) {
                    // Backup item
                    return `  - ID ${item.id}: ${item.time} (${item.type})`
                  }
                  if ('name' in item && 'url' in item) {
                    // Website item
                    return `  - ${item.name}: ${item.url}`
                  }
                  if ('name' in item && 'color' in item) {
                    // Tag item
                    return `  - ${item.name} (${item.color})`
                  }
                  if ('name' in item) {
                    // Category or other item
                    return `  - ${item.name}`
                  }
                  return `  - ${JSON.stringify(item)}`
                }
                resultText += '\n' + items.map(formatItem).join('\n')
              }
            }
          }
          results.push(resultText)
        }

        // Append execution results to message
        const finalContent = displayContent
          ? `${displayContent}\n\n📋 执行结果:\n${results.join('\n')}`
          : `📋 执行结果:\n${results.join('\n')}`

        messages.value.push({
          role: 'assistant',
          content: finalContent
        })
      } else {
        // No actions, just add the response
        messages.value.push({
          role: 'assistant',
          content: displayContent || content
        })
      }
    } catch (e) {
      error.value = (e as Error).message
      // Add error message
      messages.value.push({
        role: 'assistant',
        content: `抱歉，发生错误: ${error.value}`
      })
    } finally {
      isChatLoading.value = false
    }
  }

  return {
    // State
    providers: readonly(providers),
    usage: readonly(usage),
    messages,
    isLoading: readonly(isLoading),
    isChatLoading: readonly(isChatLoading),
    error: readonly(error),

    // Computed
    isAvailable,
    defaultProvider,
    hasProviders,

    // Actions
    loadProviders,
    addProvider,
    removeProvider,
    loadUsage,
    clearState,
    addMessage,
    clearMessages,
    sendChat
  }
})
