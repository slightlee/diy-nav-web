/**
 * @nav/config - Server Namespace
 * 服务器相关配置
 */
import { getConfig } from '../loader.js'

export function getServerConfig() {
  return getConfig().server
}

export type ServerConfig = ReturnType<typeof getServerConfig>
