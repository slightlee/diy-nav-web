<script setup lang="ts">
/**
 * AI Message Bubble Component
 */
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

defineProps<{
  role: 'user' | 'assistant' | 'system'
  content: string
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
      <i v-else :class="role === 'user' ? 'fas fa-user' : 'fas fa-robot'" />
    </div>
    <div class="bubble">
      <div class="content" v-html="content.replace(/\n/g, '<br>')" />
    </div>
  </div>
</template>

<style scoped>
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
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ai-message.assistant .avatar {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  color: #6b7280;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
  color: white;
  border-bottom-right-radius: 6px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.ai-message.assistant .bubble {
  background: white;
  color: #1f2937;
  border-bottom-left-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.content {
  overflow-wrap: break-word;
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

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .ai-message.assistant .avatar {
    background: linear-gradient(135deg, #3d3d4f 0%, #2d2d3a 100%);
    color: #d1d5db;
  }

  .ai-message.assistant .bubble {
    background: #2d2d3a;
    color: #f3f4f6;
    border-color: rgba(255, 255, 255, 0.05);
  }

  .content :deep(code) {
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>
