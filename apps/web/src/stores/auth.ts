import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { request } from '@/utils/http'
import { useSettingsStore } from '@/stores/settings'

export interface User {
  id: string
  email: string | null
  nickname: string | null
  avatar_url: string | null
  role: 'USER' | 'ADMIN'
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
    try {
      const res = await request.get<User>('/api/auth/me', undefined, {
        skipUnauthorizedHandler: true
      })
      if (res.success && res.data) {
        setCurrentUser(res.data)
      } else {
        clearLocalAuth()
      }
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

  async function logout() {
    try {
      await request.post('/api/auth/logout')
    } finally {
      clearLocalAuth()
    }
  }

  return {
    user,
    hasCheckedSession,
    isNewRegistration,
    isAuthenticated,
    login,
    loginWithProvider,
    register,
    fetchUser,
    updateNickname,
    logout
  }
})
