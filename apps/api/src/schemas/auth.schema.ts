import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})

export const updateProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(30)
})

export const providerLoginSchema = {
  params: z.object({
    provider: z.string()
  }),
  body: z.object({
    code: z.string()
  })
}
