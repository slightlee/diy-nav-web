import { z } from 'zod'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { syncService } from '../services.js'

const entityIdSchema = z.string().min(1).max(128)
const websiteSchema = z
  .object({
    id: entityIdSchema,
    name: z.string().max(300),
    url: z.string().max(4096),
    categoryId: z.string().max(128),
    tagIds: z.array(entityIdSchema).max(500)
  })
  .passthrough()
const categorySchema = z
  .object({
    id: entityIdSchema,
    name: z.string().max(200)
  })
  .passthrough()
const tagSchema = z
  .object({
    id: entityIdSchema,
    name: z.string().max(200)
  })
  .passthrough()

const syncPayloadSchema = z.object({
  meta: z.object({
    version: z.string().max(50),
    createdAt: z.string().max(100),
    appVersion: z.string().max(50).optional(),
    platform: z.string().max(50).optional()
  }),
  data: z.object({
    websites: z.array(websiteSchema).max(10000),
    categories: z.array(categorySchema).max(2000),
    tags: z.array(tagSchema).max(5000)
  })
})

const updateSnapshotSchema = z.object({
  snapshot: syncPayloadSchema,
  expectedHash: z.string().max(128).nullable()
})

const recoverSnapshotSchema = z.object({
  snapshot: syncPayloadSchema,
  expectedHash: z.string().min(1).max(128)
})

const syncRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/sync/state', { onRequest: [app.authenticate] }, async req => ({
    success: true,
    data: await syncService.getState(req.user.sub)
  }))

  app.get('/sync/snapshot', { onRequest: [app.authenticate] }, async req => ({
    success: true,
    data: await syncService.getSnapshot(req.user.sub)
  }))

  app.post('/sync/enable', { onRequest: [app.authenticate] }, async req => ({
    success: true,
    data: await syncService.setEnabled(req.user.sub, true)
  }))

  app.post('/sync/disable', { onRequest: [app.authenticate] }, async req => ({
    success: true,
    data: await syncService.setEnabled(req.user.sub, false)
  }))

  app.put(
    '/sync/snapshot',
    {
      onRequest: [app.authenticate],
      schema: { body: updateSnapshotSchema }
    },
    async req => {
      const state = await syncService.updateSnapshot(
        req.user.sub,
        req.body.snapshot,
        req.body.expectedHash
      )
      return { success: true, data: state }
    }
  )

  app.post(
    '/sync/recover',
    {
      onRequest: [app.authenticate],
      schema: { body: recoverSnapshotSchema }
    },
    async req => ({
      success: true,
      data: await syncService.recoverSnapshot(
        req.user.sub,
        req.body.snapshot,
        req.body.expectedHash
      )
    })
  )
}

export default syncRoutes
