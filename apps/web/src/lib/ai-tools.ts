/**
 * AI Function Tools
 * Defines tools that AI can call to perform actions
 */

import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { request } from '@/utils/http'
import { getIcon } from '@/api/icon'
import { classifyWebsite, generateDescription } from '@/api/ai'
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

const FALLBACK_CLASSIFICATION_RULES = [
  {
    keywords: ['github', 'gitlab', 'stackoverflow', 'stack overflow', 'npm', 'jsdelivr'],
    category: '开发工具',
    tags: ['开发', '代码']
  },
  {
    keywords: ['linux.do', 'reddit', 'v2ex', 'discord', 'forum', 'community', '社区'],
    category: '社区论坛',
    tags: ['社区', '技术交流']
  },
  {
    keywords: ['baidu', 'google', 'bing', 'duckduckgo'],
    category: '搜索引擎',
    tags: ['搜索', '中文网站']
  },
  {
    keywords: ['notion', 'wikipedia', 'readthedocs', 'docs.', '文档', '知识库'],
    category: '知识文档',
    tags: ['知识', '文档']
  },
  {
    keywords: ['youtube', 'bilibili', 'netflix', 'spotify', '视频', '音乐'],
    category: '影音娱乐',
    tags: ['视频', '娱乐']
  },
  {
    keywords: ['taobao', 'jd.com', 'amazon', '京东', '淘宝'],
    category: '购物电商',
    tags: ['购物', '电商']
  }
] as const

function getFallbackClassification(name: string, url: string, description: string) {
  const text = `${name} ${url} ${description}`.toLowerCase()
  const matched = FALLBACK_CLASSIFICATION_RULES.find(rule =>
    rule.keywords.some(keyword => text.includes(keyword))
  )
  return matched || { category: '其他网站', tags: ['常用网站'] }
}

function getOrCreateCategory(
  categoryStore: ReturnType<typeof useCategoryStore>,
  name: string,
  createdIds?: Set<string>
) {
  const normalizedName = name.trim()
  const existing = categoryStore.categories.find(
    category => category.name.trim().toLowerCase() === normalizedName.toLowerCase()
  )
  if (existing) return existing
  const category = categoryStore.addCategory({
    name: normalizedName,
    description: '',
    icon: 'fas fa-folder'
  })
  createdIds?.add(category.id)
  return category
}

function getOrCreateTag(
  tagStore: ReturnType<typeof useTagStore>,
  name: string,
  index: number,
  createdIds?: Set<string>
) {
  const normalizedName = name.trim()
  const existing = tagStore.tags.find(
    tag => tag.name.trim().toLowerCase() === normalizedName.toLowerCase()
  )
  if (existing) return existing
  const tag = tagStore.addTag({
    name: normalizedName,
    color: tagStore.tagColors[index % tagStore.tagColors.length]
  })
  createdIds?.add(tag.id)
  return tag
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
      description: '添加一个新网站到导航。用户只需提供网站名称和 URL，不必额外说“添加网站”',
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
      description: '为网站生成或更新文字描述/简介',
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
      name: 'refresh_website_icon',
      description: '刷新/重新获取网站的图标',
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
  action?: {
    kind: 'website-added' | 'website-deleted' | 'website-updated'
    website: Website
    classificationFailed?: boolean
  }
  undo?: () => void
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
        const name = typeof args.name === 'string' ? args.name.trim() : ''
        let url = typeof args.url === 'string' ? args.url.trim() : ''

        if (!name) return { success: false, message: '请提供网站名称' }
        if (!url) return { success: false, message: '请提供网站地址' }

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

        // 2. Analyze the website once for description, category, and tags
        let description = typeof args.description === 'string' ? args.description.trim() : ''
        let categoryId =
          typeof args.categoryId === 'string' &&
          categoryStore.categories.some(category => category.id === args.categoryId)
            ? args.categoryId
            : ''
        let matchedTagIds: string[] = []

        // Get available categories and tags
        const categories = categoryStore.categories
        const tags = tagStore.tags
        const createdCategoryIds = new Set<string>()
        const createdTagIds = new Set<string>()
        let classificationFailed = false

        try {
          const classification = await classifyWebsite({
            name,
            url,
            description,
            categories: categories.map(category => ({ id: category.id, name: category.name })),
            tags: tags.map(tag => ({ id: tag.id, name: tag.name }))
          })
          description = classification.description || description

          if (!categoryId) {
            if (
              classification.categoryId &&
              categories.some(category => category.id === classification.categoryId)
            ) {
              categoryId = classification.categoryId
            }

            if (classification.categoryName) {
              const category = getOrCreateCategory(
                categoryStore,
                classification.categoryName,
                createdCategoryIds
              )
              categoryId = category.id
            }
          }

          matchedTagIds = classification.tagIds.filter(tagId => tags.some(tag => tag.id === tagId))
          const suggestedTagIds = classification.tagNames.map(
            (tagName, index) => getOrCreateTag(tagStore, tagName, index, createdTagIds).id
          )
          matchedTagIds = [...new Set([...matchedTagIds, ...suggestedTagIds])].slice(0, 3)

          if (!categoryId || matchedTagIds.length === 0) {
            classificationFailed = true
          }
        } catch {
          classificationFailed = true
        }

        // Classification normally supplies the description. Only make a second AI request when
        // that response failed or omitted it, so website details are not lost on the fallback path.
        if (!description) {
          try {
            const result = await generateDescription(name, url)
            description = result.description?.trim() || ''
          } catch {
            // Description generation is best-effort; classification fallback can still add the site.
          }
        }

        if (classificationFailed) {
          const fallback = getFallbackClassification(name, url, description)
          if (!categoryId) {
            categoryId = getOrCreateCategory(
              categoryStore,
              fallback.category,
              createdCategoryIds
            ).id
          }
          if (matchedTagIds.length === 0) {
            matchedTagIds = fallback.tags
              .map((tagName, index) => getOrCreateTag(tagStore, tagName, index, createdTagIds).id)
              .slice(0, 3)
          }
          classificationFailed = !categoryId || matchedTagIds.length === 0
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
          data: website,
          action: { kind: 'website-added', website, classificationFailed },
          undo: () => {
            websiteStore.deleteWebsite(website.id)
            createdTagIds.forEach(tagId => {
              const isReferenced = websiteStore.websites.some(item => item.tagIds.includes(tagId))
              if (!isReferenced) tagStore.deleteTag(tagId)
            })
            createdCategoryIds.forEach(createdCategoryId => {
              const isReferenced = websiteStore.websites.some(
                item => item.categoryId === createdCategoryId
              )
              if (!isReferenced) categoryStore.deleteCategory(createdCategoryId)
            })
          }
        }
      }

      case 'delete_website': {
        if (args.id) {
          const found = websiteStore.websites.find(website => website.id === args.id)
          if (!found) return { success: false, message: '未找到指定网站' }
          websiteStore.deleteWebsite(found.id)
          return {
            success: true,
            message: `已删除网站 "${found.name}"`,
            data: found,
            action: { kind: 'website-deleted', website: found },
            undo: () => websiteStore.restoreWebsite(found)
          }
        }
        // Find by name using helper function
        if (args.name) {
          const found = findWebsiteByName(websiteStore.websites, args.name as string)
          if (found) {
            websiteStore.deleteWebsite(found.id)
            return {
              success: true,
              message: `已删除网站 "${found.name}"`,
              data: found,
              action: { kind: 'website-deleted', website: found },
              undo: () => websiteStore.restoreWebsite(found)
            }
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
          message: `已更新网站 "${found.name}" (${changes.join(', ') || '无变化'})`,
          action: { kind: 'website-updated', website: found },
          undo: () =>
            websiteStore.updateWebsite(found.id, {
              categoryId: found.categoryId,
              tagIds: found.tagIds
            })
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

      case 'refresh_website_icon': {
        const websiteName = args.name as string
        const found = findWebsiteByName(websiteStore.websites, websiteName)
        if (!found) {
          return { success: false, message: `未找到名为 "${websiteName}" 的网站` }
        }

        try {
          const iconRes = await getIcon({ url: found.url, refresh: true })
          if (iconRes.success && iconRes.data?.url) {
            websiteStore.updateWebsite(found.id, { favicon: iconRes.data.url })
            return {
              success: true,
              message: `已重新获取 "${found.name}" 的图标`
            }
          }
          return { success: false, message: '图标获取失败，请稍后重试' }
        } catch (e) {
          return { success: false, message: `获取图标出错: ${(e as Error).message}` }
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
