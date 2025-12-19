/**
 * @nav/config - Main Entry
 * 单一配置入口（Single Source of Truth）
 *
 * 使用方式:
 * ```typescript
 * import { config } from '@nav/config'
 * config.server.port
 * config.auth.jwtSecret
 * ```
 *
 * 或按需导入:
 * ```typescript
 * import { getServerConfig, getAuthConfig } from '@nav/config'
 * const server = getServerConfig()
 * ```
 */

// 核心导出
export { configSchema, type RawConfig } from './schema.js'
export { loadRawConfig, getConfig, type Config } from './loader.js'

// 命名空间导出
export * from './namespaces/index.js'

// 便捷导出：预加载的配置对象
import { getConfig } from './loader.js'

/**
 * 全局配置对象（延迟初始化）
 * 推荐在应用启动时使用，自动加载并验证环境变量
 */
let _config: ReturnType<typeof getConfig> | null = null

export function loadConfig() {
  if (!_config) {
    _config = getConfig()
  }
  return _config
}

/**
 * 便捷的全局配置对象（延迟初始化）
 * 使用 Proxy 实现懒加载，首次访问时自动加载配置
 */
export const config = new Proxy({} as ReturnType<typeof getConfig>, {
  get(_, prop) {
    if (!_config) {
      _config = getConfig()
    }
    return _config[prop as keyof typeof _config]
  }
})
