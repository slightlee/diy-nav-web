import { createRouter, createWebHistory } from 'vue-router'

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

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: () => getDefaultHomePath()
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/views/Home.vue'),
      meta: { multiView: ['recent', 'favorite'] }
    },
    {
      path: '/recent',
      name: 'recent',
      component: () => import('@/views/Home.vue'),
      meta: { fixedView: 'recent' }
    },
    {
      path: '/favorite',
      name: 'favorite',
      component: () => import('@/views/Home.vue'),
      meta: { fixedView: 'favorite' }
    },
    {
      path: '/all',
      name: 'all',
      component: () => import('@/views/Home.vue'),
      meta: { fixedView: 'all' }
    }
  ]
})

export default router
