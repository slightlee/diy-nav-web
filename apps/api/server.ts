import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import { validatorCompiler, serializerCompiler, ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { loadConfig } from '@nav/config'
import { IconService, getStorageAdapter, getProviders } from '@nav/icon-core'
import { readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'

// Load env first
function loadEnvFromFile() {
  const file = process.env.ICON_API_ENV_FILE || '.env.local'
  const full = resolve(process.cwd(), file)
  if (!existsSync(full)) return
  const content = readFileSync(full, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    let val = line.slice(idx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

loadEnvFromFile()

// Load config
const config = loadConfig()

// Init service
const storage = getStorageAdapter(config)
const providers = getProviders(config)
const iconService = new IconService(storage, providers, config.DEFAULT_ICON_URL)

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
  prefix: '/', // This will serve files from public/ at root. e.g. /icons/default.svg -> public/icons/default.svg
  constraints: {}
})

// Health Checks
app.get('/healthz', async () => ({ status: 'ok' }))
app.get('/readyz', async () => ({ status: 'ready' }))

// API Routes
const iconQuerySchema = z.object({
  domain: z.string().optional(),
  url: z.string().optional()
})

const iconResponseSchema = {
  200: z.object({
    url: z.string(),
    source: z
      .enum(['google', 'duckduckgo', 'clearbit', 'default', 'cache', 'storage'])
      .or(z.string()),
    processedAt: z.string().optional(),
    metrics: z
      .object({
        fetchMs: z.number().optional(),
        storeMs: z.number().optional()
      })
      .optional()
  }),
  400: z.object({
    code: z.string(),
    message: z.string()
  }),
  500: z.object({
    code: z.string(),
    message: z.string()
  })
}

app.get(
  '/api/icon',
  {
    schema: {
      querystring: iconQuerySchema,
      response: iconResponseSchema
    }
  },
  async (req, reply) => {
    // Explicitly cast if inference fails, though it should work with ZodTypeProvider
    const query = req.query as z.infer<typeof iconQuerySchema>
    const { domain, url } = query
    const target = domain || url

    if (!target) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'missing domain or url' })
    }

    try {
      const result = await iconService.getIconUrl(target)

      return {
        url: result.url,
        source: result.hit ? 'storage' : 'default',
        metrics: result.metrics
      }
    } catch (err) {
      req.log.error(err)
      return reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'failed to fetch icon' })
    }
  }
)

// Start server
const start = async () => {
  try {
    const port = config.PORT || 8787
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`Server listening on port ${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
