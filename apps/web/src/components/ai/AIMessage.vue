<script setup lang="ts">
/**
 * AI Message Bubble Component
 */
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { AIActionResult } from '@/api/ai'

const props = defineProps<{
  role: 'user' | 'assistant' | 'system'
  content: string
  actionResult?: AIActionResult
  showUndo?: boolean
  showRetry?: boolean
}>()

const emit = defineEmits<{
  undo: []
  retry: []
}>()

const authStore = useAuthStore()
const userAvatar = computed(() => authStore.user?.avatar_url)
</script>

<template>
  <div class="ai-message" :class="role">
    <div class="avatar">
      <img
        v-if="role === 'user' && userAvatar"
        :src="userAvatar"
        alt="用户头像"
        class="avatar-img"
      />
      <img
        v-else-if="role === 'assistant'"
        src="/icons/ai-panel-swallow.png"
        alt="AI 助手"
        class="avatar-img"
      />
      <i v-else class="fas fa-user" />
    </div>
    <div class="bubble">
      <div class="content" v-html="content.replace(/\n/g, '<br>')" />
      <div v-if="props.actionResult?.kind === 'website-added'" class="action-card">
        <img
          v-if="props.actionResult.website.favicon"
          :src="props.actionResult.website.favicon"
          :alt="`${props.actionResult.website.name} 图标`"
          class="action-card__icon"
        />
        <div class="action-card__info">
          <strong>{{ props.actionResult.website.name }}</strong>
          <span>{{ props.actionResult.website.url }}</span>
        </div>
        <button v-if="showUndo" type="button" class="action-card__undo" @click="emit('undo')">
          撤销
        </button>
      </div>
      <button
        v-else-if="props.actionResult && showUndo"
        type="button"
        class="action-card__undo action-card__undo--standalone"
        @click="emit('undo')"
      >
        {{ props.actionResult.kind === 'website-deleted' ? '撤销删除' : '撤销修改' }}
      </button>
      <button v-if="showRetry" type="button" class="message-retry" @click="emit('retry')">
        重试
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ai-message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  animation: message-in 0.3s ease-out;
}

@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ai-message.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
}

.ai-message.user .avatar {
  background: var(--bg-tile);
  border: 1px solid var(--border-tile);
  color: var(--text-secondary);
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ai-message.assistant .avatar {
  background: var(--ai-avatar-assistant-bg);
  color: var(--ai-avatar-assistant-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.bubble {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.6;
  position: relative;
}

.ai-message.user .bubble {
  background: var(--primary-soft);
  color: var(--text-main);
  border-bottom-right-radius: 6px;
  border: 1px solid var(--border-tile-hover);
}

.ai-message.assistant .bubble {
  background: var(--ai-bubble-assistant-bg);
  color: var(--text-main);
  border-bottom-left-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--ai-bubble-assistant-border);
}

.content {
  overflow-wrap: break-word;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 9px 10px;
  border: 1px solid var(--border-tile);
  border-radius: 12px;
  background: var(--bg-panel);
}

.action-card__icon {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border-radius: 8px;
  object-fit: cover;
}

.action-card__info {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.action-card__info strong,
.action-card__info span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-card__info strong {
  color: var(--text-main);
  font-size: 13px;
}

.action-card__info span {
  color: var(--text-muted);
  font-size: 11px;
}

.action-card__undo {
  flex: 0 0 auto;
  padding: 3px 6px;
  border: 0;
  border-radius: 6px;
  background: var(--primary-soft);
  color: var(--color-primary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.action-card__undo:hover {
  background: color-mix(in srgb, var(--color-primary) 16%, transparent);
}

.action-card__undo--standalone {
  margin-top: 8px;
}

.message-retry {
  display: block;
  margin-top: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.message-retry:hover {
  color: var(--color-primary-dark);
  text-decoration: underline;
}

.content :deep(code) {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
}

.ai-message.user .content :deep(code) {
  background: rgba(255, 255, 255, 0.2);
}

// Dark mode overrides using global selector
:global([data-theme='dark']) {
  .ai-message.assistant .avatar {
    background: linear-gradient(135deg, #3d3d4f 0%, #2d2d3a 100%);
  }

  .content :deep(code) {
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>
