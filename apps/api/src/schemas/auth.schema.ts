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

export const updatePreferencesSchema = z.object({
  navTitle: z
    .string()
    .trim()
    .refine(
      value => Array.from(value).length <= 6,
      'Navigation title must contain at most 6 characters'
    )
    .optional(),
  navIcon: z.string().trim().max(512).optional(),
  defaultHome: z.enum(['home', 'all']).optional(),
  aiAnimationEnabled: z.boolean().optional()
})

export const providerLoginSchema = {
  params: z.object({
    provider: z.string()
  }),
  body: z.object({
    code: z.string()
  })
}
