import { z } from 'zod'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { AppError } from '@nav/core'
import { config } from '@nav/config'
import {
  authService,
  storageProviderConfigService,
  siteSettingsService,
  verificationEmailSender,
  emailBindingService,
  adminAuditLogService
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
  siteLogo: z
    .string()
    .trim()
    .max(512)
    .refine(value => value === '' || /^https?:\/\/.+/i.test(value), {
      message: '站点 Logo 必须是合法的 HTTP(S) 地址'
    })
    .optional(),
  webAppUrl: z.string().trim().url().optional(),
  smtpUser: z.string().trim().email().optional().or(z.literal('')),
  smtpPassword: z.string().trim().optional(),
  registrationEnabled: z.boolean().optional()
})

const adminRoutes: FastifyPluginAsyncZod = async app => {
  const requireAdmin = async (userId: string) => {
    const currentUser = await authService.getUserById(userId)
    if (!currentUser || currentUser.role !== 'ADMIN' || currentUser.status !== 'ACTIVE') {
      throw new AppError('需要管理员权限', 'ADMIN_REQUIRED', 403)
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
      void adminAuditLogService.log({
        actorUserId: req.user.sub,
        actorEmail: req.user.email,
        action: 'ADMIN_USER_ROLE_UPDATE',
        targetType: 'user',
        targetId: user.id,
        summary: `调整用户「${user.email || user.id}」角色为 ${user.role}`,
        ip: req.ip
      })
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
      void adminAuditLogService.log({
        actorUserId: req.user.sub,
        actorEmail: req.user.email,
        action: 'ADMIN_USER_STATUS_UPDATE',
        targetType: 'user',
        targetId: user.id,
        summary: `变更用户「${user.email || user.id}」状态为 ${user.status}`,
        ip: req.ip
      })
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
      void adminAuditLogService.log({
        actorUserId: req.user.sub,
        actorEmail: req.user.email,
        action: 'ADMIN_OAUTH_CONFIG_UPDATE',
        targetType: 'oauth',
        targetId: req.params.provider,
        summary: `更新第三方登录「${req.params.provider}」配置`,
        detail: { enabled: req.body.enabled },
        ip: req.ip
      })
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
          databaseType: config.database.provider === 'mysql' ? 'MySQL' : 'Cloudflare D1',
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
      void adminAuditLogService.log({
        actorUserId: req.user.sub,
        actorEmail: req.user.email,
        action: 'ADMIN_STORAGE_CONFIG_UPDATE',
        targetType: 'storage',
        targetId: purpose,
        summary: `更新「${purpose}」存储配置为 ${req.body.provider}`,
        ip: req.ip
      })
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
      void adminAuditLogService.log({
        actorUserId: req.user.sub,
        actorEmail: req.user.email,
        action: 'ADMIN_STORAGE_CONNECTION_TEST',
        targetType: 'storage',
        targetId: req.body.purpose,
        summary: `测试「${req.body.purpose}」存储连接${result.success ? '成功' : '失败'}`,
        detail: { success: result.success, provider: req.body.provider },
        ip: req.ip
      })
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

      // Hot-swap SMTP, site name and webAppUrl into running services (no restart needed)
      const smtpPassword = siteSettingsService.getSmtpPassword()
      verificationEmailSender.setCredentials(
        updated.smtpUser || undefined,
        smtpPassword || undefined
      )
      verificationEmailSender.setFromName(updated.siteName)
      verificationEmailSender.setSiteLogo(updated.siteLogo || undefined)
      emailBindingService.setWebAppUrl(updated.webAppUrl)

      void adminAuditLogService.log({
        actorUserId: req.user.sub,
        actorEmail: req.user.email,
        action: 'ADMIN_SITE_SETTINGS_UPDATE',
        targetType: 'site',
        summary: `更新站点配置（${Object.keys(req.body).join('、')}）`,
        detail: {
          changedKeys: Object.keys(req.body),
          smtpUserChanged: req.body.smtpUser !== undefined,
          smtpPasswordChanged: !!req.body.smtpPassword
        },
        ip: req.ip
      })

      return reply.send({ success: true, data: updated })
    }
  )

  // ── Audit Logs ─────────────────────────────────────────────────────────

  // GET /admin/audit-logs → paginated audit trail (newest first)
  const auditLogsQuerySchema = z.object({
    action: z.string().trim().max(64).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0)
  })

  app.get(
    '/admin/audit-logs',
    {
      onRequest: [app.authenticate],
      schema: { querystring: auditLogsQuerySchema }
    },
    async req => {
      await requireAdmin(req.user.sub)
      const data = await adminAuditLogService.list({
        action: req.query.action,
        limit: req.query.limit,
        offset: req.query.offset
      })
      return { success: true, data }
    }
  )
}

export default adminRoutes
