import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { AppError, AVATAR_LIBRARY } from '@nav/core'

import {
  registerSchema,
  loginSchema,
  completeEmailBindingSchema,
  providerLoginSchema,
  providerBindingIntentSchema,
  providerBindingSchema,
  providerUnbindingSchema,
  requestEmailBindingSchema,
  updatePreferencesSchema,
  updateProfileSchema,
  updateAvatarSchema,
  verifyEmailBindingSchema
} from '../schemas/auth.schema.js'
import { authService, avatarService, emailBindingService, preferencesService } from '../services.js'
import { generateAccessToken } from '../lib/token.js'
import { toUserDto } from '../lib/dto.js'
import { clearAuthCookie, setAuthCookie } from '../lib/auth-cookie.js'

const authRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/auth/avatar-options', { onRequest: [app.authenticate] }, async () => ({
    success: true,
    data: AVATAR_LIBRARY.map(option => ({
      ...option,
      preview: avatarService.getPreviewDataUrl(option.key)
    }))
  }))

  // Register
  app.post(
    '/auth/register',
    {
      schema: { body: registerSchema },
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute'
        }
      }
    },
    async req => {
      const { email, password } = req.body
      const user = await authService.register(email, password)
      return { success: true, data: { id: user.id, email: user.email } }
    }
  )

  // Login
  app.post(
    '/auth/login',
    {
      schema: { body: loginSchema },
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute'
        }
      }
    },
    async (req, reply) => {
      const { email, password } = req.body
      const user = await authService.validateUser(email, password)
      if (!user) {
        throw new AppError('Invalid email or password', 'INVALID_CREDENTIALS', 401)
      }

      // Update stats
      await authService.updateLoginStats(user.id, req.ip)

      // Generate Token
      const token = generateAccessToken(app, user)
      setAuthCookie(reply, token)

      return {
        success: true,
        data: {
          user: toUserDto(user)
        }
      }
    }
  )

  // Logout
  app.post('/auth/logout', async (_req, reply) => {
    clearAuthCookie(reply)
    return { success: true }
  })

  // Me
  app.get(
    '/auth/me',
    {
      onRequest: [app.authenticate]
    },
    async req => {
      const userId = req.user.sub
      const user = await authService.getUserById(userId)
      if (!user) {
        throw new AppError('User not found', 'USER_NOT_FOUND', 404)
      }
      return {
        success: true,
        data: {
          ...toUserDto(user)
        }
      }
    }
  )

  // Update profile
  app.patch(
    '/auth/profile',
    {
      onRequest: [app.authenticate],
      schema: { body: updateProfileSchema }
    },
    async req => {
      const user = await authService.updateNickname(req.user.sub, req.body.nickname)
      return {
        success: true,
        data: {
          user: toUserDto(user)
        }
      }
    }
  )

  app.patch(
    '/auth/avatar',
    {
      onRequest: [app.authenticate],
      schema: { body: updateAvatarSchema }
    },
    async req => {
      const user = await authService.updateAvatar(req.user.sub, req.body.avatarKey)
      return { success: true, data: { user: toUserDto(user) } }
    }
  )

  app.get('/auth/login-methods', { onRequest: [app.authenticate] }, async req => {
    return {
      success: true,
      data: {
        ...(await authService.getLoginMethods(req.user.sub)),
        availableProviders: app.authProviderFactory.getProviderNames()
      }
    }
  })

  app.delete(
    '/auth/login-methods/email',
    {
      onRequest: [app.authenticate],
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }
    },
    async (req, reply) => {
      const user = await authService.unbindEmailLogin(req.user.sub)
      setAuthCookie(reply, generateAccessToken(app, user))
      return { success: true, data: { user: toUserDto(user) } }
    }
  )

  app.delete(
    '/auth/login-methods/:provider',
    {
      onRequest: [app.authenticate],
      schema: providerUnbindingSchema,
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }
    },
    async req => {
      await authService.unbindProviderIdentity(req.user.sub, req.params.provider)
      return { success: true }
    }
  )

  app.post(
    '/auth/email-bindings',
    {
      onRequest: [app.authenticate],
      schema: { body: requestEmailBindingSchema },
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } }
    },
    async req => ({
      success: true,
      data: await emailBindingService.requestBinding(req.user.sub, req.body.email)
    })
  )

  app.get(
    '/auth/email-bindings/verify',
    {
      schema: { querystring: verifyEmailBindingSchema },
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } }
    },
    async req => ({
      success: true,
      data: await emailBindingService.validateToken(req.query.token)
    })
  )

  app.post(
    '/auth/email-bindings/complete',
    {
      schema: { body: completeEmailBindingSchema },
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }
    },
    async (req, reply) => {
      const user = await emailBindingService.completeBinding(req.body.token, req.body.password)
      setAuthCookie(reply, generateAccessToken(app, user))
      return { success: true, data: { user: toUserDto(user) } }
    }
  )

  app.get('/auth/preferences', { onRequest: [app.authenticate] }, async req => {
    return {
      success: true,
      data: await preferencesService.get(req.user.sub)
    }
  })

  app.patch(
    '/auth/preferences',
    {
      onRequest: [app.authenticate],
      schema: { body: updatePreferencesSchema }
    },
    async req => {
      return {
        success: true,
        data: await preferencesService.update(req.user.sub, req.body)
      }
    }
  )

  // Linux.do OAuth Login
  app.post(
    '/auth/:provider/login',
    {
      schema: providerLoginSchema
    },
    async (req, reply) => {
      const { provider: providerName } = req.params
      const { code } = req.body

      // 1. Get Provider Strategy from DI Container
      const provider = app.authProviderFactory.getProvider(providerName)

      // 2. Exchange Token
      const tokenData = await provider.exchangeToken(code)

      // 3. Get User Info
      const userData = await provider.getUserInfo(tokenData.access_token)

      // 4. Find or Create User (Business Logic)
      const { user, isNewUser } = await authService.findOrCreateByProvider(
        provider.name,
        userData.id,
        {
          email: userData.email,
          nickname: userData.name,
          avatar_url: userData.avatar_url
        }
      )

      // 5. Update Stats & Issue Token
      await authService.updateLoginStats(user.id, req.ip)

      const token = generateAccessToken(app, user)
      setAuthCookie(reply, token)

      return {
        success: true,
        data: {
          user: toUserDto(user),
          isNewUser
        }
      }
    }
  )

  app.post(
    '/auth/:provider/bind-intent',
    {
      onRequest: [app.authenticate],
      schema: providerBindingIntentSchema,
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }
    },
    async req => {
      const { provider } = req.params
      if (!app.authProviderFactory.getProviderNames().includes(provider)) {
        throw new AppError('OAuth provider is unavailable', 'OAUTH_PROVIDER_UNAVAILABLE', 503)
      }
      const state = app.jwt.sign(
        {
          sub: req.user.sub,
          email: req.user.email,
          role: req.user.role,
          purpose: 'bind',
          provider
        },
        { expiresIn: '10m' }
      )
      return { success: true, data: { state } }
    }
  )

  app.post(
    '/auth/:provider/bind',
    {
      onRequest: [app.authenticate],
      schema: providerBindingSchema,
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } }
    },
    async req => {
      const { provider: providerName } = req.params
      const intent = app.jwt.verify<{
        sub: string
        purpose?: string
        provider?: string
      }>(req.body.state)
      if (
        intent.sub !== req.user.sub ||
        intent.purpose !== 'bind' ||
        intent.provider !== providerName
      ) {
        throw new AppError('OAuth binding request is invalid', 'OAUTH_BINDING_INVALID', 400)
      }

      const provider = app.authProviderFactory.getProvider(providerName)
      const tokenData = await provider.exchangeToken(req.body.code)
      const userData = await provider.getUserInfo(tokenData.access_token)
      await authService.bindProviderIdentity(req.user.sub, provider.name, userData.id, {
        email: userData.email,
        nickname: userData.name,
        avatar_url: userData.avatar_url
      })
      return { success: true }
    }
  )
}

export default authRoutes
