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

export const authProviderSchema = z.enum(['github', 'google', 'linuxdo'])

export const providerLoginSchema = {
  params: z.object({
    provider: authProviderSchema
  }),
  body: z.object({
    code: z.string()
  })
}

export const providerBindingIntentSchema = {
  params: z.object({ provider: authProviderSchema })
}

export const providerBindingSchema = {
  params: z.object({ provider: authProviderSchema }),
  body: z.object({
    code: z.string().min(1),
    state: z.string().min(1)
  })
}

export const providerUnbindingSchema = {
  params: z.object({ provider: authProviderSchema })
}

export const requestEmailBindingSchema = z.object({
  email: z.string().trim().email()
})

export const verifyEmailBindingSchema = z.object({
  token: z.string().min(20)
})

export const completeEmailBindingSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(128)
})
