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

  // 可能的 .env 文件路径（按优先级排序，后加载的会覆盖先加载的）
  const envPaths = [
    '.env', // 基础配置
    `.env.${nodeEnv}`, // 环境特定配置
    '.env.local', // 本地覆盖（不提交到 git）
    // Monorepo 根目录
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
 * 解析 R2 Account ID（从 endpoint 中提取）
 */
function resolveR2AccountId(config: RawConfig): string {
  if (config.STORAGE_R2_ACCOUNT_ID) {
    return config.STORAGE_R2_ACCOUNT_ID
  }

  const endpoint = config.STORAGE_R2_ENDPOINT || ''
  const match = endpoint.match(/https:\/\/([^.]+)\.r2\.cloudflarestorage\.com/)
  return match ? match[1] : ''
}

/**
 * 加载并验证配置
 * @param forceReload 是否强制重新加载（忽略缓存）
 */
export function loadRawConfig(forceReload = false): RawConfig {
  if (configCache && !forceReload) {
    return configCache
  }

  // 加载 .env 文件
  loadEnvFiles()

  // 处理 APP_PORT -> PORT 兼容
  if (process.env.APP_PORT && !process.env.PORT) {
    process.env.PORT = process.env.APP_PORT
  }

  // 验证配置
  const result = configSchema.safeParse(process.env)

  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment variables:')
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(result.error.format(), null, 2))
    throw new Error('Invalid environment variables')
  }

  const config = result.data

  configCache = config
  return config
}

/**
 * 获取结构化配置对象
 */
export function getConfig() {
  const raw = loadRawConfig()
  const accountId = resolveR2AccountId(raw)

  return {
    server: {
      port: raw.PORT,
      env: raw.NODE_ENV,
      appName: raw.APP_NAME
    },
    auth: {
      jwtSecret: raw.JWT_SECRET,
      linuxDo: {
        clientId: raw.LINUX_DO_CLIENT_ID,
        clientSecret: raw.LINUX_DO_CLIENT_SECRET,
        redirectUri: raw.LINUX_DO_REDIRECT_URI
      }
    },
    storage: {
      provider: raw.STORAGE_PROVIDER,
      bucket: raw.STORAGE_BUCKET,
      publicBaseUrl: raw.STORAGE_PUBLIC_BASE_URL,
      keyPrefix: raw.STORAGE_KEY_PREFIX,
      s3: {
        region: raw.STORAGE_S3_REGION,
        endpoint: raw.STORAGE_S3_ENDPOINT,
        accessKeyId: raw.STORAGE_S3_ACCESS_KEY_ID,
        secretAccessKey: raw.STORAGE_S3_SECRET_ACCESS_KEY
      },
      r2: {
        accountId,
        endpoint: raw.STORAGE_R2_ENDPOINT,
        accessKeyId: raw.STORAGE_R2_ACCESS_KEY_ID,
        secretAccessKey: raw.STORAGE_R2_SECRET_ACCESS_KEY
      }
    },
    database: {
      d1: {
        apiToken: raw.DB_D1_API_TOKEN,
        databaseId: raw.DB_D1_DATABASE_ID
      }
    },
    icon: {
      size: raw.ICON_SIZE,
      defaultUrl: raw.ICON_DEFAULT_URL,
      googleProxyUrl: raw.ICON_GOOGLE_PROXY_URL
    },
    backup: {
      maxRetained: raw.BACKUP_MAX_RETAINED,
      rootDir: raw.BACKUP_ROOT_DIR
    },
    log: {
      level: raw.LOG_LEVEL,
      headers: raw.LOG_HEADERS
    },
    // Cloudflare 组合配置（便捷访问）
    cloudflare: {
      accountId,
      apiToken: raw.DB_D1_API_TOKEN || '',
      d1DatabaseId: raw.DB_D1_DATABASE_ID || ''
    },
    // R2 组合配置（便捷访问）
    r2: {
      accessKeyId: raw.STORAGE_R2_ACCESS_KEY_ID || '',
      secretAccessKey: raw.STORAGE_R2_SECRET_ACCESS_KEY || '',
      bucketName: raw.STORAGE_BUCKET || '',
      publicUrlBase:
        raw.STORAGE_PUBLIC_BASE_URL ||
        `https://${raw.STORAGE_BUCKET}.${accountId}.r2.cloudflarestorage.com`
    }
  }
}

// 导出配置类型
export type Config = ReturnType<typeof getConfig>
