/**
 * 使用 DuckDuckGo 提供的 favicon 服务获取网站图标
 *
 * 目标：根据域名返回 .ico 或 .png 图标
 * 输入：domain 域名字符串（如 example.com）
 * 输出：IconFetchResult 或 null（失败）
 * 说明：接口返回的 content-type 可能为 image/x-icon 或 image/png
 */
import type { IconFetchResult } from '../types.js'

export async function fetchFromDuckDuckGo(domain: string): Promise<IconFetchResult | null> {
  const url = `https://icons.duckduckgo.com/ip3/${domain}.ico`
  const res = await fetch(url, { method: 'GET' })
  if (!res.ok) return null
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('image')) return null
  const data = await res.arrayBuffer()
  return { data, contentType: ct, extension: ct.includes('png') ? 'png' : 'ico' }
}
