/**
 * 图标提供者聚合层
 *
 * 目标：按顺序尝试多个第三方图标来源，返回首个可用结果
 * 类型：IconProvider 接受域名字符串，异步返回 IconFetchResult 或 null
 */
import type { IconFetchResult } from '../types.js'
import type { Config } from '@nav/config'
import { fetchFromDuckDuckGo } from './duckduckgo.js'
import { fetchFromClearbit } from './clearbit.js'
import { fetchFromGoogleS2 } from './google.js'

export type IconProvider = (domain: string) => Promise<IconFetchResult | null>

/**
 * 默认提供者顺序：Google S2 → Clearbit → DuckDuckGo
 */
export const defaultProviders: IconProvider[] = [
  domain => fetchFromGoogleS2(domain),
  fetchFromClearbit,
  fetchFromDuckDuckGo
]

export function getProviders(config: Config): IconProvider[] {
  return [
    domain => fetchFromGoogleS2(domain, config.ICON_SIZE),
    fetchFromClearbit,
    fetchFromDuckDuckGo
  ]
}

/**
 * 依次尝试传入的提供者列表，返回首个成功的图标结果
 * 输入：domain 域名；providers 提供者列表（可选）
 * 输出：IconFetchResult 或 null
 */
export async function fetchIconByProviders(
  domain: string,
  providers: IconProvider[] = defaultProviders
): Promise<IconFetchResult | null> {
  for (const p of providers) {
    try {
      const result = await p(domain)
      if (result) return result
    } catch {
      // ignore provider errors
    }
  }
  return null
}
