import { computed } from 'vue'
import { useWebsiteStore } from '@/stores/website'

/**
 * 网站统计数据组合式函数
 * 提供全站网站统计信息，如总数、常用数、近期新增等
 */
export function useWebsiteStats() {
  const websiteStore = useWebsiteStore()

  const totalSites = computed(() => websiteStore.websites.length)

  const favoriteTotal = computed(() => websiteStore.websites.filter(w => !!w.isFavorite).length)

  const recentAdded7d = computed(() => {
    const ts = Date.now() - 7 * 24 * 60 * 60 * 1000
    return websiteStore.websites.filter(w => w.createdAt.getTime() >= ts).length
  })

  const todayVisited = computed(() => {
    const d = new Date().toDateString()
    return websiteStore.websites.filter(w => w.lastVisited && w.lastVisited.toDateString() === d)
      .length
  })

  const tagUsageMap = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    websiteStore.websites.forEach(w =>
      w.tagIds.forEach(id => {
        map[id] = (map[id] || 0) + 1
      })
    )
    return map
  })

  const categoryCountMap = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    websiteStore.websites.forEach(w => {
      const id = w.categoryId
      if (id) map[id] = (map[id] || 0) + 1
    })
    return map
  })

  return {
    totalSites,
    favoriteTotal,
    recentAdded7d,
    todayVisited,
    tagUsageMap,
    categoryCountMap
  }
}
