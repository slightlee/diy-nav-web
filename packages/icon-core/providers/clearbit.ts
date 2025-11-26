/**
 * 使用 Clearbit 的公开 Logo 服务获取网站图标
 *
 * 目标：根据域名返回图标二进制及类型信息
 * 输入：domain 域名字符串（如 example.com）
 * 输出：IconFetchResult 或 null（失败）
 * 说明：优先识别 png 与 svg，其他类型回退为 png
 */
import type { IconFetchResult } from '../types.js'

export async function fetchFromClearbit(domain: string): Promise<IconFetchResult | null> {
  const url = `https://logo.clearbit.com/${domain}`
  const res = await fetch(url, { method: 'GET' })
  if (!res.ok) return null
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('image')) return null
  const data = await res.arrayBuffer()
  const ext = ct.includes('png') ? 'png' : ct.includes('svg') ? 'svg' : 'png'
  return { data, contentType: ct, extension: ext }
}
