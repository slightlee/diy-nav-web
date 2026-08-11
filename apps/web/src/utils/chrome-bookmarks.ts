import type { BookmarkTaxonomyRequest } from '@/api/ai'

export interface ChromeBookmark {
  sourceId: string
  name: string
  url: string
  folderPath: string
  addedAt?: string
}

export interface ChromeBookmarkParseResult {
  bookmarks: ChromeBookmark[]
  duplicateCount: number
  invalidCount: number
  folderCount: number
}

const CHROME_ROOT_FOLDERS = new Set(
  [
    'Bookmarks bar',
    'Bookmarks menu',
    'Other bookmarks',
    'Mobile bookmarks',
    '书签栏',
    '书签菜单',
    '其他书签',
    '移动设备书签'
  ].map(name => name.toLocaleLowerCase())
)

const cleanText = (value: string, maxLength: number) =>
  value.trim().replace(/\s+/g, ' ').slice(0, maxLength)

const decodeHtml = (value: string) =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, entity => {
      const entities: Record<string, string> = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        nbsp: ' '
      }
      return entities[entity.slice(1, -1).toLowerCase()] || entity
    })
    .replace(/<[^>]+>/g, '')

const getAttribute = (attributes: string, name: string) => {
  const match = attributes.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
  )
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? ''
}

const normalizeBookmarkUrl = (value: string) => {
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  url.hash = ''
  return url.toString()
}

const normalizeFolderPath = (path: string[]) =>
  path
    .map(part => cleanText(part, 80))
    .filter(part => part && !CHROME_ROOT_FOLDERS.has(part.toLocaleLowerCase()))
    .slice(-6)
    .join(' / ')
    .slice(0, 300)

export const parseChromeBookmarks = (html: string): ChromeBookmarkParseResult => {
  const bookmarks: ChromeBookmark[] = []
  const seenUrls = new Set<string>()
  const folders: string[] = []
  const folderDepth: boolean[] = []
  let duplicateCount = 0
  let invalidCount = 0
  let pendingFolder = ''

  const addBookmark = (attributes: string, title: string) => {
    try {
      const url = normalizeBookmarkUrl(decodeHtml(getAttribute(attributes, 'href')))
      if (!url) {
        invalidCount += 1
        return
      }
      if (seenUrls.has(url)) {
        duplicateCount += 1
        return
      }
      seenUrls.add(url)

      const parsedUrl = new URL(url)
      const addDate = Number(getAttribute(attributes, 'add_date'))
      bookmarks.push({
        sourceId: `bookmark-${bookmarks.length + 1}`,
        name: cleanText(decodeHtml(title), 120) || parsedUrl.hostname,
        url,
        folderPath: normalizeFolderPath(folders),
        ...(Number.isFinite(addDate) && addDate > 0
          ? { addedAt: new Date(addDate * 1000).toISOString() }
          : {})
      })
    } catch {
      invalidCount += 1
    }
  }

  // Chrome exports the Netscape bookmark format. Reading its ordered H3/DL/A
  // tokens keeps nested folders without executing or rendering the HTML file.
  const tokenPattern = /<h3\b[^>]*>([\s\S]*?)<\/h3>|<a\b([^>]*)>([\s\S]*?)<\/a>|<(\/?)dl\b[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = tokenPattern.exec(html)) !== null) {
    if (match[1] !== undefined) {
      pendingFolder = cleanText(decodeHtml(match[1]), 80)
      continue
    }
    if (match[2] !== undefined) {
      addBookmark(match[2], match[3] || '')
      continue
    }

    const closing = match[4] === '/'
    if (!closing) {
      const hasFolder = Boolean(pendingFolder)
      folderDepth.push(hasFolder)
      if (hasFolder) folders.push(pendingFolder)
      pendingFolder = ''
      continue
    }
    if (folderDepth.pop()) folders.pop()
  }

  if (bookmarks.length === 0) throw new Error('文件中没有可导入的 http 或 https 书签')

  return {
    bookmarks,
    duplicateCount,
    invalidCount,
    folderCount: new Set(bookmarks.map(bookmark => bookmark.folderPath).filter(Boolean)).size
  }
}

export const buildBookmarkTaxonomyRequest = (
  bookmarks: ChromeBookmark[]
): BookmarkTaxonomyRequest => {
  const folderCounts = new Map<string, number>()
  const domainMap = new Map<string, { count: number; titles: string[] }>()

  for (const bookmark of bookmarks) {
    if (bookmark.folderPath) {
      folderCounts.set(bookmark.folderPath, (folderCounts.get(bookmark.folderPath) || 0) + 1)
    }

    const host = new URL(bookmark.url).hostname.replace(/^www\./, '')
    const domain = domainMap.get(host) || { count: 0, titles: [] }
    domain.count += 1
    if (domain.titles.length < 3 && !domain.titles.includes(bookmark.name)) {
      domain.titles.push(bookmark.name)
    }
    domainMap.set(host, domain)
  }

  const folders = [...folderCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([path, count]) => ({ path, count }))
  const domains = [...domainMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 300)
    .map(([host, value]) => ({ host, ...value }))

  const samples: BookmarkTaxonomyRequest['samples'] = []
  const sampledIds = new Set<string>()
  const firstByDomain = new Map<string, ChromeBookmark>()
  for (const bookmark of bookmarks) {
    const host = new URL(bookmark.url).hostname.replace(/^www\./, '')
    if (!firstByDomain.has(host)) firstByDomain.set(host, bookmark)
  }
  for (const bookmark of firstByDomain.values()) {
    if (samples.length >= 220) break
    sampledIds.add(bookmark.sourceId)
    samples.push({
      name: bookmark.name,
      host: new URL(bookmark.url).hostname.replace(/^www\./, ''),
      folderPath: bookmark.folderPath
    })
  }

  const remainingSlots = 300 - samples.length
  const step = Math.max(1, Math.floor(bookmarks.length / Math.max(1, remainingSlots)))
  for (let index = 0; index < bookmarks.length && samples.length < 300; index += step) {
    const bookmark = bookmarks[index]
    if (sampledIds.has(bookmark.sourceId)) continue
    sampledIds.add(bookmark.sourceId)
    samples.push({
      name: bookmark.name,
      host: new URL(bookmark.url).hostname.replace(/^www\./, ''),
      folderPath: bookmark.folderPath
    })
  }

  return { total: bookmarks.length, folders, domains, samples }
}
