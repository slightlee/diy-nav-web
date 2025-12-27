<script setup lang="ts">
/**
 * AI Chat Panel Component
 */
import { ref, nextTick, onMounted } from 'vue'
import { useAIStore } from '@/stores/ai'
import AIMessage from './AIMessage.vue'

const emit = defineEmits<{
  close: []
  minimize: []
}>()

const aiStore = useAIStore()
const inputText = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const isLoading = ref(false)

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
})
</script>

<template>
  <div class="ai-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="header-left">
        <div class="ai-avatar">
          <i class="fas fa-robot" />
        </div>
        <div class="header-title">
          <span class="title">AI 助手</span>
          <span class="subtitle">在线</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="icon-btn close-btn" title="关闭" @click="emit('close')">
          <i class="fas fa-times" />
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div ref="messagesContainer" class="messages-container">
      <div v-if="aiStore.messages.length === 0" class="empty-state">
        <div class="empty-icon">
          <i class="fas fa-comments" />
        </div>
        <h3>你好！我是 AI 助手 👋</h3>
        <p>我可以帮你管理网站导航、添加分类标签</p>
        <div class="quick-actions">
          <button class="quick-btn" @click="inputText = '帮我添加一个网站'">
            <i class="fas fa-plus" />
            添加网站
          </button>
          <button class="quick-btn" @click="inputText = '查看我的备份'">
            <i class="fas fa-cloud" />
            查看备份
          </button>
          <button class="quick-btn" @click="inputText = '列出所有分类'">
            <i class="fas fa-folder" />
            查看分类
          </button>
        </div>
      </div>
      <AIMessage
        v-for="(msg, idx) in aiStore.messages"
        :key="idx"
        :role="msg.role"
        :content="msg.content"
      />
      <div v-if="isLoading" class="loading-indicator">
        <span class="dot" />
        <span class="dot" />
        <span class="dot" />
      </div>
    </div>

    <!-- Input -->
    <div class="input-container">
      <textarea
        v-model="inputText"
        placeholder="输入消息..."
        rows="1"
        :disabled="isLoading"
        @keydown="handleKeydown"
      />
      <button class="send-btn" :disabled="!inputText.trim() || isLoading" @click="sendMessage">
        <i class="fas fa-paper-plane" />
      </button>
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
  border-radius: 20px;
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
  padding: 16px 20px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
  color: white;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.header-title {
  display: flex;
  flex-direction: column;
}

.header-title .title {
  font-weight: 600;
  font-size: 15px;
}

.header-title .subtitle {
  font-size: 11px;
  opacity: 0.8;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.8);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  min-height: 220px;
  max-height: 340px;
  background: transparent;
}

.empty-state {
  text-align: center;
  padding: 24px 16px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: var(--ai-empty-icon-bg);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #3b82f6;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
}

.empty-state p {
  margin: 0 0 20px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 12px;
  background: var(--ai-quick-btn-bg);
  border: 1px solid var(--ai-quick-btn-border);
  border-radius: 20px;
  color: var(--ai-quick-btn-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-btn:hover {
  background: var(--bg-tile-hover);
  border-color: #8b5cf6;
  color: #3b82f6;
  transform: translateY(-1px);
}

.quick-btn i {
  font-size: 10px;
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
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-indicator .dot:nth-child(1) {
  animation-delay: -0.32s;
}
.loading-indicator .dot:nth-child(2) {
  animation-delay: -0.16s;
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
  padding: 16px 20px;
  background: var(--ai-panel-bg);
  border-top: 1px solid var(--border-tile);
}

.input-container textarea {
  flex: 1;
  border: 1px solid var(--ai-input-border);
  border-radius: 12px;
  padding: 12px 16px;
  resize: none;
  font-size: 14px;
  background: var(--ai-input-bg);
  color: var(--text-main);
  transition: all 0.2s ease;
}

.input-container textarea::placeholder {
  color: var(--text-muted);
}

.input-container textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.send-btn:not(:disabled):hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.send-btn:not(:disabled):active {
  transform: scale(0.98);
}

// Dark mode overrides using global selector
:global([data-theme='dark']) {
  .messages-container {
    background: transparent;
  }

  .empty-icon {
    background: linear-gradient(135deg, #2d2d3a 0%, #3d3d4f 100%);
  }

  .quick-btn:hover {
    background: #3d3d4f;
    color: #a78bfa;
  }
}
</style>
