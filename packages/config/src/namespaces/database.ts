/**
 * @nav/config - Database Namespace
 * 数据库相关配置
 */
import { getConfig } from '../loader.js'

export function getDatabaseConfig() {
  return getConfig().database
}

export type DatabaseConfig = ReturnType<typeof getDatabaseConfig>
