<template>
  <div
    class="manage-tags-modal__tag-item"
    :class="editing ? 'manage-tags-modal__tag-item--editing' : ''"
    :draggable="!editing"
    @dragstart="emit('dragstart', tag.id)"
    @dragover.prevent
    @drop="emit('drop', tag.id)"
  >
    <div v-if="!editing" class="manage-tags-modal__tag-view">
      <div class="manage-tags-modal__tag-drag-handle" title="拖拽排序">
        <i class="fas fa-grip-vertical" />
      </div>

      <div class="manage-tags-modal__tag-icon">
        <div class="manage-tags-modal__tag-color" :style="{ backgroundColor: tag.color }" />
      </div>

      <div class="manage-tags-modal__tag-info">
        <h4 class="manage-tags-modal__tag-name">{{ tag.name }}</h4>
        <div class="manage-tags-modal__tag-stats">
          <span class="manage-tags-modal__usage-count">
            <i class="fas fa-tag" />
            {{ usageCount }} 个网站
          </span>
          <span class="manage-tags-modal__created-time">
            创建于 {{ formatDateZh(tag.createdAt) }}
          </span>
        </div>
      </div>

      <div class="manage-tags-modal__tag-actions">
        <BaseButton variant="ghost" size="sm" title="编辑标签" @click="emit('edit', tag.id)">
          <i class="fas fa-edit" />
        </BaseButton>
        <BaseButton
          variant="ghost"
          size="sm"
          title="删除标签"
          class="manage-tags-modal__delete-btn"
          @click="emit('delete', tag.id)"
        >
          <i class="fas fa-trash" />
        </BaseButton>
      </div>
    </div>

    <form v-else class="manage-tags-modal__tag-edit" @submit.prevent="onSave">
      <BaseInput
        ref="editNameInputRef"
        v-model="localName"
        placeholder="标签名称"
        required
        :maxlength="15"
      />
      <TagColorPicker v-model="localColor" />
      <div class="manage-tags-modal__edit-actions">
        <BaseButton
          html-type="submit"
          variant="primary"
          size="sm"
          :loading="updating"
          :disabled="!localName.trim() || !localColor"
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
import TagColorPicker from '@/components/modals/parts/TagColorPicker.vue'
import { formatDateZh } from '@/utils/helpers'
import type { Tag } from '@/types'

interface Props {
  tag: Tag
  editing: boolean
  usageCount: number
  updating: boolean
}

const props = defineProps<Props>()
const emit = defineEmits(['edit', 'delete', 'save', 'cancel', 'dragstart', 'drop'])

const localName = ref('')
const localColor = ref('')
const editNameInputRef = ref()

watch(
  () => props.editing,
  val => {
    if (val) {
      localName.value = props.tag.name
      localColor.value = props.tag.color
      nextTick(() => {
        editNameInputRef.value?.focus()
      })
    }
  },
  { immediate: true }
)

const onSave = () => {
  if (!localName.value.trim() || !localColor.value) return
  emit('save', { name: localName.value.trim(), color: localColor.value })
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

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

.manage-tags-modal__tag-edit {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: rgba(var(--color-primary-rgb), 0.06);
}

.manage-tags-modal__edit-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  margin-top: var(--spacing-sm);
}

.manage-tags-modal__tag-actions {
  flex-shrink: 0;
  display: flex;
  gap: var(--spacing-xs);
}

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

@include mobile {
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

@media (prefers-contrast: high) {
  .manage-tags-modal__tag-item {
    border-width: 2px;
  }
  .manage-tags-modal__tag-item--editing {
    border-width: 2px;
  }
}

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
