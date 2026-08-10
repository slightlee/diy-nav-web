import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { request } from '@/utils/http'
import { useSettingsStore } from '@/stores/settings'
import type { OAuthProvider } from '@/utils/oauth'

export interface User {
  id: string
  email: string | null
  nickname: string | null
  avatar_url: string | null
  role: 'USER' | 'ADMIN'
}

export interface AvatarOption {
  key: string
  label: string
  preview: string
}

export interface LoginMethods {
  email: { bound: boolean; address: string | null; canUnbind: boolean }
  providers: Array<{ provider: OAuthProvider; boundAt: number; canUnbind: boolean }>
  availableProviders: OAuthProvider[]
}

export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string
  ) {
    super(message)
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(JSON.parse(localStorage.getItem('auth_user') || 'null'))
  const hasCheckedSession = ref(false)
  const isNewRegistration = ref(false)

  const isAuthenticated = computed(() => hasCheckedSession.value && !!user.value)

  function setCurrentUser(currentUser: User) {
    user.value = currentUser
    hasCheckedSession.value = true
    localStorage.setItem('auth_user', JSON.stringify(currentUser))
  }

  function clearLocalAuth() {
    user.value = null
    hasCheckedSession.value = true
    isNewRegistration.value = false
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  function requireData<T>(response: {
    success: boolean
    data?: T
    message?: string
    code?: string
  }): T {
    if (response.success && response.data !== undefined) return response.data
    throw new AuthRequestError(response.message || '请求失败', response.code)
  }

  async function login(email: string, password: string) {
    const res = await request.post<{ user: User }>('/api/auth/login', {
      email,
      password
    })

    if (res.success && res.data) {
      setCurrentUser(res.data.user)
      void useSettingsStore().loadRemotePreferences(res.data.user.id)
      return true
    }
    throw new Error(res.message || 'Login failed')
  }

  async function loginWithProvider(provider: string, code: string) {
    const res = await request.post<{ user: User; isNewUser?: boolean }>(
      `/api/auth/${provider}/login`,
      {
        code
      }
    )

    if (res.success && res.data) {
      isNewRegistration.value = !!res.data.isNewUser
      setCurrentUser(res.data.user)
      void useSettingsStore().loadRemotePreferences(res.data.user.id)
      return true
    }
    throw new Error(res.message || 'OAuth Login failed')
  }

  async function fetchLoginMethods(): Promise<LoginMethods> {
    const response = await request.get<LoginMethods>('/api/auth/login-methods')
    return requireData(response)
  }

  async function requestEmailBinding(email: string): Promise<{
    expiresAt: number
    verificationUrl?: string
  }> {
    const response = await request.post<{ expiresAt: number; verificationUrl?: string }>(
      '/api/auth/email-bindings',
      { email }
    )
    return requireData(response)
  }

  async function validateEmailBinding(token: string): Promise<{ email: string }> {
    const response = await request.get<{ email: string }>('/api/auth/email-bindings/verify', {
      token
    })
    return requireData(response)
  }

  async function completeEmailBinding(token: string, password: string): Promise<User> {
    const response = await request.post<{ user: User }>('/api/auth/email-bindings/complete', {
      token,
      password
    })
    const data = requireData(response)
    setCurrentUser(data.user)
    void useSettingsStore().loadRemotePreferences(data.user.id)
    return data.user
  }

  async function createProviderBindingIntent(provider: OAuthProvider): Promise<string> {
    const response = await request.post<{ state: string }>(`/api/auth/${provider}/bind-intent`)
    return requireData(response).state
  }

  async function bindProvider(provider: OAuthProvider, code: string, state: string): Promise<void> {
    const response = await request.post(`/api/auth/${provider}/bind`, { code, state })
    if (!response.success) {
      throw new AuthRequestError(response.message || '第三方账号绑定失败', response.code)
    }
  }

  async function unbindEmailLogin(): Promise<void> {
    const response = await request.delete<{ user: User }>('/api/auth/login-methods/email')
    const data = requireData(response)
    setCurrentUser(data.user)
  }

  async function unbindProvider(provider: OAuthProvider): Promise<void> {
    const response = await request.delete(`/api/auth/login-methods/${provider}`)
    if (!response.success) {
      throw new AuthRequestError(response.message || '第三方账号解绑失败', response.code)
    }
  }

  async function register(email: string, password: string) {
    const res = await request.post<{ id: string; email: string }>('/api/auth/register', {
      email,
      password
    })

    if (res.success) {
      isNewRegistration.value = true
      return true
    }
    throw new Error(res.message || 'Registration failed')
  }

  async function fetchUser() {
    hasCheckedSession.value = false
    try {
      const res = await request.get<User>('/api/auth/me', undefined, {
        skipUnauthorizedHandler: true
      })
      if (res.success && res.data) {
        setCurrentUser(res.data)
      } else {
        clearLocalAuth()
      }
    } catch (error) {
      // Never expose cached account data until the httpOnly-cookie session is verified.
      clearLocalAuth()
      throw error
    } finally {
      hasCheckedSession.value = true
    }
  }

  async function updateNickname(nickname: string) {
    const res = await request.patch<{ user: User }>('/api/auth/profile', { nickname })

    if (res.success && res.data) {
      setCurrentUser(res.data.user)
      return res.data.user
    }
    throw new Error(res.message || 'Failed to update nickname')
  }

  async function getAvatarOptions(): Promise<AvatarOption[]> {
    const res = await request.get<AvatarOption[]>('/api/auth/avatar-options')
    if (res.success && res.data) return res.data
    throw new Error(res.message || 'Failed to load avatar options')
  }

  async function updateAvatar(avatarKey: string) {
    const res = await request.patch<{ user: User }>('/api/auth/avatar', { avatarKey })
    if (res.success && res.data) {
      setCurrentUser(res.data.user)
      return res.data.user
    }
    throw new Error(res.message || 'Failed to update avatar')
  }

  async function logout() {
    try {
      await request.post('/api/auth/logout')
    } finally {
      clearLocalAuth()
    }
  }

  function expireSession() {
    clearLocalAuth()
  }

  return {
    user,
    hasCheckedSession,
    isNewRegistration,
    isAuthenticated,
    login,
    loginWithProvider,
    fetchLoginMethods,
    requestEmailBinding,
    validateEmailBinding,
    completeEmailBinding,
    createProviderBindingIntent,
    bindProvider,
    unbindEmailLogin,
    unbindProvider,
    register,
    fetchUser,
    updateNickname,
    getAvatarOptions,
    updateAvatar,
    logout,
    expireSession
  }
})
