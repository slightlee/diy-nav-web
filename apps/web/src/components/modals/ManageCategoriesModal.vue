<template>
  <div class="manage-categories-modal">
    <div class="modal-content-wrapper">
      <!-- Category List -->
      <div class="category-list-container">
        <!-- Empty State -->
        <EmptyState
          v-if="categories.length === 0"
          type="no-categories"
          :show-action-button="false"
          size="small"
        />

        <TransitionGroup v-else name="list" tag="div" class="category-list">
          <div
            v-for="category in categories"
            :key="category.id"
            class="category-item"
            :class="{ 'is-editing': editingId === category.id }"
            @dragover="onDragOver"
            @drop="onDrop($event, category)"
          >
            <!-- Inline Edit Mode -->
            <div v-if="editingId === category.id" class="category-item__edit">
              <div class="edit-row">
                <IconPicker
                  :model-value="editingForm.icon"
                  mode="popover"
                  @update:model-value="editingForm.icon = $event"
                />
                <BaseInput
                  v-model="editingForm.name"
                  placeholder="分类名称"
                  class="category-input"
                  auto-focus
                  @keyup.enter="handleUpdateCategory"
                />
                <div class="action-buttons">
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    icon="fas fa-check"
                    title="保存"
                    aria-label="保存分类"
                    :disabled="!editingForm.name.trim()"
                    @click="handleUpdateCategory"
                  />
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    icon="fas fa-times"
                    title="取消"
                    aria-label="取消编辑分类"
                    @click="cancelEdit"
                  />
                </div>
              </div>
            </div>

            <!-- View Mode -->
            <div v-else class="category-item__content">
              <div
                class="category-item__drag-handle"
                draggable="true"
                aria-label="拖拽排序"
                title="拖拽排序"
                @dragstart="onDragStart($event, category)"
                @dragend="onDragEnd"
              >
                <i class="fas fa-grip-vertical" />
              </div>
              <div class="category-item__icon">
                <i :class="category.icon || 'fas fa-folder'" />
              </div>
              <div class="category-item__info">
                <span class="category-item__name">{{ category.name }}</span>
                <span class="category-item__count">{{ getCategoryCount(category.id) }}</span>
              </div>
              <div class="category-item__actions">
                <BaseButton
                  variant="ghost"
                  size="sm"
                  icon="fas fa-pencil-alt"
                  title="编辑"
                  :aria-label="`编辑分类 ${category.name}`"
                  @click="startEdit(category)"
                />
                <BaseButton
                  variant="danger-ghost"
                  size="sm"
                  icon="fas fa-trash-alt"
                  title="删除"
                  :aria-label="`删除分类 ${category.name}`"
                  @click="confirmDelete(category)"
                />
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>

      <!-- Add Category Button (Bottom) -->
      <div class="add-category-section">
        <BaseButton
          v-if="!isAdding"
          block
          variant="ghost"
          size="md"
          icon="fas fa-plus"
          @click="isAdding = true"
        >
          添加分类
        </BaseButton>

        <div v-else class="add-category-form">
          <div class="form-row">
            <IconPicker v-model="newCategoryIcon" mode="popover" />
            <BaseInput
              v-model="newCategoryName"
              placeholder="分类名称"
              class="category-input"
              auto-focus
              @keyup.enter="handleAddCategory"
            />
            <div class="form-actions">
              <BaseButton
                variant="primary"
                size="sm"
                :disabled="!newCategoryName.trim()"
                @click="handleAddCategory"
              >
                确定
              </BaseButton>
              <BaseButton variant="ghost" size="sm" @click="cancelAdd">取消</BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <BaseModal
      :is-open="showDeleteModal"
      title="删除分类"
      size="sm"
      @close="showDeleteModal = false"
    >
      <div class="delete-confirm-content">
        <p class="delete-confirm-text">确定要删除分类“{{ categoryToDelete?.name }}”吗？</p>
        <p class="delete-confirm-warning">
          <i class="fas fa-info-circle" aria-hidden="true" />
          <span v-if="categoryAffectedCount > 0">
            该分类下有 {{ categoryAffectedCount }} 个网站。删除后，这些网站将移至“未分类”。
          </span>
          <span v-else>删除后无法恢复，请确认是否继续。</span>
        </p>
      </div>
      <template #footer>
        <div class="modal-footer-actions">
          <BaseButton variant="ghost" size="sm" @click="showDeleteModal = false">取消</BaseButton>
          <BaseButton variant="danger" size="sm" @click="handleDeleteCategory">删除</BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCategoryStore } from '@/stores/category'
import { useWebsiteStore } from '@/stores/website'
import { BaseInput, BaseButton, BaseModal, IconPicker, EmptyState } from '@nav/ui'
import type { Category } from '@/types'
import { computeReorderedIds } from '@/utils/helpers'

const categoryStore = useCategoryStore()
const websiteStore = useWebsiteStore()

const categories = computed(() => categoryStore.categories)
const isAdding = ref(false)
const newCategoryName = ref('')
const newCategoryIcon = ref('fas fa-folder')

const showDeleteModal = ref(false)
const categoryToDelete = ref<Category | null>(null)

const editingId = ref<string | null>(null)
const editingForm = ref({
  name: '',
  icon: ''
})

const getCategoryCount = (id: string) => {
  return websiteStore.websites.filter(w => w.categoryId === id).length
}
const categoryAffectedCount = computed(() =>
  categoryToDelete.value ? getCategoryCount(categoryToDelete.value.id) : 0
)

const handleAddCategory = () => {
  if (!newCategoryName.value.trim()) return
  categoryStore.addCategory({
    name: newCategoryName.value.trim(),
    icon: newCategoryIcon.value
  })
  newCategoryName.value = ''
  newCategoryIcon.value = 'fas fa-folder'
  isAdding.value = false
}

const cancelAdd = () => {
  isAdding.value = false
  newCategoryName.value = ''
  newCategoryIcon.value = 'fas fa-folder'
}

const startEdit = (category: Category) => {
  editingId.value = category.id
  editingForm.value = {
    name: category.name,
    icon: category.icon || 'fas fa-folder'
  }
}

const cancelEdit = () => {
  editingId.value = null
  editingForm.value = { name: '', icon: '' }
}

const handleUpdateCategory = () => {
  if (!editingId.value || !editingForm.value.name.trim()) return
  categoryStore.updateCategory(editingId.value, {
    name: editingForm.value.name,
    icon: editingForm.value.icon
  })
  editingId.value = null
}

const confirmDelete = (category: Category) => {
  categoryToDelete.value = category
  showDeleteModal.value = true
}

const handleDeleteCategory = () => {
  if (categoryToDelete.value) {
    websiteStore.removeCategoryFromWebsites(categoryToDelete.value.id)
    categoryStore.deleteCategory(categoryToDelete.value.id)
    showDeleteModal.value = false
    categoryToDelete.value = null
  }
}

// Drag and Drop Logic
const draggedItem = ref<Category | null>(null)

const onDragStart = (e: DragEvent, category: Category) => {
  draggedItem.value = category
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.dropEffect = 'move'
  }
  if (e.target) {
    ;(e.target as HTMLElement).classList.add('is-dragging')
  }
}

const onDragEnd = (e: DragEvent) => {
  draggedItem.value = null
  if (e.target) {
    ;(e.target as HTMLElement).classList.remove('is-dragging')
  }
}

const onDragOver = (e: DragEvent) => {
  e.preventDefault()
}

const onDrop = (e: DragEvent, targetCategory: Category) => {
  e.preventDefault()
  if (!draggedItem.value || draggedItem.value.id === targetCategory.id) return

  const orderIds = categories.value.map(c => c.id)
  const nextIds = computeReorderedIds(orderIds, draggedItem.value.id, targetCategory.id)
  categoryStore.reorderCategories(nextIds)
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.manage-categories-modal {
  padding: 0;
}

.modal-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-list-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 2px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.category-item {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-tile);
  border-radius: 12px;
  padding: 9px 12px;
  transition:
    background-color 0.2s,
    box-shadow 0.2s,
    transform 0.2s;
  cursor: default;

  &:hover {
    border-color: var(--border-tile-hover);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);

    .category-item__drag-handle {
      color: var(--text-secondary);
    }
  }

  &.is-dragging {
    opacity: 0.5;
    background-color: var(--bg-tile);
  }

  &.is-editing {
    border-color: transparent;
    background-color: var(--bg-tile);
    box-shadow: none;
    cursor: default;

    &:hover {
      border-color: transparent;
      box-shadow: none;
      transform: none;
    }
  }
}

.category-item__content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-item__drag-handle {
  width: 20px;
  flex: 0 0 20px;
  color: var(--text-muted);
  cursor: grab;
  padding: 2px;
  opacity: 0.5;
  transition: color 0.2s;
}

.category-item__icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: var(--primary-soft);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.category-item__info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-item__name {
  font-weight: 600;
  color: var(--text-main);
  font-size: 15px;
}

.category-item__count {
  background-color: var(--bg-tile);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
}

.category-item__actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;

  .category-item:hover & {
    opacity: 1;
  }

  .category-item:focus-within & {
    opacity: 1;
  }
}

.add-category-section {
  margin-top: 4px;
}

.add-category-form {
  background-color: var(--bg-tile);
  border-radius: 12px;
  padding: 12px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-input {
  flex: 1;
}

/* 编辑时只保留输入内容，不用蓝色边框重复强调状态。 */
:deep(.category-input .base-input__wrapper),
:deep(.category-input .base-input__wrapper--focused) {
  border-color: var(--border-tile);
  box-shadow: none;
  background-color: var(--bg-panel);
}

.form-actions {
  display: flex;
  gap: 8px;
}

.delete-confirm-text {
  color: var(--text-main);
  font-size: 16px;
  line-height: 1.5;
  margin: 0;
}

.delete-confirm-content {
  display: grid;
  gap: 14px;
}

.delete-confirm-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-error) 7%, var(--bg-panel));
  color: color-mix(in srgb, var(--color-error) 72%, var(--text-main));
  font-size: 13px;
  line-height: 1.5;
}

.delete-confirm-warning i {
  flex: 0 0 auto;
}

.modal-footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

.edit-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

/* List Transitions */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-active {
  position: absolute;
}
</style>
