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
      schema: {
        body: backupBodySchema
      }
    },
    async (req, reply) => {
      const { data, type } = req.body
      // TODO: Get real user ID from auth
      const userId = 1

      try {
        const result = await backupService.createBackup(userId, data, type)
        return { success: true, data: result }
      } catch (err) {
        req.log.error(err)
        return reply.code(500).send({ code: 'BACKUP_FAILED', message: 'Failed to create backup' })
      }
    }
  )

  app.get('/backups', async (req, reply) => {
    const userId = 1
    try {
      const backups = await backupService.listBackups(userId)
      return { success: true, data: backups }
    } catch (err) {
      req.log.error(err)
      return reply.code(500).send({ code: 'LIST_FAILED', message: 'Failed to list backups' })
    }
  })

  const restoreBodySchema = z.object({
    backupId: z.number()
  })

  app.post(
    '/backup/restore',
    {
      schema: {
        body: restoreBodySchema
      }
    },
    async (req, reply) => {
      const { backupId } = req.body
      const userId = 1

      try {
        const content = await backupService.getBackupContent(userId, backupId)
        return { success: true, data: content }
      } catch (err) {
        req.log.error(err)
        return reply.code(500).send({ code: 'RESTORE_FAILED', message: 'Failed to restore backup' })
      }
    }
  )
}

export default backupRoutes
