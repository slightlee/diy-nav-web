<template>
  <header class="rail">
    <div class="rail__inner">
      <div class="rail__start">
        <router-link class="brand" to="/home" :aria-label="`${navTitle}首页`">
          <span class="brand__mark" :class="{ 'brand__mark--image': iconIsUrl }" aria-hidden="true">
            <img v-if="iconIsUrl" :src="navIcon" class="brand__img" alt="" />
            <i v-else-if="iconIsFa" :class="navIcon" />
            <span v-else>{{ iconLetter }}</span>
          </span>
          <span class="brand__word">{{ navTitle }}</span>
        </router-link>

        <!-- Bookmark-tab nav: active ink sits on the rail edge -->
        <nav class="tabs" aria-label="视图">
          <router-link class="tabs__item" to="/home" active-class="is-on">首页</router-link>
          <router-link class="tabs__item" to="/all" active-class="is-on">全部</router-link>
        </nav>
      </div>

      <div class="rail__end">
        <!-- Soft compose control — utility, not a marketing CTA -->
        <button type="button" class="compose" @click="emit('addSite')">
          <span class="compose__glyph" aria-hidden="true">
            <i class="fas fa-plus" />
          </span>
          <span class="compose__label">添加网站</span>
        </button>

        <div class="utils">
          <div class="theme">
            <button
              type="button"
              class="util"
              :title="themeToggleTitle"
              :aria-label="`主题：${themeToggleTitle}`"
              @mouseenter="onThemeHover(true)"
              @mouseleave="onThemeHover(false)"
              @click="cycleTheme"
            >
              <!-- 同一套 stroke 线框，避免 FA solid/regular 粗细不一致 -->
              <svg
                v-if="currentTheme === 'light'"
                class="theme-icon"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <!-- 浅色：简洁圆 + 短射线，比 FA 太阳更干净 -->
                <circle cx="12" cy="12" r="4" />
                <path
                  d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.05 5.05l1.56 1.56M17.39 17.39l1.56 1.56M5.05 18.95l1.56-1.56M17.39 6.61l1.56-1.56"
                />
              </svg>
              <svg
                v-else-if="currentTheme === 'dark'"
                class="theme-icon"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path d="M20.2 14.1A8.2 8.2 0 0 1 9.9 3.8 8.5 8.5 0 1 0 20.2 14.1Z" />
              </svg>
              <svg v-else class="theme-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <!-- 跟随系统：细线显示器，与月亮同 stroke -->
                <rect x="3.5" y="4.5" width="17" height="12" rx="2" />
                <path d="M8 20.5h8M12 16.5v4" />
              </svg>
            </button>
            <div v-if="hoveringTheme || showClickTooltip" class="theme__tip" role="tooltip">
              <span :class="{ 'is-on': currentTheme === 'light' }">浅色</span>
              <span class="theme__sep">/</span>
              <span :class="{ 'is-on': currentTheme === 'dark' }">深色</span>
              <span class="theme__sep">/</span>
              <span :class="{ 'is-on': currentTheme === 'auto' }">跟随系统</span>
            </div>
          </div>

          <button
            v-if="!authStore.isAuthenticated"
            type="button"
            class="signin"
            @click="router.push('/login')"
          >
            登录
          </button>

          <button
            v-else
            type="button"
            class="util util--avatar"
            aria-label="打开账户与设置"
            @click="emit('openAccountPanel')"
          >
            <img
              v-if="authStore.user?.avatar_url"
              :src="authStore.user.avatar_url"
              class="face"
              alt=""
            />
            <span v-else class="face face--ink">
              {{ (authStore.user?.nickname || authStore.user?.email || '?')[0]?.toUpperCase() }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore, DEFAULT_SETTINGS, isNavIconUrl, isNavIconFa } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits(['addSite', 'openAccountPanel'])
const router = useRouter()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const navTitle = computed(
  () => settingsStore.settings.navTitle || DEFAULT_SETTINGS.navTitle || 'DIY 导航'
)
const navIcon = computed(() => settingsStore.settings.navIcon || DEFAULT_SETTINGS.navIcon || 'D')
const iconIsUrl = computed(() => isNavIconUrl(navIcon.value))
const iconIsFa = computed(() => isNavIconFa(navIcon.value))
const iconLetter = computed(() => {
  const t = navIcon.value.trim()
  if (!t) return 'D'
  return Array.from(t)[0] || 'D'
})

const currentTheme = computed(() => settingsStore.settings.theme)
const themeToggleTitle = computed(
  () => (({ light: '浅色', dark: '深色', auto: '跟随系统' }) as const)[currentTheme.value]
)

const showClickTooltip = ref(false)
const hoveringTheme = ref(false)
let clickTooltipTimer: number | undefined

const cycleTheme = () => {
  const order: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto']
  const next = order[(order.indexOf(currentTheme.value) + 1) % order.length]
  settingsStore.setTheme(next)
  showClickTooltip.value = true
  if (clickTooltipTimer) clearTimeout(clickTooltipTimer)
  clickTooltipTimer = window.setTimeout(() => {
    if (!hoveringTheme.value) showClickTooltip.value = false
  }, 1200)
}

const onThemeHover = (hover: boolean) => {
  hoveringTheme.value = hover
  showClickTooltip.value = hover
}
</script>

<style scoped lang="scss">
/*
  DIY 导航 · Bookmark Rail
  ────────────────────────
  Subject: personal startpage / link desk
  Job of header: orient + rare utilities — never compete with the site grid

  Tokens (aligned to page system):
    Paper   #f5f5f7  (--bg-body)
    Surface #ffffff  (--bg-panel)
    Ink     #1f2933  (--text-main)
    Mute    #6b7280  (--text-secondary)
    Signal  var(--color-primary) — fallback mark + active tab only

  Signature: active tab ink flush to the rail edge (bookmark tab feel).
  Anti-pattern avoided: solid blue marketing CTA, pill login, nested gray chips.
*/

.rail {
  --rail-h: 56px;
  --rail-pad: 20px;
  --hit: 32px;

  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--rail-h);
  background: var(--bg-panel);
  /* Hairline only — drop shadow is reserved for content cards */
  border-bottom: 1px solid color-mix(in srgb, var(--border-tile) 70%, #d1d5db 30%);
}

.rail__inner {
  max-width: var(--container-max-width);
  height: 100%;
  margin: 0 auto;
  padding: 0 var(--rail-pad);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.rail__start {
  display: flex;
  align-items: center;
  gap: 28px;
  min-width: 0;
  height: 100%;
}

/* ——— Brand ——— */
.brand {
  /* 品牌是导航布局的固定锚点，名称变长不能推动后面的 tabs。 */
  width: 132px;
  flex: 0 0 132px;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--text-main);
  border-radius: 8px;

  &:focus-visible {
    outline: 2px solid rgba(var(--color-primary-rgb), 0.45);
    outline-offset: 3px;
  }
}

.brand__mark {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  overflow: hidden;

  i {
    font-size: 13px;
  }

  /* 图片模式：无蓝底、无描边，让图标本身说话 */
  &--image {
    background: transparent;
    border: none;
    box-shadow: none;
    color: inherit;
  }
}

.brand__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: transparent;
}

.brand__word {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1;
  white-space: nowrap;
}

/* ——— Bookmark tabs ——— */
.tabs {
  display: flex;
  align-items: stretch;
  height: 100%;
  gap: 2px;
}

.tabs__item {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-decoration: none;
  transition: color 0.15s ease;

  &:hover {
    color: var(--text-main);
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--color-primary-rgb), 0.4);
    outline-offset: -4px;
    border-radius: 6px;
  }

  &.is-on {
    color: var(--text-main);
    font-weight: 600;

    /* Signature: ink flush to rail bottom — reads as a selected bookmark tab */
    &::after {
      content: '';
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: -1px; /* sit on the rail border */
      height: 2px;
      border-radius: 2px 2px 0 0;
      background: var(--color-primary);
    }
  }
}

/* ——— End utilities ——— */
.rail__end {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* Compose = quiet secondary, no border — hover 才出现浅底 */
.compose {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: var(--hit);
  margin: 0;
  padding: 0 10px 0 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-main);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.01em;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: var(--bg-tile);
  }

  &:active {
    background: color-mix(in srgb, var(--bg-tile) 70%, #e5e7eb 30%);
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--color-primary-rgb), 0.4);
    outline-offset: 2px;
  }
}

.compose__glyph {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  flex-shrink: 0;

  i {
    font-size: 10px;
    line-height: 1;
  }
}

.compose:hover .compose__glyph {
  background: color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.utils {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.util {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--hit);
  height: var(--hit);
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: var(--bg-tile);
    color: var(--text-main);
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--color-primary-rgb), 0.4);
    outline-offset: 2px;
  }

  i {
    font-size: 14px;
    line-height: 1;
  }
}

/* 主题三图标统一 stroke，视觉重量一致 */
.theme-icon {
  width: 16px;
  height: 16px;
  display: block;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.util--avatar {
  overflow: hidden;
}

/* Menu-bar style account entry — no pill chrome */
.signin {
  display: inline-flex;
  align-items: center;
  height: var(--hit);
  margin: 0;
  padding: 0 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-main);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--bg-tile);
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--color-primary-rgb), 0.4);
    outline-offset: 2px;
  }
}

.theme {
  position: relative;
}

.theme__tip {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 60;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-tile);
  background: var(--bg-panel);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
  animation: tip-in 0.14s ease-out;
}

.theme__sep {
  color: var(--text-muted);
  font-size: 10px;
}

.theme__tip .is-on {
  color: var(--color-primary);
  font-weight: 600;
}

@keyframes tip-in {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.face {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.face--ink {
  display: grid;
  place-items: center;
  background: var(--color-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .tabs__item,
  .compose,
  .util,
  .signin {
    transition: none;
  }

  .theme__tip {
    animation: none;
  }
}

@media (max-width: 768px) {
  .rail {
    --rail-h: 52px;
    --rail-pad: 12px;
    --hit: 36px;
    --brand-w: 28px;
  }

  .brand {
    width: var(--brand-w);
    flex-basis: var(--brand-w);
  }

  .rail__start {
    gap: 12px;
  }

  .brand__word {
    display: none;
  }

  .tabs__item {
    padding: 0 10px;
    font-size: 13px;

    &.is-on::after {
      left: 10px;
      right: 10px;
    }
  }

  .compose {
    width: var(--hit);
    height: var(--hit);
    padding: 0;
    justify-content: center;

    .compose__label {
      display: none;
    }

    .compose__glyph {
      width: 20px;
      height: 20px;
      border-radius: 6px;

      i {
        font-size: 11px;
      }
    }
  }
}
</style>
