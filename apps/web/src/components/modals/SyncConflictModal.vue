<template>
  <div class="sync-conflict-modal">
    <div class="conflict-header">
      <div class="icon-wrapper">
        <svg viewBox="0 0 24 24" class="icon" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3>发现云端数据备份</h3>
      <p class="subtitle">检测到您的云端账户存有备份数据，与当前本地数据存在差异。</p>
    </div>

    <div class="conflict-comparison">
      <!-- Local Card -->
      <div class="data-card local">
        <div class="card-header">
          <span class="label">当前设备 (本地)</span>
        </div>
        <div class="stats">
          <div class="stat-item">
            <span class="value">{{ localCount }}</span>
            <span class="key">个网站</span>
          </div>
          <div class="stat-item">
            <span class="value text-sm">{{ formatDate(new Date()) }}</span>
            <!-- Local is always "Now" effectively -->
            <span class="key">最后修改</span>
          </div>
        </div>
      </div>

      <!-- Arrow -->
      <div class="arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      </div>

      <!-- Cloud Card -->
      <div class="data-card cloud">
        <div class="card-header">
          <span class="label">云端备份</span>
          <span class="badge">推荐</span>
        </div>
        <div class="stats">
          <div class="stat-item">
            <span class="value">{{ remoteCount }}</span>
            <span class="key">个网站</span>
          </div>
          <div class="stat-item">
            <span class="value text-sm">{{ formatDate(remoteDate) }}</span>
            <span class="key">备份时间</span>
          </div>
        </div>
      </div>
    </div>

    <div class="conflict-actions">
      <button class="btn-use-cloud" @click="emit('useCloud')">
        <svg viewBox="0 0 24 24" class="btn-icon" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        使用云端数据 (覆盖本地)
      </button>

      <button class="btn-keep-local" @click="emit('keepLocal')">保留本地数据 (忽略云端)</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  localCount: number
  remoteCount: number
  remoteDate: Date
}>()

const emit = defineEmits<{
  (e: 'useCloud'): void
  (e: 'keepLocal'): void
}>()

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date)
}
</script>

<style scoped lang="scss">
.sync-conflict-modal {
  padding: 10px;
  color: var(--text-main);
}

.conflict-header {
  text-align: center;
  margin-bottom: 24px;

  .icon-wrapper {
    width: 48px;
    height: 48px;
    margin: 0 auto 16px;
    background: rgba(245, 158, 11, 0.1); // Amber
    color: #f59e0b;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;

    .icon {
      width: 24px;
      height: 24px;
    }
  }

  h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.5;
  }
}

.conflict-comparison {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;

  @media (max-width: 640px) {
    flex-direction: column;
    gap: 20px;
  }
}

.data-card {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  min-width: 0; // prevent overflow

  &.cloud {
    border-color: var(--color-primary);
    background: rgba(var(--color-primary-rgb), 0.02);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .badge {
      font-size: 10px;
      background: var(--color-primary);
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
  }

  .stats {
    .stat-item {
      display: flex;
      flex-direction: column;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }

      .value {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-main);

        &.text-sm {
          font-size: 14px;
        }
      }

      .key {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 2px;
      }
    }
  }
}

.arrow {
  color: var(--text-secondary);
  opacity: 0.5;

  svg {
    width: 24px;
    height: 24px;
  }

  @media (max-width: 640px) {
    transform: rotate(90deg);
  }
}

.conflict-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;

  button {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .btn-use-cloud {
    background: var(--color-primary);
    color: white;
    border: none;

    &:hover {
      filter: brightness(1.1);
    }

    .btn-icon {
      width: 18px;
      height: 18px;
    }
  }

  .btn-keep-local {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-main);

    &:hover {
      background: var(--bg-hover);
    }
  }
}
</style>
