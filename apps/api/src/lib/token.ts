import { FastifyInstance } from 'fastify'
import { User } from '@nav/core'

export function generateAccessToken(app: FastifyInstance, user: User) {
  return app.jwt.sign({
    sub: user.id,
    email: user.email,
    role: user.role
  })
}
