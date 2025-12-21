/**
 * Web Scraper Service
 * Fetches and extracts metadata from websites for AI description generation
 */

import { httpClient } from './http.js'
import * as cheerio from 'cheerio'

/**
 * Extracted content from a web page
 */
export interface WebPageContent {
  title: string
  metaDescription: string
  ogDescription: string
  firstParagraph: string
  keywords: string[]
}

/**
 * Default content when scraping fails
 */
const EMPTY_CONTENT: WebPageContent = {
  title: '',
  metaDescription: '',
  ogDescription: '',
  firstParagraph: '',
  keywords: []
}

/**
 * Scrape a webpage and extract metadata
 * @param url - URL to scrape
 * @param timeout - Request timeout in ms (default: 10000)
 * @returns Extracted content
 */
export async function scrapeWebPage(url: string, timeout = 10000): Promise<WebPageContent> {
  try {
    // Normalize URL
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

    const response = await httpClient.get(normalizedUrl, {
      timeout,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      },
      maxRedirects: 3
    })

    const html = response.data as string
    const $ = cheerio.load(html)

    // Extract title
    const title = $('title').first().text().trim() || $('h1').first().text().trim()

    // Extract meta description
    const metaDescription =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="description"]').attr('content')?.trim() ||
      ''

    // Extract Open Graph description
    const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || ''

    // Extract first meaningful paragraph
    let firstParagraph = ''
    $('p').each((_, el) => {
      const text = $(el).text().trim()
      if (text.length > 50 && !firstParagraph) {
        firstParagraph = text.slice(0, 300)
        return false
      }
    })

    // Extract keywords
    const keywordsStr = $('meta[name="keywords"]').attr('content') || ''
    const keywords = keywordsStr
      .split(/[,，]/)
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .slice(0, 10)

    return {
      title,
      metaDescription,
      ogDescription,
      firstParagraph,
      keywords
    }
  } catch {
    // Return empty content on error, let AI work with just URL
    return EMPTY_CONTENT
  }
}

/**
 * Get the best available description from scraped content
 * @param content - Scraped web page content
 * @returns Best description found, or empty string
 */
export function getBestDescription(content: WebPageContent): string {
  if (content.metaDescription) return content.metaDescription
  if (content.ogDescription) return content.ogDescription
  if (content.firstParagraph) return content.firstParagraph
  return ''
}

/**
 * Format scraped content for AI prompt
 * @param content - Scraped content
 * @returns Formatted string for AI context
 */
export function formatContentForAI(content: WebPageContent): string {
  const parts: string[] = []

  if (content.title) {
    parts.push(`标题：${content.title}`)
  }

  const description = getBestDescription(content)
  if (description) {
    parts.push(`描述：${description}`)
  }

  if (content.keywords.length > 0) {
    parts.push(`关键词：${content.keywords.join('、')}`)
  }

  return parts.join('\n')
}
