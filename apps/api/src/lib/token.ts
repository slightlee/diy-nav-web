import { FastifyInstance } from 'fastify'
import { User } from '@nav/core'

export function generateAccessToken(
  app: FastifyInstance,
  user: Pick<User, 'id' | 'email' | 'role'>
) {
  return app.jwt.sign({
    sub: user.id,
    email: user.email || '', // Handle null email for OAuth users
    role: user.role
  })
}
