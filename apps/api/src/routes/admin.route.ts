import { z } from 'zod'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { AppError } from '@nav/core'
import { config } from '@nav/config'
import {
  authService,
  storageProviderConfigService,
  siteSettingsService,
  verificationEmailSender,
  emailBindingService
} from '../services.js'
import { toUserDto } from '../lib/dto.js'
import { OAUTH_PROVIDER_NAMES, type OAuthProviderName } from '../lib/oauth-provider-config.js'

const listUsersSchema = z.object({
  query: z.string().trim().max(120).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFY']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0)
})

const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN'])
})

const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED'])
})

const userIdParamsSchema = z.object({
  id: z.string().uuid()
})

const updateOAuthConfigParamsSchema = z.object({
  provider: z.enum(OAUTH_PROVIDER_NAMES)
})

const updateOAuthConfigSchema = z.object({
  enabled: z.boolean(),
  clientId: z.string().trim().min(1, 'Client ID 不能为空'),
  clientSecret: z.string().trim().optional(),
  redirectUri: z.string().trim().min(1, '回调地址不能为空')
})

const storagePurposeParamsSchema = z.object({
  purpose: z.enum(['public', 'backup'])
})

const updateStoragePurposeSchema = z.object({
  provider: z.enum(['r2', 's3', 'webdav']),
  bucketName: z.string().trim().optional(),
  accountId: z.string().trim().optional(),
  accessKeyId: z.string().trim().optional(),
  secretAccessKey: z.string().trim().optional(),
  endpoint: z.string().trim().optional(),
  region: z.string().trim().optional(),
  publicBaseUrl: z.string().trim().optional(),
  webdavUrl: z.string().trim().optional(),
  webdavUsername: z.string().trim().optional(),
  webdavPassword: z.string().trim().optional(),
  storagePath: z.string().trim().optional(),
  maxRetainedBackups: z.coerce.number().int().min(1).max(50).optional()
})

const testStorageProviderSchema = z.object({
  purpose: z.enum(['public', 'backup']),
  provider: z.enum(['r2', 's3', 'webdav']),
  bucketName: z.string().trim().optional(),
  accountId: z.string().trim().optional(),
  accessKeyId: z.string().trim().optional(),
  secretAccessKey: z.string().trim().optional(),
  endpoint: z.string().trim().optional(),
  region: z.string().trim().optional(),
  publicBaseUrl: z.string().trim().optional(),
  webdavUrl: z.string().trim().optional(),
  webdavUsername: z.string().trim().optional(),
  webdavPassword: z.string().trim().optional(),
  storagePath: z.string().trim().optional()
})

const updateSiteSettingsSchema = z.object({
  siteName: z.string().trim().min(1).max(64).optional(),
  webAppUrl: z.string().trim().url().optional(),
  smtpUser: z.string().trim().email().optional().or(z.literal('')),
  smtpPassword: z.string().trim().optional(),
  registrationEnabled: z.boolean().optional()
})

const adminRoutes: FastifyPluginAsyncZod = async app => {
  const requireAdmin = async (userId: string) => {
    const currentUser = await authService.getUserById(userId)
    if (!currentUser || currentUser.role !== 'ADMIN' || currentUser.status !== 'ACTIVE') {
      throw new AppError('Administrator access is required', 'ADMIN_REQUIRED', 403)
    }
  }

  // List users with role and status filtering
  app.get(
    '/admin/users',
    {
      onRequest: [app.authenticate],
      schema: { querystring: listUsersSchema }
    },
    async req => {
      await requireAdmin(req.user.sub)
      const result = await authService.listUsers(req.query)
      return {
        success: true,
        data: {
          ...result,
          users: result.users.map(user => ({
            ...toUserDto(user),
            status: user.status,
            lastLoginAt: user.last_login_at
          }))
        }
      }
    }
  )

  // Update user role
  app.patch(
    '/admin/users/:id/role',
    {
      onRequest: [app.authenticate],
      schema: {
        params: userIdParamsSchema,
        body: updateUserRoleSchema
      }
    },
    async req => {
      await requireAdmin(req.user.sub)
      const user = await authService.updateUserRole(req.user.sub, req.params.id, req.body.role)
      return {
        success: true,
        data: {
          ...toUserDto(user),
          status: user.status,
          lastLoginAt: user.last_login_at
        }
      }
    }
  )

  // Update user status
  app.patch(
    '/admin/users/:id/status',
    {
      onRequest: [app.authenticate],
      schema: {
        params: userIdParamsSchema,
        body: updateUserStatusSchema
      }
    },
    async req => {
      await requireAdmin(req.user.sub)
      const user = await authService.updateUserStatus(req.user.sub, req.params.id, req.body.status)
      return {
        success: true,
        data: {
          ...toUserDto(user),
          status: user.status,
          lastLoginAt: user.last_login_at
        }
      }
    }
  )

  // List OAuth configurations
  app.get(
    '/admin/oauth-configs',
    {
      onRequest: [app.authenticate]
    },
    async req => {
      await requireAdmin(req.user.sub)
      const configs = await app.oauthProviderConfigService.listAdminConfigs()
      return {
        success: true,
        data: configs
      }
    }
  )

  // Update OAuth configuration
  app.patch(
    '/admin/oauth-configs/:provider',
    {
      onRequest: [app.authenticate],
      schema: {
        params: updateOAuthConfigParamsSchema,
        body: updateOAuthConfigSchema
      }
    },
    async req => {
      await requireAdmin(req.user.sub)
      const updated = await app.oauthProviderConfigService.update(
        req.params.provider as OAuthProviderName,
        req.body
      )
      return {
        success: true,
        data: updated
      }
    }
  )

  // System runtime info
  app.get(
    '/admin/system-info',
    {
      onRequest: [app.authenticate]
    },
    async req => {
      await requireAdmin(req.user.sub)
      return {
        success: true,
        data: {
          appName: siteSettingsService.getSettings().siteName,
          nodeVersion: process.version,
          env: config.server.env,
          uptimeSeconds: Math.floor(process.uptime()),
          publicStorageProvider: 'db-managed',
          backupStorageProvider: 'db-managed',
          databaseType: 'Cloudflare D1',
          serverPort: config.server.port
        }
      }
    }
  )

  // Storage configuration - Get both purpose configs
  app.get(
    '/admin/config/storage',
    {
      onRequest: [app.authenticate]
    },
    async req => {
      await requireAdmin(req.user.sub)
      const configs = await storageProviderConfigService.getAdminConfig()
      return { success: true, data: configs }
    }
  )

  // Storage configuration - Update a specific purpose (public | backup)
  app.patch(
    '/admin/config/storage/:purpose',
    {
      onRequest: [app.authenticate],
      schema: {
        params: storagePurposeParamsSchema,
        body: updateStoragePurposeSchema
      }
    },
    async (req, reply) => {
      await requireAdmin(req.user.sub)
      const { purpose } = req.params
      const updated = await storageProviderConfigService.updatePurposeConfig(purpose, req.body)
      return reply.send({ success: true, data: updated })
    }
  )

  // Storage configuration - Connection test
  app.post(
    '/admin/config/storage/test',
    {
      onRequest: [app.authenticate],
      schema: { body: testStorageProviderSchema }
    },
    async (req, reply) => {
      await requireAdmin(req.user.sub)
      const result = await storageProviderConfigService.testConnection(req.body)
      return reply.send({ success: result.success, data: result })
    }
  )

  // ── Site Settings ──────────────────────────────────────────────────────

  // GET /admin/config/site → site name, web app URL, SMTP (password masked)
  app.get('/admin/config/site', { onRequest: [app.authenticate] }, async req => {
    await requireAdmin(req.user.sub)
    const data = await siteSettingsService.getAdminConfig()
    return { success: true, data }
  })

  // PATCH /admin/config/site → update and hot-swap running services
  app.patch(
    '/admin/config/site',
    {
      onRequest: [app.authenticate],
      schema: { body: updateSiteSettingsSchema }
    },
    async (req, reply) => {
      await requireAdmin(req.user.sub)
      const updated = await siteSettingsService.updateSettings(req.body)

      // Hot-swap SMTP and webAppUrl into running services (no restart needed)
      const smtpPassword = siteSettingsService.getSmtpPassword()
      verificationEmailSender.setCredentials(
        updated.smtpUser || undefined,
        smtpPassword || undefined
      )
      emailBindingService.setWebAppUrl(updated.webAppUrl)

      return reply.send({ success: true, data: updated })
    }
  )
}

export default adminRoutes
