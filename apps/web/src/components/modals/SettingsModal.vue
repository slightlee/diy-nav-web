<template>
  <!-- 与账号 / 数据管理 / AI 一致的分区卡片外壳 -->
  <div class="prefs">
    <section class="prefs-card">
      <div class="prefs-card__body">
        <div class="identity">
          <div
            class="identity__mark"
            :class="{
              'is-image': hasImagePreview,
              'is-letter': !hasImagePreview
            }"
            aria-hidden="true"
          >
            <img
              v-if="hasImagePreview"
              :src="urlIconDraft.trim()"
              class="identity__mark-img"
              alt=""
              @error="urlPreviewBroken = true"
              @load="urlPreviewBroken = false"
            />
            <span v-else>{{ fallbackLetter }}</span>
          </div>
          <div class="identity__title">{{ navTitleDraft.trim() || '导航名称' }}</div>
        </div>

        <div class="fields">
          <div class="field-block">
            <div class="field-block__head">
              <label class="field-block__label" for="nav-title-input">导航名称</label>
              <span class="field-block__meta">{{ titleLen }}/{{ titleMax }}</span>
            </div>
            <input
              id="nav-title-input"
              v-model="navTitleDraft"
              class="input"
              type="text"
              placeholder="例如：一点导航"
              spellcheck="false"
              @input="onTitleInput"
              @blur="commitBrand"
            />
          </div>

          <div class="field-block">
            <div class="field-block__head">
              <label class="field-block__label" for="nav-icon-url">图标链接</label>
            </div>
            <div
              class="input-shell"
              :class="{
                'is-invalid': urlIconDraft.trim() && !urlIsReady
              }"
            >
              <input
                id="nav-icon-url"
                v-model="urlIconDraft"
                class="input input--with-action"
                type="url"
                inputmode="url"
                autocomplete="url"
                placeholder="https://example.com/logo.png"
                spellcheck="false"
                @blur="commitBrand"
              />
              <button
                v-if="urlIconDraft.trim()"
                type="button"
                class="input-shell__clear"
                title="清除"
                aria-label="清除图标链接"
                @click="clearIconUrl"
              >
                <i class="fas fa-times" />
              </button>
            </div>
            <p v-if="urlHelpText" class="field-block__hint is-warn">{{ urlHelpText }}</p>
          </div>
        </div>

        <div class="rule" role="separator" />

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
            <div class="launch__title">燕子飞行动效</div>
            <div class="launch__hint">控制打开和关闭面板时的飞行动画</div>
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
import { ref, watch, computed, onUnmounted } from 'vue'
import {
  NAVIGATION_BRAND_CONFIG,
  clampNavigationTitle,
  countNavigationTitle
} from '@nav/config/brand'
import { useSettingsStore, isNavIconUrl, isNavIconFa } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'

const store = useSettingsStore()
const authStore = useAuthStore()
const titleMax = NAVIGATION_BRAND_CONFIG.titleMaxLength

const current = store.settings.defaultHome
const validDefault = (['home', 'all'].includes(current || '') ? current : 'home') as 'home' | 'all'
const defaultHome = ref<'home' | 'all'>(validDefault)
const aiAnimationEnabled = ref(store.settings.aiAnimationEnabled !== false)

const rawTitle = store.settings.navTitle || NAVIGATION_BRAND_CONFIG.defaultTitle
const navTitleDraft = ref(clampNavigationTitle(rawTitle))

const savedIcon = (store.settings.navIcon || '').trim()
const urlIconDraft = ref(isNavIconUrl(savedIcon) ? savedIcon : '')
const urlPreviewBroken = ref(false)

const titleLen = computed(() => countNavigationTitle(navTitleDraft.value))
const urlIsReady = computed(() => isNavIconUrl(urlIconDraft.value))
const hasImagePreview = computed(() => urlIsReady.value && !urlPreviewBroken.value)

const fallbackLetter = computed(() => {
  const title = navTitleDraft.value.trim()
  const [firstCharacter] = Array.from(title)
  if (firstCharacter) return firstCharacter.toUpperCase()
  return NAVIGATION_BRAND_CONFIG.defaultIcon
})

const urlHelpText = computed(() => {
  const raw = urlIconDraft.value.trim()
  if (!raw) return ''
  if (!urlIsReady.value) return '请输入完整图片链接'
  if (urlPreviewBroken.value) return '图片加载失败'
  return ''
})

const onTitleInput = () => {
  const next = clampNavigationTitle(navTitleDraft.value)
  if (next !== navTitleDraft.value) navTitleDraft.value = next
}

const commitBrand = () => {
  const title = clampNavigationTitle(navTitleDraft.value) || NAVIGATION_BRAND_CONFIG.defaultTitle
  const url = urlIconDraft.value.trim()

  if (!url) {
    const savedIcon = (store.settings.navIcon || '').trim()
    const icon = isNavIconFa(savedIcon)
      ? savedIcon
      : Array.from(title)[0] || NAVIGATION_BRAND_CONFIG.defaultIcon
    store.setNavBrand({ navTitle: title, navIcon: icon })
  } else if (isNavIconUrl(url)) {
    store.setNavBrand({ navTitle: title, navIcon: url })
  } else {
    store.setNavBrand({ navTitle: title })
  }

  navTitleDraft.value = store.settings.navTitle || title
  if (authStore.isAuthenticated) void store.saveRemotePreferences(authStore.user?.id)
}

const clearIconUrl = () => {
  urlIconDraft.value = ''
  urlPreviewBroken.value = false
  commitBrand()
}

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

watch(urlIconDraft, () => {
  urlPreviewBroken.value = false
})

let brandTimer: number | undefined
const scheduleCommit = () => {
  if (brandTimer) window.clearTimeout(brandTimer)
  brandTimer = window.setTimeout(() => commitBrand(), 320)
}

watch(navTitleDraft, scheduleCommit)
watch(urlIconDraft, scheduleCommit)

onUnmounted(() => {
  if (brandTimer) window.clearTimeout(brandTimer)
})
</script>

<style scoped lang="scss">
/*
  Align with account-card / data-management section shell:
  hairline border · 16px radius · head + body
*/

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

/* ——— Live brand preview (mirrors top rail) ——— */
.identity {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 0 18px;
}

.identity__mark {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  overflow: hidden;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  user-select: none;
}

.identity__mark.is-letter {
  background: var(--color-primary);
  color: #fff;
}

.identity__mark.is-image {
  background: transparent;
  /* no border — image is the mark */
}

.identity__mark-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.identity__title {
  color: var(--text-main);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

/* ——— Fields: stacked, equal width ——— */
.fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.field-block__label {
  color: var(--text-main);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.2;
}

.field-block__meta {
  color: var(--text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.field-block__hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.35;
  color: var(--text-muted);

  &.is-warn {
    color: #b45309;
  }
}

/* 名称 / 链接共用同一套 input 选中样式 */
.input {
  width: 100%;
  height: 40px;
  margin: 0;
  padding: 0 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 10px;
  background: var(--bg-panel);
  color: var(--text-main);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &::placeholder {
    color: var(--text-muted);
    font-weight: 400;
  }

  &::selection {
    background: rgba(var(--color-primary-rgb), 0.18);
    color: var(--text-main);
  }

  &:hover {
    border-color: rgba(148, 163, 184, 0.32);
  }

  &:focus {
    border-color: rgba(var(--color-primary-rgb), 0.5);
    box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
  }
}

/* 带清除按钮：外壳不抢 focus，由内部 .input 自己画边框 */
.input-shell {
  position: relative;
  width: 100%;

  &.is-invalid .input:focus {
    border-color: color-mix(in srgb, #f59e0b 55%, #cbd5e1);
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
}

.input--with-action {
  padding-right: 40px;
}

.input-shell__clear {
  position: absolute;
  top: 50%;
  right: 4px;
  z-index: 1;
  width: 32px;
  height: 32px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  transform: translateY(-50%);
  display: grid;
  place-items: center;

  &:hover {
    color: var(--text-main);
    background: var(--bg-tile);
  }
}

.rule {
  height: 1px;
  margin: 20px 0;
  background: rgba(148, 163, 184, 0.12);
}

/* ——— Launch: 无外框，选中用主色软底，一眼能分清 ——— */
.launch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.launch__title {
  color: var(--text-main);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.3;
}

.launch__hint {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.3;
}

.preference-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.switch {
  position: relative;
  flex-shrink: 0;
  width: 38px;
  height: 22px;
  padding: 2px;
  border: 0;
  border-radius: 999px;
  background: var(--bg-tile);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.2);
  cursor: pointer;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;

  &.is-on {
    background: var(--color-primary);
    box-shadow: none;
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--color-primary-rgb), 0.45);
    outline-offset: 2px;
  }
}

.switch__thumb {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
  transform: translateX(0);
  transition: transform 0.2s ease;

  .switch.is-on & {
    transform: translateX(16px);
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

.seg {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: transparent;
}

.seg__btn {
  margin: 0;
  min-width: 64px;
  padding: 8px 16px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover:not(.is-on) {
    background: var(--bg-tile);
    color: var(--text-main);
  }

  /* 选中：主色字 + 浅蓝底，对比足够 */
  &.is-on {
    background: var(--primary-soft, #e6f0ff);
    color: var(--color-primary);
    font-weight: 700;
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--color-primary-rgb), 0.4);
    outline-offset: 2px;
  }
}

@media (max-width: 480px) {
  .launch {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>
