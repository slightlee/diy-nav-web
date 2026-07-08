import type { FastifyReply } from 'fastify'
import type { CookieSerializeOptions } from '@fastify/cookie'
import { config } from '@nav/config'

export const AUTH_COOKIE_NAME = 'nav_auth'

const AUTH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

const getAuthCookieOptions = (): CookieSerializeOptions => ({
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: config.server.env === 'production',
  maxAge: AUTH_COOKIE_MAX_AGE_SECONDS
})

export function setAuthCookie(reply: FastifyReply, token: string) {
  reply.setCookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions())
}

export function clearAuthCookie(reply: FastifyReply) {
  reply.clearCookie(AUTH_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.server.env === 'production'
  })
}
