<template>
  <div class="settings-content">
    <div class="settings-section">
      <div class="section-header">
        <div class="section-icon blue">
          <i class="fas fa-home" />
        </div>
        <div class="section-info">
          <h3 class="section-title">默认首页</h3>
          <p class="section-description">设置打开应用时默认显示的页面</p>
        </div>
      </div>

      <div class="settings-group">
        <div class="setting-row">
          <div class="setting-main">
            <div class="setting-info">
              <span class="setting-title">启动页面</span>
              <span class="setting-desc">选择您希望在启动时看到的视图。</span>
            </div>
          </div>
          <div class="setting-action">
            <div class="radio-group">
              <label class="radio-item">
                <input v-model="defaultHome" type="radio" value="home" />
                <span class="radio-label">首页</span>
              </label>
              <label class="radio-item">
                <input v-model="defaultHome" type="radio" value="all" />
                <span class="radio-label">全部</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const store = useSettingsStore()
// Ensure default is valid, fallback to 'home' if it was 'recent' or 'favorite'
const current = store.settings.defaultHome
const validDefault = (['home', 'all'].includes(current || '') ? current : 'home') as 'home' | 'all'
const defaultHome = ref<'home' | 'all'>(validDefault)

watch(defaultHome, val => {
  if (val) store.setDefaultHome(val)
})
</script>

<style scoped lang="scss">
.settings-content {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-primary);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.section-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;

  &.blue {
    background-color: #eff6ff;
    color: #3b82f6;
  }
}

.section-info {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin: 0;
  line-height: 1.4;
}

.section-description {
  font-size: 12px;
  color: var(--color-neutral-500);
  margin: 0;
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-neutral-800);
}

.setting-desc {
  font-size: 12px;
  color: var(--color-neutral-500);
}

.radio-group {
  display: flex;
  gap: 12px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-neutral-700);

  input {
    cursor: pointer;
  }

  &:hover {
    color: var(--color-primary);
  }
}
</style>
