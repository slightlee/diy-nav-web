/**
 * @nav/config - Log Namespace
 * 日志相关配置
 */
import { getConfig } from '../loader.js'

export function getLogConfig() {
  return getConfig().log
}

export type LogConfig = ReturnType<typeof getLogConfig>
