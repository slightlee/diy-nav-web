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

  // R2 Storage
  STORAGE_R2_ACCOUNT_ID: z.string().optional(),
  STORAGE_R2_ENDPOINT: z.string().optional(),
  STORAGE_R2_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_R2_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),

  // D1 Database
  DB_D1_DATABASE_ID: z.string().optional(),
  DB_D1_API_TOKEN: z.string().optional(),

  // Backup
  BACKUP_MAX_RETAINED: z.string().transform(Number).default('5'),
  BACKUP_ROOT_DIR: z.string().default('backups'),
  BACKUP_AUTO_INTERVAL: z.string().transform(Number).default('3600000')
})

const processEnv = envSchema.parse(process.env)

// Helper to resolve Account ID
const getAccountId = () => {
  if (processEnv.STORAGE_R2_ACCOUNT_ID) return processEnv.STORAGE_R2_ACCOUNT_ID

  const endpoint = processEnv.STORAGE_R2_ENDPOINT || ''
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
    apiToken: processEnv.DB_D1_API_TOKEN || '',
    d1DatabaseId: processEnv.DB_D1_DATABASE_ID || ''
  },
  r2: {
    accessKeyId: processEnv.STORAGE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: processEnv.STORAGE_R2_SECRET_ACCESS_KEY || '',
    bucketName: processEnv.STORAGE_BUCKET || ''
  },
  backup: {
    maxRetained: processEnv.BACKUP_MAX_RETAINED,
    rootDir: processEnv.BACKUP_ROOT_DIR,
    autoInterval: processEnv.BACKUP_AUTO_INTERVAL
  }
}
