/**
 * 首屏品牌引导脚本（/api/site/boot.js）的生成逻辑。
 *
 * index.html 在 <head> 中同步加载该脚本，使浏览器渲染任何内容之前就拿到
 * 后台配置的站点名称/Logo，消除"先闪项目默认品牌再变配置"的问题。
 * index.html 自身保持零内联代码（Vue 项目约定）。
 *
 * 品牌统一由管理员配置、全员一致，因此脚本只做两件事：
 * - window.__SITE_BOOT_CONFIG__：供前端 store 同步初始化站点配置（首访零闪）
 * - 标签页标题：站点名称；未配置时保留 <title> 中构建期注入的项目默认值
 */

export interface SiteBootConfigPayload {
  siteName: string
  siteLogo: string
  registrationEnabled: boolean
}

/** JSON → 安全的 JS 字面量（转义 < 与 U+2028/2029 行分隔符） */
const toJsLiteral = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

export const renderSiteBootScript = (config: SiteBootConfigPayload): string => `(function () {
  try {
    var config = ${toJsLiteral(config)};
    window.__SITE_BOOT_CONFIG__ = config;
    if (typeof config.siteName === 'string' && config.siteName.trim()) {
      document.title = config.siteName.trim();
    }
  } catch (e) {
    /* 引导失败时保留 <title> 构建期默认值 */
  }
})();
`
