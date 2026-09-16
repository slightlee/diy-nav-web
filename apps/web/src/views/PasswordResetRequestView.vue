<template>
  <AuthLayout>
    <div class="reset-request">
      <!-- Logo（与登录/注册页同款品牌区，跟随站点配置） -->
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

      <template v-if="viewState === 'success'">
        <div class="result-card">
          <h3 class="result-card__title">重置邮件已发送</h3>
          <p class="result-card__desc">
            已发送至
            <strong>{{ submittedEmail }}</strong>
            <br />
            请在 30 分钟内点击邮件中的链接完成重置。
          </p>
          <BaseButton block size="md" class="result-card__action" @click="router.replace('/login')">
            返回登录
          </BaseButton>
        </div>
      </template>

      <template v-else>
        <div class="header">
          <div class="header-sub">输入账号绑定的邮箱，我们将发送重置链接</div>
        </div>

        <form @submit.prevent="submit">
          <div class="form-group">
            <label class="form-label" for="reset-email">
              邮箱
              <span>*</span>
            </label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <polyline points="4 7 12 12 20 7" />
              </svg>
              <input
                id="reset-email"
                v-model="email"
                type="email"
                placeholder="your@email.com"
                :disabled="submitting"
                required
              />
            </div>
            <div v-if="formError" class="error-text">{{ formError }}</div>
          </div>

          <BaseButton block size="lg" class="auth-submit" html-type="submit" :loading="submitting">
            {{ submitting ? '发送中...' : '发送重置邮件' }}
          </BaseButton>

          <div class="switch-row">
            想起密码了？
            <RouterLink to="/login">返回登录</RouterLink>
          </div>
        </form>
      </template>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AuthLayout, BaseButton, BrandLogo } from '@nav/ui'
import { NAVIGATION_BRAND_CONFIG } from '@nav/config/brand'
import { isNavIconFa, isNavIconUrl, useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'

type ViewState = 'form' | 'success'

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
const viewState = ref<ViewState>('form')
const email = ref('')
const submittedEmail = ref('')
const formError = ref('')
const submitting = ref(false)

const submit = async () => {
  formError.value = ''
  const trimmed = email.value.trim()
  if (!trimmed) {
    formError.value = '请输入邮箱。'
    return
  }

  submitting.value = true
  try {
    await authStore.requestPasswordReset(trimmed)
    submittedEmail.value = trimmed
    viewState.value = 'success'
  } catch (error) {
    // 防枚举：服务端对不存在的邮箱也返回成功；能到达这里的失败是真实故障
    formError.value =
      error instanceof Error && error.message ? error.message : '发送失败，请稍后重试。'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.reset-request {
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

.reset-request__eyebrow {
  margin-bottom: 6px;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
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
}

.switch-row {
  margin-top: 24px;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.switch-row a {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  margin-left: var(--spacing-xs);
}

/* 成功态（注册关闭卡片同款） */
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

  strong {
    color: var(--text-main);
    font-weight: var(--font-weight-semibold);
  }
}

.result-card__action {
  margin-top: 24px;
  max-width: 300px;
}
</style>
