import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import { validatorCompiler, serializerCompiler, ZodTypeProvider } from 'fastify-type-provider-zod'
import { join } from 'path'
import { config } from './src/config.js'
import { initServices } from './src/services.js'
import { AppError } from '@nav/core'
import iconRoutes from './src/routes/icon.js'
import backupRoutes from './src/routes/backup.js'
import authRoutes from './src/routes/auth.js'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'

import { createRequire } from 'module'

// Fastify app
const require = createRequire(import.meta.url)
const isDev = process.env.NODE_ENV === 'development'

const app = Fastify({
  logger: isDev
    ? {
        transport: {
          target: require.resolve('pino-pretty'),
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            colorize: true
          }
        }
      }
    : true
}).withTypeProvider<ZodTypeProvider>()

// Setup Zod validation
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.setErrorHandler((error, request, reply) => {
  // Handle AppError
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      code: error.code,
      message: error.message,
      isOperational: error.isOperational
    })
  }

  // Handle Zod Validation Errors
  // Fastify validation errors typically have a 'validation' property
  interface FastifyValidationError extends Error {
    validation: any[] // or specific validation error shape
    statusCode?: number
  }

  const validationError = error as FastifyValidationError
  if (validationError.validation) {
    return reply.status(400).send({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: validationError.validation
    })
  }

  // Handle generic errors
  app.log.error(error)
  return reply.status(500).send({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal Server Error'
  })
})

// Plugins
await app.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['content-type', 'authorization']
})

await app.register(rateLimit, {
  global: false
})

await app.register(jwt, {
  secret: config.auth.jwtSecret
})

app.decorate('authenticate', async function (req, reply) {
  try {
    await req.jwtVerify()
  } catch (err) {
    reply.send(err)
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
await app.register(authRoutes, { prefix: '/api' })

// Start server
const start = async () => {
  try {
    // Initialize services (DB tables, etc.)
    await initServices(app.log)

    const port = config.server.port
    await app.listen({ port, host: '0.0.0.0' })
    app.log.info(`Server listening on port ${port} in ${config.server.env} mode`)
    app.log.info(app.printRoutes())
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
