<template>
  <div class="empty-state" :class="emptyStateClasses">
    <!-- 图标区域 -->
    <div class="empty-state__icon">
      <component :is="iconComponent" class="empty-state__icon-component" />
      <i v-if="!iconComponent" class="fas" :class="[`fa-${icon}`]" />
    </div>

    <!-- 内容区域 -->
    <div class="empty-state__content">
      <h2 class="empty-state__title">
        {{ typeConfig.title }}
      </h2>
      <p class="empty-state__description">
        {{ typeConfig.description }}
      </p>

      <!-- 操作按钮 -->
      <BaseButton
        v-if="props.showActionButton"
        :variant="buttonVariant"
        :icon="props.actionButtonIcon"
        class="empty-state__action-btn"
        @click="handleAction"
      >
        {{ props.actionButtonText || '操作' }}
      </BaseButton>

      <!-- 额外内容插槽 -->
      <slot v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from './base/BaseButton.vue'
import { useRouter } from 'vue-router'

interface TypeConfig {
  title: string
  description: string
  icon?: string
  showActionButton: boolean
  actionButtonText?: string
  actionButtonIcon?: string
  eventName?: string
}

interface Props {
  type: 'no-websites' | 'no-search-results' | 'no-categories' | 'no-tags' | 'no-data' | 'error' | 'loading' | 'network-error'
  title?: string
  description?: string
  icon?: string
  showActionButton?: boolean
  actionButtonText?: string
  actionButtonIcon?: string
  eventName?: string
}

interface Emits {
  (e: 'action'): void
}

const props = withDefaults(defineProps<Props>(), {
  type: 'no-data',
  showActionButton: true
})

const emit = defineEmits<Emits>()

// 数据类型获取默认配置
const typeConfig = computed(() => {
  switch (props.type) {
    case 'no-websites':
      return {
        title: props.title || '还没有添加任何网站',
        description: props.description || '还没有添加任何网站，点击下方按钮开始添加第一个网站',
        icon: props.icon || 'fas fa-globe',
        actionButtonText: props.actionButtonText || '添加网站',
        actionButtonIcon: props.actionButtonIcon || 'fas fa-plus',
        eventName: 'add-website'
      }
    case 'no-search-results':
      return {
        title: props.title || '没有找到匹配的网站',
        description: props.description || '试试调整搜索关键词或筛选条件，或许能找到你想要的内容',
        icon: props.icon || 'fas fa-search',
        actionButtonText: props.actionButtonText || '清除搜索',
        actionButtonIcon: props.actionButtonIcon || 'fas fa-times',
        eventName: 'retry'
      }
    case 'no-categories':
      return {
        title: props.title || '还没有创建分类',
        description: props.description || '创建分类可以帮助你更好地组织和管理网站',
        icon: props.icon || 'fas fa-folder',
        actionButtonText: props.actionButtonText || '创建分类',
        actionButtonIcon: props.actionButtonIcon || 'fas fa-plus',
        eventName: 'add-category'
      }
    case 'no-tags':
      return {
        title: props.title || '还没有添加标签',
        description: props.description || '标签可以帮助你更灵活地筛选和组织网站',
        icon: props.icon || 'fas fa-tags',
        actionButtonText: props.actionButtonText || '添加标签',
        actionButtonIcon: props.actionButtonIcon || 'fas fa-plus',
        eventName: 'add-tag'
      }
    case 'no-data':
      return {
        title: props.title || '这里还没有任何内容',
        description: props.description || '这里还没有任何内容',
        icon: props.icon || 'fas fa-inbox',
        actionButtonText: props.actionButtonText || '开始添加',
        actionButtonIcon: props.actionButtonIcon || 'fas fa-plus',
        eventName: 'action'
      }
    case 'error':
      return {
        title: props.title || '出错了',
        description: props.description || '发生了未知错误，请稍后重试',
        icon: props.icon || 'fas fa-exclamation-triangle',
        actionButtonText: props.actionButtonText || '重试',
        actionButtonIcon: props.actionButtonIcon || 'fas fa-redo',
        eventName: 'retry'
      }
    case 'loading':
      return {
        title: props.title || '加载中...',
        description: props.description || '正在努力获取数据，请稍候',
        icon: props.icon || 'fas fa-spinner fa-spin',
        actionButtonText: undefined,
        actionButtonIcon: undefined,
        eventName: 'retry'
      }
    case 'network-error':
      return {
        title: props.title || '网络错误',
        description: props.description || '网络连接出现问题，请检查网络设置',
        icon: props.icon || 'fas fa-wifi',
        actionButtonText: props.actionButtonText || '重试',
        actionButtonIcon: props.actionButtonIcon || 'fas fa-redo',
        eventName: 'retry'
      }
    default:
      return {
        title: props.title || '未知状态',
        description: props.description || '遇到了未知的状态',
        icon: props.icon || 'fas fa-question-circle',
        actionButtonText: props.actionButtonText || '确定',
        actionButtonIcon: props.actionButtonIcon || 'fas fa-check',
        eventName: 'action'
      }
  }
})

// 默认图标组件
const iconComponent = computed(() => {
  switch (props.type) {
    case 'no-websites':
    case 'no-search-results':
      return { template: '<i class="fas fa-globe"></i>' }
    case 'no-categories':
      return { template: '<i class="fas fa-folder"></i>' }
    case 'no-tags':
      return { template: '<i class="fas fa-tags"></i>' }
    case 'no-data':
      return { template: '<i class="fas fa-inbox"></i>' }
    case 'error':
      return { template: '<i class="fas fa-exclamation-triangle"></i>' }
    case 'loading':
      return { template: '<i class="fas fa-spinner fa-spin"></i>' }
    case 'network-error':
      return { template: '<i class="fas fa-wifi"></i>' }
    default:
      return { template: '<i class="fas fa-exclamation-circle"></i>' }
  }
})

const config = computed(() => typeConfig.value)

// 计算样式类
const emptyStateClasses = computed(() => ({
  'empty-state--with-icon': !!props.icon,
  'empty-state--with-description': !!props.description,
  'empty-state--with-action': props.showActionButton
}))

// 按钮变体
const buttonVariant = computed(() => {
  switch (props.type) {
    case 'error':
    case 'network-error':
      return 'danger'
    default:
      return 'primary'
  }
})

const handleAction = () => {
  emit('action')
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-xl);
  min-height: 200px;
}

.empty-state--with-icon { padding-top: var(--spacing-xl); }

.empty-state--with-description { padding: 0 var(--spacing-lg); }

.empty-state--with-action { padding-top: var(--spacing-lg); }

.empty-state__icon {
  margin-bottom: var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: var(--radius-xl);
  background-color: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  font-size: 48px;
}

.empty-state__icon-component {
  font-size: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state__content {
  text-align: center;
}

.empty-state__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-md) 0;
}

.empty-state__description {
  font-size: var(--font-size-base);
  color: var(--color-neutral-600);
  margin: 0 0 var(--spacing-lg) 0;
  line-height: var(--line-height-relaxed);
}

.empty-state__action-btn {
  margin-top: var(--spacing-lg);
}
</style>
