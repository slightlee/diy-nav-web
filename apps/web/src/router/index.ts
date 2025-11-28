import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'

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
    }
  ]
})

export default router
