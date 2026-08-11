import { describe, expect, it } from 'vitest'
import {
  bookmarkClassificationRequestSchema,
  buildBookmarkTaxonomyMessages,
  parseBookmarkClassificationResponse,
  parseBookmarkTaxonomyResponse
} from './bookmark-import-ai.js'

describe('bookmark import AI contract', () => {
  it('scales taxonomy targets down for small bookmark sets', () => {
    const [systemMessage] = buildBookmarkTaxonomyMessages({
      total: 2,
      folders: [],
      domains: [{ host: 'example.com', count: 2, titles: ['首页', '文档'] }],
      samples: [{ name: '首页', host: 'example.com', folderPath: '' }]
    })

    expect(systemMessage.content).toContain('目标约 2 个')
    expect(systemMessage.content).toContain('目标约 3 个')
    expect(systemMessage.content).not.toContain('通常 6 到 20 个')
  })

  it('deduplicates taxonomy names and enforces global caps', () => {
    const categories = Array.from({ length: 35 }, (_, index) => `分类 ${index}`)
    const tags = Array.from({ length: 55 }, (_, index) => `标签 ${index}`)
    const result = parseBookmarkTaxonomyResponse(
      JSON.stringify({
        categories: [...categories, '分类 0'],
        tags: [...tags, '标签 0', '分类 0']
      })
    )

    expect(result.categories).toHaveLength(30)
    expect(result.tags).toHaveLength(50)
    expect(new Set(result.categories).size).toBe(30)
    expect(new Set(result.tags).size).toBe(50)
    expect(result.tags).not.toContain('分类 0')
  })

  it('caps taxonomy size to the imported bookmark scale', () => {
    const result = parseBookmarkTaxonomyResponse(
      JSON.stringify({
        categories: Array.from({ length: 10 }, (_, index) => `分类 ${index}`),
        tags: Array.from({ length: 10 }, (_, index) => `标签 ${index}`)
      }),
      2
    )

    expect(result.categories).toHaveLength(2)
    expect(result.tags).toHaveLength(6)
  })

  it('accepts only requested ids and one to three valid tags per bookmark', () => {
    const input = bookmarkClassificationRequestSchema.parse({
      taxonomy: {
        categories: [{ id: 'c1', name: '开发与开源' }],
        tags: [
          { id: 't1', name: '开源' },
          { id: 't2', name: '文档' }
        ]
      },
      bookmarks: [
        { sourceId: 'b1', name: 'GitHub', url: 'https://github.com/', folderPath: '开发' },
        { sourceId: 'b2', name: 'Docs', url: 'https://docs.example.com/', folderPath: '资料' },
        { sourceId: 'b3', name: 'Search', url: 'https://example.com/', folderPath: '' }
      ]
    })
    const result = parseBookmarkClassificationResponse(
      JSON.stringify({
        items: [
          {
            sourceId: 'b1',
            description: '代码托管与开源协作平台',
            categoryId: 'c1',
            tagIds: ['t1', 't2', 't2']
          },
          {
            sourceId: 'b2',
            description: '开发文档资料站点',
            categoryId: 'invalid',
            tagIds: ['t2']
          },
          {
            sourceId: 'unknown',
            description: '不属于本批次',
            categoryId: 'c1',
            tagIds: ['t1']
          }
        ]
      }),
      input
    )

    expect(result.items).toEqual([
      {
        sourceId: 'b1',
        description: '代码托管与开源协作平台',
        categoryId: 'c1',
        tagIds: ['t1', 't2']
      }
    ])
    expect(result.errors).toEqual([
      { sourceId: 'b2', message: 'AI 返回了无效分类' },
      { sourceId: 'b3', message: 'AI 未返回该书签的分析结果' }
    ])
  })

  it('maps existing taxonomy names back to their ids', () => {
    const input = bookmarkClassificationRequestSchema.parse({
      taxonomy: {
        categories: [{ id: 'c1', name: '开发与开源' }],
        tags: [{ id: 't1', name: '开源' }]
      },
      bookmarks: [{ sourceId: 'b1', name: 'GitHub', url: 'https://github.com/', folderPath: '' }]
    })

    expect(
      parseBookmarkClassificationResponse(
        JSON.stringify({
          items: [
            {
              sourceId: 'b1',
              description: '代码托管平台',
              categoryId: '开发与开源',
              tagIds: ['开源']
            }
          ]
        }),
        input
      )
    ).toMatchObject({
      items: [{ sourceId: 'b1', categoryId: 'c1', tagIds: ['t1'] }],
      errors: []
    })
  })

  it('rejects batches larger than fifteen bookmarks', () => {
    expect(() =>
      bookmarkClassificationRequestSchema.parse({
        taxonomy: {
          categories: [{ id: 'c1', name: '工具' }],
          tags: [{ id: 't1', name: '在线工具' }]
        },
        bookmarks: Array.from({ length: 16 }, (_, index) => ({
          sourceId: `b${index}`,
          name: `网站 ${index}`,
          url: `https://example.com/${index}`,
          folderPath: ''
        }))
      })
    ).toThrow()
  })
})
