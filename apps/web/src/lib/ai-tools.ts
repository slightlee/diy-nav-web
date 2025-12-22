/**
 * AI Function Tools
 * Defines tools that AI can call to perform actions
 */

import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { request } from '@/utils/http'
import { getIcon } from '@/api/icon'
import { generateDescription, sendChatMessage } from '@/api/ai'
import type { Website } from '@/types'

// ============================================
// Helper Functions (P1: Reduce Code Duplication)
// ============================================

/**
 * Find website by name with priority: exact match → startsWith → includes
 */
function findWebsiteByName(websites: Website[], name: string): Website | undefined {
  const nameLower = name.toLowerCase()
  return (
    websites.find(w => w.name.toLowerCase() === nameLower) ||
    websites.find(w => w.name.toLowerCase().startsWith(nameLower)) ||
    websites.find(w => w.name.toLowerCase().includes(nameLower))
  )
}

/**
 * Tool definitions in OpenAI function calling format
 */
export const aiTools = [
  // Website operations
  {
    type: 'function' as const,
    function: {
      name: 'add_website',
      description: '添加一个新网站到导航',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '网站名称' },
          url: { type: 'string', description: '网站地址' },
          description: { type: 'string', description: '网站描述' },
          categoryId: { type: 'string', description: '分类ID' }
        },
        required: ['name', 'url']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_website',
      description: '删除一个网站',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '网站ID' },
          name: { type: 'string', description: '网站名称（用于模糊匹配）' }
        }
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_website',
      description: '修改网站的分类或标签（支持标签名称，不存在会自动创建）',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '网站名称（用于匹配）' },
          category: { type: 'string', description: '分类名称' },
          addTags: {
            type: 'array',
            items: { type: 'string' },
            description: '要添加的标签名称列表（如不存在会自动创建）'
          },
          removeTags: {
            type: 'array',
            items: { type: 'string' },
            description: '要移除的标签名称列表'
          },
          removeAllTags: {
            type: 'boolean',
            description: '是否移除所有标签'
          }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_description',
      description: '为网站自动生成AI描述（完善/更新描述）',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '网站名称' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_websites',
      description: '搜索网站',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '搜索关键词' }
        },
        required: ['keyword']
      }
    }
  },
  // Category operations
  {
    type: 'function' as const,
    function: {
      name: 'add_category',
      description: '创建一个新分类',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '分类名称' },
          icon: { type: 'string', description: '分类图标' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_categories',
      description: '列出所有分类',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  // Tag operations
  {
    type: 'function' as const,
    function: {
      name: 'add_tag',
      description: '创建一个新标签',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '标签名称' },
          color: { type: 'string', description: '标签颜色' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_tags',
      description: '列出所有标签',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  // Backup operations (calls backend)
  {
    type: 'function' as const,
    function: {
      name: 'list_backups',
      description: '获取云端备份列表',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'backup_data',
      description: '备份数据到云端',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
]

export interface ToolCallResult {
  success: boolean
  message: string
  data?: unknown
}

/**
 * Execute a tool call and return the result
 */
export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const websiteStore = useWebsiteStore()
  const categoryStore = useCategoryStore()
  const tagStore = useTagStore()

  try {
    switch (toolName) {
      // Website operations
      case 'add_website': {
        const name = args.name as string
        let url = args.url as string

        // Ensure URL has protocol
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url
        }

        // 1. Try to get icon
        let favicon: string | undefined
        try {
          const iconRes = await getIcon({ url })
          if (iconRes.success && iconRes.data?.url) {
            favicon = iconRes.data.url
          }
        } catch {
          // Icon fetch failed, continue without it
        }

        // 2. Try to generate AI description
        let description = (args.description as string) || ''
        if (!description) {
          try {
            const descRes = await generateDescription(name, url)
            description = descRes.description || ''
          } catch {
            // Description generation failed, use empty
          }
        }

        // 3. Use AI to infer category and tags
        let categoryId = args.categoryId as string
        let matchedTagIds: string[] = []

        // Get available categories and tags
        const categories = categoryStore.categories
        const tags = tagStore.tags

        // Only use AI inference if we have categories/tags and no category is specified
        if (!categoryId && (categories.length > 0 || tags.length > 0)) {
          try {
            const categoryList = categories.map(c => `${c.id}:${c.name}`).join(', ')
            const tagList = tags.map(t => `${t.id}:${t.name}`).join(', ')

            const inferPrompt = `分析这个网站并推荐分类和标签。

网站名称: ${name}
网站地址: ${url}
网站描述: ${description || '无'}

可选分类: ${categoryList || '无'}
可选标签: ${tagList || '无'}

请只返回 JSON 格式，不要有其他文字:
{"categoryId": "匹配的分类ID或空字符串", "tagIds": ["匹配的标签ID数组"]}

注意:
1. categoryId 只能从可选分类中选择一个，如果没有合适的就返回空字符串
2. tagIds 可以选择多个标签，如果没有合适的就返回空数组
3. 根据网站的实际用途和特点来匹配`

            const aiResult = await sendChatMessage([{ role: 'user', content: inferPrompt }])

            // Parse AI response
            const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0])
              if (parsed.categoryId && categories.some(c => c.id === parsed.categoryId)) {
                categoryId = parsed.categoryId
              }
              if (Array.isArray(parsed.tagIds)) {
                matchedTagIds = parsed.tagIds.filter((id: string) => tags.some(t => t.id === id))
              }
            }
          } catch {
            // AI inference failed, continue without category/tags
          }
        }

        // 4. Add website
        const website = websiteStore.addWebsite({
          name,
          url,
          description,
          categoryId: categoryId || '',
          tagIds: matchedTagIds,
          favicon,
          isFavorite: false,
          isOnline: true,
          visitCount: 0,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        })

        const matchedCat = categoryId
          ? categoryStore.categories.find(c => c.id === categoryId)?.name
          : null

        const matchedTagNames = matchedTagIds
          .map(id => tagStore.tags.find(t => t.id === id)?.name)
          .filter(Boolean)

        const statusParts: string[] = []
        if (favicon) statusParts.push('含图标')
        if (description) statusParts.push('含描述')
        if (matchedCat) statusParts.push(`分类:${matchedCat}`)
        if (matchedTagNames.length > 0) statusParts.push(`标签:${matchedTagNames.join(',')}`)

        const statusText = statusParts.length > 0 ? ` (${statusParts.join(', ')})` : ''

        return {
          success: true,
          message: `已添加网站 "${name}"${statusText}`,
          data: website
        }
      }

      case 'delete_website': {
        if (args.id) {
          websiteStore.deleteWebsite(args.id as string)
          return { success: true, message: '网站已删除' }
        }
        // Find by name using helper function
        if (args.name) {
          const found = findWebsiteByName(websiteStore.websites, args.name as string)
          if (found) {
            websiteStore.deleteWebsite(found.id)
            return { success: true, message: `已删除网站 "${found.name}"` }
          }
          return { success: false, message: `未找到名为 "${args.name}" 的网站` }
        }
        return { success: false, message: '请提供网站 ID 或名称' }
      }

      case 'update_website': {
        const websiteName = args.name as string
        const found = findWebsiteByName(websiteStore.websites, websiteName)
        if (!found) {
          return { success: false, message: `未找到名为 "${websiteName}" 的网站` }
        }

        const updates: { categoryId?: string; tagIds?: string[] } = {}
        const changes: string[] = []

        // Update category if provided (by name)
        if (args.category) {
          const catName = args.category as string
          const cat = categoryStore.categories.find(
            c => c.name.toLowerCase() === catName.toLowerCase()
          )
          if (cat) {
            updates.categoryId = cat.id
            changes.push(`分类:${cat.name}`)
          } else {
            changes.push(`分类"${catName}"不存在`)
          }
        }

        // Update tags (by name, auto-create if not found)
        let newTagIds = [...found.tagIds]

        if (args.addTags && Array.isArray(args.addTags)) {
          for (const tagName of args.addTags as string[]) {
            // Find existing tag
            let tag = tagStore.tags.find(t => t.name.toLowerCase() === tagName.toLowerCase())
            // Auto-create if not found
            if (!tag) {
              tag = tagStore.addTag({ name: tagName, color: '#3B82F6' })
              changes.push(`+新标签:${tagName}`)
            } else {
              changes.push(`+标签:${tag.name}`)
            }
            if (!newTagIds.includes(tag.id)) {
              newTagIds.push(tag.id)
            }
          }
        }

        // Handle removeAllTags first
        if (args.removeAllTags === true) {
          const removedCount = newTagIds.length
          newTagIds = []
          changes.push(`-所有标签(${removedCount}个)`)
        } else if (args.removeTags && Array.isArray(args.removeTags)) {
          for (const tagName of args.removeTags as string[]) {
            const tag = tagStore.tags.find(t => t.name.toLowerCase() === tagName.toLowerCase())
            if (tag) {
              newTagIds = newTagIds.filter(id => id !== tag.id)
              changes.push(`-标签:${tag.name}`)
            }
          }
        }

        updates.tagIds = newTagIds
        websiteStore.updateWebsite(found.id, updates)

        return {
          success: true,
          message: `已更新网站 "${found.name}" (${changes.join(', ') || '无变化'})`
        }
      }

      case 'generate_description': {
        const websiteName = args.name as string
        const found = findWebsiteByName(websiteStore.websites, websiteName)
        if (!found) {
          return { success: false, message: `未找到名为 "${websiteName}" 的网站` }
        }

        // Call AI to generate description
        try {
          const result = await generateDescription(found.name, found.url)
          if (result.description) {
            websiteStore.updateWebsite(found.id, { description: result.description })
            return {
              success: true,
              message: `已为 "${found.name}" 生成描述：${result.description.substring(0, 50)}...`
            }
          }
          return { success: false, message: '描述生成失败' }
        } catch (e) {
          return { success: false, message: `生成描述出错: ${(e as Error).message}` }
        }
      }

      case 'search_websites': {
        const keyword = (args.keyword as string).toLowerCase()
        const results = websiteStore.websites.filter(
          w =>
            w.name.toLowerCase().includes(keyword) ||
            w.description?.toLowerCase().includes(keyword) ||
            w.url.toLowerCase().includes(keyword)
        )
        return {
          success: true,
          message: `找到 ${results.length} 个匹配的网站`,
          data: results.slice(0, 5).map(w => ({ name: w.name, url: w.url }))
        }
      }

      // Category operations
      case 'add_category': {
        const category = categoryStore.addCategory({
          name: args.name as string,
          description: '',
          icon: (args.icon as string) || 'fas fa-folder'
        })
        return {
          success: true,
          message: `已创建分类 "${args.name}"`,
          data: category
        }
      }

      case 'list_categories': {
        const categories = categoryStore.categories
        return {
          success: true,
          message: `共有 ${categories.length} 个分类`,
          data: categories.map(c => ({ id: c.id, name: c.name }))
        }
      }

      // Tag operations
      case 'add_tag': {
        const tag = tagStore.addTag({
          name: args.name as string,
          color: (args.color as string) || '#3B82F6'
        })
        return {
          success: true,
          message: `已创建标签 "${args.name}"`,
          data: tag
        }
      }

      case 'list_tags': {
        const tags = tagStore.tags
        return {
          success: true,
          message: `共有 ${tags.length} 个标签`,
          data: tags.map(t => ({ id: t.id, name: t.name, color: t.color }))
        }
      }

      // Backup operations (call backend API)
      case 'list_backups': {
        const res =
          await request.get<{ id: number; created_at: number; type: string }[]>('/api/backups')
        if (res.success && res.data) {
          const backups = res.data
          if (backups.length === 0) {
            return { success: true, message: '暂无云端备份' }
          }
          return {
            success: true,
            message: `共有 ${backups.length} 个云端备份`,
            data: backups.map(b => ({
              id: b.id,
              time: new Date(b.created_at).toLocaleString(),
              type: b.type === 'AUTO' ? '自动' : '手动'
            }))
          }
        }
        return { success: false, message: '获取备份列表失败' }
      }

      case 'backup_data': {
        try {
          const exportData = websiteStore.exportData()
          const res = await request.post('/api/backup', {
            data: exportData,
            type: 'MANUAL'
          })
          if (res.success) {
            return { success: true, message: '数据已手动备份到云端' }
          }
          return { success: false, message: res.message || '备份失败' }
        } catch (e) {
          return { success: false, message: `备份失败: ${(e as Error).message}` }
        }
      }

      default:
        return { success: false, message: `未知操作: ${toolName}` }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, message: `操作失败: ${msg}` }
  }
}

/**
 * Get tool names for system prompt
 */
export function getToolsDescription(): string {
  return aiTools.map(t => `- ${t.function.name}: ${t.function.description}`).join('\n')
}
