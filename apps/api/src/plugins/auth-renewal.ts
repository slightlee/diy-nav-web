import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { generateAccessToken } from '../lib/token.js'

const RENEW_THRESHOLD_SEC = 2 * 24 * 60 * 60 // 2 days
const TOKEN_HEADER_NAME = 'X-Nav-Token'

const authRenewalPlugin: FastifyPluginAsync = async app => {
  app.addHook('onSend', async (req, reply, payload) => {
    // With type augmentation, we don't need 'as unknown' anymore
    const user = req.user
    if (!user || !user.exp) return payload

    // Check if token is about to expire
    const now = Math.floor(Date.now() / 1000)
    const timeLeft = user.exp - now

    if (timeLeft < RENEW_THRESHOLD_SEC) {
      // Issue new token
      // We only need id, email, and role for the token payload
      const userPayload = {
        id: user.sub || user.id,
        email: user.email,
        role: user.role as 'USER' | 'ADMIN'
      }

      try {
        const newToken = generateAccessToken(app, userPayload)
        reply.header(TOKEN_HEADER_NAME, newToken)
        app.log.info(`[Auth] Token auto-renewed for user ${userPayload.id}`)
      } catch (err) {
        app.log.error({ err }, '[Auth] Failed to auto-renew token')
      }
    }

    return payload
  })
}

export default fp(authRenewalPlugin)
