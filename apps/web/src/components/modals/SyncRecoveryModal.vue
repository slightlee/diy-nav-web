<template>
  <div class="sync-recovery">
    <div class="warning-icon" aria-hidden="true">!</div>
    <h3>云端同步文件无法读取</h3>
    <p class="description">
      云端记录仍在，但对应的数据文件已经丢失或损坏。自动同步已暂停，避免错误覆盖当前设备的数据。
    </p>

    <div class="local-summary">
      <span>当前设备</span>
      <strong>{{ localStats.websites }} 个网站</strong>
      <small>{{ localStats.categories }} 个分类 · {{ localStats.tags }} 个标签</small>
    </div>

    <p class="time">异常同步记录：{{ formatDate(failedAt) }}</p>

    <div class="actions">
      <button class="repair-button" :disabled="loading" @click="emit('repair')">
        {{ loading ? '处理中…' : '使用本地数据修复云端' }}
      </button>
      <button class="disable-button" :disabled="loading" @click="emit('disable')">
        {{ loading ? '处理中…' : '关闭云同步' }}
      </button>
    </div>
    <p class="hint">修复只会重建已丢失的云端同步文件，不会修改当前设备的数据。</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  localStats: { websites: number; categories: number; tags: number }
  failedAt: Date
  loading?: boolean
}>()

const emit = defineEmits<{
  (event: 'repair'): void
  (event: 'disable'): void
}>()

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
</script>

<style scoped lang="scss">
.sync-recovery {
  padding: 8px;
  text-align: center;
  color: var(--text-main);
}

.warning-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  font-size: 24px;
  font-weight: 700;
}

h3 {
  margin: 0 0 8px;
  font-size: 18px;
}

.description,
.hint,
.time {
  color: var(--text-secondary);
  line-height: 1.6;
}

.description {
  margin: 0 0 20px;
}

.local-summary {
  display: grid;
  gap: 5px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--bg-card);

  span,
  small {
    color: var(--text-secondary);
  }

  strong {
    font-size: 20px;
  }
}

.time {
  margin: 10px 0 20px;
  font-size: 12px;
}

.actions {
  display: grid;
  gap: 10px;
}

button {
  min-height: 42px;
  border-radius: 10px;
  font-weight: 650;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.repair-button {
  border: 0;
  background: var(--color-primary);
  color: #fff;
}

.disable-button {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--text-main);
}

.hint {
  margin: 14px 0 0;
  font-size: 12px;
}
</style>
