import { ref, computed, watch, unref, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { useWebsiteStore } from '@/stores/website'
import { useTagStore } from '@/stores/tag'
import { useCategoryStore } from '@/stores/category'
import type { Website, Tag } from '@/types'

type FixedViewType = 'recent' | 'favorite' | 'all' | undefined
type MaybeRef<T> = T | Ref<T> | (() => T)

function resolveValue<T>(val: MaybeRef<T>): T {
  if (typeof val === 'function') return (val as () => T)()
  return unref(val)
}

/**
 * 网站搜索与过滤逻辑组合式函数
 * 处理搜索关键词、分类筛选、标签筛选以及与路由的同步
 *
 * @param fixedViewSource - 视图类型 (recent | favorite | all | undefined)
 */
export function useWebsiteSearch(fixedViewSource: MaybeRef<FixedViewType>) {
  const websiteStore = useWebsiteStore()
  const categoryStore = useCategoryStore()
  const tagStore = useTagStore()
  const route = useRoute()

  const searchKeyword = ref('')
  const selectedTags = ref<string[]>([])
  const selectedCategory = ref('all')

  const fixedView = computed(() => resolveValue(fixedViewSource))

  const showFilters = computed(() => !fixedView.value || fixedView.value === 'all')
  const tags = computed(() => tagStore.tags)
  const categories = computed(() => [...categoryStore.categories].sort((a, b) => a.order - b.order))

  // Scope determination
  const recentLimit = 12
  const favoriteLimit = 12

  /**
   * 根据视图类型获取基础网站列表
   */
  const baseViewWebsites = computed(() => {
    const view = fixedView.value
    if (view === 'recent') {
      return websiteStore.websites
        .filter(w => !!w.lastVisited)
        .sort((a, b) => (b.lastVisited?.getTime() ?? 0) - (a.lastVisited?.getTime() ?? 0))
        .slice(0, recentLimit)
    }
    if (view === 'favorite') {
      return websiteStore.websites
        .filter(w => !!w.isFavorite)
        .sort(
          (a, b) =>
            (a.favoriteOrder ?? a.order ?? 0) - (b.favoriteOrder ?? b.order ?? 0) ||
            (b.visitCount ?? 0) - (a.visitCount ?? 0)
        )
        .slice(0, favoriteLimit)
    }
    return websiteStore.websites
  })

  /**
   * 过滤后的网站列表 (非搜索状态)
   */
  const filteredWebsites = computed(() => {
    const scope = baseViewWebsites.value
    const ids = new Set(scope.map(w => w.id))
    return websiteStore.filteredWebsites.filter(w => ids.has(w.id))
  })

  /**
   * 搜索结果列表 (搜索状态)
   */
  const searchResults = computed(() => {
    if (!searchKeyword.value.trim()) return [] as Website[]
    const keyword = searchKeyword.value.toLowerCase()
    const scope = fixedView.value ? baseViewWebsites.value : websiteStore.websites

    return scope.filter(
      website =>
        website.name.toLowerCase().includes(keyword) ||
        website.url.toLowerCase().includes(keyword) ||
        website.description?.toLowerCase().includes(keyword) ||
        getWebsiteTags(website.tagIds).some(tag => tag.name.toLowerCase().includes(keyword))
    )
  })

  const getWebsiteTags = (tagIds: string[]) => {
    return tagIds.map(id => tagStore.getTagById(id)).filter((tag): tag is Tag => !!tag)
  }

  // Actions
  const toggleTag = (tagId: string) => {
    const index = selectedTags.value.indexOf(tagId)
    if (index > -1) selectedTags.value.splice(index, 1)
    else selectedTags.value.push(tagId)
  }

  const selectCategory = (categoryId: string) => {
    selectedCategory.value = categoryId
  }

  const clearSearch = () => {
    searchKeyword.value = ''
  }

  const clearSelectedTags = () => {
    selectedTags.value = []
  }

  // Sync with Store
  watch(
    searchKeyword,
    kw => {
      websiteStore.setSearchFilters({ keyword: kw.trim() })
    },
    { immediate: true }
  )

  watch(
    selectedCategory,
    id => {
      websiteStore.setSearchFilters({ categoryIds: id === 'all' ? [] : [id] })
    },
    { immediate: true }
  )

  watch(
    selectedTags,
    list => {
      websiteStore.setSearchFilters({ tagIds: list })
    },
    { immediate: true }
  )

  /**
   * 从路由参数同步过滤状态
   */
  const syncFiltersFromRoute = () => {
    const q = route.query
    const tagQ = q.tag
    const catQ = q.category

    // Sync Tags
    if (typeof tagQ === 'string' && tagQ) {
      selectedTags.value = [tagQ]
    } else if (Array.isArray(tagQ)) {
      selectedTags.value = (tagQ as (string | null)[]).filter(
        (x): x is string => typeof x === 'string' && !!x
      )
    } else {
      // Clear if not present in query (for exact sync)
      // Only clear if we are in 'all' view or main view where routing matters
      if (!fixedView.value || fixedView.value === 'all') {
        selectedTags.value = []
      }
    }

    // Sync Category
    if (typeof catQ === 'string' && catQ) {
      selectedCategory.value = catQ
    } else {
      if (!fixedView.value || fixedView.value === 'all') {
        selectedCategory.value = 'all'
      }
    }
  }

  // Watch route query
  watch(
    () => route.query,
    () => {
      syncFiltersFromRoute()
    },
    { immediate: true }
  )

  // Watch fixedView changes to re-sync with route (handles navigation between views)
  watch(fixedView, () => {
    syncFiltersFromRoute()
  })

  return {
    searchKeyword,
    selectedTags,
    selectedCategory,
    showFilters,
    tags,
    categories,
    filteredWebsites,
    searchResults,
    toggleTag,
    selectCategory,
    clearSearch,
    clearSelectedTags
  }
}
