/**
 * 使用 Icon Horse 服务获取网站图标
 *
 * 目标：根据域名返回高质量图标
 * 输入：domain 域名字符串
 * 输出：IconFetchResult 或 null
 * 官网：https://icon.horse
 */
import type { IconFetchResult } from '../types.js'

export async function fetchFromIconHorse(domain: string): Promise<IconFetchResult | null> {
  // Icon Horse 格式: https://icon.horse/icon/[domain]
  const url = `https://icon.horse/icon/${domain}`

  // 增加 5s 超时控制，避免卡住后续 provider
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('image')) return null

    const data = await res.arrayBuffer()
    // Icon Horse 通常返回 png
    const ext = ct.includes('png') ? 'png' : ct.includes('svg') ? 'svg' : 'ico'

    return {
      data,
      contentType: ct,
      extension: ext,
      source: 'iconhorse'
    }
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}
