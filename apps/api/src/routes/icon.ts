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
      success: z.boolean(),
      code: z.string(),
      message: z.string()
    }),
    500: z.object({
      success: z.boolean(),
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
        return reply
          .code(400)
          .send({ success: false, code: 'BAD_REQUEST', message: '缺少 domain 或 url 参数' })
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
        req.log.error({ err, target }, 'Icon fetch failed')
        return reply.code(500).send({
          success: false,
          code: 'INTERNAL_ERROR',
          message: '图标获取失败，请稍后重试'
        })
      }
    }
  )
}

export default iconRoutes
