<template>
  <div class="manage-tags-modal">
    <!-- 添加新标签表单 -->
    <div class="manage-tags-modal__add-section">
      <h3 class="manage-tags-modal__section-title">
        <i class="fas fa-tag" />
        添加新标签
      </h3>
      <form class="manage-tags-modal__add-form" @submit.prevent="handleAddTag">
        <div class="manage-tags-modal__form-row">
          <BaseInput
            ref="tagNameInputRef"
            v-model="newTag.name"
            placeholder="标签名称"
            required
            :maxlength="15"
          />
          <div class="manage-tags-modal__color-picker">
            <label class="manage-tags-modal__color-label">颜色</label>
            <div class="manage-tags-modal__color-list">
              <button
                v-for="color in tagColors"
                :key="color"
                type="button"
                class="manage-tags-modal__color-btn"
                :class="[{
                  'manage-tags-modal__color-btn--selected': newTag.color === color
                }]"
                :style="{ backgroundColor: color }"
                @click="selectColor(color)"
              >
                <i v-if="newTag.color === color" class="fas fa-check" />
              </button>
            </div>
          </div>
        </div>
        <BaseButton
          html-type="submit"
          variant="primary"
          :loading="adding"
          :disabled="!newTag.name.trim() || !newTag.color"
        >
          <i class="fas fa-plus" />
          添加
        </BaseButton>
      </form>
    </div>

    <!-- 标签列表 -->
    <div class="manage-tags-modal__list-section">
      <h3 class="manage-tags-modal__section-title">
        <i class="fas fa-list" />
        现有标签
        <span class="manage-tags-modal__count">({{ tags.length }})</span>
      </h3>

      <!-- 空状态 -->
      <EmptyState
        v-if="tags.length === 0"
        type="no-tags"
        :show-action-button="false"
      />

      <!-- 标签列表 -->
      <div v-else class="manage-tags-modal__tag-list">
        <TransitionGroup name="tag-item" tag="div">
          <div
            v-for="tag in sortedTags"
            :key="tag.id"
            class="manage-tags-modal__tag-item"
            :class="{ 'manage-tags-modal__tag-item--editing': editingId === tag.id }"
            :draggable="editingId !== tag.id"
            @dragstart="onDragStart(tag.id)"
            @dragover.prevent
            @drop="onDrop(tag.id)"
          >
            <!-- 查看模式 -->
            <div v-if="editingId !== tag.id" class="manage-tags-modal__tag-view">
              <div class="manage-tags-modal__tag-drag-handle" title="拖拽排序">
                <i class="fas fa-grip-vertical" />
              </div>

              <div class="manage-tags-modal__tag-icon">
                <div
                  class="manage-tags-modal__tag-color"
                  :style="{ backgroundColor: tag.color }"
                />
              </div>

              <div class="manage-tags-modal__tag-info">
                <h4 class="manage-tags-modal__tag-name">
                  {{ tag.name }}
                </h4>
                <div class="manage-tags-modal__tag-stats">
                  <span class="manage-tags-modal__usage-count">
                    <i class="fas fa-tag" />
                    {{ getWebsiteCount(tag.id) }} 个网站
                  </span>
                  <span class="manage-tags-modal__created-time">
                    创建于 {{ formatDate(tag.createdAt) }}
                  </span>
                </div>
              </div>

              <div class="manage-tags-modal__tag-actions">
                <BaseButton
                  variant="ghost"
                  size="sm"
                  title="编辑标签"
                  @click="startEdit(tag)"
                >
                  <i class="fas fa-edit" />
                </BaseButton>
                <BaseButton
                  variant="ghost"
                  size="sm"
                  title="删除标签"
                  class="manage-tags-modal__delete-btn"
                  @click="handleDeleteTag(tag)"
                >
                  <i class="fas fa-trash" />
                </BaseButton>
              </div>
            </div>

            <!-- 编辑模式 -->
            <form
              v-else
              class="manage-tags-modal__tag-edit"
              @submit.prevent="handleUpdateTag"
            >
              <div class="manage-tags-modal__edit-color">
                <label class="manage-tags-modal__color-label">颜色</label>
                <div class="manage-tags-modal__color-list">
                  <button
                    v-for="color in tagColors"
                    :key="color"
                    type="button"
                    class="manage-tags-modal__color-btn"
                    :class="[{
                      'manage-tags-modal__color-btn--selected': editingTag.color === color
                    }]"
                    :style="{ backgroundColor: color }"
                    @click="selectEditColor(color)"
                  >
                    <i v-if="editingTag.color === color" class="fas fa-check" />
                  </button>
                </div>
              </div>
              <BaseInput
                ref="editNameInputRef"
                v-model="editingTag.name"
                placeholder="标签名称"
                required
                :maxlength="15"
              />
              <div class="manage-tags-modal__edit-actions">
                <BaseButton
                  html-type="submit"
                  variant="primary"
                  size="sm"
                  :loading="updating"
                  :disabled="!editingTag.name.trim() || !editingTag.color"
                >
                  <i class="fas fa-save" />
                  保存
                </BaseButton>
                <BaseButton
                  variant="ghost"
                  size="sm"
                  @click="cancelEdit"
                >
                  <i class="fas fa-times" />
                  取消
                </BaseButton>
              </div>
            </form>
          </div>
        </TransitionGroup>
      </div>
    </div>
    <BaseModal
      v-if="deleteConfirmOpen"
      :is-open="deleteConfirmOpen"
      title="删除标签"
      @close="closeDeleteConfirm"
    >
      <div class="manage-tags-modal__confirm-content">
        <p>确定要删除该标签吗？此操作不可恢复。</p>
      </div>
      <template #footer>
        <div class="manage-tags-modal__confirm-actions">
          <BaseButton variant="secondary" @click="closeDeleteConfirm">
            取消
          </BaseButton>
          <BaseButton variant="danger" :loading="deleting" @click="confirmDeleteTag">
            <i class="fas fa-trash" />
            删除
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useTagStore } from '@/stores/tag'
import { useWebsiteStore } from '@/stores/website'
import { useUIStore } from '@/stores/ui'
import BaseInput from '../base/BaseInput.vue'
import BaseButton from '../base/BaseButton.vue'
import EmptyState from '../EmptyState.vue'
import BaseModal from '../base/BaseModal.vue'
import type { Tag } from '@/types'

interface Emits {
  (e: 'close'): void
}

const emit = defineEmits<Emits>()

// Store
const tagStore = useTagStore()
const websiteStore = useWebsiteStore()
const uiStore = useUIStore()

// 组件引用
const tagNameInputRef = ref()
const editNameInputRef = ref()

// 表单数据
const newTag = ref({
  name: '',
  color: ''
})

// 编辑状态
const editingId = ref<string | null>(null)
const editingTag = ref({
  name: '',
  color: ''
})

// 加载状态
const adding = ref(false)
const updating = ref(false)

// 计算属性
const tags = computed(() => tagStore.tags)

const sortedTags = computed(() => {
  return [...tags.value].sort((a, b) => a.order - b.order)
})

const tagColors = computed(() => tagStore.tagColors)

const draggingId = ref<string | null>(null)
const onDragStart = (id: string) => {
  draggingId.value = id
}
const onDrop = (targetId: string) => {
  if (!draggingId.value || draggingId.value === targetId) {
    draggingId.value = null
    return
  }
  const orderIds = sortedTags.value.map(t => t.id)
  const from = orderIds.indexOf(draggingId.value)
  const to = orderIds.indexOf(targetId)
  if (from === -1 || to === -1) {
    draggingId.value = null
    return
  }
  orderIds.splice(from, 1)
  orderIds.splice(to, 0, draggingId.value)

  const newOrder = orderIds
    .map(id => tags.value.find(t => t.id === id))
    .filter((t): t is Tag => !!t)

  tagStore.reorderTags(newOrder)
  draggingId.value = null
}

// 获取标签下的网站数量
const getWebsiteCount = (tagId: string): number => {
  return websiteStore.websites.filter(w => w.tagIds.includes(tagId)).length
}

// 格式化日期
const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 处理添加标签
const handleAddTag = () => {
  if (!newTag.value.name.trim() || !newTag.value.color || adding.value) {
    return
  }

  adding.value = true

  try {
    tagStore.addTag({
      name: newTag.value.name.trim(),
      color: newTag.value.color,
      order: tags.value.length,
      usageCount: 0
    })

    uiStore.showToast('标签添加成功', 'success')

    // 重置表单
    newTag.value = { name: '', color: '' }

    // 聚焦到输入框
    nextTick()
    tagNameInputRef.value?.focus()
  } catch (error) {
    console.error('添加标签失败:', error)
    uiStore.showToast('添加失败，请重试', 'error')
  } finally {
    adding.value = false
  }
}

// 选择颜色
const selectColor = (color: string) => {
  newTag.value.color = color
}

// 选择编辑颜色
const selectEditColor = (color: string) => {
  editingTag.value.color = color
}

// 开始编辑
const startEdit = (tag: Tag) => {
  editingId.value = tag.id
  editingTag.value = {
    name: tag.name,
    color: tag.color
  }

  nextTick()
  editNameInputRef.value?.focus()
}

// 处理更新标签
const handleUpdateTag = () => {
  if (!editingId.value || !editingTag.value.name.trim() || !editingTag.value.color || updating.value) {
    return
  }

  updating.value = true

  try {
    tagStore.updateTag(editingId.value, {
      name: editingTag.value.name.trim(),
      color: editingTag.value.color
    })

    uiStore.showToast('标签更新成功', 'success')
    cancelEdit()
  } catch (error) {
    console.error('更新标签失败:', error)
    uiStore.showToast('更新失败，请重试', 'error')
  } finally {
    updating.value = false
  }
}

// 取消编辑
const cancelEdit = () => {
  editingId.value = null
  editingTag.value = { name: '', color: '' }
}

// 处理删除标签
const handleDeleteTag = (tag: Tag) => {
  const websiteCount = getWebsiteCount(tag.id)

  if (websiteCount > 0) {
    uiStore.showToast(
      `该标签下还有 ${websiteCount} 个网站，请先移除或删除这些网站`,
      'warning'
    )
    return
  }

  deleteTargetId.value = tag.id
  deleteConfirmOpen.value = true
}

// 处理关闭
const handleClose = () => {
  emit('close')
}

// 键盘快捷键
const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl/Cmd + N 聚焦到添加输入框
  if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
    event.preventDefault()
    tagNameInputRef.value?.focus()
  }

  // ESC 关闭模态框
  if (event.key === 'Escape') {
    if (editingId.value) {
      cancelEdit()
    } else {
      handleClose()
    }
  }
}

// 生命周期
onMounted(() => {
  // 聚焦到添加输入框
  tagNameInputRef.value?.focus()

  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

const deleteConfirmOpen = ref(false)
const deleteTargetId = ref<string>('')
const deleting = ref(false)

const closeDeleteConfirm = () => {
  deleteConfirmOpen.value = false
  deleteTargetId.value = ''
}

const confirmDeleteTag = () => {
  if (!deleteTargetId.value || deleting.value) return
  deleting.value = true
  try {
    tagStore.deleteTag(deleteTargetId.value)
    uiStore.showToast('标签删除成功', 'success')
    closeDeleteConfirm()
  } catch (error) {
    uiStore.showToast('删除失败，请重试', 'error')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.manage-tags-modal {
  width: 100%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

// 区域标题
.manage-tags-modal__section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-md) 0;
}

.manage-tags-modal__count {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-500);
  font-weight: var(--font-weight-normal);
}

// 添加区域
.manage-tags-modal__add-section {
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.manage-tags-modal__add-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.manage-tags-modal__form-row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;

  > .base-input {
    flex: 1;
    min-width: 0;
  }
}

// 颜色选择器
.manage-tags-modal__color-picker {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
}

.manage-tags-modal__color-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
}

.manage-tags-modal__color-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.manage-tags-modal__color-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: 2px solid var(--color-border);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;

  &:hover {
    transform: scale(1.1);
    border-color: var(--color-neutral-300);
  }

  &--selected {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
  }
}

// 标签列表区域
.manage-tags-modal__list-section {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-bottom: var(--spacing-lg);
}

.manage-tags-modal__tag-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

// 标签项
.manage-tags-modal__tag-item {
  background-color: var(--color-neutral-100);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all var(--transition-fast);

  &--editing {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.12);
  }
}

// 查看模式
.manage-tags-modal__tag-view {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
}

.manage-tags-modal__tag-drag-handle {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-400);
  cursor: move;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);

  &:hover {
    color: var(--color-neutral-600);
    background-color: var(--color-neutral-100);
  }
}

.manage-tags-modal__tag-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
}

.manage-tags-modal__tag-color {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
}

.manage-tags-modal__tag-info {
  flex: 1;
  min-width: 0;
}

.manage-tags-modal__tag-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-xs) 0;
  @include text-truncate(1);
}

.manage-tags-modal__tag-stats {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--color-neutral-500);
}

.manage-tags-modal__usage-count,
.manage-tags-modal__created-time {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.manage-tags-modal__delete-btn {
  color: var(--color-neutral-500);

  &:hover {
    color: var(--color-error);
    background-color: var(--color-neutral-100);
  }
}

// 编辑模式
.manage-tags-modal__tag-edit {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: rgba(var(--color-primary-rgb), 0.06);
}

.manage-tags-modal__edit-color {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--spacing-sm);
}

.manage-tags-modal__edit-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  margin-top: var(--spacing-sm);
}

// 操作按钮
.manage-tags-modal__tag-actions {
  flex-shrink: 0;
  display: flex;
  gap: var(--spacing-xs);
}

// 动画
.tag-item-enter-active,
.tag-item-leave-active {
  transition: all var(--transition-normal);
}

.tag-item-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.tag-item-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.tag-item-move {
  transition: transform var(--transition-normal);
}

// 响应式适配
@include mobile {
  .manage-tags-modal {
    max-width: 100%;
  }

  .manage-tags-modal__form-row {
    flex-direction: column;
    align-items: stretch;
  }

  .manage-tags-modal__tag-view {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-md);
  }

  .manage-tags-modal__tag-drag-handle {
    align-self: center;
  }

  .manage-tags-modal__tag-stats {
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .manage-tags-modal__edit-actions {
    flex-direction: column;
  }
}

// 高对比度模式
@media (prefers-contrast: high) {
  .manage-tags-modal__tag-item {
    border-width: 2px;
  }

  .manage-tags-modal__tag-item--editing {
    border-width: 2px;
  }
}

// 减少动画偏好
@media (prefers-reduced-motion: reduce) {
  .tag-item-enter-active,
  .tag-item-leave-active,
  .tag-item-move {
    transition: none;
  }

  .manage-tags-modal__tag-item {
    transition: none;
  }
}
  .manage-tags-modal__confirm-content {
    padding: var(--spacing-md) 0;
  }

  .manage-tags-modal__confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-md);
  }
</style>
