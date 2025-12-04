import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { iconService } from '../services.js'

const iconRoutes: FastifyPluginAsyncZod = async app => {
  const iconQuerySchema = z.object({
    domain: z.string().optional(),
    url: z.string().optional(),
    refresh: z
      .string()
      .optional()
      .transform(val => val === 'true' || val === '1')
  })

  const iconResponseSchema = {
    200: z.object({
      success: z.boolean(),
      data: z.object({
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
      })
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
    '/icon',
    {
      schema: {
        querystring: iconQuerySchema,
        response: iconResponseSchema
      }
    },
    async (req, reply) => {
      const query = req.query
      const { domain, url, refresh } = query
      const target = domain || url

      if (!target) {
        return reply.code(400).send({ code: 'BAD_REQUEST', message: 'missing domain or url' })
      }

      try {
        const result = await iconService.getIconUrl(target, refresh || false)

        return {
          success: true,
          data: {
            url: result.url,
            source: result.source,
            metrics: result.metrics
          }
        }
      } catch (err) {
        req.log.error(err)
        return reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'failed to fetch icon' })
      }
    }
  )
}

export default iconRoutes
