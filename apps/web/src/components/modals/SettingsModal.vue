<template>
  <div class="settings-modal">
    <div class="settings-modal__section">
      <h3 class="settings-modal__section-title">
        <i class="fas fa-adjust" />
        主题
      </h3>
      <div class="settings-modal__theme-options">
        <label class="settings-modal__theme-option">
          <input v-model="theme" type="radio" value="auto" class="settings-modal__theme-radio" />
          <div class="settings-modal__theme-card">
            <div class="settings-modal__theme-preview settings-modal__theme-preview--auto">
              <i class="fas fa-adjust" />
            </div>
            <div class="settings-modal__theme-name">跟随系统</div>
          </div>
        </label>
        <label class="settings-modal__theme-option">
          <input v-model="theme" type="radio" value="light" class="settings-modal__theme-radio" />
          <div class="settings-modal__theme-card">
            <div class="settings-modal__theme-preview settings-modal__theme-preview--light">
              <i class="fas fa-sun" />
            </div>
            <div class="settings-modal__theme-name">亮色</div>
          </div>
        </label>
        <label class="settings-modal__theme-option">
          <input v-model="theme" type="radio" value="dark" class="settings-modal__theme-radio" />
          <div class="settings-modal__theme-card">
            <div class="settings-modal__theme-preview settings-modal__theme-preview--dark">
              <i class="fas fa-moon" />
            </div>
            <div class="settings-modal__theme-name">暗色</div>
          </div>
        </label>
      </div>
    </div>

    <div class="settings-modal__section">
      <h3 class="settings-modal__section-title">
        <i class="fas fa-home" />
        默认首页
      </h3>
      <div class="settings-modal__setting-group">
        <div class="settings-modal__setting-item">
          <label class="settings-modal__setting-label">打开应用时进入</label>
          <div class="settings-modal__radio-group">
            <label class="settings-modal__radio">
              <input v-model="defaultHome" type="radio" value="home" />
              <span>首页</span>
            </label>
            <label class="settings-modal__radio">
              <input v-model="defaultHome" type="radio" value="all" />
              <span>全部</span>
            </label>
            <label class="settings-modal__radio">
              <input v-model="defaultHome" type="radio" value="recent" />
              <span>最近</span>
            </label>
            <label class="settings-modal__radio">
              <input v-model="defaultHome" type="radio" value="favorite" />
              <span>常用</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-modal__actions">
      <BaseButton variant="secondary" @click="onClose">关闭</BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { BaseButton } from '@nav/ui'
import { useSettingsStore } from '@/stores/settings'

const emit = defineEmits<{ (e: 'close'): void }>()
const onClose = () => emit('close')

const store = useSettingsStore()
const theme = ref(store.settings.theme)
const defaultHome = ref(store.settings.defaultHome ?? 'home')

watch(theme, val => store.setTheme(val))
watch(defaultHome, val => store.setDefaultHome(val))
</script>

<style scoped lang="scss">
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

.settings-modal__section {
  padding: var(--spacing-lg);
  background-color: var(--color-neutral-100);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
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
}

.settings-modal__theme-radio:checked + .settings-modal__theme-card {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
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
}

.settings-modal__theme-card:hover {
  border-color: var(--color-neutral-300);
}

.settings-modal__theme-preview {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
}

.settings-modal__theme-preview--light {
  background-color: var(--color-white);
  color: var(--color-neutral-800);
  border: 1px solid var(--color-border);
}

.settings-modal__theme-preview--dark {
  background-color: var(--color-neutral-800);
  color: var(--color-white);
}

.settings-modal__theme-preview--auto {
  background: linear-gradient(135deg, var(--color-white) 50%, var(--color-neutral-800) 50%);
  color: var(--color-primary);
}

.settings-modal__theme-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
}

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

.settings-modal__radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.settings-modal__radio input {
  margin-right: 6px;
}

.settings-modal__actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

@include mobile {
  .settings-modal {
    max-width: 100%;
  }

  .settings-modal__theme-options {
    grid-template-columns: 1fr;
  }

  .settings-modal__setting-item {
    flex-direction: column;
    align-items: stretch;
  }

  .settings-modal__actions {
    flex-direction: column;
  }
}
</style>
