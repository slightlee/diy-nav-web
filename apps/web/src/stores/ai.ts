/**
 * AI Store
 * Manages AI-related state for the application
 */

import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import {
  getAIProviders,
  getAIProvider,
  addAIProvider,
  updateAIProvider,
  deleteAIProvider,
  setDefaultAIProvider,
  getAIUsage,
  sendChatMessage,
  type AIProvider,
  type AIProviderDetail,
  type AIProviderInput,
  type AIUsageStats,
  type ChatMessage,
  type AIActionResult
} from '@/api/ai'
import { useAuthStore } from './auth'
import { captureAccountSession, isCurrentAccountSession } from '@/utils/account-session'

export const useAIStore = defineStore('ai', () => {
  const authStore = useAuthStore()

  // State
  const providers = ref<AIProvider[]>([])
  const usage = ref<AIUsageStats | null>(null)
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isChatLoading = ref(false)
  const error = ref<string | null>(null)
  const pendingAction = ref<{
    name: string
    args: Record<string, unknown>
    message: string
  } | null>(null)
  const undoAction = ref<{ id: string; execute: () => void } | null>(null)
  const captureAuthenticatedSession = () => {
    const session = captureAccountSession()
    return authStore.isAuthenticated && session.userId ? session : null
  }

  // Computed
  const isAvailable = computed(() => authStore.isAuthenticated)
  const defaultProvider = computed(() => providers.value.find(p => p.isDefault))
  const hasProviders = computed(() => providers.value.length > 0)

  /**
   * Load user's AI providers
   */
  async function loadProviders() {
    const session = captureAuthenticatedSession()
    if (!session) return

    isLoading.value = true
    error.value = null
    try {
      const result = await getAIProviders()
      if (isCurrentAccountSession(session)) providers.value = result
    } catch (e) {
      if (isCurrentAccountSession(session)) error.value = (e as Error).message
    } finally {
      if (isCurrentAccountSession(session)) isLoading.value = false
    }
  }

  /**
   * Add a new AI provider
   */
  async function addProvider(input: AIProviderInput) {
    const session = captureAuthenticatedSession()
    if (!session) throw new Error('请先登录')
    isLoading.value = true
    error.value = null
    try {
      const provider = await addAIProvider(input)
      if (!isCurrentAccountSession(session)) throw new Error('账号已切换，操作已取消')
      if (provider.isDefault) {
        providers.value.forEach(p => {
          p.isDefault = false
        })
      }
      providers.value.push(provider)
      return provider
    } catch (e) {
      if (isCurrentAccountSession(session)) error.value = (e as Error).message
      throw e
    } finally {
      if (isCurrentAccountSession(session)) isLoading.value = false
    }
  }

  /**
   * Get provider detail
   */
  async function loadProviderDetail(id: string): Promise<AIProviderDetail> {
    const session = captureAuthenticatedSession()
    if (!session) throw new Error('请先登录')
    const result = await getAIProvider(id)
    if (!isCurrentAccountSession(session)) throw new Error('账号已切换，操作已取消')
    return result
  }

  /**
   * Update provider
   */
  async function updateProvider(id: string, input: AIProviderInput) {
    const session = captureAuthenticatedSession()
    if (!session) throw new Error('请先登录')
    isLoading.value = true
    error.value = null
    try {
      const provider = await updateAIProvider(id, input)
      if (!isCurrentAccountSession(session)) throw new Error('账号已切换，操作已取消')
      if (provider.isDefault) {
        providers.value.forEach(p => {
          p.isDefault = false
        })
      }
      const index = providers.value.findIndex(p => p.id === id)
      if (index !== -1) {
        providers.value[index] = provider
      }
      return provider
    } catch (e) {
      if (isCurrentAccountSession(session)) error.value = (e as Error).message
      throw e
    } finally {
      if (isCurrentAccountSession(session)) isLoading.value = false
    }
  }

  /**
   * Remove an AI provider
   */
  async function removeProvider(id: string) {
    const session = captureAuthenticatedSession()
    if (!session) throw new Error('请先登录')
    isLoading.value = true
    error.value = null
    try {
      await deleteAIProvider(id)
      const result = await getAIProviders()
      if (!isCurrentAccountSession(session)) throw new Error('账号已切换，操作已取消')
      providers.value = result
    } catch (e) {
      if (isCurrentAccountSession(session)) error.value = (e as Error).message
      throw e
    } finally {
      if (isCurrentAccountSession(session)) isLoading.value = false
    }
  }

  async function setDefaultProvider(id: string) {
    const session = captureAuthenticatedSession()
    if (!session) throw new Error('请先登录')
    error.value = null
    try {
      const provider = await setDefaultAIProvider(id)
      if (!isCurrentAccountSession(session)) throw new Error('账号已切换，操作已取消')
      providers.value.forEach(item => {
        item.isDefault = item.id === provider.id
      })
      return provider
    } catch (e) {
      if (isCurrentAccountSession(session)) error.value = (e as Error).message
      throw e
    }
  }

  /**
   * Load usage statistics
   */
  async function loadUsage() {
    const session = captureAuthenticatedSession()
    if (!session) return

    try {
      const result = await getAIUsage()
      if (isCurrentAccountSession(session)) usage.value = result
    } catch (e) {
      if (isCurrentAccountSession(session)) error.value = (e as Error).message
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
    pendingAction.value = null
    undoAction.value = null
    isLoading.value = false
    isChatLoading.value = false
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
    pendingAction.value = null
    undoAction.value = null
  }

  /**
   * Send chat to AI and get response
   * Parses response for action commands in format: [ACTION:name:args_json]
   */
  async function sendChat() {
    if (messages.value.length === 0 || isChatLoading.value) return
    const session = captureAuthenticatedSession()
    if (!session?.userId) return

    isChatLoading.value = true
    error.value = null
    try {
      const result = await sendChatMessage(
        messages.value.map(({ role, content }) => ({ role, content }))
      )
      if (!isCurrentAccountSession(session)) return
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

      const destructiveAction = actions.find(
        action =>
          action.name === 'delete_website' ||
          (action.name === 'update_website' &&
            (action.args.removeAllTags === true ||
              (Array.isArray(action.args.removeTags) && action.args.removeTags.length > 0)))
      )

      if (destructiveAction) {
        const target =
          (destructiveAction.args.name as string) ||
          (destructiveAction.args.id as string) ||
          '目标网站'
        const actionLabel =
          destructiveAction.name === 'delete_website'
            ? `删除“${target}”`
            : destructiveAction.args.removeAllTags === true
              ? `移除“${target}”的全部标签`
              : `修改“${target}”的标签`
        pendingAction.value = {
          ...destructiveAction,
          message: actionLabel
        }
        messages.value.push({
          role: 'assistant',
          content: `${displayContent || `我准备${actionLabel}`}\n\n⚠️ 这是一个会修改导航数据的操作，请确认后继续。`
        })
        return
      }

      // Execute actions
      if (actions.length > 0) {
        const { executeToolCall } = await import('@/lib/ai-tools')
        const results: string[] = []
        let actionResult: AIActionResult | undefined

        for (const action of actions) {
          const toolResult = await executeToolCall(action.name, action.args, session)
          if (!isCurrentAccountSession(session)) return
          let resultText = toolResult.success
            ? `✅ ${toolResult.message}`
            : `❌ ${toolResult.message}`

          if (toolResult.success && toolResult.action?.kind === 'website-added') {
            resultText = `✅ 已添加网站“${toolResult.action.website.name}”`
          }

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
          if (toolResult.action) {
            const undoId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
            actionResult = { ...toolResult.action, undoId }
            undoAction.value = toolResult.undo ? { id: undoId, execute: toolResult.undo } : null
          } else if (toolResult.success && toolResult.undo) {
            const undoId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
            undoAction.value = { id: undoId, execute: toolResult.undo }
          }
        }

        // Append execution results to message
        const resultContent =
          results.length === 1 ? results[0] : `📋 执行结果：\n${results.join('\n')}`
        const finalContent = displayContent
          ? `${displayContent}\n\n${resultContent}`
          : resultContent

        messages.value.push({
          role: 'assistant',
          content: finalContent,
          actionResult
        })
      } else {
        // No actions, just add the response
        messages.value.push({
          role: 'assistant',
          content: displayContent || content
        })
      }
    } catch (e) {
      if (!isCurrentAccountSession(session)) return
      error.value = (e as Error).message
      // Add error message
      messages.value.push({
        role: 'assistant',
        content: `抱歉，发生错误: ${error.value}`
      })
    } finally {
      if (isCurrentAccountSession(session)) {
        isChatLoading.value = false
      }
    }
  }

  async function confirmPendingAction() {
    const action = pendingAction.value
    if (!action || isChatLoading.value) return
    const session = captureAuthenticatedSession()
    if (!session?.userId) return

    pendingAction.value = null
    isChatLoading.value = true
    try {
      const { executeToolCall } = await import('@/lib/ai-tools')
      const toolResult = await executeToolCall(action.name, action.args, session)
      if (!isCurrentAccountSession(session)) return
      let resultText = toolResult.success ? `✅ ${toolResult.message}` : `❌ ${toolResult.message}`
      let actionResult: AIActionResult | undefined

      if (toolResult.action) {
        if (toolResult.action.kind === 'website-added') {
          resultText = `✅ 已添加网站“${toolResult.action.website.name}”`
        }
        const undoId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        actionResult = { ...toolResult.action, undoId }
        undoAction.value = toolResult.undo ? { id: undoId, execute: toolResult.undo } : null
      }

      messages.value.push({ role: 'assistant', content: resultText, actionResult })
    } catch (e) {
      if (!isCurrentAccountSession(session)) return
      messages.value.push({
        role: 'assistant',
        content: `❌ 操作失败：${(e as Error).message}`
      })
    } finally {
      if (isCurrentAccountSession(session)) {
        isChatLoading.value = false
      }
    }
  }

  function cancelPendingAction() {
    if (!pendingAction.value) return
    messages.value.push({ role: 'assistant', content: '已取消操作。' })
    pendingAction.value = null
  }

  function undoLastAction() {
    const action = undoAction.value
    if (!action) return
    action.execute()
    undoAction.value = null
    messages.value.push({ role: 'assistant', content: '↩️ 已撤销上一步操作。' })
  }

  async function retryLastMessage() {
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage?.role !== 'assistant' || !lastMessage.content.startsWith('抱歉，发生错误')) {
      return
    }
    messages.value.pop()
    await sendChat()
  }

  return {
    // State
    providers: readonly(providers),
    usage: readonly(usage),
    messages,
    isLoading: readonly(isLoading),
    isChatLoading: readonly(isChatLoading),
    error: readonly(error),
    pendingAction: readonly(pendingAction),
    undoAction: readonly(undoAction),

    // Computed
    isAvailable,
    defaultProvider,
    hasProviders,

    // Actions
    loadProviders,
    loadProviderDetail,
    addProvider,
    updateProvider,
    removeProvider,
    setDefaultProvider,
    loadUsage,
    clearState,
    addMessage,
    clearMessages,
    sendChat,
    confirmPendingAction,
    cancelPendingAction,
    undoLastAction,
    retryLastMessage
  }
})
