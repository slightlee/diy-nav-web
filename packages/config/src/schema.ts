/**
 * @nav/config - Schema Definitions
 * 所有环境变量的 Zod schema 定义（Single Source of Truth）
 */
import { z } from 'zod'

// ============================================
// Server 配置
// ============================================
export const serverSchema = z.object({
  PORT: z.coerce.number().default(8787),
  APP_PORT: z.coerce.number().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('diy-nav-web')
})

// ============================================
// Auth 配置
// ============================================
export const authSchema = z.object({
  JWT_SECRET: z.string().default('dev-secret-do-not-use-in-prod'),
  LINUX_DO_CLIENT_ID: z.string().optional(),
  LINUX_DO_CLIENT_SECRET: z.string().optional(),
  LINUX_DO_REDIRECT_URI: z.string().optional()
})

// ============================================
// Storage 配置
// ============================================
export const storageSchema = z.object({
  // Storage providers
  PUBLIC_STORAGE_PROVIDER: z.enum(['r2', 's3', 'local']).default('r2'),
  BACKUP_STORAGE_PROVIDER: z.enum(['r2', 'webdav']).default('r2'),

  STORAGE_BUCKET: z.string().optional(),
  STORAGE_PUBLIC_BASE_URL: z.string().optional(),

  // Per-service path prefixes
  STORAGE_ICONS_PATH: z.string().default('icons'),
  STORAGE_AVATARS_PATH: z.string().default('avatars'),
  STORAGE_BACKUPS_PATH: z.string().default('data-backups'),

  // AWS S3
  STORAGE_S3_REGION: z.string().optional(),
  STORAGE_S3_ENDPOINT: z.string().optional(),
  STORAGE_S3_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Cloudflare R2
  STORAGE_R2_ACCOUNT_ID: z.string().optional(),
  STORAGE_R2_ENDPOINT: z.string().optional(),
  STORAGE_R2_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_R2_SECRET_ACCESS_KEY: z.string().optional(),

  // WebDAV (for backup storage)
  WEBDAV_URL: z.string().optional(),
  WEBDAV_USERNAME: z.string().optional(),
  WEBDAV_PASSWORD: z.string().optional(),
  WEBDAV_BASE_PATH: z.string().default('/nav-backup/')
})

// ============================================
// Database 配置
// ============================================
export const databaseSchema = z.object({
  DB_D1_API_TOKEN: z.string().optional(),
  DB_D1_DATABASE_ID: z.string().optional()
})

// ============================================
// Icon 配置
// ============================================
export const iconSchema = z.object({
  ICON_SIZE: z.coerce.number().default(64),
  ICON_DEFAULT_URL: z.string().default('/icons/default.svg'),
  ICON_GOOGLE_PROXY_URL: z.string().default('https://www.google.com/s2/favicons')
})

// ============================================
// Backup 配置
// ============================================
export const backupSchema = z.object({
  BACKUP_MAX_RETAINED: z.coerce.number().default(5)
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
  .merge(storageSchema)
  .merge(databaseSchema)
  .merge(iconSchema)
  .merge(backupSchema)
  .merge(logSchema)
  .superRefine((data, ctx) => {
    // ============================================
    // 生产环境安全检查
    // ============================================
    if (data.NODE_ENV === 'production') {
      // JWT_SECRET 不能使用默认值
      if (data.JWT_SECRET === 'dev-secret-do-not-use-in-prod') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'JWT_SECRET must be set in production (at least 32 characters)',
          path: ['JWT_SECRET']
        })
      }
    }

    // ============================================
    // 云存储提供商验证
    // ============================================
    if (data.PUBLIC_STORAGE_PROVIDER === 'r2' || data.PUBLIC_STORAGE_PROVIDER === 's3') {
      if (!data.STORAGE_BUCKET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `STORAGE_BUCKET required for ${data.PUBLIC_STORAGE_PROVIDER} provider`,
          path: ['STORAGE_BUCKET']
        })
      }
      if (!data.STORAGE_PUBLIC_BASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `STORAGE_PUBLIC_BASE_URL required for ${data.PUBLIC_STORAGE_PROVIDER} provider`,
          path: ['STORAGE_PUBLIC_BASE_URL']
        })
      }
    }
  })

// 导出原始配置类型
export type RawConfig = z.infer<typeof configSchema>
