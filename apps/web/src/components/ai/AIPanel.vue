<script setup lang="ts">
/**
 * AI Chat Panel Component
 */
import { ref, nextTick, onMounted } from 'vue'
import { BaseButton } from '@nav/ui'
import { useAIStore } from '@/stores/ai'
import AIMessage from './AIMessage.vue'

const emit = defineEmits<{
  close: []
}>()

const aiStore = useAIStore()
const inputText = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const messagesContainer = ref<HTMLElement | null>(null)
const isLoading = ref(false)

const resizeInput = () => {
  const input = inputRef.value
  if (!input) return

  input.style.height = 'auto'
  const contentHeight = input.value ? input.scrollHeight : 40
  input.style.height = `${Math.min(contentHeight, 104)}px`
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || isLoading.value) return

  inputText.value = ''
  nextTick(resizeInput)
  aiStore.addMessage({ role: 'user', content: text })
  scrollToBottom()

  isLoading.value = true
  try {
    await aiStore.sendChat()
    scrollToBottom()
  } finally {
    isLoading.value = false
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

onMounted(() => {
  scrollToBottom()
  resizeInput()
})
</script>

<template>
  <div class="ai-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="header-left">
        <div class="ai-avatar">
          <img class="ai-mark" src="/icons/ai-panel-swallow.png" alt="" />
        </div>
        <div class="header-title">
          <span class="title">AI 助手</span>
          <span class="subtitle">在线</span>
        </div>
      </div>
      <div class="header-actions">
        <BaseButton
          variant="neutral-ghost"
          size="sm"
          icon="fas fa-times"
          title="关闭"
          aria-label="关闭 AI 助手"
          @click="emit('close')"
        />
      </div>
    </div>

    <!-- Messages -->
    <div ref="messagesContainer" class="messages-container">
      <div v-if="aiStore.messages.length === 0" class="empty-state">
        <h3>你好！我是 AI 助手 👋</h3>
        <p>我可以帮你管理网站导航、添加分类标签</p>
        <div class="quick-actions">
          <BaseButton
            variant="secondary"
            size="sm"
            icon="fas fa-plus"
            @click="inputText = '帮我添加一个网站'"
          >
            添加网站
          </BaseButton>
          <BaseButton
            variant="secondary"
            size="sm"
            icon="fas fa-cloud"
            @click="inputText = '查看我的备份'"
          >
            查看备份
          </BaseButton>
          <BaseButton
            variant="secondary"
            size="sm"
            icon="fas fa-folder"
            @click="inputText = '列出所有分类'"
          >
            查看分类
          </BaseButton>
        </div>
      </div>
      <AIMessage
        v-for="(msg, idx) in aiStore.messages"
        :key="idx"
        :role="msg.role"
        :content="msg.content"
        :action-result="msg.actionResult"
        :show-undo="msg.actionResult?.undoId === aiStore.undoAction?.id"
        :show-retry="msg.content.startsWith('抱歉，发生错误')"
        @undo="aiStore.undoLastAction"
        @retry="aiStore.retryLastMessage"
      />
      <div v-if="aiStore.pendingAction" class="action-confirmation">
        <span>确认{{ aiStore.pendingAction.message }}？</span>
        <div class="action-confirmation__actions">
          <BaseButton variant="neutral-ghost" size="xs" @click="aiStore.cancelPendingAction">
            取消
          </BaseButton>
          <BaseButton variant="primary" size="xs" @click="aiStore.confirmPendingAction">
            确认执行
          </BaseButton>
        </div>
      </div>
      <div v-if="isLoading" class="loading-indicator">
        <span class="dot" />
        <span class="dot" />
        <span class="dot" />
      </div>
    </div>

    <!-- Input -->
    <div class="input-container">
      <textarea
        ref="inputRef"
        v-model="inputText"
        placeholder="输入消息..."
        rows="1"
        :disabled="isLoading || !!aiStore.pendingAction"
        @input="resizeInput"
        @keydown="handleKeydown"
      />
      <BaseButton
        variant="ghost"
        size="sm"
        icon="fas fa-paper-plane"
        title="发送"
        aria-label="发送消息"
        :disabled="!inputText.trim() || isLoading || !!aiStore.pendingAction"
        @click="sendMessage"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.ai-panel {
  position: absolute;
  bottom: 75px;
  right: 0;
  width: 400px;
  height: 520px;
  background: var(--ai-panel-bg);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: var(--ai-panel-shadow);
  border: 1px solid var(--ai-panel-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  background: var(--ai-header-bg);
  color: var(--ai-header-text);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  background: var(--ai-empty-icon-bg);
  border: 1px solid var(--ai-panel-border);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.ai-avatar .ai-mark {
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.header-title {
  display: flex;
  flex-direction: column;
}

.header-title .title {
  font-weight: 600;
  font-size: 16px;
}

.header-title .subtitle {
  font-size: 11px;
  color: var(--ai-header-muted);
}

.header-actions {
  display: flex;
  gap: 6px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 18px 18px 12px;
  min-height: 220px;
  max-height: 340px;
  background: transparent;
}

.empty-state {
  text-align: center;
  padding: 66px 14px 10px;
}

.empty-state h3 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
}

.empty-state p {
  margin: 0 0 18px;
  font-size: 13px;
  color: var(--text-secondary);
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.loading-indicator {
  display: flex;
  gap: 6px;
  padding: 16px;
  align-items: center;
}

.loading-indicator .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--ai-send-bg);
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-indicator .dot:nth-child(1) {
  animation-delay: -0.32s;
}
.loading-indicator .dot:nth-child(2) {
  animation-delay: -0.16s;
}

.action-confirmation {
  margin: 0 0 12px 48px;
  padding: 10px 12px;
  border: 1px solid var(--ai-bubble-assistant-border);
  border-radius: 16px;
  background: var(--ai-bubble-assistant-bg);
  color: var(--text-main);
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.action-confirmation__actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
    opacity: 0.5;
  }

  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.input-container {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  margin: 0 18px 16px;
  padding: 8px 8px 8px 15px;
  background: var(--ai-input-bg);
  border: 1px solid var(--ai-input-border);
  border-radius: 18px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.input-container:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
}

.input-container textarea {
  flex: 1;
  min-width: 0;
  border: none;
  border-radius: 12px;
  padding: 6px 0;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  min-height: 40px;
  max-height: 104px;
  overflow-y: auto;
  background: transparent;
  color: var(--text-main);
  transition: color 0.2s ease;
}

.input-container textarea::placeholder {
  color: var(--text-muted);
}

.input-container textarea:focus {
  outline: none;
}

// Dark mode overrides using global selector
:global([data-theme='dark']) {
  .messages-container {
    background: transparent;
  }
}
</style>
