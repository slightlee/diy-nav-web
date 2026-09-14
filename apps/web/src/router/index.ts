import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    fixedView?: string
    requiresAdmin?: boolean
  }
}

const getDefaultHomePath = (): string => {
  const stored = localStorage.getItem('userSettings')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      const home = parsed?.defaultHome as 'home' | 'all' | 'recent' | 'favorite' | undefined
      if (home === 'home' || home === 'recent' || home === 'favorite') return '/home'
      if (home === 'all') return '/all'
      return '/home'
    } catch {
      return '/home'
    }
  }
  return '/home'
}

const useHash = import.meta.env.VITE_USE_HASH_ROUTER === 'true'
const router = createRouter({
  history: useHash
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: () => getDefaultHomePath()
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/views/DashboardView.vue')
    },
    {
      path: '/recent',
      name: 'recent',
      component: () => import('@/views/WebsiteListView.vue'),
      meta: { fixedView: 'recent' }
    },
    {
      path: '/favorite',
      name: 'favorite',
      component: () => import('@/views/WebsiteListView.vue'),
      meta: { fixedView: 'favorite' }
    },
    {
      path: '/all',
      name: 'all',
      component: () => import('@/views/WebsiteListView.vue'),
      meta: { fixedView: 'all' }
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@/views/AdminView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/admin/configuration',
      redirect: '/admin/config/oauth'
    },
    {
      path: '/admin/config/site',
      name: 'admin-config-site',
      component: () => import('@/views/AdminView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/admin/config/oauth',
      name: 'admin-config-oauth',
      component: () => import('@/views/AdminView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/admin/config/storage',
      name: 'admin-config-storage',
      component: () => import('@/views/AdminView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/admin/audit-logs',
      name: 'admin-audit-logs',
      component: () => import('@/views/AdminView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/oauth2/callback',
      alias: '/oauth/callback',
      name: 'oauth2-callback',
      component: () => import('@/views/OAuthCallback.vue')
    },
    {
      path: '/email-binding/verify',
      name: 'email-binding-verify',
      component: () => import('@/views/EmailBindingView.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/AuthView.vue')
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/AuthView.vue')
    }
  ]
})

/**
 * Admin route guard — blocks navigation before the component loads.
 *
 * Security model:
 *   1. If the server session has NOT been verified yet (`hasCheckedSession` is
 *      false), we call `fetchUser()` which validates the httpOnly cookie against
 *      the server and writes the real role into the store.  This closes the
 *      timing window between app mount and session verification where a tampered
 *      localStorage `auth_user` could grant visual access to admin pages.
 *   2. After verification, only users whose server-confirmed role is ADMIN may
 *      proceed. Everyone else is redirected to /home.
 *   3. The backend `requireAdmin` middleware remains the authoritative check on
 *      every API call; this guard is a defense-in-depth measure on the UI side.
 */
router.beforeEach(async to => {
  if (!to.meta.requiresAdmin) return true

  const authStore = useAuthStore()

  if (!authStore.hasCheckedSession) {
    try {
      await authStore.fetchUser()
    } catch {
      // fetchUser clears auth state on failure — will fall through to redirect
    }
  }

  if (authStore.user?.role !== 'ADMIN') return '/home'

  return true
})

export default router
