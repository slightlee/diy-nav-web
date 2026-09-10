import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { siteSettingsService } from '../services.js'
import { renderSiteBootScript, type SiteBootConfigPayload } from '../lib/site-boot.js'

const toPayload = (): SiteBootConfigPayload => {
  const settings = siteSettingsService.getSettings()
  return {
    siteName: settings.siteName,
    siteLogo: settings.siteLogo,
    registrationEnabled: settings.registrationEnabled
  }
}

/**
 * Public (unauthenticated) site configuration.
 * Consumed by the auth pages and the nav brand to reflect site-wide switches
 * (registration toggle) and the admin-configured site name / logo.
 */
const siteRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/site/public-config', async () => {
    return {
      success: true,
      data: toPayload()
    }
  })

  // 阻塞式引导脚本：index.html 在 <head> 中同步加载，渲染前即写入
  // window.__SITE_BOOT_CONFIG__ 并设置标签页标题。脚本内容由
  // renderSiteBootScript 生成（逻辑见 lib/site-boot.ts，含单元测试）。
  // 宽松限流：正常浏览每次页面加载命中一次，仅防脚本化滥用；
  // 触发限流时页面按"boot 不可用"降级，走本地缓存/默认品牌。
  app.get(
    '/site/boot.js',
    { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
    async (_req, reply) => {
      reply.header('content-type', 'application/javascript; charset=utf-8')
      reply.header('cache-control', 'no-store')
      return renderSiteBootScript(toPayload())
    }
  )
}

export default siteRoutes
