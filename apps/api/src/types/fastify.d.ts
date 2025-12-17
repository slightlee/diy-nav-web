import { FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      email: string
      role: string
    }
    user: {
      sub: string // jwt sub is mapped to id
      id: string
      email: string
      role: string
      exp?: number
      iat?: number
    }
  }
}
