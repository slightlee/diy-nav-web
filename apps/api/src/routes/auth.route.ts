import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { AppError } from '@nav/core'

import { registerSchema, loginSchema, providerLoginSchema } from '../schemas/auth.schema.js'
import { authService } from '../services.js'
import { generateAccessToken } from '../lib/token.js'
import { toUserDto } from '../lib/dto.js'

const authRoutes: FastifyPluginAsyncZod = async app => {
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
    async req => {
      const { email, password } = req.body
      const user = await authService.validateUser(email, password)
      if (!user) {
        throw new AppError('Invalid email or password', 'INVALID_CREDENTIALS', 401)
      }

      // Update stats
      await authService.updateLoginStats(user.id, req.ip)

      // Generate Token
      const token = generateAccessToken(app, user)

      return {
        success: true,
        data: {
          token,
          user: toUserDto(user)
        }
      }
    }
  )

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

  // Linux.do OAuth Login
  app.post(
    '/auth/:provider/login',
    {
      schema: providerLoginSchema
    },
    async req => {
      const { provider: providerName } = req.params
      const { code } = req.body

      // 1. Get Provider Strategy from DI Container
      const provider = app.authProviderFactory.getProvider(providerName)

      // 2. Exchange Token
      const tokenData = await provider.exchangeToken(code)

      // 3. Get User Info
      const userData = await provider.getUserInfo(tokenData.access_token)

      // 4. Find or Create User (Business Logic)
      const user = await authService.findOrCreateByProvider(provider.name, userData.id, {
        email: userData.email,
        nickname: userData.name,
        avatar_url: userData.avatar_url
      })

      // 5. Update Stats & Issue Token
      await authService.updateLoginStats(user.id, req.ip)

      const token = generateAccessToken(app, user)

      return {
        success: true,
        data: {
          token,
          user: toUserDto(user)
        }
      }
    }
  )
}

export default authRoutes
