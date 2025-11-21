import { createRouter, createWebHistory } from 'vue-router'

const getDefaultHomePath = (): string => {
  const stored = localStorage.getItem('userSettings')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      const home = parsed?.defaultHome as 'recent' | 'favorite' | 'all' | undefined
      if (home === 'recent') return '/my'
      if (home === 'favorite') return '/my'
      if (home === 'all') return '/all'
      return '/favorite'
    } catch {
      return '/favorite'
    }
  }
  return '/favorite'
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: () => getDefaultHomePath()
    },
    {
      path: '/my',
      name: 'my',
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
