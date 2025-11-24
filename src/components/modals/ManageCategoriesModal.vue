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
          <CategoryIconPicker v-model="newCategory.icon" />
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
            html-type="submit"
            variant="primary"
            size="lg"
            :loading="adding"
            :disabled="!newCategory.name.trim()"
          >
            <i class="fas fa-plus" />
            添加
          </BaseButton>
        </div>
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
          <EmptyState
            v-if="categories.length === 0"
            type="no-categories"
            :show-action-button="false"
            description="还没有创建任何分类，请在上方添加第一个分类"
          />
          <CategoryListItem
            v-for="category in sortedCategories"
            :key="category.id"
            :category="category"
            :editing="editingId === category.id"
            :website-count="getWebsiteCount(category.id)"
            :updating="updating"
            @edit="startEdit(category)"
            @delete="handleDeleteCategory(category)"
            @save="handleSave"
            @cancel="cancelEdit"
            @dragstart="onDragStart"
            @drop="onDrop"
          />
        </TransitionGroup>
      </div>
    </div>

    <BaseModal
      v-if="deleteConfirmOpen"
      :is-open="deleteConfirmOpen"
      title="删除分类"
      @close="closeDeleteConfirm"
    >
      <div class="manage-categories-modal__confirm-content">
        <p>确定要删除该分类吗？此操作不可恢复。</p>
      </div>
      <template #footer>
        <div class="manage-categories-modal__confirm-actions">
          <BaseButton variant="secondary" @click="closeDeleteConfirm">取消</BaseButton>
          <BaseButton variant="danger" :loading="deleting" @click="confirmDeleteCategory">
            <i class="fas fa-trash" />
            删除
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useCategoryStore } from '@/stores/category'
import { useWebsiteStore } from '@/stores/website'
import { useUIStore } from '@/stores/ui'
import BaseInput from '../base/BaseInput.vue'
import BaseButton from '../base/BaseButton.vue'
import EmptyState from '../EmptyState.vue'
import BaseModal from '../base/BaseModal.vue'
import CategoryIconPicker from './parts/CategoryIconPicker.vue'
import CategoryListItem from './parts/CategoryListItem.vue'
import type { Category } from '@/types'
import { ERROR_DUPLICATE_NAME } from '@/types'
import { computeReorderedIds } from '@/utils/helpers'

// Store
const categoryStore = useCategoryStore()
const websiteStore = useWebsiteStore()
const uiStore = useUIStore()

// 组件引用
const categoryNameInputRef = ref()

// 表单数据
const newCategory = ref({
  name: '',
  description: '',
  icon: 'fas fa-folder'
})

// 编辑状态
const editingId = ref<string | null>(null)

// 加载状态
const adding = ref(false)
const updating = ref(false)

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
  if (!draggingId.value) return
  const orderIds = sortedCategories.value.map(c => c.id)
  const next = computeReorderedIds(orderIds, draggingId.value, targetId)
  categoryStore.reorderCategories(next)
  draggingId.value = null
}

// 获取分类下的网站数量
const getWebsiteCount = (categoryId: string): number => {
  return websiteStore.websites.filter(w => w.categoryId === categoryId).length
}

// 统一使用工具函数格式化日期

// 处理添加分类
const handleAddCategory = async () => {
  if (!newCategory.value.name.trim() || adding.value) {
    return
  }

  adding.value = true

  try {
    const exists = categories.value.some(
      c => c.name.toLowerCase() === newCategory.value.name.trim().toLowerCase()
    )
    if (exists) {
      uiStore.showToast('分类名称已存在', 'warning')
      return
    }
    categoryStore.addCategory({
      name: newCategory.value.name.trim(),
      description: newCategory.value.description.trim(),
      icon: newCategory.value.icon
    })

    uiStore.showToast('分类添加成功', 'success')

    // 重置表单
    newCategory.value = { name: '', description: '', icon: 'fas fa-folder' }

    // 聚焦到输入框
    await nextTick()
    categoryNameInputRef.value?.focus()
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_DUPLICATE_NAME) {
      uiStore.showToast('分类名称已存在', 'warning')
    } else {
      uiStore.showToast('添加失败，请重试', 'error')
    }
  } finally {
    adding.value = false
  }
}

// 开始编辑
const startEdit = (category: Category) => {
  editingId.value = category.id
}

// 处理更新分类
const handleSave = async (payload: { name: string; description: string; icon: string }) => {
  if (!editingId.value || updating.value) return
  const name = payload.name.trim()
  const description = payload.description.trim()
  const icon = payload.icon
  if (!name) return
  const exists = categories.value.some(
    c => c.id !== editingId.value && c.name.toLowerCase() === name.toLowerCase()
  )
  if (exists) {
    uiStore.showToast('分类名称已存在', 'warning')
    return
  }

  updating.value = true
  try {
    await categoryStore.updateCategory(editingId.value, { name, description, icon })
    uiStore.showToast('分类更新成功', 'success')
    cancelEdit()
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_DUPLICATE_NAME) {
      uiStore.showToast('分类名称已存在', 'warning')
    } else {
      uiStore.showToast('更新失败，请重试', 'error')
    }
  } finally {
    updating.value = false
  }
}

// 取消编辑
const cancelEdit = () => {
  editingId.value = null
}

// 处理删除分类
const handleDeleteCategory = async (category: Category) => {
  const websiteCount = getWebsiteCount(category.id)

  if (websiteCount > 0) {
    uiStore.showToast(`该分类下还有 ${websiteCount} 个网站，请先移动或删除这些网站`, 'warning')
    return
  }

  deleteTargetId.value = category.id
  deleteConfirmOpen.value = true
}

// 生命周期
onMounted(() => {
  categoryNameInputRef.value?.focus()
})

// 清理

const deleteConfirmOpen = ref(false)
const deleteTargetId = ref<string>('')
const deleting = ref(false)

const closeDeleteConfirm = () => {
  deleteConfirmOpen.value = false
  deleteTargetId.value = ''
}

const confirmDeleteCategory = async () => {
  if (!deleteTargetId.value || deleting.value) return
  deleting.value = true
  try {
    await categoryStore.deleteCategory(deleteTargetId.value)
    uiStore.showToast('分类删除成功', 'success')
    closeDeleteConfirm()
  } catch {
    uiStore.showToast('删除失败，请重试', 'error')
  } finally {
    deleting.value = false
  }
}
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
  gap: var(--spacing-xl);
}

// 区域标题
.manage-categories-modal__section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-md) 0;
}

.manage-categories-modal__count {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-500);
  font-weight: var(--font-weight-normal);
}

// 添加区域
.manage-categories-modal__add-section {
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.manage-categories-modal__add-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.manage-categories-modal__form-row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;

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
}

.manage-categories-modal__icon-btn {
  width: 48px;
  min-width: 48px;
  padding: 0;
  background-color: var(--color-neutral-100);
  border-color: var(--color-border);
  border-radius: var(--radius-md);
}

.manage-categories-modal__icon-panel {
  position: absolute;
  top: calc(100% + var(--spacing-xs));
  left: 0;
  background-color: var(--color-neutral-100);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-sm);
  display: grid;
  grid-template-columns: repeat(8, 36px);
  gap: var(--spacing-xs);
  z-index: 1000;
  max-height: 240px;
  overflow-y: auto;
  width: max-content;
}

.manage-categories-modal__icon-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background-color: var(--color-neutral-100);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.manage-categories-modal__icon-item:hover {
  transform: scale(1.06);
  background-color: var(--color-neutral-200);
}

.manage-categories-modal__icon-item.is-active {
  border-color: var(--color-primary);
  background-color: rgba(var(--color-primary-rgb), 0.08);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}

.manage-categories-modal__description-input {
  margin-top: var(--spacing-sm);
}

// 列表区域
.manage-categories-modal__list-section {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-bottom: var(--spacing-lg);
}

.manage-categories-modal__category-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
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

  .manage-categories-modal__icon-btn {
    width: 44px;
    min-width: 44px;
    height: 44px;
  }
}
.manage-categories-modal__confirm-content {
  padding: var(--spacing-md) 0;
}

.manage-categories-modal__confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
}
</style>
