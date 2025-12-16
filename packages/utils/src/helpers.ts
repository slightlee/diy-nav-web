export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

export const formatUrl = (url: string): string => {
  if (!url) return ''
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`
  }
  return url
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
