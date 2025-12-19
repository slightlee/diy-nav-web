/**
 * @nav/config - Auth Namespace
 * 认证相关配置
 */
import { getConfig } from '../loader.js'

export function getAuthConfig() {
  return getConfig().auth
}

export type AuthConfig = ReturnType<typeof getAuthConfig>
