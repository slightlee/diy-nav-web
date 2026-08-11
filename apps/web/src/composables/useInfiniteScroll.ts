/**
 * 无限滚动 Composable
 * 滚动到底部时自动加载更多数据
 */

import { ref, computed, onMounted, onUnmounted, watch, type Ref } from 'vue'

interface InfiniteScrollOptions {
  /** 每次加载数量 */
  pageSize?: number
  /** 初始加载数量 */
  initialSize?: number
  /** 触发加载的距离（距离底部多少像素时触发） */
  threshold?: number
  /** 用于定位滚动容器的锚点元素 */
  anchor?: Ref<HTMLElement | null>
}

export function useInfiniteScroll<T>(items: Ref<T[]>, options: InfiniteScrollOptions = {}) {
  const { pageSize = 30, initialSize = 30, threshold = 200, anchor } = options

  const loadedCount = ref(initialSize)
  const isLoading = ref(false)

  // 当前显示的数据
  const visibleItems = computed(() => {
    return items.value.slice(0, loadedCount.value)
  })

  // 是否还有更多数据
  const hasMore = computed(() => {
    return loadedCount.value < items.value.length
  })

  // 加载进度
  const progress = computed(() => {
    if (items.value.length === 0) return 100
    return Math.round((loadedCount.value / items.value.length) * 100)
  })

  // 加载更多
  const loadMore = () => {
    if (isLoading.value || !hasMore.value) return

    isLoading.value = true

    // 使用 requestAnimationFrame 避免阻塞
    requestAnimationFrame(() => {
      loadedCount.value = Math.min(loadedCount.value + pageSize, items.value.length)
      isLoading.value = false
    })
  }

  // 重置（数据源变化时调用）
  const reset = () => {
    loadedCount.value = initialSize
  }

  let scrollTarget: HTMLElement | Window | null = null

  const resolveScrollTarget = () => {
    let element = anchor?.value?.parentElement ?? null
    while (element) {
      const overflowY = window.getComputedStyle(element).overflowY
      if (/(auto|scroll|overlay)/.test(overflowY)) return element
      element = element.parentElement
    }
    return window
  }

  // 滚动事件处理。AppLayout 使用内部 .main-content 滚动，不能只读取 window。
  const handleScroll = () => {
    if (!hasMore.value || isLoading.value) return

    const target = scrollTarget ?? window
    const { scrollTop, scrollHeight, clientHeight } =
      target instanceof HTMLElement
        ? target
        : {
            scrollTop: window.scrollY || document.documentElement.scrollTop,
            scrollHeight: document.documentElement.scrollHeight,
            clientHeight: window.innerHeight
          }

    // 距离底部小于 threshold 时加载更多
    if (scrollHeight - scrollTop - clientHeight < threshold) {
      loadMore()
    }
  }

  // 节流处理
  let ticking = false
  const throttledScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        handleScroll()
        ticking = false
      })
      ticking = true
    }
  }

  // 生命周期
  onMounted(() => {
    scrollTarget = resolveScrollTarget()
    scrollTarget.addEventListener('scroll', throttledScroll, { passive: true })
    requestAnimationFrame(handleScroll)
  })

  onUnmounted(() => {
    scrollTarget?.removeEventListener('scroll', throttledScroll)
  })

  // 首批内容不足以撑满容器时，继续补载直到出现可滚动空间或数据耗尽。
  watch(
    () => visibleItems.value.length,
    () => requestAnimationFrame(handleScroll)
  )

  return {
    // 状态
    visibleItems,
    hasMore,
    isLoading,
    progress,
    loadedCount,
    totalCount: computed(() => items.value.length),

    // 方法
    loadMore,
    reset
  }
}
