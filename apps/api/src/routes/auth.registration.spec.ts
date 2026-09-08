/**
 * 注册开关路由行为验证：
 * - 站点关闭注册后，POST /auth/register 直接 403，不再触达 authService.register
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'

const getSettingsMock = vi.fn(() => ({ registrationEnabled: true }))
const registerMock = vi.fn(async () => ({ id: 'user-1', email: 'new@example.com' }))

vi.mock('../services.js', () => ({
  authService: {
    register: (...args: unknown[]) => registerMock(...args),
    hasProviderIdentity: vi.fn(async () => false)
  },
  avatarService: {},
  emailBindingService: {},
  preferencesService: {},
  siteSettingsService: { getSettings: () => getSettingsMock() }
}))

import authRoutes from './auth.route.js'

const buildApp = async () => {
  const app = Fastify()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.decorate('authenticate', async () => {})
  app.decorate('oauthProviderConfigService', {
    listPublic: async () => [],
    getEnabledProvider: async () => null
  })
  app.decorate('jwt', { sign: () => 'token', verify: () => ({}) })
  await app.register(authRoutes, { prefix: '/api' })
  return app
}

describe('POST /api/auth/register × 注册开关', () => {
  beforeEach(() => {
    getSettingsMock.mockReturnValue({ registrationEnabled: true })
    registerMock.mockClear()
  })

  it('开关开启时正常进入注册逻辑', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'new@example.com', password: 'password123' }
    })
    expect(res.statusCode).toBe(200)
    expect(registerMock).toHaveBeenCalledTimes(1)
    await app.close()
  })

  it('开关关闭时返回 403 且不触达注册服务', async () => {
    getSettingsMock.mockReturnValue({ registrationEnabled: false })
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'new@example.com', password: 'password123' }
    })
    const body = res.json()
    expect(res.statusCode).toBe(403)
    expect(body.code).toBe('REGISTRATION_DISABLED')
    expect(body.message).toContain('已关闭新用户注册')
    expect(registerMock).not.toHaveBeenCalled()
    await app.close()
  })
})
