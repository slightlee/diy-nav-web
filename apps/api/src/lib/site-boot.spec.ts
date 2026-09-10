import { describe, expect, it } from 'vitest'
import { runInNewContext } from 'node:vm'
import { renderSiteBootScript } from './site-boot.js'

interface BootSandbox {
  window: { __SITE_BOOT_CONFIG__?: Record<string, unknown> }
  document: { title: string }
}

const runBootScript = (
  config: { siteName: string; siteLogo: string; registrationEnabled: boolean },
  initialTitle = '构建期默认标题'
): BootSandbox => {
  const sandbox: BootSandbox = {
    window: {},
    document: { title: initialTitle }
  }
  runInNewContext(renderSiteBootScript(config), sandbox)
  return sandbox
}

describe('renderSiteBootScript', () => {
  const config = {
    siteName: '一点导航',
    siteLogo: 'https://files.example.com/logo.png',
    registrationEnabled: true
  }

  it('exposes the site config on window and titles the tab with the site name', () => {
    const sandbox = runBootScript(config)
    expect(sandbox.window.__SITE_BOOT_CONFIG__).toEqual(config)
    expect(sandbox.document.title).toBe('一点导航')
  })

  it('keeps the initial title when the site name is empty', () => {
    const sandbox = runBootScript({ ...config, siteName: '' }, 'DIY 导航')
    expect(sandbox.window.__SITE_BOOT_CONFIG__).toBeDefined()
    expect(sandbox.document.title).toBe('DIY 导航')
  })

  it('escapes angle brackets so the payload cannot break out of the script', () => {
    const script = renderSiteBootScript({ ...config, siteName: '</script><b>注入</b>' })
    expect(script).not.toContain('</script>')
    expect(script).toContain('\\u003c')
    expect(() => runInNewContext(script, { window: {}, document: { title: '' } })).not.toThrow()
  })
})
