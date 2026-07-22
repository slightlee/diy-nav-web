<template>
  <div class="sync-conflict-modal" :aria-busy="loading">
    <div v-if="loading" class="resolve-overlay" role="status" aria-live="polite">
      <div class="resolve-overlay__spinner" aria-hidden="true" />
      <p class="resolve-overlay__title">{{ loadingTitle }}</p>
      <p class="resolve-overlay__desc">{{ loadingDesc }}</p>
    </div>

    <div class="conflict-header">
      <div class="icon-wrapper" aria-hidden="true">
        <svg viewBox="0 0 24 24" class="icon" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3>本地与云端数据不一致</h3>
      <p class="subtitle">请选择如何同步</p>
    </div>

    <div class="conflict-comparison">
      <div class="data-card local">
        <span class="label">本机</span>
        <span class="value">{{ localStats.websites }}</span>
        <span class="unit">个网站</span>
        <span class="meta">{{ localStats.categories }} 分类 · {{ localStats.tags }} 标签</span>
      </div>

      <div class="arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      </div>

      <div class="data-card cloud">
        <span class="label">云端</span>
        <span class="value">{{ remoteStats.websites }}</span>
        <span class="unit">个网站</span>
        <span class="meta">{{ remoteStats.categories }} 分类 · {{ remoteStats.tags }} 标签</span>
        <span class="meta time">{{ formatDate(remoteDate) }}</span>
      </div>
    </div>

    <div class="conflict-actions">
      <button
        class="btn-use-cloud"
        :class="{ 'is-active-loading': loading && action === 'useCloud' }"
        :disabled="loading"
        @click="emit('useCloud')"
      >
        <span v-if="loading && action === 'useCloud'" class="btn-spinner" aria-hidden="true" />
        <svg v-else viewBox="0 0 24 24" class="btn-icon" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        {{ loading && action === 'useCloud' ? '处理中…' : '云端覆盖本地' }}
      </button>

      <button
        class="btn-merge"
        :class="{ 'is-active-loading': loading && action === 'merge' }"
        :disabled="loading"
        @click="emit('merge')"
      >
        <span v-if="loading && action === 'merge'" class="btn-spinner" aria-hidden="true" />
        {{ loading && action === 'merge' ? '合并中…' : '合并两边数据' }}
      </button>

      <button
        class="btn-keep-local"
        :class="{ 'is-active-loading': loading && action === 'keepLocal' }"
        :disabled="loading"
        @click="emit('keepLocal')"
      >
        <span v-if="loading && action === 'keepLocal'" class="btn-spinner" aria-hidden="true" />
        {{ loading && action === 'keepLocal' ? '上传中…' : '本地覆盖云端' }}
      </button>

      <p class="action-hint">覆盖会丢掉另一侧独有内容；合并尽量都保留，但可能有重复。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  localStats: { websites: number; categories: number; tags: number }
  remoteStats: { websites: number; categories: number; tags: number }
  remoteDate: Date
  loading?: boolean
  action?: 'useCloud' | 'keepLocal' | 'merge' | null
}>()

const emit = defineEmits<{
  (e: 'useCloud'): void
  (e: 'keepLocal'): void
  (e: 'merge'): void
}>()

const loadingTitle = computed(() => {
  switch (props.action) {
    case 'merge':
      return '正在合并'
    case 'useCloud':
      return '正在应用云端数据'
    case 'keepLocal':
      return '正在上传本地数据'
    default:
      return '处理中'
  }
})

const loadingDesc = computed(() => '请稍候，不要关闭页面')

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date)
}
</script>

<style scoped lang="scss">
.sync-conflict-modal {
  position: relative;
  padding: 4px 2px 0;
  color: var(--text-main);
}

.resolve-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #fff) 90%, transparent);
  backdrop-filter: blur(6px);
  text-align: center;
}

.resolve-overlay__spinner,
.btn-spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid rgba(59, 130, 246, 0.18);
  border-top-color: var(--color-primary, #3b82f6);
  animation: conflict-spin 0.75s linear infinite;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.resolve-overlay__title {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}

.resolve-overlay__desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.conflict-header {
  text-align: center;
  margin-bottom: 20px;

  .icon-wrapper {
    width: 44px;
    height: 44px;
    margin: 0 auto 12px;
    background: rgba(245, 158, 11, 0.12);
    color: #f59e0b;
    border-radius: 50%;
    display: grid;
    place-items: center;

    .icon {
      width: 22px;
      height: 22px;
    }
  }

  h3 {
    margin: 0 0 6px;
    font-size: 17px;
    font-weight: 650;
  }

  .subtitle {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.conflict-comparison {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: stretch;
  gap: 10px;
  margin-bottom: 20px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 12px;

    .arrow {
      transform: rotate(90deg);
      justify-self: center;
    }
  }
}

.data-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 14px 14px 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color, rgba(148, 163, 184, 0.25));
  background: var(--bg-tile, var(--bg-card, #fff));

  &.cloud {
    border-color: color-mix(in srgb, var(--color-primary, #3b82f6) 35%, transparent);
    background: color-mix(in srgb, var(--color-primary, #3b82f6) 6%, transparent);
  }

  .label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }

  .value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  .unit {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  .meta {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.4;

    &.time {
      margin-top: 2px;
      opacity: 0.9;
    }
  }
}

.arrow {
  display: grid;
  place-items: center;
  color: var(--text-secondary);
  opacity: 0.45;

  svg {
    width: 22px;
    height: 22px;
  }
}

.conflict-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;

  button {
    width: 100%;
    min-height: 44px;
    padding: 11px 14px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition:
      filter 0.15s ease,
      background 0.15s ease,
      opacity 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    &:disabled {
      cursor: wait;
      opacity: 0.7;
    }

    &.is-active-loading {
      opacity: 1;
    }
  }

  .btn-use-cloud {
    background: var(--color-primary, #3b82f6);
    color: #fff;
    border: none;

    &:hover:not(:disabled) {
      filter: brightness(1.06);
    }

    .btn-icon {
      width: 18px;
      height: 18px;
    }
  }

  .btn-keep-local {
    background: transparent;
    border: 1px solid var(--border-color, rgba(148, 163, 184, 0.35));
    color: var(--text-main);

    &:hover:not(:disabled) {
      background: var(--bg-hover, rgba(148, 163, 184, 0.1));
    }
  }

  .btn-merge {
    background: color-mix(in srgb, var(--color-primary, #3b82f6) 8%, transparent);
    color: var(--color-primary, #3b82f6);
    border: 1px solid color-mix(in srgb, var(--color-primary, #3b82f6) 45%, transparent);

    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--color-primary, #3b82f6) 14%, transparent);
    }
  }
}

.action-hint {
  margin: 2px 0 0;
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

@keyframes conflict-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
