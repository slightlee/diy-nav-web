/**
 * 使用 Bitwarden Icons 服务获取网站图标
 *
 * 目标：根据域名返回图标
 * 输入：domain 域名字符串
 * 输出：IconFetchResult 或 null
 * 说明：Bitwarden 提供的公共图标服务，速度快且稳定
 */
import type { IconFetchResult } from '../types.js'

export async function fetchFromBitwarden(domain: string): Promise<IconFetchResult | null> {
  // Bitwarden 格式: https://icons.bitwarden.net/[domain]/icon.png
  const url = `https://icons.bitwarden.net/${domain}/icon.png`

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

    return {
      data,
      contentType: ct,
      extension: 'png', // Bitwarden 固定返回 png
      source: 'bitwarden'
    }
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}
