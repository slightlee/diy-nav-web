import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { authService } from '../services.js'

const authRoutes: FastifyPluginAsyncZod = async app => {
  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string()
  })

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
    async (req, reply) => {
      const { email, password } = req.body
      try {
        const user = await authService.register(email, password)
        return { success: true, data: { id: user.id, email: user.email } }
      } catch (err: any) {
        if (err.message === 'User already exists') {
          return reply.code(409).send({ code: 'USER_EXISTS', message: 'User already exists' })
        }
        req.log.error(err)
        return reply.code(500).send({ code: 'REGISTER_FAILED', message: 'Registration failed' })
      }
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
      try {
        const user = await authService.validateUser(email, password)
        if (!user) {
          return reply
            .code(401)
            .send({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' })
        }

        // Update stats
        await authService.updateLoginStats(user.id, req.ip)

        // Generate Token
        const token = app.jwt.sign({
          sub: user.id,
          email: user.email,
          role: user.role
        })

        return {
          success: true,
          data: {
            token,
            user: {
              id: user.id,
              email: user.email,
              nickname: user.nickname,
              avatar_url: user.avatar_url,
              role: user.role
            }
          }
        }
      } catch (err) {
        req.log.error(err)
        return reply.code(500).send({ code: 'LOGIN_FAILED', message: 'Login failed' })
      }
    }
  )

  // Me
  app.get(
    '/auth/me',
    {
      onRequest: [app.authenticate]
    },
    async (req, reply) => {
      try {
        const userId = req.user.sub
        const user = await authService.getUserById(userId)
        if (!user) {
          return reply.code(404).send({ code: 'USER_NOT_FOUND', message: 'User not found' })
        }
        return {
          success: true,
          data: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            avatar_url: user.avatar_url,
            role: user.role,
            created_at: user.created_at
          }
        }
      } catch (err) {
        req.log.error(err)
        return reply.code(500).send({ code: 'FETCH_USER_FAILED', message: 'Failed to fetch user' })
      }
    }
  )
}

export default authRoutes
