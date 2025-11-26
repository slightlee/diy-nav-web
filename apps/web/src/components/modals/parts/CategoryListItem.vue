<template>
  <div
    class="category-item"
    draggable="true"
    @dragstart="$emit('dragstart', category.id)"
    @dragover.prevent
    @drop="$emit('drop', category.id)"
  >
    <div v-if="editing" class="edit-row">
      <button class="drag-handle" aria-label="拖拽排序" title="拖拽排序">
        <i class="fas fa-grip-lines" />
      </button>
      <IconPicker v-model="editIcon" :compact="true" mode="popover" />
      <BaseInput v-model="name" placeholder="分类名称" size="md" shape="rounded" />
      <BaseButton variant="primary" size="sm" shape="pill" :loading="updating" @click="onSave">
        保存
      </BaseButton>
      <BaseButton variant="neutral-outline" size="sm" shape="pill" @click="$emit('cancel')">
        取消
      </BaseButton>
    </div>
    <div v-else class="view-row">
      <button class="drag-handle" aria-label="拖拽排序" title="拖拽排序">
        <i class="fas fa-grip-lines" />
      </button>
      <i :class="category.icon" class="category-icon" />
      <span class="name">{{ category.name }}</span>
      <span class="count" title="网站数量">{{ websiteCount }}</span>
      <BaseButton
        variant="neutral-outline"
        size="sm"
        shape="pill"
        class="action-btn"
        title="编辑"
        aria-label="编辑"
        @click="$emit('edit')"
      >
        编辑
      </BaseButton>
      <BaseButton
        variant="danger-outline"
        size="sm"
        shape="pill"
        class="action-btn"
        title="删除"
        aria-label="删除"
        @click="$emit('delete')"
      >
        删除
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import type { Category } from '@/types'
import { BaseInput, BaseButton, IconPicker } from '@nav/ui'

const props = defineProps<{
  category: Category
  editing: boolean
  websiteCount: number
  updating: boolean
}>()
const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'save', payload: { name: string; description: string; icon: string }): void
  (e: 'cancel'): void
  (e: 'dragstart', id: string): void
  (e: 'drop', id: string): void
}>()

const name = ref('')
const description = ref('')
const editIcon = ref('fas fa-folder')
watchEffect(() => {
  name.value = props.category.name
  description.value = props.category.description || ''
  editIcon.value = props.category.icon || 'fas fa-folder'
})
const onSave = () =>
  emit('save', {
    name: name.value.trim(),
    description: '',
    icon: editIcon.value || 'fas fa-folder'
  })
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.category-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-md);
  background: var(--color-white);
  transition: all var(--transition-fast);
}
.view-row,
.edit-row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  min-height: 48px;
}
.category-icon {
  color: var(--color-neutral-700);
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-neutral-100);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
.name {
  font-weight: var(--font-weight-medium);
  flex: 1;
}
.desc {
  color: var(--color-neutral-600);
}
.count {
  margin-left: auto;
  color: var(--color-neutral-600);
  background-color: var(--color-neutral-100);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-pill);
  padding: 0 var(--spacing-sm);
  min-width: 36px;
  height: 28px;
  line-height: 28px;
  font-size: var(--font-size-xs);
  text-align: center;
}
.action-btn {
  flex-shrink: 0;
  margin-left: var(--spacing-sm);
}
.drag-handle {
  margin-left: var(--spacing-xs);
  margin-right: var(--spacing-sm);
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--color-neutral-400);
  cursor: grab;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast);
}
.drag-handle:active {
  cursor: grabbing;
}
.drag-handle:hover {
  color: var(--color-neutral-600);
}
.category-item:hover {
  box-shadow: var(--shadow-sm);
}
.category-item:hover .drag-handle {
  opacity: 1;
}
</style>
