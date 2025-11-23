<template>
  <div class="settings-modal">
    <!-- 高级设置 -->
    <div class="settings-modal__section">
      <h3 class="settings-modal__section-title">
        <i class="fas fa-keyboard" />
        快捷键
      </h3>

      <div class="settings-modal__shortcuts-section">
        <div class="settings-modal__shortcuts-list">
          <div
            v-for="shortcut in shortcuts"
            :key="shortcut.id"
            class="settings-modal__shortcut-item"
          >
            <span class="settings-modal__shortcut-name">{{ shortcut.name }}</span>
            <kbd class="settings-modal__shortcut-key">{{ shortcut.keybind }}</kbd>
          </div>
        </div>
      </div>
    </div>
    <div class="settings-modal__section">
      <h3 class="settings-modal__section-title">
        <i class="fas fa-home" />
        默认首页
      </h3>
      <div class="settings-modal__setting-item">
        <label class="settings-modal__setting-label">打开应用时进入</label>
        <select
          class="settings-modal__setting-select"
          :value="settings.defaultHome || 'home'"
          @change="settingsStore.setDefaultHome(($event.target as HTMLSelectElement).value as any)"
        >
          <option value="home">主页</option>
          <option value="all">全部</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'

import type { UserSettings } from '@/types'

interface Emits {
  (e: 'close'): void
}

const emit = defineEmits<Emits>()

// Store
const settingsStore = useSettingsStore()

// 设置数据
const settings = ref<UserSettings>({
  theme: 'light',
  customBackground: '',
  autoBackup: true,
  shortcuts: {}
})

// 快捷键列表
const shortcuts = computed(() => [
  { id: 'add-website', name: '添加网站', keybind: 'Ctrl+N' },
  { id: 'quick-search', name: '快速搜索', keybind: 'Ctrl+K' },
  { id: 'manage-categories', name: '管理分类', keybind: 'Ctrl+Shift+C' },
  { id: 'manage-tags', name: '管理标签', keybind: 'Ctrl+Shift+T' },
  { id: 'settings', name: '设置', keybind: 'Ctrl+,' }
])

// 初始化设置
const initializeSettings = () => {
  const saved = localStorage.getItem('userSettings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      settings.value = { ...settings.value, ...parsed }
    } catch (error) {
      console.error('解析设置失败:', error)
    }
  }
}

// 生命周期
onMounted(() => {
  initializeSettings()
})
</script>

<style scoped lang="scss">
@use 'sass:color';
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.settings-modal {
  width: 100%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
  overflow-y: auto;
}

// 区域样式
.settings-modal__section {
  padding: var(--spacing-lg);
  background-color: var(--color-neutral-100);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);

  &--danger {
    border-color: var(--color-error);
    background-color: var(--color-neutral-100);
  }
}

.settings-modal__section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-lg) 0;
}

// 数据管理区域
.settings-modal__data-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.settings-modal__data-action {
  padding: var(--spacing-md);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-primary);
    background-color: rgba(var(--color-primary-rgb), 0.06);
  }
}

.settings-modal__action-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-xs) 0;
}

.settings-modal__action-description {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-600);
  margin: 0 0 var(--spacing-md) 0;
  line-height: var(--line-height-normal);
}

.settings-modal__action-btn {
  width: 100%;
}

// 主题设置
.settings-modal__theme-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-md);
}

.settings-modal__theme-option {
  cursor: pointer;
}

.settings-modal__theme-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;

  &:checked + .settings-modal__theme-card {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
  }
}

.settings-modal__theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-neutral-300);
  }
}

.settings-modal__theme-preview {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);

  &--light {
    background-color: var(--color-white);
    color: var(--color-neutral-800);
    border: 1px solid var(--color-border);
  }

  &--dark {
    background-color: var(--color-neutral-800);
    color: var(--color-white);
  }

  &--auto {
    background: linear-gradient(135deg, var(--color-white) 50%, var(--color-neutral-800) 50%);
    color: var(--color-primary);
  }
}

.settings-modal__theme-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
}

// 设置组
.settings-modal__setting-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.settings-modal__setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.settings-modal__setting-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
}

.settings-modal__setting-select {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-neutral-100);
  color: var(--color-neutral-700);
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);

  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

// 复选框设置
.settings-modal__checkbox-setting {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  cursor: pointer;
}

.settings-modal__checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
  margin-top: 2px;
}

.settings-modal__checkbox-text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
}

.settings-modal__checkbox-description {
  font-size: var(--font-size-xs);
  color: var(--color-neutral-500);
  margin-top: var(--spacing-xs);
}

// 快捷键
.settings-modal__shortcuts-section {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-neutral-200);
}

.settings-modal__shortcuts-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-md) 0;
}

.settings-modal__shortcuts-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-sm);
}

.settings-modal__shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-neutral-50);
  border-radius: var(--radius-sm);
}

.settings-modal__shortcut-name {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-700);
}

.settings-modal__shortcut-key {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-neutral-200);
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-family: var(--font-family-mono);
  color: var(--color-neutral-700);
}

// 危险操作
.settings-modal__danger-description {
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin: 0 0 var(--spacing-md) 0;
}

.settings-modal__danger-btn {
  background-color: var(--color-error);
  color: var(--color-white);

  &:hover {
    background-color: rgba(var(--color-error-rgb), 0.9);
  }
}

// 操作按钮
.settings-modal__actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

// 响应式适配
@include mobile {
  .settings-modal {
    max-width: 100%;
  }

  .settings-modal__data-actions {
    grid-template-columns: 1fr;
  }

  .settings-modal__theme-options {
    grid-template-columns: 1fr;
  }

  .settings-modal__setting-item {
    flex-direction: column;
    align-items: stretch;
  }

  .settings-modal__shortcuts-list {
    grid-template-columns: 1fr;
  }

  .settings-modal__actions {
    flex-direction: column;
  }
}

// 高对比度模式
@media (prefers-contrast: high) {
  .settings-modal__section {
    border-width: 2px;
  }

  .settings-modal__theme-card {
    border-width: 2px;
  }

  .settings-modal__setting-select {
    border-width: 2px;
  }
}

// 减少动画偏好
@media (prefers-reduced-motion: reduce) {
  .settings-modal__theme-card,
  .settings-modal__data-action,
  .settings-modal__setting-select {
    transition: none;
  }
}
</style>
