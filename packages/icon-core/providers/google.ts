/**
 * 使用 Google S2 Favicons 服务获取网站图标
 *
 * 目标：根据域名返回高质量 png 图标，尺寸可配
 * 输入：domain 域名字符串（如 example.com）
 * 输出：IconFetchResult 或 null（失败）
 * 配置：size 指定 sz 参数，默认 64
 */
import type { IconFetchResult } from '../types.js'

export async function fetchFromGoogleS2(
  domain: string,
  size: number = 64
): Promise<IconFetchResult | null> {
  const sz = Number.isFinite(size) && size > 0 ? size : 64
  const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=${sz}`
  const res = await fetch(url, { method: 'GET' })
  if (!res.ok) return null
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('image')) return null
  const data = await res.arrayBuffer()
  return { data, contentType: ct, extension: 'png' }
}
