<template>
  <div class="empty-state" :class="[`size-${size}`]">
    <div class="empty-icon-wrapper">
      <slot name="icon">
        <div class="default-icon-bg">
          <i class="fas fa-inbox" />
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

interface Props {
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
  gap: 2rem;
  padding: 4rem 2rem;
  color: var(--color-neutral-600);
  text-align: center;
  max-width: 600px;
  margin: 0 auto;

  &.size-small {
    gap: 1rem;
    padding: 2rem 1rem;

    .default-icon-bg {
      width: 80px;
      height: 80px;
      border-radius: 24px;
      font-size: 32px;

      &::after {
        border-radius: 18px;
      }
    }

    .empty-title {
      font-size: 18px;
    }

    .empty-desc {
      font-size: 14px;
    }
  }
}

.empty-icon-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}

.default-icon-bg {
  width: 120px;
  height: 120px;
  border-radius: 40px;
  background: linear-gradient(135deg, #e0e7ff 0%, #f3f4f6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: #818cf8;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.05),
    0 10px 10px -5px rgba(0, 0, 0, 0.01);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    width: 80%;
    height: 80%;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 30px;
    top: 50%;
    left: 50%;
    transform: translate(-30%, -30%);
  }

  i {
    position: relative;
    z-index: 1;
  }
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.empty-desc {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 480px;
  margin: 0;
}

.empty-actions {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.empty-hint {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 1rem;
}
</style>
