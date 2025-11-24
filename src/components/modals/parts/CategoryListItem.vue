<template>
  <div
    class="manage-categories-modal__category-item"
    :class="editing ? 'manage-categories-modal__category-item--editing' : ''"
    :draggable="!editing"
    @dragstart="emit('dragstart', category.id)"
    @dragover.prevent
    @drop="emit('drop', category.id)"
  >
    <div v-if="!editing" class="manage-categories-modal__category-view">
      <div class="manage-categories-modal__category-drag-handle" title="拖拽排序">
        <i class="fas fa-grip-vertical" />
      </div>

      <div class="manage-categories-modal__category-icon">
        <i :class="category.icon || 'fas fa-folder'" />
      </div>

      <div class="manage-categories-modal__category-info">
        <h4 class="manage-categories-modal__category-name">{{ category.name }}</h4>

        <div class="manage-categories-modal__category-stats">
          <span class="manage-categories-modal__website-count">
            <i class="fas fa-globe" />
            {{ websiteCount }} 个网站
          </span>
          <span class="manage-categories-modal__created-time">
            创建于 {{ formatDateZh(category.createdAt) }}
          </span>
        </div>
      </div>

      <div class="manage-categories-modal__category-actions">
        <BaseButton variant="ghost" size="sm" title="编辑分类" @click="emit('edit', category.id)">
          <i class="fas fa-edit" />
        </BaseButton>
        <BaseButton
          variant="ghost"
          size="sm"
          title="删除分类"
          class="manage-categories-modal__delete-btn"
          @click="emit('delete', category.id)"
        >
          <i class="fas fa-trash" />
        </BaseButton>
      </div>
    </div>

    <form v-else class="manage-categories-modal__category-edit" @submit.prevent="onSave">
      <div class="manage-categories-modal__form-row">
        <CategoryIconPicker v-model="localIcon" />
        <BaseInput
          ref="editNameInputRef"
          v-model="localName"
          placeholder="分类名称"
          required
          :maxlength="20"
          size="lg"
          :show-char-count="false"
        />
      </div>

      <div class="manage-categories-modal__edit-actions">
        <BaseButton
          html-type="submit"
          variant="primary"
          size="sm"
          :loading="updating"
          :disabled="!localName.trim()"
        >
          <i class="fas fa-save" />
          保存
        </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="emit('cancel')">
          <i class="fas fa-times" />
          取消
        </BaseButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import CategoryIconPicker from '@/components/modals/parts/CategoryIconPicker.vue'
import { formatDateZh } from '@/utils/helpers'
import type { Category } from '@/types'

interface Props {
  category: Category
  editing: boolean
  websiteCount: number
  updating: boolean
}

const props = defineProps<Props>()
const emit = defineEmits(['edit', 'delete', 'save', 'cancel', 'dragstart', 'drop'])

const localName = ref('')
const localDescription = ref('')
const localIcon = ref('fas fa-folder')
const editNameInputRef = ref()

watch(
  () => props.editing,
  val => {
    if (val) {
      localName.value = props.category.name
      localDescription.value = props.category.description || ''
      localIcon.value = props.category.icon || 'fas fa-folder'
      nextTick(() => {
        editNameInputRef.value?.focus()
      })
    }
  },
  { immediate: true }
)

const onSave = () => {
  if (!localName.value.trim()) return
  emit('save', {
    name: localName.value.trim(),
    icon: localIcon.value
  })
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.manage-categories-modal__category-item {
  background-color: var(--color-neutral-100);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all var(--transition-fast);

  &--editing {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.12);
    overflow: visible;
  }
}

.manage-categories-modal__category-view {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
}

.manage-categories-modal__category-drag-handle {
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

.manage-categories-modal__category-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
}

.manage-categories-modal__category-info {
  flex: 1;
  min-width: 0;
}

.manage-categories-modal__category-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-xs) 0;
}

.manage-categories-modal__category-stats {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--color-neutral-500);
}

.manage-categories-modal__website-count,
.manage-categories-modal__created-time {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.manage-categories-modal__category-actions {
  flex-shrink: 0;
  display: flex;
  gap: var(--spacing-xs);
}

.manage-categories-modal__delete-btn {
  color: var(--color-neutral-500);

  &:hover {
    color: var(--color-error);
    background-color: var(--color-neutral-100);
  }
}

.manage-categories-modal__category-edit {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: rgba(var(--color-primary-rgb), 0.06);
}

.manage-categories-modal__edit-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  margin-top: var(--spacing-sm);
}

.category-item-enter-active,
.category-item-leave-active {
  transition: all var(--transition-normal);
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
  transition: transform var(--transition-normal);
}

@include mobile {
  .manage-categories-modal__category-view {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-md);
  }
  .manage-categories-modal__category-drag-handle {
    align-self: center;
  }
  .manage-categories-modal__category-stats {
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  .manage-categories-modal__edit-actions {
    flex-direction: column;
  }
}

@media (prefers-contrast: high) {
  .manage-categories-modal__category-item {
    border-width: 2px;
  }
  .manage-categories-modal__category-item--editing {
    border-width: 2px;
  }
}

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
