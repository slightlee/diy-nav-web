import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { request } from '@/utils/http'

export interface User {
  id: string
  email: string
  nickname: string | null
  avatar_url: string | null
  role: 'USER' | 'ADMIN'
}

interface AuthState {
  user: User | null
  token: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('auth_token'))

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
      return true
    }
    throw new Error(res.message || 'Login failed')
  }

  async function register(email: string, password: string) {
    const res = await request.post<{ id: string; email: string }>('/api/auth/register', {
      email,
      password
    })

    if (res.success) {
      return true
    }
    throw new Error(res.message || 'Registration failed')
  }

  async function fetchUser() {
    if (!token.value) return

    const res = await request.get<User>('/api/auth/me')
    if (res.success && res.data) {
      user.value = res.data
    } else {
      logout()
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('auth_token')
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    fetchUser,
    logout
  }
})
