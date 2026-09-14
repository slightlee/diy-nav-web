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
        req.log.error({ err, userId }, 'Backup creation failed')
        return reply
          .code(500)
          .send({ success: false, code: 'BACKUP_FAILED', message: '创建备份失败，请稍后重试' })
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
        req.log.error({ err, userId }, 'Backup listing failed')
        return reply
          .code(500)
          .send({ success: false, code: 'LIST_FAILED', message: '获取备份列表失败，请稍后重试' })
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
        req.log.error({ err, userId, backupId }, 'Backup restore failed')
        return reply
          .code(500)
          .send({ success: false, code: 'RESTORE_FAILED', message: '恢复备份失败，请稍后重试' })
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
        req.log.error({ err, userId, id }, 'Backup deletion failed')
        return reply
          .code(500)
          .send({ success: false, code: 'DELETE_FAILED', message: '删除备份失败，请稍后重试' })
      }
    }
  )
}

export default backupRoutes
