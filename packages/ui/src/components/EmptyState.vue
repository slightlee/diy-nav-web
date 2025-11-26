<template>
  <div class="empty-state">
    <div class="empty-icon"><i class="fas fa-inbox" /></div>
    <div class="empty-text">{{ message }}</div>
    <div v-if="description" class="empty-desc">{{ description }}</div>
    <div v-if="showActionButton" class="empty-actions">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Props {
  type?: string
  message?: string
  description?: string
  showActionButton?: boolean
}

const props = defineProps<Props>()
const showActionButton = computed(() => props.showActionButton ?? false)
const description = computed(() => props.description ?? '')
const message = computed(() => {
  if (props.message) return props.message
  const t = (props.type || '').toLowerCase()
  if (t.includes('no-tags')) return '暂无标签'
  if (t.includes('no-categories')) return '暂无分类'
  if (t.includes('no-websites')) return '暂无网站'
  return '暂无数据'
})
</script>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  color: var(--color-neutral-600);
}
.empty-icon {
  font-size: 24px;
}
.empty-text {
  font-size: var(--font-size-base);
}
.empty-desc {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-500);
}
.empty-actions {
  margin-top: var(--spacing-sm);
}
</style>
