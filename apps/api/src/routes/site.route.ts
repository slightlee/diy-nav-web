import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { siteSettingsService } from '../services.js'

/**
 * Public (unauthenticated) site configuration.
 * Consumed by the auth pages to reflect site-wide switches such as
 * whether new user registration is open.
 */
const siteRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/site/public-config', async () => {
    const settings = siteSettingsService.getSettings()
    return {
      success: true,
      data: {
        siteName: settings.siteName,
        registrationEnabled: settings.registrationEnabled
      }
    }
  })
}

export default siteRoutes
