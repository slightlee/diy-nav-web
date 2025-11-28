import { ref, unref, type Ref } from 'vue'
import { useWebsiteStore } from '@/stores/website'

type FixedViewType = 'recent' | 'favorite' | 'all' | undefined
type MaybeRef<T> = T | Ref<T> | (() => T)

function resolveValue<T>(val: MaybeRef<T>): T {
  if (typeof val === 'function') return (val as () => T)()
  return unref(val)
}

/**
 * 网站拖拽排序逻辑组合式函数
 * 处理拖拽开始、经过、放置等事件，并更新 Store 中的排序
 *
 * @param fixedViewSource - 视图类型 (recent | favorite | all | undefined)
 */
export function useWebsiteDrag(fixedViewSource: MaybeRef<FixedViewType>) {
  const websiteStore = useWebsiteStore()

  const draggingId = ref<string | null>(null)
  const dragOverId = ref<string | null>(null)

  const onDragStart = (id: string, e: DragEvent) => {
    draggingId.value = id
    e.dataTransfer?.setData('text/plain', id)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
    const target = e.target as HTMLElement | null
    const card = target?.closest('.website-draggable') as HTMLElement | null
    if (card && e.dataTransfer) {
      const rect = card.getBoundingClientRect()
      e.dataTransfer.setDragImage(card, rect.width / 2, rect.height / 2)
    }
  }

  const onDragOver = (targetId: string, e: DragEvent) => {
    if (!draggingId.value || draggingId.value === targetId) return
    e.preventDefault()
    dragOverId.value = targetId
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (targetId: string, e: DragEvent) => {
    e.preventDefault()
    const sourceId = draggingId.value
    draggingId.value = null
    dragOverId.value = null
    if (!sourceId || sourceId === targetId) return

    const fixedView = resolveValue(fixedViewSource)
    const inFavoriteView = fixedView === 'favorite'
    if (inFavoriteView) websiteStore.moveFavoriteBefore(sourceId, targetId)
    else websiteStore.moveWebsiteBefore(sourceId, targetId)
  }

  const onDragEnd = () => {
    draggingId.value = null
    dragOverId.value = null
  }

  return {
    draggingId,
    dragOverId,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd
  }
}
