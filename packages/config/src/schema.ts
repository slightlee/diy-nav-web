/**
 * @nav/config - Schema Definitions
 * 所有环境变量的 Zod schema 定义（Single Source of Truth）
 *
 * 设计原则：
 * - 只放"启动时必须有"的配置（数据库连接、安全密钥、服务端口等）
 * - 存储凭据（R2/S3/WebDAV）统一由管理后台写入数据库，不再走环境变量
 */
import { z } from 'zod'

const DEVELOPMENT_OAUTH_CONFIG_KEY = 'dev-oauth-config-key-change-me-now'

// ============================================
// Server 配置
// ============================================
export const serverSchema = z.object({
  PORT: z.coerce.number().default(8787),
  APP_PORT: z.coerce.number().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
})

// ============================================
// Auth 配置
// ============================================
export const authSchema = z.object({
  JWT_SECRET: z.string().default('dev-secret-do-not-use-in-prod'),
  OAUTH_CONFIG_ENCRYPTION_KEY: z.preprocess(
    value => (value === '' ? undefined : value),
    z.string().min(32).default(DEVELOPMENT_OAUTH_CONFIG_KEY)
  )
})

// ============================================
// Database 配置
// ============================================
export const databaseSchema = z.object({
  // Cloudflare Account ID 用于 D1 数据库 API 地址
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  DB_D1_API_TOKEN: z.string().optional(),
  DB_D1_DATABASE_ID: z.string().optional(),
  // 数据库提供商：d1（Cloudflare，默认）或 mysql（自建，如阿里云 RDS）
  DB_PROVIDER: z.enum(['d1', 'mysql']).default('d1'),
  DB_MYSQL_HOST: z.string().optional(),
  DB_MYSQL_PORT: z.coerce.number().optional(),
  DB_MYSQL_USER: z.string().optional(),
  DB_MYSQL_PASSWORD: z.string().optional(),
  DB_MYSQL_DATABASE: z.string().optional(),
  DB_MYSQL_CONNECTION_LIMIT: z.coerce.number().optional()
})

// ============================================
// Icon 配置（应用行为，非敏感数据）
// ============================================
export const iconSchema = z.object({
  ICON_SIZE: z.coerce.number().default(64),
  ICON_DEFAULT_URL: z.string().default('/icons/default.svg'),
  ICON_GOOGLE_PROXY_URL: z.string().default('https://www.google.com/s2/favicons')
})

// ============================================
// Log 配置
// ============================================
export const logSchema = z.object({
  LOG_LEVEL: z.string().optional(),
  LOG_HEADERS: z
    .string()
    .transform(val => val === 'true')
    .default('false')
})

// ============================================
// 完整配置 Schema（合并所有子 schema）
// ============================================
export const configSchema = z
  .object({})
  .merge(serverSchema)
  .merge(authSchema)
  .merge(databaseSchema)
  .merge(iconSchema)
  .merge(logSchema)
  .superRefine((data, ctx) => {
    // (SMTP config is now managed in site_settings DB table — no env validation needed)

    // ============================================
    // 生产环境安全检查
    // ============================================
    if (data.NODE_ENV === 'production') {
      if (data.JWT_SECRET === 'dev-secret-do-not-use-in-prod') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'JWT_SECRET must be set in production (at least 32 characters)',
          path: ['JWT_SECRET']
        })
      }
      if (data.OAUTH_CONFIG_ENCRYPTION_KEY === DEVELOPMENT_OAUTH_CONFIG_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'OAUTH_CONFIG_ENCRYPTION_KEY must be set in production',
          path: ['OAUTH_CONFIG_ENCRYPTION_KEY']
        })
      }
    }
  })

// 导出原始配置类型
export type RawConfig = z.infer<typeof configSchema>
