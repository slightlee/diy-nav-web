/**
 * @nav/config - Icon Namespace
 * 图标服务相关配置
 */
import { getConfig } from '../loader.js'

export function getIconConfig() {
  return getConfig().icon
}

export type IconConfig = ReturnType<typeof getIconConfig>
