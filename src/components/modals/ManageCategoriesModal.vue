<template>
  <div class="manage-categories-modal">
    <!-- 添加新分类表单 -->
    <div class="manage-categories-modal__add-section">
      <h3 class="manage-categories-modal__section-title">
        <i class="fas fa-folder-plus" />
        添加新分类
      </h3>
      <form class="manage-categories-modal__add-form" @submit.prevent="handleAddCategory">
        <div class="manage-categories-modal__form-row">
          <div class="manage-categories-modal__icon-select">
            <BaseButton
              class="manage-categories-modal__icon-btn"
              variant="secondary"
              size="lg"
              shape="rounded"
              :icon="newCategory.icon || 'fas fa-folder'"
              aria-label="选择图标"
              @click="toggleIconPanel"
            />
            <div v-if="showIconPanel" class="manage-categories-modal__icon-panel">
              <button
                v-for="icon in iconOptions"
                :key="icon"
                type="button"
                class="manage-categories-modal__icon-item"
                :class="{ 'is-active': (newCategory.icon || 'fas fa-folder') === icon }"
                @click="selectIcon(icon)"
              >
                <i :class="icon" />
              </button>
            </div>
          </div>
          <BaseInput
            ref="categoryNameInputRef"
            v-model="newCategory.name"
            placeholder="分类名称"
            required
            :maxlength="20"
            size="lg"
            :show-char-count="false"
          />
          <BaseButton
            type="submit"
            variant="primary"
            size="lg"
            :loading="adding"
            :disabled="!newCategory.name.trim()"
          >
            <i class="fas fa-plus" />
            添加
          </BaseButton>
        </div>
        <BaseInput
          v-model="newCategory.description"
          placeholder="分类描述（可选）"
          :maxlength="100"
          class="manage-categories-modal__description-input"
        />
      </form>
    </div>

    <!-- 分类列表 -->
    <div class="manage-categories-modal__list-section">
      <h3 class="manage-categories-modal__section-title">
        <i class="fas fa-list" />
        现有分类
        <span class="manage-categories-modal__count">({{ categories.length }})</span>
      </h3>

      <!-- 分类列表容器 -->
      <div class="manage-categories-modal__category-list">
        <!-- 分类列表 -->
        <TransitionGroup name="category-item" tag="div">
          <!-- 空状态 -->
          <EmptyState
            v-if="categories.length === 0"
            type="no-categories"
            :show-action-button="false"
            description="还没有创建任何分类，请在上方添加第一个分类"
          />

          <!-- 分类项 -->
          <div
            v-for="category in sortedCategories"
            :key="category.id"
            class="manage-categories-modal__category-item"
            :class="{ 'manage-categories-modal__category-item--editing': editingId === category.id }"
            :draggable="editingId !== category.id"
            @dragstart="onDragStart(category.id)"
            @dragover.prevent
            @drop="onDrop(category.id)"
          >
            <!-- 查看模式 -->
            <div v-if="editingId !== category.id" class="manage-categories-modal__category-view">
              <div class="manage-categories-modal__category-drag-handle" title="拖拽排序">
                <i class="fas fa-grip-vertical" />
              </div>

              <div class="manage-categories-modal__category-icon">
                <i :class="category.icon || 'fas fa-folder'" />
              </div>

              <div class="manage-categories-modal__category-info">
                <h4 class="manage-categories-modal__category-name">
                  {{ category.name }}
                </h4>
                <p v-if="category.description" class="manage-categories-modal__category-description">
                  {{ category.description }}
                </p>
                <div class="manage-categories-modal__category-stats">
                  <span class="manage-categories-modal__website-count">
                    <i class="fas fa-globe" />
                    {{ getWebsiteCount(category.id) }} 个网站
                  </span>
                  <span class="manage-categories-modal__created-time">
                    创建于 {{ formatDate(category.createdAt) }}
                  </span>
                </div>
              </div>

              <div class="manage-categories-modal__category-actions">
                <BaseButton
                  variant="ghost"
                  size="sm"
                  title="编辑分类"
                  @click="startEdit(category)"
                >
                  <i class="fas fa-edit" />
                </BaseButton>
                <BaseButton
                  variant="ghost"
                  size="sm"
                  title="删除分类"
                  class="manage-categories-modal__delete-btn"
                  @click="handleDeleteCategory(category)"
                >
                  <i class="fas fa-trash" />
                </BaseButton>
              </div>
            </div>

            <!-- 编辑模式 -->
            <form
              v-else
              class="manage-categories-modal__category-edit"
              @submit.prevent="handleUpdateCategory"
            >
              <div class="manage-categories-modal__form-row">
                <div class="manage-categories-modal__icon-select">
                  <BaseButton
                    class="manage-categories-modal__icon-btn"
                    variant="secondary"
                    size="lg"
                    shape="rounded"
                    :icon="editingCategory.icon || 'fas fa-folder'"
                    aria-label="选择图标"
                    @click="toggleEditIconPanel"
                  />
                  <div v-if="showEditIconPanel" class="manage-categories-modal__icon-panel">
                    <button
                      v-for="icon in iconOptions"
                      :key="icon"
                      type="button"
                      class="manage-categories-modal__icon-item"
                      :class="{ 'is-active': (editingCategory.icon || 'fas fa-folder') === icon }"
                      @click="selectEditIcon(icon)"
                    >
                      <i :class="icon" />
                    </button>
                  </div>
                </div>
                <BaseInput
                  ref="editNameInputRef"
                  v-model="editingCategory.name"
                  placeholder="分类名称"
                  required
                  :maxlength="20"
                  size="lg"
                  :show-char-count="false"
                />
              </div>
              <BaseInput
                v-model="editingCategory.description"
                placeholder="分类描述"
                :maxlength="100"
              />
              <div class="manage-categories-modal__edit-actions">
                <BaseButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  :loading="updating"
                  :disabled="!editingCategory.name.trim()"
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
import { useCategoryStore } from '@/stores/category'
import { useWebsiteStore } from '@/stores/website'
import { useUIStore } from '@/stores/ui'
import BaseInput from '../base/BaseInput.vue'
import BaseButton from '../base/BaseButton.vue'
import EmptyState from '../EmptyState.vue'
import type { Category } from '@/types'

interface Emits {
  (e: 'close'): void
}

const emit = defineEmits<Emits>()

// Store
const categoryStore = useCategoryStore()
const websiteStore = useWebsiteStore()
const uiStore = useUIStore()

// 组件引用
const categoryNameInputRef = ref()
const editNameInputRef = ref()

// 表单数据
const newCategory = ref({
  name: '',
  description: '',
  icon: 'fas fa-folder'
})

// 编辑状态
const editingId = ref<string | null>(null)
const editingCategory = ref({
  name: '',
  description: '',
  icon: 'fas fa-folder'
})

// 加载状态
const adding = ref(false)
const updating = ref(false)

const showIconPanel = ref(false)
const showEditIconPanel = ref(false)
const iconOptions = [
  'fas fa-folder',
  'fas fa-bookmark',
  'fas fa-briefcase',
  'fas fa-code',
  'fas fa-globe',
  'fas fa-star',
  'fas fa-chart-bar',
  'fas fa-graduation-cap',
  'fas fa-music',
  'fas fa-film',
  'fas fa-cog',
  'fas fa-lightbulb',
  'fas fa-heart',
  'fas fa-bolt'
]
const toggleIconPanel = () => {
  showIconPanel.value = !showIconPanel.value
}
const toggleEditIconPanel = () => {
  showEditIconPanel.value = !showEditIconPanel.value
}
const selectIcon = (icon: string) => {
  newCategory.value.icon = icon
  showIconPanel.value = false
}
const selectEditIcon = (icon: string) => {
  editingCategory.value.icon = icon
  showEditIconPanel.value = false
}

// 计算属性
const categories = computed(() => categoryStore.categories)

const sortedCategories = computed(() => {
  return [...categories.value].sort((a, b) => a.order - b.order)
})

const draggingId = ref<string | null>(null)
const onDragStart = (id: string) => {
  draggingId.value = id
}
const onDrop = (targetId: string) => {
  if (!draggingId.value || draggingId.value === targetId) {
    draggingId.value = null
    return
  }
  const orderIds = sortedCategories.value.map(c => c.id)
  const from = orderIds.indexOf(draggingId.value)
  const to = orderIds.indexOf(targetId)
  if (from === -1 || to === -1) {
    draggingId.value = null
    return
  }
  orderIds.splice(from, 1)
  orderIds.splice(to, 0, draggingId.value)
  categoryStore.reorderCategories(orderIds)
  draggingId.value = null
}

// 获取分类下的网站数量
const getWebsiteCount = (categoryId: string): number => {
  return websiteStore.websites.filter(w => w.categoryId === categoryId).length
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

// 处理添加分类
const handleAddCategory = async () => {
  if (!newCategory.value.name.trim() || adding.value) {
    return
  }

  adding.value = true

  try {
    categoryStore.addCategory({
      name: newCategory.value.name.trim(),
      description: newCategory.value.description.trim(),
      icon: newCategory.value.icon,
      order: categories.value.length + 1,
      websiteCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    uiStore.showToast('分类添加成功', 'success')

    // 重置表单
    newCategory.value = { name: '', description: '', icon: 'fas fa-folder' }

    // 聚焦到输入框
    await nextTick()
    categoryNameInputRef.value?.focus()
  } catch (error) {
    console.error('添加分类失败:', error)
    uiStore.showToast('添加失败，请重试', 'error')
  } finally {
    adding.value = false
  }
}

// 开始编辑
const startEdit = async (category: Category) => {
  editingId.value = category.id
  editingCategory.value = {
    name: category.name,
    description: category.description || '',
    icon: category.icon || 'fas fa-folder'
  }

  await nextTick()
  editNameInputRef.value?.focus()
}

// 处理更新分类
const handleUpdateCategory = async () => {
  if (!editingId.value || !editingCategory.value.name.trim() || updating.value) {
    return
  }

  updating.value = true

  try {
    await categoryStore.updateCategory(editingId.value, {
      name: editingCategory.value.name.trim(),
      description: editingCategory.value.description.trim(),
      icon: editingCategory.value.icon
    })

    uiStore.showToast('分类更新成功', 'success')
    cancelEdit()
  } catch (error) {
    console.error('更新分类失败:', error)
    uiStore.showToast('更新失败，请重试', 'error')
  } finally {
    updating.value = false
  }
}

// 取消编辑
const cancelEdit = () => {
  editingId.value = null
  editingCategory.value = { name: '', description: '', icon: 'fas fa-folder' }
  showEditIconPanel.value = false
}

// 处理删除分类
const handleDeleteCategory = async (category: Category) => {
  const websiteCount = getWebsiteCount(category.id)

  if (websiteCount > 0) {
    uiStore.showToast(
      `该分类下还有 ${websiteCount} 个网站，请先移动或删除这些网站`,
      'warning'
    )
    return
  }

  if (!confirm(`确定要删除分类"${category.name}"吗？此操作不可恢复。`)) {
    return
  }

  try {
    await categoryStore.deleteCategory(category.id)
    uiStore.showToast('分类删除成功', 'success')
  } catch (error) {
    console.error('删除分类失败:', error)
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
    categoryNameInputRef.value?.focus()
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
  categoryNameInputRef.value?.focus()

  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeydown)
})

// 清理
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.manage-categories-modal {
  width: 100%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;
}

// 区域标题
.manage-categories-modal__section-title {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  color: $color-neutral-800;
  margin: 0 0 $spacing-md 0;
}

.manage-categories-modal__count {
  font-size: $font-size-sm;
  color: $color-neutral-500;
  font-weight: $font-weight-normal;
}

// 添加区域
.manage-categories-modal__add-section {
  padding-bottom: $spacing-lg;
  border-bottom: 1px solid $color-border;
}


.manage-categories-modal__add-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.manage-categories-modal__form-row {
  display: flex;
  gap: $spacing-sm;
  align-items: stretch;

  > .base-input {
    flex: 1;
    min-width: 0;
  }
}

.manage-categories-modal__icon-select {
  position: relative;
  flex-shrink: 0;
}

.manage-categories-modal__form-row .base-button {
  flex-shrink: 0;
  height: 100%;
}

.manage-categories-modal__icon-btn {
  width: 48px;
  min-width: 48px;
  height: 100%;
  padding: 0;
  background-color: $color-white;
  border-color: $color-border;
  border-radius: $border-radius-md;
}

.manage-categories-modal__icon-panel {
  position: absolute;
  top: calc(100% + #{$spacing-xs});
  left: 0;
  background-color: $color-white;
  border: 1px solid $color-border;
  border-radius: $border-radius-md;
  box-shadow: $shadow-md;
  padding: $spacing-sm;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: $spacing-sm;
  z-index: 10;
}

.manage-categories-modal__icon-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid $color-border;
  border-radius: $border-radius-sm;
  background-color: $color-neutral-50;
  cursor: pointer;
  transition: all $transition-fast;
}

.manage-categories-modal__icon-item:hover {
  background-color: $color-neutral-100;
}

.manage-categories-modal__icon-item.is-active {
  border-color: $color-primary;
  box-shadow: 0 0 0 3px rgba($color-primary, 0.12);
}

.manage-categories-modal__description-input {
  margin-top: $spacing-sm;
}

// 列表区域
.manage-categories-modal__list-section {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-bottom: $spacing-lg;
}

.manage-categories-modal__category-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

// 分类项
.manage-categories-modal__category-item {
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
.manage-categories-modal__category-view {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md;
}

.manage-categories-modal__category-drag-handle {
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

.manage-categories-modal__category-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background-color: rgba($color-primary, 0.1);
  color: $color-primary;
  border-radius: $border-radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-lg;
}

.manage-categories-modal__category-info {
  flex: 1;
  min-width: 0;
}

.manage-categories-modal__category-name {
  font-size: $font-size-base;
  font-weight: $font-weight-medium;
  color: $color-neutral-800;
  margin: 0 0 $spacing-xs 0;
  @include text-truncate(1);
}

.manage-categories-modal__category-description {
  font-size: $font-size-sm;
  color: $color-neutral-600;
  margin: 0 0 $spacing-sm 0;
  @include text-truncate(2);
}

.manage-categories-modal__category-stats {
  display: flex;
  gap: $spacing-md;
  font-size: $font-size-xs;
  color: $color-neutral-500;
}

.manage-categories-modal__website-count,
.manage-categories-modal__created-time {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.manage-categories-modal__category-actions {
  flex-shrink: 0;
  display: flex;
  gap: $spacing-xs;
}

.manage-categories-modal__delete-btn {
  color: $color-neutral-500;

  &:hover {
    color: $color-error;
    background-color: rgba($color-error, 0.1);
  }
}

// 编辑模式
.manage-categories-modal__category-edit {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-md;
  background-color: rgba($color-primary, 0.02);
}

.manage-categories-modal__edit-actions {
  display: flex;
  gap: $spacing-sm;
  justify-content: flex-end;
  margin-top: $spacing-sm;
}



// 动画
.category-item-enter-active,
.category-item-leave-active {
  transition: all $transition-normal;
}

.category-item-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.category-item-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.category-item-move {
  transition: transform $transition-normal;
}

// 响应式适配
@include mobile {
  .manage-categories-modal {
    max-width: 100%;
  }

  .manage-categories-modal__form-row {
    flex-direction: column;
    align-items: stretch;
  }

  .manage-categories-modal__category-view {
    flex-direction: column;
    align-items: stretch;
    gap: $spacing-md;
  }

  .manage-categories-modal__icon-btn {
    width: 44px;
    min-width: 44px;
    height: 44px;
  }

  .manage-categories-modal__category-drag-handle {
    align-self: center;
  }

  .manage-categories-modal__category-stats {
    flex-direction: column;
    gap: $spacing-xs;
  }

  .manage-categories-modal__edit-actions {
    flex-direction: column;
  }
}

// 高对比度模式
@media (prefers-contrast: high) {
  .manage-categories-modal__category-item {
    border-width: 2px;
  }

  .manage-categories-modal__category-item--editing {
    border-width: 2px;
  }
}

// 减少动画偏好
@media (prefers-reduced-motion: reduce) {
  .category-item-enter-active,
  .category-item-leave-active,
  .category-item-move {
    transition: none;
  }

  .manage-categories-modal__category-item {
    transition: none;
  }
}
</style>
