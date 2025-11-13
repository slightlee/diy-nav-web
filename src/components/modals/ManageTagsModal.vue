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
                    {{ tag.usageCount }} 个网站
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

  if (!confirm(`确定要删除标签"${tag.name}"吗？此操作不可恢复。`)) {
    return
  }

  try {
    tagStore.deleteTag(tag.id)
    uiStore.showToast('标签删除成功', 'success')
  } catch (error) {
    console.error('删除标签失败:', error)
    uiStore.showToast('删除失败，请重试', 'error')
  }
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
  gap: $spacing-xl;
}

// 区域标题
.manage-tags-modal__section-title {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-neutral-800;
  margin: 0;
}

.manage-tags-modal__count {
  font-size: $font-size-sm;
  color: $color-neutral-500;
  font-weight: $font-weight-normal;
}

// 添加区域
.manage-tags-modal__add-section {
  padding-bottom: $spacing-lg;
  border-bottom: 1px solid $color-border;
}

.manage-tags-modal__add-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.manage-tags-modal__form-row {
  display: flex;
  gap: $spacing-sm;
  align-items: flex-end;
}

// 颜色选择器
.manage-tags-modal__color-picker {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  flex: 1;
}

.manage-tags-modal__color-label {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: $color-neutral-700;
}

.manage-tags-modal__color-list {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.manage-tags-modal__color-btn {
  width: 32px;
  height: 32px;
  border-radius: $border-radius-md;
  border: 2px solid $color-border;
  cursor: pointer;
  transition: all $transition-fast;
  position: relative;

  &:hover {
    transform: scale(1.1);
    border-color: $color-neutral-300;
  }

  &--selected {
    border-color: $color-primary;
    box-shadow: 0 0 0 2px rgba($color-primary, 0.2);
  }
}

// 标签列表区域
.manage-tags-modal__list-section {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.manage-tags-modal__tag-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

// 标签项
.manage-tags-modal__tag-item {
  background-color: $color-white;
  border: 1px solid $color-border;
  border-radius: $border-radius-md;
  overflow: hidden;
  transition: all $transition-fast;

  &--editing {
    border-color: $color-primary;
    box-shadow: 0 0 0 2px rgba($color-primary, 0.1);
  }
}

// 查看模式
.manage-tags-modal__tag-view {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
  padding: $spacing-md;
}

.manage-tags-modal__tag-drag-handle {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-neutral-400;
  cursor: move;
  border-radius: $border-radius-sm;
  transition: all $transition-fast;

  &:hover {
    color: $color-neutral-600;
    background-color: $color-neutral-100;
  }
}

.manage-tags-modal__tag-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: $border-radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-lg;
}

.manage-tags-modal__tag-color {
  width: 20px;
  height: 20px;
  border-radius: $border-radius-pill;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.manage-tags-modal__tag-info {
  flex: 1;
  min-width: 0;
}

.manage-tags-modal__tag-name {
  font-size: $font-size-base;
  font-weight: $font-weight-medium;
  color: $color-neutral-800;
  margin: 0 0 $spacing-xs 0;
  @include text-truncate(1);
}

.manage-tags-modal__tag-stats {
  display: flex;
  gap: $spacing-md;
  font-size: $font-size-xs;
  color: $color-neutral-500;
}

.manage-tags-modal__usage-count,
.manage-tags-modal__created-time {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.manage-tags-modal__delete-btn {
  color: $color-neutral-500;

  &:hover {
    color: $color-error;
    background-color: rgba($color-error, 0.1);
  }
}

// 编辑模式
.manage-tags-modal__tag-edit {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-md;
  background-color: rgba($color-primary, 0.02);
}

.manage-tags-modal__edit-color {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.manage-tags-modal__edit-actions {
  display: flex;
  gap: $spacing-sm;
  justify-content: flex-end;
  margin-top: $spacing-sm;
}

// 操作按钮
.manage-tags-modal__tag-actions {
  flex-shrink: 0;
  display: flex;
  gap: $spacing-xs;
}

// 动画
.tag-item-enter-active,
.tag-item-leave-active {
  transition: all $transition-normal;
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
  transition: transform $transition-normal;
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
    gap: $spacing-md;
  }

  .manage-tags-modal__tag-drag-handle {
    align-self: center;
  }

  .manage-tags-modal__tag-stats {
    flex-direction: column;
    gap: $spacing-xs;
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
</style>
