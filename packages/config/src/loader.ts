/**
 * @nav/config - Config Loader
 * 统一的 .env 加载和验证逻辑
 */
import dotenv from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { configSchema, type RawConfig } from './schema.js'

// 配置缓存
let configCache: RawConfig | null = null

/**
 * 加载 .env 文件
 * 支持多环境文件优先级：.env.local > .env.{NODE_ENV} > .env
 */
function loadEnvFiles(): void {
  const cwd = process.cwd()
  const nodeEnv = process.env.NODE_ENV || 'development'

  const envPaths = [
    '.env',
    `.env.${nodeEnv}`,
    '.env.local',
    '../../.env',
    `../../.env.${nodeEnv}`,
    '../../.env.local'
  ]

  for (const envPath of envPaths) {
    const fullPath = resolve(cwd, envPath)
    if (existsSync(fullPath)) {
      dotenv.config({ path: fullPath })
    }
  }
}

/**
 * 加载并验证配置
 * @param forceReload 是否强制重新加载（忽略缓存）
 */
export function loadRawConfig(forceReload = false): RawConfig {
  if (configCache && !forceReload) {
    return configCache
  }

  loadEnvFiles()

  // APP_PORT -> PORT 兼容
  if (process.env.APP_PORT && !process.env.PORT) {
    process.env.PORT = process.env.APP_PORT
  }

  // 兼容旧 env：STORAGE_R2_ACCOUNT_ID 作为 CLOUDFLARE_ACCOUNT_ID 的别名
  if (process.env.STORAGE_R2_ACCOUNT_ID && !process.env.CLOUDFLARE_ACCOUNT_ID) {
    process.env.CLOUDFLARE_ACCOUNT_ID = process.env.STORAGE_R2_ACCOUNT_ID
  }

  const result = configSchema.safeParse(process.env)

  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment variables:')
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(result.error.format(), null, 2))
    throw new Error('Invalid environment variables')
  }

  configCache = result.data
  return configCache
}

/**
 * 获取结构化配置对象
 *
 * 注意：存储凭据（R2/S3/WebDAV）不再从环境变量读取，
 * 统一由管理后台写入数据库（storage_purpose_configs 表）。
 */
export function getConfig() {
  const raw = loadRawConfig()

  return {
    server: {
      port: raw.PORT,
      env: raw.NODE_ENV
    },
    auth: {
      jwtSecret: raw.JWT_SECRET,
      oauthConfigEncryptionKey: raw.OAUTH_CONFIG_ENCRYPTION_KEY
    },
    database: {
      provider: raw.DB_PROVIDER ?? 'd1',
      d1: {
        apiToken: raw.DB_D1_API_TOKEN,
        databaseId: raw.DB_D1_DATABASE_ID
      },
      mysql: {
        host: raw.DB_MYSQL_HOST,
        port: raw.DB_MYSQL_PORT,
        user: raw.DB_MYSQL_USER,
        password: raw.DB_MYSQL_PASSWORD,
        database: raw.DB_MYSQL_DATABASE,
        connectionLimit: raw.DB_MYSQL_CONNECTION_LIMIT
      }
    },
    icon: {
      size: raw.ICON_SIZE,
      defaultUrl: raw.ICON_DEFAULT_URL,
      googleProxyUrl: raw.ICON_GOOGLE_PROXY_URL
    },
    log: {
      level: raw.LOG_LEVEL,
      headers: raw.LOG_HEADERS
    },
    // Cloudflare 账号信息（D1 数据库连接需要 Account ID）
    cloudflare: {
      accountId: raw.CLOUDFLARE_ACCOUNT_ID || '',
      apiToken: raw.DB_D1_API_TOKEN || '',
      d1DatabaseId: raw.DB_D1_DATABASE_ID || ''
    }
  }
}

// 导出配置类型
export type Config = ReturnType<typeof getConfig>
