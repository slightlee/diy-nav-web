<template>
  <AuthLayout>
    <div v-if="!errorState" class="state-loading">
      <!-- Branded Logo (Pulsing) -->
      <div
        class="logo-wrapper"
        :class="{
          'has-custom-image': brandIconIsUrl,
          'is-default-brand': isDefaultBrandIcon
        }"
      >
        <BrandLogo :pulsing="true">
          <img
            v-if="brandIconIsUrl"
            :src="brandIcon"
            class="brand-logo-image"
            alt=""
            @error="brandImageBroken = true"
          />
          <i v-else-if="brandIconIsFa" :class="brandIcon" aria-hidden="true" />
          <span v-else class="brand-logo-text" :class="{ 'is-default': isDefaultBrandIcon }">
            {{ brandIconText }}
          </span>
        </BrandLogo>
      </div>

      <h2 class="status-title">{{ statusTitle }}</h2>
      <p class="status-desc">{{ statusDescription }}</p>

      <!-- Progress Bar -->
      <div class="progress-bar">
        <div class="progress-inner" />
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="state-error">
      <div class="error-icon-wrapper">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="error-icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h2 class="status-title text-error">{{ errorTitle }}</h2>
      <p class="status-desc">{{ errorState }}</p>
      <BaseButton variant="secondary" size="md" class="btn-retry" @click="leaveErrorState">
        {{ errorActionLabel }}
      </BaseButton>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NAVIGATION_BRAND_CONFIG } from '@nav/config/brand'
import { AuthRequestError, useAuthStore } from '@/stores/auth'
import { isNavIconFa, isNavIconUrl, useSettingsStore } from '@/stores/settings'
import { useUIStore } from '@/stores/ui'
import { AuthLayout, BaseButton, BrandLogo } from '@nav/ui'
import type { OAuthMode, OAuthProvider } from '@/utils/oauth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const uiStore = useUIStore()

const errorState = ref<string | null>(null)
const brandImageBroken = ref(false)
const oauthProvider = ref((localStorage.getItem('oauth_provider') || 'linuxdo') as OAuthProvider)
const oauthMode = ref((localStorage.getItem('oauth_mode') || 'login') as OAuthMode)
const oauthBrandIcon = localStorage.getItem('oauth_brand_icon')?.trim()

const configuredBrandIcon = computed(
  () =>
    oauthBrandIcon || settingsStore.settings.navIcon?.trim() || NAVIGATION_BRAND_CONFIG.defaultIcon
)
const brandIcon = computed(() =>
  brandImageBroken.value ? NAVIGATION_BRAND_CONFIG.defaultIcon : configuredBrandIcon.value
)
const brandIconIsUrl = computed(() => isNavIconUrl(brandIcon.value))
const brandIconIsFa = computed(() => isNavIconFa(brandIcon.value))
const isDefaultBrandIcon = computed(() => brandIcon.value === NAVIGATION_BRAND_CONFIG.defaultIcon)
const brandIconText = computed(() => {
  if (isDefaultBrandIcon.value) return NAVIGATION_BRAND_CONFIG.defaultIcon
  return Array.from(brandIcon.value).slice(0, 2).join('') || NAVIGATION_BRAND_CONFIG.defaultIcon
})

watch(configuredBrandIcon, () => {
  brandImageBroken.value = false
})

const providerLabel = computed(() => {
  if (oauthProvider.value === 'github') return 'GitHub'
  if (oauthProvider.value === 'google') return 'Google'
  return 'LinuxDo'
})
const isBinding = computed(() => oauthMode.value === 'bind')
const statusTitle = computed(() =>
  isBinding.value ? `正在绑定 ${providerLabel.value}…` : '正在登录…'
)
const statusDescription = computed(() =>
  isBinding.value ? '正在确认授权账号，请稍候' : '正在确认账号信息，请稍候'
)
const errorTitle = computed(() => (isBinding.value ? '绑定失败' : '登录失败'))
const errorActionLabel = computed(() => (isBinding.value ? '返回账号设置' : '返回登录页'))

onMounted(async () => {
  const code = route.query.code as string
  const state = route.query.state as string
  const storedState = localStorage.getItem('oauth_state')

  // Security: Validate CSRF State
  if (!state || state !== storedState) {
    errorState.value = '安全校验失败 (CSRF): 请求来源不可信'
    return
  }

  localStorage.removeItem('oauth_state')
  localStorage.removeItem('oauth_provider')
  localStorage.removeItem('oauth_mode')
  localStorage.removeItem('oauth_brand_icon')

  if (!code) {
    errorState.value = '授权回调异常: 未能获取授权码'
    return
  }

  try {
    if (isBinding.value) {
      await authStore.bindProvider(oauthProvider.value, code, state)
      sessionStorage.setItem('open_account_panel', 'true')
      uiStore.showToast('第三方账号绑定成功', 'success')
      router.replace('/home')
    } else {
      await authStore.loginWithProvider(oauthProvider.value, code)
      uiStore.showToast('欢迎回来', 'success')
      router.replace('/')
    }
  } catch (error: unknown) {
    const err = error as Error
    if (error instanceof AuthRequestError && error.code === 'PROVIDER_ACCOUNT_IN_USE') {
      errorState.value = `该 ${providerLabel.value} 账号已被使用，无法绑定。请更换账号或直接使用 ${providerLabel.value} 登录。`
    } else {
      errorState.value =
        err.message || (isBinding.value ? '账号绑定失败，请重试' : '身份验证失败，请重试')
    }
  }
})

const leaveErrorState = () => {
  if (isBinding.value) {
    sessionStorage.setItem('open_account_panel', 'true')
    router.replace('/home')
    return
  }
  router.replace('/login')
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.logo-wrapper {
  margin-bottom: var(--spacing-2xl);
}

.logo-wrapper.has-custom-image :deep(.logo) {
  background: transparent;
  box-shadow: none;
}

.logo-wrapper.is-default-brand :deep(.logo) {
  background: var(--primary-soft);
  color: var(--color-primary);
  box-shadow: none;
}

.logo-wrapper.is-default-brand :deep(.logo-pulse) {
  display: none;
}

.brand-logo-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.brand-logo-text.is-default {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.08em;
}

/* Error State Styles */
.state-loading,
.state-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.error-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba($color-error, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-2xl);
}

.error-icon {
  width: 32px;
  height: 32px;
  color: var(--color-error);
}

.text-error {
  color: var(--color-error);
}

.btn-retry {
  margin-top: var(--spacing-md);
}

.status-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-main);
  margin-bottom: var(--spacing-md);
}

.status-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-2xl);
}

.progress-bar {
  width: 100%;
  height: var(--spacing-sm);
  background: var(--color-neutral-100);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.progress-inner {
  height: 100%;
  background: var(--color-primary);
  width: 30%;
  border-radius: var(--radius-pill);
  animation: progress 1.5s ease-in-out infinite;
}

@keyframes progress {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
    width: 60%;
  }
  100% {
    transform: translateX(200%);
  }
}

/* Dark mode support */
:global([data-theme='dark']) {
  .error-icon-wrapper {
    background: rgba($color-error, 0.15);
  }
  .status-title {
    color: var(--text-main);
  }
  .status-desc {
    color: var(--text-secondary);
  }
  .progress-bar {
    background: var(--color-neutral-700);
  }
}
</style>
