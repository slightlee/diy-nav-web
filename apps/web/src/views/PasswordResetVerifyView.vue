<template>
  <AuthLayout>
    <div class="reset-verify">
      <!-- Logo（与登录/注册页同款品牌区，跟随站点配置；从邮件跳转
           到此页的用户靠它确认站点身份） -->
      <div class="logo-container">
        <BrandLogo link="/" title="返回首页">
          <img
            v-if="brandIconIsUrl && !brandImageBroken"
            :src="brandIcon"
            class="auth-brand-logo"
            alt=""
            @error="brandImageBroken = true"
          />
          <i v-else-if="brandIconIsFa" :class="brandIcon" aria-hidden="true" />
          <template v-else>{{ brandIcon }}</template>
        </BrandLogo>
        <span class="auth-brand-name">{{ brandTitle }}</span>
      </div>

      <template v-if="viewState === 'loading'">
        <div class="loading-inline">
          <i class="fas fa-circle-notch fa-spin" />
          <span>正在校验重置链接…</span>
        </div>
      </template>

      <template v-else-if="viewState === 'error'">
        <div class="result-card">
          <h3 class="result-card__title">重置链接不可用</h3>
          <p class="result-card__desc">{{ errorMessage }}</p>
          <BaseButton
            block
            size="md"
            class="result-card__action"
            @click="router.replace('/forgot-password')"
          >
            重新申请重置
          </BaseButton>
        </div>
      </template>

      <template v-else-if="viewState === 'success'">
        <div class="result-card">
          <h3 class="result-card__title">密码重置成功</h3>
          <p class="result-card__desc">
            请使用新密码登录
            <br />
            2 秒后自动返回登录页
          </p>
          <BaseButton block size="md" class="result-card__action" @click="router.replace('/login')">
            立即返回登录
          </BaseButton>
        </div>
      </template>

      <template v-else>
        <div class="header">
          <div class="header-sub">
            正在为
            <strong>{{ maskedEmail }}</strong>
            设置新密码
          </div>
        </div>

        <form @submit.prevent="completeReset">
          <div class="form-group">
            <label class="form-label" for="reset-new-password">
              新密码
              <span>*</span>
            </label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M9 10V8a3 3 0 0 1 6 0v2" />
              </svg>
              <input
                id="reset-new-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="至少 8 位字符"
                :disabled="submitting"
                required
              />
              <BaseButton
                variant="neutral-ghost"
                size="sm"
                :icon="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                @click="showPassword = !showPassword"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="reset-confirm-password">
              确认新密码
              <span>*</span>
            </label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M9 10V8a3 3 0 0 1 6 0v2" />
              </svg>
              <input
                id="reset-confirm-password"
                v-model="confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                placeholder="再次输入新密码"
                :disabled="submitting"
                required
              />
            </div>
            <div v-if="formError" class="error-text">{{ formError }}</div>
          </div>

          <BaseButton
            block
            size="lg"
            class="auth-submit"
            html-type="submit"
            :loading="submitting"
            :disabled="!canSubmit"
          >
            {{ submitting ? '重置中...' : '完成重置' }}
          </BaseButton>
        </form>
      </template>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AuthLayout, BaseButton, BrandLogo } from '@nav/ui'
import { NAVIGATION_BRAND_CONFIG } from '@nav/config/brand'
import { isNavIconFa, isNavIconUrl, useSettingsStore } from '@/stores/settings'
import { AuthRequestError, useAuthStore } from '@/stores/auth'

type ViewState = 'loading' | 'ready' | 'success' | 'error'

const AUTO_RETURN_DELAY_MS = 2_000

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

// 品牌跟随站点配置（与登录/注册页一致）
const brandTitle = computed(
  () => settingsStore.effectiveNavTitle || NAVIGATION_BRAND_CONFIG.defaultTitle
)
const brandIcon = computed(
  () => settingsStore.effectiveNavIcon || NAVIGATION_BRAND_CONFIG.defaultIcon
)
const brandIconIsUrl = computed(() => isNavIconUrl(brandIcon.value))
const brandIconIsFa = computed(() => isNavIconFa(brandIcon.value))
const brandImageBroken = ref(false)

watch(brandIcon, () => {
  brandImageBroken.value = false
})
const viewState = ref<ViewState>('loading')
const maskedEmail = ref('')
const errorMessage = ref('该重置链接无效或已过期，请重新申请。')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const formError = ref('')
const submitting = ref(false)
let autoReturnTimer: number | null = null
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const canSubmit = computed(
  () =>
    !submitting.value &&
    password.value.length >= 8 &&
    password.value.length <= 128 &&
    password.value === confirmPassword.value
)

const clearAutoReturn = () => {
  if (autoReturnTimer === null) return
  window.clearTimeout(autoReturnTimer)
  autoReturnTimer = null
}

const scheduleAutoReturn = () => {
  clearAutoReturn()
  autoReturnTimer = window.setTimeout(() => router.replace('/login'), AUTO_RETURN_DELAY_MS)
}

const completeReset = async () => {
  formError.value = ''
  if (password.value.length < 8) {
    formError.value = '密码至少需要 8 位字符。'
    return
  }
  if (password.value !== confirmPassword.value) {
    formError.value = '两次输入的密码不一致。'
    return
  }

  submitting.value = true
  try {
    await authStore.completePasswordReset(token.value, password.value)
    viewState.value = 'success'
    scheduleAutoReturn()
  } catch (error) {
    if (error instanceof AuthRequestError && error.code === 'RESET_TOKEN_ALREADY_USED') {
      errorMessage.value = '该重置链接已被使用，请重新申请。'
      viewState.value = 'error'
    } else if (error instanceof AuthRequestError && error.code === 'RESET_TOKEN_INVALID') {
      errorMessage.value = '重置链接无效或已过期，请重新申请。'
      viewState.value = 'error'
    } else {
      formError.value = '重置失败，请稍后重试。'
    }
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (!token.value) {
    viewState.value = 'error'
    return
  }
  try {
    const result = await authStore.validatePasswordResetToken(token.value)
    maskedEmail.value = result.maskedEmail
    viewState.value = 'ready'
  } catch {
    viewState.value = 'error'
  }
})

onBeforeUnmount(clearAutoReturn)
</script>

<style scoped lang="scss">
.reset-verify {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  form {
    width: 100%;
  }
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  margin-bottom: 28px;
}

.logo-container :deep(.logo-wrapper) {
  width: 52px;
  height: 52px;
}

.logo-container :deep(.logo) {
  border-radius: 15px;
  background: var(--primary-soft);
  color: var(--color-primary);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.08em;
  box-shadow: none;
}

.logo-container :deep(.auth-brand-logo) {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
  display: block;
}

.logo-container :deep(a.logo:hover) {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--primary-soft) 88%, var(--color-primary) 12%);
  box-shadow: 0 6px 14px rgba(var(--color-primary-rgb), 0.12);
}

.logo-container :deep(.logo-pulse) {
  display: none;
}

.auth-brand-name {
  color: var(--text-main);
  font-size: 20px;
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.02em;
}

/* 副标题（登录页同款） */
.header {
  text-align: center;
  margin-bottom: 28px;
  width: 100%;
}

.header-sub {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);

  strong {
    color: var(--text-main);
    font-weight: var(--font-weight-semibold);
  }
}

/* 表单（登录页同款） */
.form-group {
  margin-bottom: 20px;
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 10px;
  color: var(--text-main);
  display: inline-flex;
  align-items: center;
}

.form-label span {
  color: var(--color-error);
  margin-left: var(--spacing-xs);
}

.input-wrap {
  height: 52px;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  background: var(--bg-tile);
  padding: 0 var(--spacing-lg);
  display: flex;
  align-items: center;
  transition: all var(--transition-fast);
}

.input-wrap:focus-within {
  border-color: var(--color-primary);
  background: var(--bg-tile-hover);
  box-shadow: 0 0 0 1px rgba(var(--color-primary-rgb), 0.35);
}

.input-icon {
  width: 18px;
  height: 18px;
  margin-right: var(--spacing-md);
  stroke: var(--text-muted);
  stroke-width: 1.8;
  fill: none;
}

input {
  flex: 1;
  min-width: 0;
  text-align: left;
  border: none;
  background: none;
  font-size: var(--font-size-sm);
  outline: none;
  color: var(--text-main);
  width: 100%;
}

input::placeholder {
  color: var(--text-muted);
}

.error-text {
  color: var(--color-error);
  font-size: var(--font-size-xs);
  margin-top: var(--spacing-xs);
  margin-left: var(--spacing-xs);
}

.auth-submit {
  margin-top: 24px;
  width: 100%;
}

/* loading（登录页同款轻量内联） */
.loading-inline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

/* 终态卡片（注册关闭卡片同款） */
.result-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 24px 8px;
  text-align: center;
}

.result-card__title {
  margin: 16px 0 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.01em;
  color: var(--text-main);
}

.result-card__desc {
  margin: 8px 0 0;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  line-height: 1.7;
}

.result-card__action {
  margin-top: 24px;
  max-width: 300px;
}
</style>
