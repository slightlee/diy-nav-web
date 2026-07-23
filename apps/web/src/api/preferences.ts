import type { UserPreferences } from '@nav/types'
import { request } from '@/utils/http'

export interface RemotePreferences extends UserPreferences {
  initialized: boolean
  updatedAt: number
}

export const getPreferences = () =>
  request.get<RemotePreferences>('/api/auth/preferences', undefined, {
    skipUnauthorizedHandler: true
  })

export const updatePreferences = (preferences: UserPreferences) =>
  request.patch<RemotePreferences>('/api/auth/preferences', preferences)
