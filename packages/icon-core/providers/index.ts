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
import { fetchFromIconHorse } from './iconhorse.js'
import { fetchFromBitwarden } from './bitwarden.js'

export type IconProvider = (domain: string) => Promise<IconFetchResult | null>

/**
 * 默认提供者顺序：
 * 1. Google S2 (质量最佳，国内可能超时)
 * 2. Icon Horse (质量好，国内可用)
 * 3. Bitwarden (稳定，速度快)
 * 4. Clearbit (兜底)
 * 5. DuckDuckGo (兜底)
 */
export const defaultProviders: IconProvider[] = [
  domain => fetchFromGoogleS2(domain),
  fetchFromIconHorse,
  fetchFromBitwarden,
  fetchFromClearbit,
  fetchFromDuckDuckGo
]

export function getProviders(config: Config): IconProvider[] {
  return [
    domain => fetchFromGoogleS2(domain, config.ICON_SIZE),
    fetchFromIconHorse,
    fetchFromBitwarden,
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
  const debug = process.env.LOG_LEVEL === 'debug'
  if (debug) console.debug('[icon] try providers', { domain })
  for (const p of providers) {
    try {
      const result = await p(domain)
      if (result) {
        if (debug) console.debug('[icon] provider hit', { domain, source: result.source })
        return result
      }
    } catch {
      // ignore provider errors
    }
  }
  return null
}
