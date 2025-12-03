import { z } from 'zod'
import dotenv from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'

export const configSchema = z
  .object({
    PORT: z.coerce.number().default(8787),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    APP_NAME: z.string().default('diy-nav-web'),

    // Storage
    STORAGE_PROVIDER: z.enum(['local', 'aws', 'cloudflare']).default('local'),
    STORAGE_BUCKET: z.string().optional(),
    STORAGE_PUBLIC_BASE_URL: z.string().optional(),
    STORAGE_KEY_PREFIX: z.string().default(''),

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

    // Icon
    ICON_DEFAULT_URL: z.string().default('/icons/default.svg'),
    ICON_SIZE: z.coerce.number().default(64),
    ICON_GOOGLE_PROXY_URL: z.string().default('https://www.google.com/s2/favicons')
  })
  .superRefine((data, ctx) => {
    if (data.STORAGE_PROVIDER === 'aws') {
      if (!data.STORAGE_BUCKET)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'STORAGE_BUCKET required for aws provider',
          path: ['STORAGE_BUCKET']
        })
      if (!data.STORAGE_PUBLIC_BASE_URL)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'STORAGE_PUBLIC_BASE_URL required for aws provider',
          path: ['STORAGE_PUBLIC_BASE_URL']
        })
    }
    if (data.STORAGE_PROVIDER === 'cloudflare') {
      if (!data.STORAGE_BUCKET)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'STORAGE_BUCKET required for cloudflare provider',
          path: ['STORAGE_BUCKET']
        })
      if (!data.STORAGE_PUBLIC_BASE_URL)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'STORAGE_PUBLIC_BASE_URL required for cloudflare provider',
          path: ['STORAGE_PUBLIC_BASE_URL']
        })
    }
  })

export type Config = z.infer<typeof configSchema>

let configCache: Config | null = null

export function loadConfig(): Config {
  if (configCache) return configCache

  // Try loading .env if not already loaded
  dotenv.config()

  // Try loading from root if in a monorepo structure
  // We check a few common locations up the tree
  const pathsToCheck = ['../../.env', '../../../.env']
  for (const p of pathsToCheck) {
    const fullPath = resolve(process.cwd(), p)
    if (existsSync(fullPath)) {
      dotenv.config({ path: fullPath })
      break
    }
  }

  // Use APP_PORT if PORT is not set
  if (process.env.APP_PORT && !process.env.PORT) {
    process.env.PORT = process.env.APP_PORT
  }

  const result = configSchema.safeParse(process.env)

  if (!result.success) {
    console.error(
      '❌ Invalid environment variables:',
      JSON.stringify(result.error.format(), null, 2)
    )
    throw new Error('Invalid environment variables')
  }

  configCache = result.data
  return result.data
}
