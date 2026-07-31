import { describe, expect, it } from 'vitest'
import {
  NAVIGATION_BRAND_CONFIG,
  clampNavigationTitle,
  countNavigationTitle,
  resolveNavigationIcon,
  resolveNavigationTitle
} from './brand.js'

describe('navigation brand config', () => {
  it('uses the configured defaults for missing values', () => {
    expect(resolveNavigationTitle(undefined)).toBe(NAVIGATION_BRAND_CONFIG.defaultTitle)
    expect(resolveNavigationTitle('   ')).toBe(NAVIGATION_BRAND_CONFIG.defaultTitle)
    expect(resolveNavigationIcon(null)).toBe(NAVIGATION_BRAND_CONFIG.defaultIcon)
  })

  it('limits titles by graphemes and preserves valid custom titles', () => {
    expect(clampNavigationTitle('一点导航')).toBe('一点导航')
    expect(clampNavigationTitle('一点导航测试名称超长')).toBe('一点导航测试名称')
    expect(resolveNavigationTitle('我的导航')).toBe('我的导航')
  })

  it('counts compound emoji as one grapheme', () => {
    expect(countNavigationTitle('👨‍👩‍👧‍👦导航')).toBe(3)
    expect(clampNavigationTitle('👨‍👩‍👧‍👦导航')).toBe('👨‍👩‍👧‍👦导航')
  })
})
