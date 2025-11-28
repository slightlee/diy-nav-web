<template>
  <div
    class="tag-item"
    :class="{ 'is-dragging': isDragging }"
    draggable="true"
    @dragstart="onDragStart"
    @dragover.prevent
    @drop="onDrop"
    @dragend="onDragEnd"
  >
    <div v-if="editing" class="edit-row">
      <BaseInput
        v-model="name"
        placeholder="标签名称"
        size="sm"
        class="tag-input"
        auto-focus
        @keyup.enter="onSave"
      />
      <ColorPicker v-model="color" />
      <div class="action-buttons">
        <button class="action-btn save-btn" title="保存" @click="onSave">
          <i class="fas fa-check" />
        </button>
        <button class="action-btn cancel-btn" title="取消" @click="$emit('cancel')">
          <i class="fas fa-times" />
        </button>
      </div>
    </div>
    <div v-else class="view-row">
      <div class="drag-handle">
        <i class="fas fa-grip-vertical" />
      </div>
      <span class="color-dot" :style="{ backgroundColor: tag.color }" />
      <span class="name">{{ tag.name }}</span>
      <span class="count">{{ usageCount }}</span>
      <div class="item-actions">
        <button class="action-btn edit-btn" title="编辑" @click="$emit('edit')">
          <i class="fas fa-pencil-alt" />
        </button>
        <button class="action-btn delete-btn" title="删除" @click="$emit('delete')">
          <i class="fas fa-trash-alt" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { BaseInput, ColorPicker } from '@nav/ui'
import type { Tag } from '@/types'

const props = defineProps<{ tag: Tag; editing: boolean; usageCount: number; updating: boolean }>()
const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'save', payload: { name: string; color: string }): void
  (e: 'cancel'): void
  (e: 'dragstart', id: string): void
  (e: 'drop', id: string): void
}>()

const name = ref('')
const color = ref('#3B82F6')
const isDragging = ref(false)

watchEffect(() => {
  name.value = props.tag.name
  color.value = props.tag.color
})

const onSave = () => emit('save', { name: name.value.trim(), color: color.value })

const onDragStart = (e: DragEvent) => {
  isDragging.value = true
  emit('dragstart', props.tag.id)
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.dropEffect = 'move'
  }
}

const onDragEnd = () => {
  isDragging.value = false
}

const onDrop = () => {
  isDragging.value = false
  emit('drop', props.tag.id)
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.tag-item {
  background-color: var(--color-white);
  border: 1px solid var(--border-tile);
  border-radius: 12px;
  padding: 12px 16px;
  transition: all 0.2s;
  cursor: grab;

  &:hover {
    border-color: var(--color-primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    transform: translateY(-1px);

    .drag-handle {
      color: var(--text-secondary);
    }

    .item-actions {
      opacity: 1;
    }
  }

  &.is-dragging {
    opacity: 0.5;
    background-color: var(--bg-tile);
  }
}

.view-row,
.edit-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.drag-handle {
  color: var(--border-tile);
  cursor: grab;
  padding: 4px;
  transition: color 0.2s;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.name {
  font-weight: 600;
  color: var(--text-main);
  font-size: 15px;
  flex: 1;
}

.count {
  background-color: var(--bg-tile);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
}

.item-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background-color: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background-color: var(--bg-tile);
    color: var(--text-main);
  }

  &.delete-btn:hover {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--color-error);
  }

  &.save-btn {
    color: var(--color-success);
    &:hover {
      background-color: rgba(16, 185, 129, 0.1);
    }
  }

  &.cancel-btn:hover {
    color: var(--text-main);
  }
}

.tag-input {
  flex: 1;
}
</style>
