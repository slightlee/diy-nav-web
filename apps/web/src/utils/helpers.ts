import { apiClient } from '@/api/client'

// 生成唯一ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// URL验证
export const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

// 格式化URL
export const formatUrl = (url: string): string => {
  if (!url) return ''

  // 如果没有协议，默认添加https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`
  }

  return url
}

export const fetchIconFromApi = async (url: string): Promise<string | null> => {
  try {
    const u = new URL(formatUrl(url))
    const res = await apiClient.getIcon({ url: u.href })
    return res?.url || null
  } catch {
    return null
  }
}

export const getLetterFavicon = (text: string, size = 64): string => {
  const letter = (text || 'W').trim().charAt(0).toUpperCase()
  const palette = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280']
  const idx = letter ? letter.charCodeAt(0) % palette.length : 0
  const bg = palette[idx]
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'><rect width='${size}' height='${size}' rx='12' fill='${bg}'/><text x='50%' y='60%' text-anchor='middle' font-size='${Math.round(size * 0.56)}' font-family='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' fill='#ffffff'>${letter}</text></svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

export const formatVisitCountCompact = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

export const formatDateTimeZh = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatLastVisitedZh = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs < 0) {
    return formatDateTimeZh(d)
  }

  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}周前`
  } else if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)}个月前`
  } else {
    return `${Math.floor(diffDays / 365)}年前`
  }
}

export const getContrastColor = (bgColor: string): string => {
  const hexMatch = bgColor.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  let r = 255,
    g = 255,
    b = 255

  if (hexMatch) {
    let hex = hexMatch[1]
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map(ch => ch + ch)
        .join('')
    }
    const num = parseInt(hex, 16)
    r = (num >> 16) & 0xff
    g = (num >> 8) & 0xff
    b = num & 0xff
  } else {
    const rgbMatch = bgColor
      .trim()
      .match(/^rgba?\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\)$/)
    if (rgbMatch) {
      r = Math.min(255, parseInt(rgbMatch[1], 10))
      g = Math.min(255, parseInt(rgbMatch[2], 10))
      b = Math.min(255, parseInt(rgbMatch[3], 10))
    }
  }

  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance > 0.6 ? '#111111' : '#ffffff'
}

export const computeReorderedIds = (
  orderIds: string[],
  draggingId: string,
  targetId: string
): string[] => {
  if (!draggingId || draggingId === targetId) return orderIds
  const from = orderIds.indexOf(draggingId)
  const to = orderIds.indexOf(targetId)
  if (from === -1 || to === -1) return orderIds
  const next = orderIds.slice()
  next.splice(from, 1)
  next.splice(to, 0, draggingId)
  return next
}
