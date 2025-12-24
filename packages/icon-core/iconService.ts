/**
 * 图标获取核心服务
 *
 * 目标：优先命中存储，未命中则聚合第三方提供者抓取并写入存储
 * 返回：公共 URL、是否命中、性能指标（抓取/写入耗时）
 */
import type { StorageClient } from '@nav/storage'
import { LocalClient } from '@nav/storage'
import type { IconSource } from './types.js'
import { fetchIconByProviders, type IconProvider, defaultProviders } from './providers/index.js'

export class IconService {
  constructor(
    private storage: StorageClient = new LocalClient(),
    private providers: IconProvider[] = defaultProviders,
    private defaultIconUrl: string = '/icons/default.svg',
    private pathPrefix: string = 'icons'
  ) {}

  async getIconUrl(
    domain: string,
    forceRefresh: boolean = false
  ): Promise<{
    url: string
    hit: boolean
    source: IconSource
    metrics?: { fetchMs?: number; storeMs?: number }
  }> {
    const normalized = this.normalizeDomain(domain)

    // 1) 如果不是强制刷新,先检查缓存
    if (!forceRefresh) {
      const candidateExts = ['ico', 'png', 'jpg', 'jpeg', 'svg']
      for (const ext of candidateExts) {
        const key = `${this.pathPrefix}/${normalized}.${ext}`
        const url = await this.storage.exists(key)
        if (url) return { url, hit: true, source: 'storage' }
      }
    }

    // 2) 未命中或强制刷新：聚合第三方提供者抓取，并记录抓取耗时
    const tFetchStart = performance.now()
    const fetched = await fetchIconByProviders(normalized, this.providers)
    const fetchMs = Math.round(performance.now() - tFetchStart)

    if (fetched) {
      // 3) 成功获取后：以实际类型生成 key，写入存储并记录写入耗时
      const key = `${this.pathPrefix}/${normalized}.${fetched.extension}`
      const tStoreStart = performance.now()
      const url = await this.storage.store(key, fetched.data, fetched.contentType)
      const storeMs = Math.round(performance.now() - tStoreStart)
      return { url, hit: false, source: fetched.source, metrics: { fetchMs, storeMs } }
    }

    // 4) 获取失败：返回兜底默认图标，并附带抓取耗时
    return { url: this.defaultIconUrl, hit: false, source: 'default', metrics: { fetchMs } }
  }

  /**
   * 归一化域名/URL 为主机名
   */
  private normalizeDomain(input: string): string {
    try {
      const u = new URL(input.includes('://') ? input : `https://${input}`)
      return u.hostname.toLowerCase()
    } catch {
      return input.toLowerCase()
    }
  }
}
