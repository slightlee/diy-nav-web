import { computed, ref } from 'vue'
import type { Category, Tag, Website } from '@/types'
import { useWebsiteStore } from '@/stores/website'
import { useTagStore } from '@/stores/tag'
import { getIcon } from '@/api/icon'
import { generateId } from '@/utils/helpers'
import { getWorkspaceStorageKey } from '@/utils/user-data-storage'
import {
  AIRequestError,
  classifyBookmarkBatch,
  planBookmarkTaxonomy,
  type BookmarkTaxonomyItem
} from '@/api/ai'
import {
  buildBookmarkTaxonomyRequest,
  type ChromeBookmark,
  type ChromeBookmarkParseResult
} from '@/utils/chrome-bookmarks'

const TASK_VERSION = 1
// Keep each structured AI response small enough for slower providers to finish reliably.
const BATCH_SIZE = 15

export type BookmarkImportPhase =
  | 'review'
  | 'taxonomy'
  | 'classifying'
  | 'icons'
  | 'paused'
  | 'ready'
  | 'applying'
  | 'completed'

export interface BookmarkImportResult {
  description: string
  categoryId: string
  tagIds: string[]
  favicon?: string
  iconResolved?: boolean
}

export interface BookmarkImportFailure {
  message: string
  attempts: number
}

export interface BookmarkImportTask {
  version: number
  id: string
  fileName: string
  phase: BookmarkImportPhase
  createdAt: string
  updatedAt: string
  completedAt?: string
  bookmarks: ChromeBookmark[]
  duplicateCount: number
  invalidCount: number
  folderCount: number
  taxonomy: {
    categories: BookmarkTaxonomyItem[]
    tags: BookmarkTaxonomyItem[]
  } | null
  results: Record<string, BookmarkImportResult>
  failures: Record<string, BookmarkImportFailure>
  fatalError: string
  fatalCode?: string
}

export interface BookmarkImportTaskSummary {
  phase: BookmarkImportPhase
  total: number
  success: number
  failed: number
}

const taskStorageKey = () => getWorkspaceStorageKey('bookmarkImportTask')

const isTask = (value: unknown): value is BookmarkImportTask => {
  if (!value || typeof value !== 'object') return false
  const task = value as Partial<BookmarkImportTask>
  return (
    task.version === TASK_VERSION &&
    typeof task.id === 'string' &&
    typeof task.fileName === 'string' &&
    typeof task.phase === 'string' &&
    Array.isArray(task.bookmarks) &&
    !!task.results &&
    typeof task.results === 'object' &&
    !!task.failures &&
    typeof task.failures === 'object'
  )
}

const readPersistedTask = (): BookmarkImportTask | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(taskStorageKey()) || 'null')
    return isTask(parsed) ? parsed : null
  } catch {
    return null
  }
}

export const getBookmarkImportTaskSummary = (): BookmarkImportTaskSummary | null => {
  const task = readPersistedTask()
  if (!task) return null
  return {
    phase: task.phase,
    total: task.bookmarks.length,
    success: Object.keys(task.results).length,
    failed: Object.keys(task.failures).length
  }
}

export function useBookmarkImport() {
  const websiteStore = useWebsiteStore()
  const tagStore = useTagStore()
  const task = ref<BookmarkImportTask | null>(null)
  const running = ref(false)
  const currentBatchIds = ref<string[]>([])
  let controller: AbortController | null = null
  let pauseRequested = false

  const persist = () => {
    if (!task.value) return
    task.value.updatedAt = new Date().toISOString()
    try {
      localStorage.setItem(taskStorageKey(), JSON.stringify(task.value))
    } catch {
      throw new Error('导入任务过大，浏览器无法保存进度，请减少书签数量后重试')
    }
  }

  const loadTask = () => {
    const stored = readPersistedTask()
    if (!stored) {
      task.value = null
      return null
    }

    const needsIcons = Object.values(stored.results).some(result => !result.iconResolved)
    const resumeAtIcons =
      stored.phase === 'icons' ||
      stored.phase === 'applying' ||
      (stored.phase === 'ready' && needsIcons)
    if (
      ['taxonomy', 'classifying', 'icons', 'applying'].includes(stored.phase) ||
      (stored.phase === 'ready' && needsIcons)
    ) {
      stored.phase = 'paused'
      stored.fatalError = resumeAtIcons
        ? '网站分析已完成，可以继续获取图标'
        : '上次任务已中断，可以从当前进度继续'
      stored.updatedAt = new Date().toISOString()
      localStorage.setItem(taskStorageKey(), JSON.stringify(stored))
    }
    task.value = stored
    return stored
  }

  const startTask = (fileName: string, parsed: ChromeBookmarkParseResult) => {
    controller?.abort()
    pauseRequested = false
    task.value = {
      version: TASK_VERSION,
      id: generateId(),
      fileName,
      phase: 'review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bookmarks: parsed.bookmarks,
      duplicateCount: parsed.duplicateCount,
      invalidCount: parsed.invalidCount,
      folderCount: parsed.folderCount,
      taxonomy: null,
      results: {},
      failures: {},
      fatalError: ''
    }
    persist()
  }

  const setPaused = (message = '') => {
    if (!task.value || task.value.phase === 'completed') return
    task.value.phase = 'paused'
    if (message) task.value.fatalError = message
    persist()
  }

  const pause = () => {
    if (!task.value || !running.value) return
    pauseRequested = true
    controller?.abort()
    setPaused('任务已暂停，已完成的结果会保留')
  }

  const createTaxonomy = async (signal: AbortSignal) => {
    if (!task.value || task.value.taxonomy) return
    task.value.phase = 'taxonomy'
    task.value.fatalError = ''
    task.value.fatalCode = undefined
    persist()

    const plan = await planBookmarkTaxonomy(
      buildBookmarkTaxonomyRequest(task.value.bookmarks),
      signal
    )
    task.value.taxonomy = {
      categories: plan.categories.slice(0, 30).map(name => ({ id: generateId(), name })),
      tags: plan.tags.slice(0, 50).map(name => ({ id: generateId(), name }))
    }
    persist()
  }

  const pendingBookmarks = () => {
    if (!task.value) return []
    return task.value.bookmarks.filter(
      bookmark =>
        !task.value?.results[bookmark.sourceId] && !task.value?.failures[bookmark.sourceId]
    )
  }

  const fetchPendingIcons = async (signal: AbortSignal) => {
    if (!task.value) return
    task.value.phase = 'icons'
    task.value.fatalError = ''
    persist()

    const pending = task.value.bookmarks.filter(bookmark => {
      const result = task.value?.results[bookmark.sourceId]
      return result && !result.iconResolved
    })
    let cursor = 0
    const worker = async () => {
      while (!pauseRequested && !signal.aborted) {
        const bookmark = pending[cursor++]
        if (!bookmark) return
        currentBatchIds.value = [...currentBatchIds.value, bookmark.sourceId]
        const result = task.value?.results[bookmark.sourceId]
        try {
          const response = await getIcon({ url: bookmark.url }, { signal })
          if (pauseRequested || signal.aborted || !result) return
          result.favicon = response.success ? response.data?.url : undefined
          result.iconResolved = true
        } catch {
          if (pauseRequested || signal.aborted || !result) return
          result.iconResolved = true
        } finally {
          currentBatchIds.value = currentBatchIds.value.filter(id => id !== bookmark.sourceId)
          if (!pauseRequested && !signal.aborted) persist()
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(4, pending.length) }, () => worker()))
  }

  const run = async () => {
    if (!task.value || running.value || task.value.phase === 'completed') return
    running.value = true
    pauseRequested = false
    controller = new AbortController()

    try {
      await createTaxonomy(controller.signal)
      if (!task.value?.taxonomy || pauseRequested) return

      task.value.phase = 'classifying'
      task.value.fatalError = ''
      task.value.fatalCode = undefined
      persist()

      while (!pauseRequested) {
        const batch = pendingBookmarks().slice(0, BATCH_SIZE)
        if (batch.length === 0) break
        currentBatchIds.value = batch.map(bookmark => bookmark.sourceId)

        const response = await classifyBookmarkBatch(
          {
            taxonomy: task.value.taxonomy,
            bookmarks: batch.map(({ sourceId, name, url, folderPath }) => ({
              sourceId,
              name,
              url,
              folderPath
            }))
          },
          controller.signal
        )
        if (pauseRequested) return

        for (const item of response.items) {
          task.value.results[item.sourceId] = {
            description: item.description,
            categoryId: item.categoryId,
            tagIds: item.tagIds.slice(0, 3)
          }
          delete task.value.failures[item.sourceId]
        }
        for (const error of response.errors) {
          const previous = task.value.failures[error.sourceId]
          task.value.failures[error.sourceId] = {
            message: error.message,
            attempts: (previous?.attempts || 0) + 1
          }
        }
        persist()
      }

      if (pauseRequested) return
      await fetchPendingIcons(controller.signal)
      if (pauseRequested || controller.signal.aborted) return

      if (!pauseRequested && task.value) {
        task.value.phase = 'ready'
        task.value.fatalError = ''
        currentBatchIds.value = []
        persist()
      }
    } catch (error) {
      if (!task.value || pauseRequested || controller.signal.aborted) return
      task.value.phase = 'paused'
      task.value.fatalError = error instanceof Error ? error.message : '书签分析中断，请重试'
      task.value.fatalCode = error instanceof AIRequestError ? error.code : undefined
      persist()
    } finally {
      running.value = false
      currentBatchIds.value = []
      controller = null
    }
  }

  const retryFailures = async () => {
    if (!task.value || running.value) return
    task.value.failures = {}
    persist()
    await run()
  }

  const applyImport = () => {
    if (!task.value || task.value.phase !== 'ready' || running.value || !task.value.taxonomy) return
    const imported = task.value.bookmarks.filter(bookmark => task.value?.results[bookmark.sourceId])
    if (imported.length === 0) throw new Error('没有可导入的成功结果')

    task.value.phase = 'applying'
    persist()
    const now = new Date()
    const categoryUsage = new Map<string, number>()
    const tagUsage = new Map<string, number>()

    const websites: Website[] = imported.map((bookmark, order) => {
      const result = task.value?.results[bookmark.sourceId]
      if (!result) throw new Error('导入结果不完整')
      categoryUsage.set(result.categoryId, (categoryUsage.get(result.categoryId) || 0) + 1)
      result.tagIds.forEach(tagId => tagUsage.set(tagId, (tagUsage.get(tagId) || 0) + 1))
      const createdAt = bookmark.addedAt ? new Date(bookmark.addedAt) : now

      return {
        id: generateId(),
        name: bookmark.name,
        url: bookmark.url,
        description: result.description,
        categoryId: result.categoryId,
        tagIds: result.tagIds.slice(0, 3),
        favicon: result.favicon,
        visitCount: 0,
        isOnline: true,
        isFavorite: false,
        createdAt,
        updatedAt: now,
        order
      }
    })
    const categories: Category[] = task.value.taxonomy.categories.map((category, order) => ({
      ...category,
      order,
      websiteCount: categoryUsage.get(category.id) || 0,
      createdAt: now,
      updatedAt: now
    }))
    const colors = tagStore.tagColors
    const tags: Tag[] = task.value.taxonomy.tags.map((tag, order) => ({
      ...tag,
      color: colors[order % colors.length] || '#3B82F6',
      order,
      usageCount: tagUsage.get(tag.id) || 0,
      createdAt: now,
      updatedAt: now
    }))

    websiteStore.importData({ data: { websites, categories, tags } })
    task.value.phase = 'completed'
    task.value.completedAt = new Date().toISOString()
    task.value.fatalError = ''
    persist()
  }

  const discardTask = () => {
    controller?.abort()
    running.value = false
    currentBatchIds.value = []
    task.value = null
    localStorage.removeItem(taskStorageKey())
  }

  const successCount = computed(() => Object.keys(task.value?.results || {}).length)
  const failedCount = computed(() => Object.keys(task.value?.failures || {}).length)
  const totalCount = computed(() => task.value?.bookmarks.length || 0)
  const inProgressCount = computed(() => currentBatchIds.value.length)
  const iconProcessedCount = computed(
    () => Object.values(task.value?.results || {}).filter(result => result.iconResolved).length
  )
  const iconSuccessCount = computed(
    () =>
      Object.values(task.value?.results || {}).filter(
        result => result.iconResolved && result.favicon
      ).length
  )
  const iconRemainingCount = computed(() =>
    Math.max(0, successCount.value - iconProcessedCount.value - inProgressCount.value)
  )
  const iconPercent = computed(() =>
    successCount.value ? Math.round((iconProcessedCount.value / successCount.value) * 100) : 100
  )
  const remainingCount = computed(() =>
    Math.max(0, totalCount.value - successCount.value - failedCount.value - inProgressCount.value)
  )
  const percent = computed(() =>
    totalCount.value
      ? Math.round(((successCount.value + failedCount.value) / totalCount.value) * 100)
      : 0
  )
  const currentBatch = computed(() => {
    const ids = new Set(currentBatchIds.value)
    return task.value?.bookmarks.filter(bookmark => ids.has(bookmark.sourceId)) || []
  })
  const failedBookmarks = computed(() =>
    (task.value?.bookmarks || [])
      .filter(bookmark => task.value?.failures[bookmark.sourceId])
      .map(bookmark => ({ ...bookmark, failure: task.value?.failures[bookmark.sourceId] }))
  )

  return {
    task,
    running,
    successCount,
    failedCount,
    totalCount,
    inProgressCount,
    iconProcessedCount,
    iconSuccessCount,
    iconRemainingCount,
    iconPercent,
    remainingCount,
    percent,
    currentBatch,
    failedBookmarks,
    loadTask,
    startTask,
    run,
    pause,
    retryFailures,
    applyImport,
    discardTask
  }
}
