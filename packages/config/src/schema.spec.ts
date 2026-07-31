import { describe, expect, it } from 'vitest'
import { configSchema } from './schema.js'

const developmentConfig = {
  PUBLIC_STORAGE_PROVIDER: 'local'
} as const

describe('SMTP configuration', () => {
  it('allows SMTP credentials to be omitted in development', () => {
    expect(configSchema.safeParse(developmentConfig).success).toBe(true)
  })

  it('requires the SMTP account and authorization code together', () => {
    expect(
      configSchema.safeParse({ ...developmentConfig, SMTP_USER: 'sender@163.com' }).success
    ).toBe(false)
    expect(
      configSchema.safeParse({ ...developmentConfig, SMTP_PASSWORD: 'authorization-code' }).success
    ).toBe(false)
    expect(
      configSchema.safeParse({
        ...developmentConfig,
        SMTP_USER: 'sender@163.com',
        SMTP_PASSWORD: 'authorization-code'
      }).success
    ).toBe(true)
  })
})
