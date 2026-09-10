/**
 * 导航品牌的共享配置。
 *
 * 品牌由管理员在后台统一配置（site_settings 的 site_name / site_logo），
 * 所有用户展示一致；未配置时回退到这里的项目内置默认值。
 *
 * 该入口保持浏览器安全，不依赖 Node.js 环境，可同时用于前端、服务端和构建配置。
 */
export const NAVIGATION_BRAND_CONFIG = {
  defaultTitle: 'DIY 导航',
  defaultIcon: 'D',
  iconMaxLength: 512
} as const

/** 是否为图片链接图标（http/https、data URL 或站内相对路径）。 */
export function isNavIconUrl(value: string): boolean {
  return /^(https?:\/\/|data:image\/|\/)/i.test(value.trim())
}

/** 是否为 Font Awesome 类名图标。 */
export function isNavIconFa(value: string): boolean {
  const v = value.trim()
  return /^(fa[srlbd]?|fa)\s+fa-[\w-]+/i.test(v) || /^fa-[\w-]+(\s+fa-[\w-]+)*$/i.test(v)
}
