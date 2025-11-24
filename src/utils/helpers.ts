// 类型定义，避免未使用变量错误
// 移除未使用的简单类型与接口定义，保留纯工具函数

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

// 获取网站favicon
export const getFaviconUrl = (url: string): string => {
  try {
    const urlObj = new URL(formatUrl(url))
    return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`
  } catch {
    return ''
  }
}

// 通过公共服务获取网站favicon
export const getServiceFaviconUrl = (url: string, size = 64): string => {
  try {
    const urlObj = new URL(formatUrl(url))
    const hostname = urlObj.hostname
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`
  } catch {
    return ''
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

// 格式化访问次数
export const formatVisitCount = (count: number): string => {
  if (count === 0) return '未访问'
  if (count === 1) return '访问1次'
  if (count < 1000) return `访问${count}次`
  return `访问${(count / 1000).toFixed(1)}k次`
}

export const formatVisitCountCompact = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

// 格式化日期
export const formatDate = (date: Date | string | undefined): string => {
  if (!date) return ''

  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  } else {
    return d.toLocaleDateString('zh-CN')
  }
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

export const formatDateZh = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
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

// 截断文本
export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// 防抖函数
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
      timeout = null
    }, wait)
  }
}

// 节流函数
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true

      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// 验证邮箱格式
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 生成随机颜色
export const getRandomColor = (): string => {
  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']
  return colors[Math.floor(Math.random() * colors.length)]
}

// 获取网站域名
export const getDomain = (url: string): string => {
  try {
    const urlObj = new URL(formatUrl(url))
    return urlObj.hostname
  } catch {
    return url
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

// 下载文件
export const downloadFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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
