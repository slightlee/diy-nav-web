import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import { validatorCompiler, serializerCompiler, ZodTypeProvider } from 'fastify-type-provider-zod'
import { join } from 'path'
import { config } from './src/config.js'
import { initServices } from './src/services.js'
import iconRoutes from './src/routes/icon.js'
import backupRoutes from './src/routes/backup.js'

// Fastify app
const app = Fastify({
  logger: true
}).withTypeProvider<ZodTypeProvider>()

// Setup Zod validation
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// Plugins
await app.register(cors, {
  origin: '*',
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['content-type']
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

// Start server
const start = async () => {
  try {
    // Initialize services (DB tables, etc.)
    await initServices()

    const port = config.server.port
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`Server listening on port ${port} in ${config.server.env} mode`)
    console.log(app.printRoutes())
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
