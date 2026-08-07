<script setup lang="ts">
/**
 * AI Message Bubble Component
 */
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import type { AIActionResult } from '@/api/ai'

const props = defineProps<{
  role: 'user' | 'assistant' | 'system'
  content: string
  actionResult?: AIActionResult
  showUndo?: boolean
  showRetry?: boolean
  isLoading?: boolean
}>()

const emit = defineEmits<{
  undo: []
  retry: []
}>()

const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()
const userAvatar = computed(() => authStore.user?.avatar_url)
const actionWebsite = computed(() =>
  props.actionResult?.kind === 'website-added' ? props.actionResult.website : null
)
const actionClassificationFailed = computed(
  () => props.actionResult?.kind === 'website-added' && props.actionResult.classificationFailed
)
const actionCategoryName = computed(() => {
  const categoryId = actionWebsite.value?.categoryId
  return categoryId ? categoryStore.getCategoryById(categoryId)?.name : undefined
})
const actionTags = computed(() =>
  (actionWebsite.value?.tagIds || []).flatMap(tagId => {
    const tag = tagStore.getTagById(tagId)
    return tag ? [tag] : []
  })
)
const visibleActionTags = computed(() => actionTags.value.slice(0, 3))
const hiddenActionTagCount = computed(() => Math.max(0, actionTags.value.length - 3))
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
    <div
      class="bubble"
      :class="{ 'is-loading': isLoading }"
      :role="isLoading ? 'status' : undefined"
      :aria-live="isLoading ? 'polite' : undefined"
      :aria-label="isLoading ? 'AI 助手正在思考' : undefined"
    >
      <div v-if="isLoading" class="message-loading" aria-hidden="true">
        <span class="dot" />
        <span class="dot" />
        <span class="dot" />
      </div>
      <template v-else>
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
            <span class="action-card__url">{{ props.actionResult.website.url }}</span>
            <div class="action-card__meta">
              <div class="action-card__meta-row">
                <i class="fas fa-folder" aria-hidden="true" />
                <span class="action-card__meta-label">分类</span>
                <span
                  class="action-card__meta-value"
                  :class="{
                    'is-empty': !actionCategoryName && !actionClassificationFailed,
                    'is-error': !actionCategoryName && actionClassificationFailed
                  }"
                >
                  {{
                    actionCategoryName || (actionClassificationFailed ? '自动归类失败' : '未分类')
                  }}
                </span>
              </div>
              <div class="action-card__meta-row action-card__meta-row--tags">
                <i class="fas fa-tags" aria-hidden="true" />
                <span class="action-card__meta-label">标签</span>
                <div v-if="visibleActionTags.length" class="action-card__tags">
                  <span
                    v-for="tag in visibleActionTags"
                    :key="tag.id"
                    class="action-card__tag"
                    :title="tag.name"
                  >
                    <span
                      class="action-card__tag-color"
                      :style="{ backgroundColor: tag.color }"
                      aria-hidden="true"
                    />
                    <span class="action-card__tag-name">{{ tag.name }}</span>
                  </span>
                  <span v-if="hiddenActionTagCount" class="action-card__tag-more">
                    +{{ hiddenActionTagCount }}
                  </span>
                </div>
                <span
                  v-else
                  class="action-card__meta-value"
                  :class="actionClassificationFailed ? 'is-error' : 'is-empty'"
                >
                  {{ actionClassificationFailed ? '标签未生成' : '暂无标签' }}
                </span>
              </div>
            </div>
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
      </template>
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

.bubble.is-loading {
  min-width: 68px;
}

.message-loading {
  display: flex;
  min-height: 20px;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.message-loading .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ai-send-bg);
  animation: message-loading-bounce 1.4s infinite ease-in-out both;
}

.message-loading .dot:nth-child(1) {
  animation-delay: -0.32s;
}

.message-loading .dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes message-loading-bounce {
  0%,
  80%,
  100% {
    opacity: 0.45;
    transform: scale(0.7);
  }

  40% {
    opacity: 1;
    transform: scale(1);
  }
}

.content {
  overflow-wrap: break-word;
}

.action-card {
  display: flex;
  align-items: flex-start;
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

.action-card__info > strong,
.action-card__url {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-card__info strong {
  color: var(--text-main);
  font-size: 13px;
}

.action-card__url {
  color: var(--text-muted);
  font-size: 11px;
}

.action-card__meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 7px;
  padding-top: 7px;
  border-top: 1px solid var(--border-tile);
}

.action-card__meta-row {
  display: grid;
  grid-template-columns: 12px 28px minmax(0, 1fr);
  gap: 5px;
  align-items: center;
  min-height: 18px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.4;
}

.action-card__meta-row--tags {
  align-items: start;
}

.action-card__meta-row > i {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 10px;
  text-align: center;
}

.action-card__meta-label {
  color: var(--text-muted);
}

.action-card__meta-value {
  min-width: 0;
  overflow: hidden;
  color: var(--text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-card__meta-value.is-empty {
  color: var(--text-muted);
}

.action-card__meta-value.is-error {
  color: var(--color-error);
}

.action-card__tags {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 4px;
}

.action-card__tag,
.action-card__tag-more {
  display: inline-flex;
  max-width: 88px;
  min-height: 18px;
  align-items: center;
  gap: 4px;
  padding: 1px 5px;
  border: 1px solid var(--border-tile);
  border-radius: 6px;
  background: var(--bg-tile);
  color: var(--text-secondary);
  line-height: 1.3;
}

.action-card__tag-color {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: 50%;
}

.action-card__tag-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-card__tag-more {
  color: var(--text-muted);
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
