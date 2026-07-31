import { z } from 'zod'
import { NAVIGATION_BRAND_CONFIG, countNavigationTitle } from '@nav/config/brand'

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
      value => countNavigationTitle(value) <= NAVIGATION_BRAND_CONFIG.titleMaxLength,
      `Navigation title must contain at most ${NAVIGATION_BRAND_CONFIG.titleMaxLength} characters`
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
