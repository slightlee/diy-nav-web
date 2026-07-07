/**
 * AI Routes
 * API endpoints for AI-powered features
 */

import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  AIProviderRegistry,
  OpenAIProvider,
  checkRateLimit,
  consumeRateLimit,
  recordUsage,
  getUserStats,
  decrypt,
  encrypt,
  toProviderDTO,
  type AIProvider,
  type AIProviderConfig
} from '@nav/ai-core'
import { config } from '@nav/config'
import { scrapeWebPage, formatContentForAI } from '../lib/web-scraper.js'
import { databaseClient } from '../services.js'
import {
  listUserProviders,
  createProvider,
  deleteProvider,
  findUserProviderById,
  findUserDefaultProvider,
  findUserFirstProvider,
  updateProvider
} from '../lib/ai-provider-store.js'

// Initialize provider registry with JWT secret as encryption key
const providerRegistry = new AIProviderRegistry(config.auth.jwtSecret)

const aiRoutes: FastifyPluginAsyncZod = async app => {
  // ============================================
  // Provider Management
  // ============================================

  const providerInputSchema = z
    .object({
      name: z.string().min(1).max(50),
      type: z.enum(['openai', 'claude', 'qwen', 'ernie', 'custom']),
      apiKey: z.string().min(1),
      baseUrl: z.string().url().optional(),
      model: z.string().optional(),
      isDefault: z.boolean().optional()
    })
    .superRefine((data, ctx) => {
      if (data.type === 'custom') {
        if (!data.baseUrl) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Custom provider requires baseUrl',
            path: ['baseUrl']
          })
        }
        if (!data.model) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Custom provider requires model',
            path: ['model']
          })
        }
      }
    })

  // List user's AI providers
  app.get(
    '/ai/providers',
    {
      onRequest: [app.authenticate]
    },
    async req => {
      const userId = req.user.sub
      const providers = await listUserProviders(databaseClient, userId)
      return { success: true, data: providers.map(toProviderDTO) }
    }
  )

  // Get provider detail (includes apiKey for editing)
  app.get(
    '/ai/providers/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        params: z.object({ id: z.string().uuid() })
      }
    },
    async (req, reply) => {
      const userId = req.user.sub
      const { id } = req.params
      const provider = await findUserProviderById(databaseClient, userId, id)

      if (!provider) {
        return reply.code(404).send({ success: false, message: 'Provider not found' })
      }

      const apiKey = decrypt(provider.apiKeyEncrypted, config.auth.jwtSecret)

      return {
        success: true,
        data: {
          ...toProviderDTO(provider),
          apiKey
        }
      }
    }
  )

  // Add a new AI provider
  app.post(
    '/ai/providers',
    {
      onRequest: [app.authenticate],
      schema: {
        body: providerInputSchema
      }
    },
    async req => {
      const userId = req.user.sub
      const { name, type, apiKey, baseUrl, model, isDefault } = req.body

      // Encrypt API key
      const apiKeyEncrypted = encrypt(apiKey, config.auth.jwtSecret)

      const now = Date.now()
      const newProvider: AIProviderConfig = {
        id: crypto.randomUUID(),
        userId,
        name,
        type,
        apiKeyEncrypted,
        baseUrl,
        model,
        isDefault: isDefault ?? false,
        createdAt: now,
        updatedAt: now
      }

      await createProvider(databaseClient, newProvider)

      return {
        success: true,
        data: toProviderDTO(newProvider)
      }
    }
  )

  // Update provider
  app.patch(
    '/ai/providers/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: providerInputSchema
      }
    },
    async (req, reply) => {
      const userId = req.user.sub
      const { id } = req.params
      const { name, type, apiKey, baseUrl, model, isDefault } = req.body

      const existing = await findUserProviderById(databaseClient, userId, id)
      if (!existing) {
        return reply.code(404).send({ success: false, message: 'Provider not found' })
      }

      const apiKeyEncrypted = encrypt(apiKey, config.auth.jwtSecret)
      const updatedAt = Date.now()
      const updatedProvider: AIProviderConfig = {
        ...existing,
        name,
        type,
        apiKeyEncrypted,
        baseUrl,
        model,
        isDefault: isDefault ?? existing.isDefault,
        updatedAt
      }

      const ok = await updateProvider(databaseClient, updatedProvider)
      if (!ok) {
        return reply.code(404).send({ success: false, message: 'Provider not found' })
      }

      providerRegistry.clearCache(userId, id)

      return {
        success: true,
        data: toProviderDTO(updatedProvider)
      }
    }
  )

  // Delete an AI provider
  app.delete(
    '/ai/providers/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        params: z.object({ id: z.string().uuid() })
      }
    },
    async (req, reply) => {
      const userId = req.user.sub
      const { id } = req.params

      const removed = await deleteProvider(databaseClient, userId, id)
      if (!removed) {
        return reply.code(404).send({ success: false, message: 'Provider not found' })
      }

      providerRegistry.clearCache(userId, id)

      return { success: true }
    }
  )

  // ============================================
  // Description Generation
  // ============================================

  const generateDescriptionSchema = z.object({
    name: z.string().min(1).max(100),
    url: z.string().url(),
    providerId: z.string().uuid().optional()
  })

  app.post(
    '/ai/generate-description',
    {
      onRequest: [app.authenticate],
      schema: {
        body: generateDescriptionSchema
      },
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute'
        }
      }
    },
    async (req, reply) => {
      const userId = req.user.sub
      const { name, url, providerId } = req.body

      // Check rate limit
      const limitResult = checkRateLimit(userId)
      if (!limitResult.allowed) {
        return reply.code(429).send({
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: '今日 AI 调用次数已达上限',
          resetAt: limitResult.resetAt
        })
      }

      // Get provider
      let providerConfig: AIProviderConfig | null = null

      if (providerId) {
        providerConfig = await findUserProviderById(databaseClient, userId, providerId)
      } else {
        providerConfig =
          (await findUserDefaultProvider(databaseClient, userId)) ||
          (await findUserFirstProvider(databaseClient, userId))
      }

      if (!providerConfig) {
        // Fall back to system OpenAI if configured
        const envApiKey = process.env.AI_OPENAI_API_KEY
        if (!envApiKey) {
          return reply.code(400).send({
            success: false,
            code: 'NO_PROVIDER',
            message: '请先配置 AI 服务'
          })
        }

        // Create temporary OpenAI provider
        const tempProvider = new OpenAIProvider()
        tempProvider.initialize({
          apiKey: envApiKey,
          baseUrl: process.env.AI_OPENAI_BASE_URL,
          model: process.env.AI_OPENAI_MODEL
        })

        try {
          // Scrape webpage
          const scrapedContent = await scrapeWebPage(url)
          const formattedContent = formatContentForAI(scrapedContent)

          // Generate description
          const result = await tempProvider.generateDescription(name, url, formattedContent, {
            lang: 'zh',
            maxLength: 100
          })

          // Consume rate limit and record usage
          consumeRateLimit(userId)
          recordUsage(userId, 'system', 'generate_description', result.tokensUsed || 0)

          return {
            success: true,
            data: {
              description: result.description,
              tokensUsed: result.tokensUsed
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          req.log.error({ error: errorMessage, url, name }, 'Failed to generate description')
          return reply.code(500).send({
            success: false,
            code: 'GENERATION_FAILED',
            message: `生成描述失败: ${errorMessage}`
          })
        }
      }

      // Use user's provider
      try {
        const provider = providerRegistry.getProvider(providerConfig)

        // Scrape webpage
        const scrapedContent = await scrapeWebPage(url)
        const formattedContent = formatContentForAI(scrapedContent)

        // Generate description
        const result = await provider.generateDescription(name, url, formattedContent, {
          lang: 'zh',
          maxLength: 100
        })

        // Consume rate limit and record usage
        consumeRateLimit(userId)
        recordUsage(userId, providerConfig.id, 'generate_description', result.tokensUsed || 0)

        return {
          success: true,
          data: {
            description: result.description,
            tokensUsed: result.tokensUsed
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        req.log.error({ error: errorMessage, url, name }, 'Failed to generate description')
        return reply.code(500).send({
          success: false,
          code: 'GENERATION_FAILED',
          message: `生成描述失败: ${errorMessage}`
        })
      }
    }
  )

  // ============================================
  // Usage Statistics
  // ============================================

  app.get(
    '/ai/usage',
    {
      onRequest: [app.authenticate]
    },
    async req => {
      const userId = req.user.sub
      const stats = getUserStats(userId)
      const limit = checkRateLimit(userId)

      return {
        success: true,
        data: {
          ...stats,
          dailyLimit: 100,
          dailyRemaining: limit.remaining,
          resetAt: limit.resetAt
        }
      }
    }
  )

  // ============================================
  // Test Provider Connection
  // ============================================

  app.post(
    '/ai/providers/:id/test',
    {
      onRequest: [app.authenticate],
      schema: {
        params: z.object({ id: z.string().uuid() })
      }
    },
    async (req, reply) => {
      const userId = req.user.sub
      const { id } = req.params

      const providerConfig = await findUserProviderById(databaseClient, userId, id)

      if (!providerConfig) {
        return reply.code(404).send({ success: false, message: 'Provider not found' })
      }

      try {
        const provider = providerRegistry.getProvider(providerConfig)
        const connected = await provider.testConnection()

        return {
          success: true,
          data: { connected }
        }
      } catch (error) {
        return {
          success: true,
          data: { connected: false, error: (error as Error).message }
        }
      }
    }
  )

  // ============================================
  // AI Chat with Tool Calling
  // ============================================

  const chatMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })

  const chatSchema = z.object({
    messages: z.array(chatMessageSchema),
    tools: z.array(z.string()).optional() // List of enabled tool names
  })

  app.post(
    '/ai/chat',
    {
      onRequest: [app.authenticate],
      schema: {
        body: chatSchema
      }
    },
    async (req, reply) => {
      const userId = req.user.sub
      const { messages } = req.body

      // Check rate limit
      const limitResult = checkRateLimit(userId)
      if (!limitResult.allowed) {
        return reply.code(429).send({
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: '今日 AI 调用次数已达上限'
        })
      }

      // Get provider
      const userProvider =
        (await findUserDefaultProvider(databaseClient, userId)) ||
        (await findUserFirstProvider(databaseClient, userId))

      let provider: AIProvider
      let providerIdForUsage = 'system'

      if (userProvider) {
        provider = providerRegistry.getProvider(userProvider)
        providerIdForUsage = userProvider.id
      } else {
        const envApiKey = process.env.AI_OPENAI_API_KEY
        if (!envApiKey) {
          return reply.code(400).send({
            success: false,
            code: 'NO_PROVIDER',
            message: '请先配置 AI 服务'
          })
        }

        const tempProvider = new OpenAIProvider()
        tempProvider.initialize({
          apiKey: envApiKey,
          baseUrl: process.env.AI_OPENAI_BASE_URL,
          model: process.env.AI_OPENAI_MODEL
        })
        provider = tempProvider
      }

      // TODO: MCP tools will be used for tool calling support
      // const { mcpTools, executeMcpTool } = await import('../lib/mcp-tools.js')

      try {
        // Build system message for assistant
        const systemMessage = {
          role: 'system' as const,
          content: `你是一个导航网站的 AI 助手。你可以帮助用户管理网站、分类和标签。

## 可用操作
操作标记格式：[ACTION:操作名:{参数JSON}]

### 网站操作
- 添加网站: [ACTION:add_website:{"name":"网站名","url":"https://..."}]
- 删除网站: [ACTION:delete_website:{"name":"网站名"}]
- 搜索网站: [ACTION:search_websites:{"keyword":"关键词"}]
- 修改网站: [ACTION:update_website:{"name":"网站名","addTags":["标签名"],"removeTags":["标签名"],"removeAllTags":true,"category":"分类名"}]
  - addTags: 给网站添加标签（不存在会自动创建）
  - removeTags: 从网站移除指定标签
  - removeAllTags: 设为true时移除网站所有标签
- 生成描述: [ACTION:generate_description:{"name":"网站名"}]
  用于完善/更新网站描述，AI会自动抓取并生成
- 刷新图标: [ACTION:refresh_website_icon:{"name":"网站名"}]

### 分类操作
- 添加分类: [ACTION:add_category:{"name":"分类名"}]
- 列出分类: [ACTION:list_categories:{}]

### 标签操作
- 添加标签: [ACTION:add_tag:{"name":"标签名"}]
- 列出标签: [ACTION:list_tags:{}]

### 备份操作
- 列出备份: [ACTION:list_backups:{}]
- 备份数据: [ACTION:backup_data:{}]

## 示例
用户：给百度添加AI标签
回复：好的，我来给百度添加AI标签。
[ACTION:update_website:{"name":"百度","addTags":["AI"]}]

用户：去掉百度学术的AI标签
回复：好的，我来移除百度学术的AI标签。
[ACTION:update_website:{"name":"百度学术","removeTags":["AI"]}]

用户：把百度的标签都去掉
回复：好的，我来移除百度的所有标签。
[ACTION:update_website:{"name":"百度","removeAllTags":true}]

用户：完善七牛云描述
回复：好的，我来为七牛云生成描述。
[ACTION:generate_description:{"name":"七牛云"}]

用户：添加网站 GitHub github.com
回复：好的，我来添加GitHub。
[ACTION:add_website:{"name":"GitHub","url":"https://github.com"}]

用户：重新获取AWS的图标
回复：好的，我来刷新AWS的图标。
[ACTION:refresh_website_icon:{"name":"AWS"}]

## 注意
1. 始终使用中文回复
2. 当用户说"完善描述/更新描述"时，使用 generate_description
3. 当用户说"移除所有标签"时，使用 removeAllTags:true
4. 当用户说"刷新图标/重新获取图标/重新上传图标"时，使用 refresh_website_icon
5. 直接执行操作，不需要询问用户`
        }

        const allMessages = [systemMessage, ...messages]

        // For now, use chatComplete (non-streaming)
        // TODO: Add streaming support with SSE
        const result = await provider.chatComplete(allMessages, {
          temperature: 0.7,
          maxTokens: 1000
        })

        // Consume rate limit and record usage
        consumeRateLimit(userId)
        recordUsage(userId, providerIdForUsage, 'chat', result.meta.totalTokens || 0)

        return {
          success: true,
          data: {
            content: result.content,
            tokensUsed: result.meta.totalTokens
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        req.log.error({ error: errorMessage }, 'Failed to process chat')
        return reply.code(500).send({
          success: false,
          code: 'CHAT_FAILED',
          message: `对话失败: ${errorMessage}`
        })
      }
    }
  )
}

export default aiRoutes
