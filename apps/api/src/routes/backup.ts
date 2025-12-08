import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { backupService } from '../services.js'

const backupRoutes: FastifyPluginAsyncZod = async app => {
  const backupBodySchema = z.object({
    data: z.any(),
    type: z.enum(['MANUAL', 'AUTO']).optional().default('MANUAL')
  })

  app.post(
    '/backup',
    {
      onRequest: [app.authenticate],
      schema: {
        body: backupBodySchema
      }
    },
    async (req, reply) => {
      const { data, type } = req.body
      const userId = req.user.sub

      try {
        const result = await backupService.createBackup(userId, data, type)
        return { success: true, data: result }
      } catch (err) {
        req.log.error(err)
        return reply.code(500).send({ code: 'BACKUP_FAILED', message: 'Failed to create backup' })
      }
    }
  )

  app.get(
    '/backups',
    {
      onRequest: [app.authenticate]
    },
    async (req, reply) => {
      const userId = req.user.sub
      try {
        const backups = await backupService.listBackups(userId)
        return { success: true, data: backups }
      } catch (err) {
        req.log.error(err)
        return reply.code(500).send({ code: 'LIST_FAILED', message: 'Failed to list backups' })
      }
    }
  )

  const restoreBodySchema = z.object({
    backupId: z.coerce.number().int().positive()
  })

  app.post(
    '/backup/restore',
    {
      onRequest: [app.authenticate],
      schema: {
        body: restoreBodySchema
      }
    },
    async (req, reply) => {
      const { backupId } = req.body
      const userId = req.user.sub

      try {
        const content = await backupService.getBackupContent(userId, backupId)
        return { success: true, data: content }
      } catch (err) {
        req.log.error(err)
        return reply.code(500).send({ code: 'RESTORE_FAILED', message: 'Failed to restore backup' })
      }
    }
  )

  const deleteParamsSchema = z.object({
    id: z.coerce.number().int().positive()
  })

  app.delete(
    '/backup/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        params: deleteParamsSchema
      }
    },
    async (req, reply) => {
      const { id } = req.params
      const userId = req.user.sub

      try {
        await backupService.deleteBackup(userId, id)
        return { success: true }
      } catch (err) {
        req.log.error(err)
        return reply.code(500).send({ code: 'DELETE_FAILED', message: 'Failed to delete backup' })
      }
    }
  )
}

export default backupRoutes
