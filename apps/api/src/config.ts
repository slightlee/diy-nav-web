import { z } from 'zod'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env file
const envFile = process.env.ICON_API_ENV_FILE || '.env.local'
dotenv.config({ path: resolve(process.cwd(), envFile) })
// Also try loading root .env if exists
dotenv.config({ path: resolve(process.cwd(), '../../.env') })

const envSchema = z.object({
  // Server
  PORT: z.string().transform(Number).default('8787'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Cloudflare Account
  // Support both variable names for compatibility
  CF_ACCOUNT_ID: z.string().optional(),

  // R2 Storage
  CF_R2_ENDPOINT: z.string().optional(),

  CF_R2_ACCESS_KEY_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),

  CF_R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),

  STORAGE_BUCKET: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),

  // D1 Database
  CF_D1_DATABASE_ID: z.string().optional(),
  CLOUDFLARE_D1_DATABASE_ID: z.string().optional(),

  CF_API_TOKEN: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),

  // Backup
  BACKUP_MAX_RETAINED: z.string().transform(Number).default('5'),
  BACKUP_ROOT_DIR: z.string().default('backups')
})

const processEnv = envSchema.parse(process.env)

// Helper to resolve Account ID
const getAccountId = () => {
  if (processEnv.CF_ACCOUNT_ID) return processEnv.CF_ACCOUNT_ID

  const endpoint = processEnv.CF_R2_ENDPOINT || ''
  const match = endpoint.match(/https:\/\/([^.]+)\.r2\.cloudflarestorage\.com/)
  return match ? match[1] : ''
}

const accountId = getAccountId()

export const config = {
  server: {
    port: processEnv.PORT,
    env: processEnv.NODE_ENV
  },
  cloudflare: {
    accountId,
    apiToken: processEnv.CF_API_TOKEN || processEnv.CLOUDFLARE_API_TOKEN || '',
    d1DatabaseId: processEnv.CF_D1_DATABASE_ID || processEnv.CLOUDFLARE_D1_DATABASE_ID || ''
  },
  r2: {
    accessKeyId: processEnv.CF_R2_ACCESS_KEY_ID || processEnv.R2_ACCESS_KEY_ID || '',
    secretAccessKey: processEnv.CF_R2_SECRET_ACCESS_KEY || processEnv.R2_SECRET_ACCESS_KEY || '',
    bucketName: processEnv.STORAGE_BUCKET || processEnv.R2_BUCKET_NAME || ''
  },
  backup: {
    maxRetained: processEnv.BACKUP_MAX_RETAINED,
    rootDir: processEnv.BACKUP_ROOT_DIR
  }
}
