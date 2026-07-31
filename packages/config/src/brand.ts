/**
 * 导航品牌的共享配置。
 *
 * 该入口保持浏览器安全，不依赖 Node.js 环境，可同时用于前端、服务端和构建配置。
 */
export const NAVIGATION_BRAND_CONFIG = {
  defaultTitle: 'DIY 导航',
  defaultIcon: 'D',
  titleMaxLength: 8,
  iconMaxLength: 512
} as const

const titleSegmenter =
  typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('zh-CN', { granularity: 'grapheme' })
    : null

function splitNavigationTitle(value: string): string[] {
  return titleSegmenter
    ? Array.from(titleSegmenter.segment(value), item => item.segment)
    : Array.from(value)
}

/**
 * 清理并限制用户输入的导航名称；空字符串仍保持为空，交由调用方决定回退策略。
 */
export function clampNavigationTitle(value: string): string {
  return splitNavigationTitle(value.trim())
    .slice(0, NAVIGATION_BRAND_CONFIG.titleMaxLength)
    .join('')
}

/** 返回与名称长度限制一致的字素数量。 */
export function countNavigationTitle(value: string): number {
  return splitNavigationTitle(value).length
}

/** 将未知输入转换为可用的导航名称。 */
export function resolveNavigationTitle(value: unknown): string {
  if (typeof value !== 'string') return NAVIGATION_BRAND_CONFIG.defaultTitle
  return clampNavigationTitle(value) || NAVIGATION_BRAND_CONFIG.defaultTitle
}

/** 将未知输入转换为可用的导航图标。 */
export function resolveNavigationIcon(value: unknown): string {
  if (typeof value !== 'string') return NAVIGATION_BRAND_CONFIG.defaultIcon
  return (
    value.trim().slice(0, NAVIGATION_BRAND_CONFIG.iconMaxLength) ||
    NAVIGATION_BRAND_CONFIG.defaultIcon
  )
}
