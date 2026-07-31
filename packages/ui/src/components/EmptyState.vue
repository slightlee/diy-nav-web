<template>
  <div class="empty-state" :class="[`size-${size}`, `type-${type}`]">
    <div class="empty-icon-wrapper">
      <slot name="icon">
        <div class="default-icon-bg" aria-hidden="true">
          <i :class="iconClass" />
        </div>
      </slot>
    </div>
    <div class="empty-content">
      <h3 class="empty-title">{{ message }}</h3>
      <p v-if="description" class="empty-desc">{{ description }}</p>
      <div v-if="showActionButton" class="empty-actions">
        <slot name="action" />
      </div>
      <p v-if="hint" class="empty-hint">{{ hint }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Props {
  type?: 'default' | 'no-data' | 'no-results' | 'no-websites' | 'no-tags' | 'no-categories'
  message?: string
  description?: string
  hint?: string
  showActionButton?: boolean
  size?: 'default' | 'small'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  message: '',
  description: '',
  hint: '',
  showActionButton: false,
  size: 'default'
})

const hint = computed(() => props.hint ?? '')
const iconClass = computed(() => {
  switch (props.type) {
    case 'no-websites':
      return 'fas fa-globe'
    case 'no-tags':
      return 'fas fa-tags'
    case 'no-categories':
      return 'fas fa-folder-open'
    case 'no-results':
      return 'fas fa-search'
    default:
      return 'fas fa-inbox'
  }
})
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
  gap: $spacing-xl;
  padding: 56px $spacing-2xl 48px;
  color: $color-neutral-600;
  text-align: center;
  max-width: 600px;
  margin: 0 auto;

  &.size-small {
    gap: $spacing-lg;
    padding: 44px $spacing-xl 36px;

    .default-icon-bg {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      font-size: 24px;
    }

    .empty-title {
      font-size: 20px;
    }

    .empty-desc {
      font-size: 15px;
    }
  }
}

.empty-icon-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}

.default-icon-bg {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: var(--primary-soft, #eef3ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  color: var(--color-primary, $color-primary);
  box-shadow: none;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-lg;
}

.empty-title {
  font-size: 22px;
  font-weight: $font-weight-bold;
  color: $color-neutral-800;
  margin: 0;
}

.empty-desc {
  font-size: 15px;
  color: $color-neutral-600;
  line-height: $line-height-relaxed;
  max-width: 520px;
  margin: 0;
}

.empty-actions {
  margin-top: $spacing-md;
}

.empty-hint {
  font-size: $font-size-sm;
  color: $color-neutral-500;
  margin: $spacing-md 0 0;
  padding-top: $spacing-lg;
  border-top: 1px solid var(--border-tile, $color-border);
}

.type-no-websites .empty-hint {
  color: var(--text-muted, $color-neutral-500);
}
</style>
