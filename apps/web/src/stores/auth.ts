import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { request } from '@/utils/http'

export interface User {
  id: string
  email: string | null
  nickname: string | null
  avatar_url: string | null
  role: 'USER' | 'ADMIN'
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(JSON.parse(localStorage.getItem('auth_user') || 'null'))
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const isNewRegistration = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string) {
    const res = await request.post<{ token: string; user: User }>('/api/auth/login', {
      email,
      password
    })

    if (res.success && res.data) {
      token.value = res.data.token
      user.value = res.data.user
      localStorage.setItem('auth_token', res.data.token)
      localStorage.setItem('auth_user', JSON.stringify(res.data.user))
      return true
    }
    throw new Error(res.message || 'Login failed')
  }

  async function loginWithProvider(provider: string, code: string) {
    const res = await request.post<{ token: string; user: User; isNewUser?: boolean }>(
      `/api/auth/${provider}/login`,
      {
        code
      }
    )

    if (res.success && res.data) {
      isNewRegistration.value = !!res.data.isNewUser
      token.value = res.data.token
      user.value = res.data.user
      localStorage.setItem('auth_token', res.data.token)
      localStorage.setItem('auth_user', JSON.stringify(res.data.user))
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
    if (!token.value) return

    const res = await request.get<User>('/api/auth/me')
    if (res.success && res.data) {
      user.value = res.data
      localStorage.setItem('auth_user', JSON.stringify(res.data))
    } else {
      logout()
    }
  }

  function logout() {
    user.value = null
    token.value = null
    isNewRegistration.value = false
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  return {
    user,
    token,
    isNewRegistration,
    isAuthenticated,
    login,
    loginWithProvider,
    register,
    fetchUser,
    logout
  }
})
