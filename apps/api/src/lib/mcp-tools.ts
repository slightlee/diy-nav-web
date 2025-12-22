/**
 * MCP Tools Definition
 * Backend tools for AI assistant (backup operations)
 */

import { backupService } from '../services.js'

/**
 * Tool definitions for OpenAI function calling format
 */
export const mcpTools = [
  {
    type: 'function' as const,
    function: {
      name: 'backup_data',
      description: '将用户的导航数据备份到云端存储',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            description: '要备份的数据对象，包含 websites, categories, tags'
          }
        },
        required: ['data']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_backups',
      description: '获取用户的所有云端备份列表',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'restore_backup',
      description: '从指定的备份恢复数据',
      parameters: {
        type: 'object',
        properties: {
          backupId: {
            type: 'number',
            description: '要恢复的备份ID'
          }
        },
        required: ['backupId']
      }
    }
  }
]

/**
 * Execute an MCP tool call
 */
export async function executeMcpTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  try {
    switch (toolName) {
      case 'backup_data': {
        const result = await backupService.createBackup(userId, args.data, 'AUTO')
        if (!result) {
          return { success: true, result: { message: '内容未变化，已跳过备份' } }
        }
        return { success: true, result: { message: '数据备份成功', backupId: result.id } }
      }

      case 'list_backups': {
        const backups = await backupService.listBackups(userId)
        return {
          success: true,
          result: {
            count: backups.length,
            backups: backups.map(b => ({
              id: b.id,
              createdAt: b.created_at,
              type: b.type
            }))
          }
        }
      }

      case 'restore_backup': {
        const content = await backupService.getBackupContent(userId, args.backupId as number)
        return { success: true, result: { message: '备份数据获取成功', data: content } }
      }

      default:
        return { success: false, error: `未知工具: ${toolName}` }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}
