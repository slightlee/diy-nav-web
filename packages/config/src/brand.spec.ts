import { describe, expect, it } from 'vitest'
import { NAVIGATION_BRAND_CONFIG, isNavIconFa, isNavIconUrl } from './brand.js'

describe('navigation brand config', () => {
  it('exposes the project fallback defaults', () => {
    expect(NAVIGATION_BRAND_CONFIG.defaultTitle).toBe('DIY 导航')
    expect(NAVIGATION_BRAND_CONFIG.defaultIcon).toBe('D')
  })
})

describe('icon type detection', () => {
  it('recognizes image URLs and Font Awesome classes', () => {
    expect(isNavIconUrl('https://cdn.example.com/logo.svg')).toBe(true)
    expect(isNavIconUrl('data:image/png;base64,xxxx')).toBe(true)
    expect(isNavIconUrl('/storage/icons/a.png')).toBe(true)
    expect(isNavIconUrl('D')).toBe(false)
    expect(isNavIconUrl('fa fa-compass')).toBe(false)

    expect(isNavIconFa('fas fa-compass')).toBe(true)
    expect(isNavIconFa('fa-compass')).toBe(true)
    expect(isNavIconFa('https://cdn.example.com/logo.svg')).toBe(false)
  })
})
