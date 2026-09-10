<template>
  <!-- 与账号 / 数据管理 / AI 一致的分区卡片外壳 -->
  <div class="prefs">
    <section class="prefs-card">
      <div class="prefs-card__body">
        <div class="launch">
          <div class="launch__copy">
            <div class="launch__title">启动页面</div>
            <div class="launch__hint">打开应用时默认进入</div>
          </div>
          <div class="seg" role="radiogroup" aria-label="启动页面">
            <button
              type="button"
              role="radio"
              class="seg__btn"
              :class="{ 'is-on': defaultHome === 'home' }"
              :aria-checked="defaultHome === 'home'"
              @click="defaultHome = 'home'"
            >
              首页
            </button>
            <button
              type="button"
              role="radio"
              class="seg__btn"
              :class="{ 'is-on': defaultHome === 'all' }"
              :aria-checked="defaultHome === 'all'"
              @click="defaultHome = 'all'"
            >
              全部
            </button>
          </div>
        </div>

        <div class="rule" role="separator" />

        <div class="preference-row">
          <div class="launch__copy">
            <div class="launch__title">小鸟飞行动效</div>
            <div class="launch__hint">控制打开和关闭面板时的小鸟动画</div>
          </div>
          <button
            type="button"
            role="switch"
            class="switch"
            :class="{ 'is-on': aiAnimationEnabled }"
            :aria-checked="aiAnimationEnabled"
            @click="toggleAIAnimation"
          >
            <span class="switch__thumb" />
            <span class="sr-only">{{ aiAnimationEnabled ? '已开启' : '已关闭' }}</span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'

const store = useSettingsStore()
const authStore = useAuthStore()

const current = store.settings.defaultHome
const validDefault = (['home', 'all'].includes(current || '') ? current : 'home') as 'home' | 'all'
const defaultHome = ref<'home' | 'all'>(validDefault)
const aiAnimationEnabled = ref(store.settings.aiAnimationEnabled !== false)

watch(defaultHome, val => {
  if (val) {
    store.setDefaultHome(val)
    if (authStore.isAuthenticated) void store.saveRemotePreferences(authStore.user?.id)
  }
})

const toggleAIAnimation = () => {
  aiAnimationEnabled.value = !aiAnimationEnabled.value
  store.updateSettings({ aiAnimationEnabled: aiAnimationEnabled.value })
  if (authStore.isAuthenticated) void store.saveRemotePreferences(authStore.user?.id)
}
</script>

<style scoped lang="scss">
.prefs {
  width: 100%;
  max-width: 820px;
}

.prefs-card {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  background: transparent;
  overflow: hidden;
  box-shadow: none;
}

.prefs-card__body {
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.rule {
  height: 1px;
  background: rgba(148, 163, 184, 0.14);
  margin: 18px 0;
}

/* ——— 通用行（与账号/数据管理一致的横排布局） ——— */
.launch,
.preference-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.launch__copy {
  min-width: 0;
}

.launch__title {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 600;
}

.launch__hint {
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

/* ——— 分段选择（启动页面） ——— */
.seg {
  display: inline-flex;
  padding: 3px;
  border-radius: 9px;
  background: rgba(148, 163, 184, 0.12);
  gap: 2px;
  flex-shrink: 0;
}

.seg__btn {
  border: none;
  background: transparent;
  padding: 6px 16px;
  border-radius: 7px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;

  &:hover {
    color: var(--text-main);
  }

  &.is-on {
    background: var(--bg-panel, #fff);
    color: var(--text-main);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
  }
}

/* ——— 开关（小鸟动效） ——— */
.switch {
  position: relative;
  width: 42px;
  height: 24px;
  border-radius: 999px;
  border: none;
  background: rgba(148, 163, 184, 0.4);
  cursor: pointer;
  transition: background 0.2s ease;
  flex-shrink: 0;

  &.is-on {
    background: var(--color-primary);
  }
}

.switch__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  .is-on & {
    transform: translateX(18px);
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
</style>
