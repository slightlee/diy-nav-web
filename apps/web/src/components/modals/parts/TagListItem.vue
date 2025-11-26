<template>
  <div
    class="tag-item"
    draggable="true"
    @dragstart="$emit('dragstart', tag.id)"
    @dragover.prevent
    @drop="$emit('drop', tag.id)"
  >
    <div v-if="editing" class="edit-row">
      <BaseInput v-model="name" placeholder="标签名称" size="sm" shape="rounded" />
      <ColorPicker v-model="color" />
      <BaseButton variant="primary" size="sm" shape="pill" :loading="updating" @click="onSave">
        保存
      </BaseButton>
      <BaseButton variant="neutral-outline" size="sm" shape="pill" @click="$emit('cancel')">
        取消
      </BaseButton>
    </div>
    <div v-else class="view-row">
      <span class="color-dot" :style="{ backgroundColor: tag.color }" />
      <span class="name">{{ tag.name }}</span>
      <span class="count">{{ usageCount }}</span>
      <BaseButton variant="neutral-outline" size="sm" shape="pill" @click="$emit('edit')">
        编辑
      </BaseButton>
      <BaseButton variant="danger-outline" size="sm" shape="pill" @click="$emit('delete')">
        删除
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { BaseInput, BaseButton, ColorPicker } from '@nav/ui'
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
watchEffect(() => {
  name.value = props.tag.name
  color.value = props.tag.color
})
const onSave = () => emit('save', { name: name.value.trim(), color: color.value })
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
.tag-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-neutral-100);
}
.view-row,
.edit-row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}
.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
}
.name {
  font-weight: var(--font-weight-medium);
}
.count {
  margin-left: auto;
  color: var(--color-neutral-500);
}
</style>
