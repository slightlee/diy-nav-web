import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import { validatorCompiler, serializerCompiler, ZodTypeProvider } from 'fastify-type-provider-zod'
import { join } from 'path'
import { config } from '@nav/config'
import { databaseClient, initServices } from './src/services.js'
import { isDatabaseUnavailableError } from '@nav/database'
import { AppError } from '@nav/core'
import { configs } from '@nav/logger'
import iconRoutes from './src/routes/icon.js'
import backupRoutes from './src/routes/backup.js'
import syncRoutes from './src/routes/sync.route.js'
import authRoutes from './src/routes/auth.route.js'
import aiRoutes from './src/routes/ai.route.js'
import adminRoutes from './src/routes/admin.route.js'
import siteRoutes from './src/routes/site.route.js'
import { httpClient } from './src/lib/http.js'
import { isNetworkUnavailableError, toFrameworkClientError } from './src/lib/infra-error.js'
import { OAuthProviderConfigService } from './src/lib/oauth-provider-config.js'
import authRenewalPlugin from './src/plugins/auth-renewal.js'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import helmet from '@fastify/helmet'
import cookie from '@fastify/cookie'
import { AUTH_COOKIE_NAME } from './src/lib/auth-cookie.js'

// Fastify app

const app = Fastify({
  logger: configs.node
}).withTypeProvider<ZodTypeProvider>()

// Setup Zod validation
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.setErrorHandler((error, request, reply) => {
  // Handle AppError：业务语义错误，直接透出
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      code: error.code,
      message: error.message
    })
  }

  // 数据库不可用：503 + 泛化文案（不向前端暴露"数据库"等内部实现细节），
  // 原始错误与具体原因只进日志
  if (isDatabaseUnavailableError(error)) {
    request.log.error({ err: error, url: request.url }, 'Database unavailable')
    return reply.status(503).send({
      success: false,
      code: 'SERVICE_UNAVAILABLE',
      message: '服务暂时不可用，请稍后重试'
    })
  }

  // 其它外部依赖网络失败（SMTP、OAuth 上游等），同样只进日志
  if (isNetworkUnavailableError(error)) {
    request.log.error({ err: error, url: request.url }, 'Dependency unavailable')
    return reply.status(503).send({
      success: false,
      code: 'SERVICE_UNAVAILABLE',
      message: '服务暂时不可用，请稍后重试'
    })
  }

  // Handle Zod Validation Errors
  // Fastify validation errors typically have a 'validation' property
  interface FastifyValidationError extends Error {
    validation: unknown[] // or specific validation error shape
    statusCode?: number
  }

  const validationError = error as FastifyValidationError
  if (validationError.validation) {
    return reply.status(400).send({
      success: false,
      code: 'VALIDATION_ERROR',
      message: '请求参数不合法',
      details: validationError.validation
    })
  }

  // Fastify 框架自带 4xx（空 body、非法 JSON、限流等），避免被误报成 500
  const frameworkError = toFrameworkClientError(error)
  if (frameworkError) {
    request.log.warn({ err: error, url: request.url }, 'Framework client error')
    return reply.status(frameworkError.statusCode).send({
      success: false,
      code: frameworkError.code,
      message: frameworkError.message
    })
  }

  // Handle generic errors
  request.log.error({ err: error, url: request.url }, 'Unhandled error')
  return reply.status(500).send({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: '服务器内部错误，请稍后重试'
  })
})

// 404 走 notFoundHandler，不经过 setErrorHandler，需要单独统一信封
app.setNotFoundHandler((request, reply) => {
  request.log.warn({ url: request.url }, 'Route not found')
  return reply.status(404).send({
    success: false,
    code: 'NOT_FOUND',
    message: '接口不存在'
  })
})

// Plugins
await app.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['content-type', 'authorization']
})

// Security Headers
await app.register(helmet, {
  contentSecurityPolicy: false
})

await app.register(rateLimit, {
  global: false
})

await app.register(cookie)

await app.register(jwt, {
  secret: config.auth.jwtSecret,
  cookie: {
    cookieName: AUTH_COOKIE_NAME,
    signed: false
  },
  sign: {
    expiresIn: '7d'
  }
})

app.decorate('authenticate', async function (req, reply) {
  try {
    await req.jwtVerify()
  } catch (err) {
    app.log.warn({ err, ip: req.ip }, 'JWT verification failed')
    return reply.status(401).send({
      success: false,
      code: 'UNAUTHORIZED',
      message: '登录状态已失效，请重新登录'
    })
  }
})

await app.register(staticPlugin, {
  root: join(process.cwd(), 'public'),
  prefix: '/',
  constraints: {}
})

// Health Checks
app.get('/healthz', async () => ({ status: 'ok' }))
app.get('/readyz', async () => ({ status: 'ready' }))

// Register Routes
await app.register(iconRoutes, { prefix: '/api' })
await app.register(backupRoutes, { prefix: '/api' })
await app.register(syncRoutes, { prefix: '/api' })
const oauthProviderConfigService = new OAuthProviderConfigService(
  databaseClient,
  httpClient,
  config.auth.oauthConfigEncryptionKey
)
app.decorate('oauthProviderConfigService', oauthProviderConfigService)

await app.register(authRoutes, { prefix: '/api' })
await app.register(aiRoutes, { prefix: '/api' })
await app.register(adminRoutes, { prefix: '/api' })
await app.register(siteRoutes, { prefix: '/api' })

await app.register(authRenewalPlugin)

// Start server
const start = async () => {
  try {
    // Initialize services (DB tables, etc.)
    // 数据库不可用时不再 fail-fast：服务照常监听（请求期错误由全局
    // 503 信封兜住），并在后台按间隔重试初始化，数据库恢复后自愈。
    const RETRY_INTERVAL_MS = 10_000
    const initAll = async () => {
      await initServices(app.log)
      await oauthProviderConfigService.initTable()
      await oauthProviderConfigService.validateEnabledProviders()
    }

    const scheduleDbInitRetry = () => {
      const timer = setTimeout(async () => {
        try {
          await initAll()
          app.log.info('Database became available, services initialized')
        } catch (retryErr) {
          app.log.warn({ err: retryErr }, 'Database still unavailable, will retry')
          scheduleDbInitRetry()
        }
      }, RETRY_INTERVAL_MS)
      timer.unref()
    }

    try {
      await initAll()
    } catch (initErr) {
      app.log.error(
        { err: initErr },
        'Database unavailable at startup, serving degraded until it recovers'
      )
      scheduleDbInitRetry()
    }

    const port = config.server.port
    await app.listen({ port, host: '0.0.0.0' })
    app.log.info(`Server listening on port ${port} in ${config.server.env} mode`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()

// Graceful Shutdown
const signals = ['SIGTERM', 'SIGINT'] as const

signals.forEach(signal => {
  process.on(signal, async () => {
    app.log.info(`Received ${signal}, shutting down...`)
    await app.close()
    process.exit(0)
  })
})
