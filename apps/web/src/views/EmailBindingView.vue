<template>
  <AuthLayout>
    <div class="email-verify">
      <div class="email-verify__mark" :class="`email-verify__mark--${viewState}`">
        <i v-if="viewState === 'loading'" class="fas fa-spinner fa-spin" />
        <i v-else-if="viewState === 'success'" class="fas fa-check" />
        <i v-else-if="viewState === 'error'" class="fas fa-link-slash" />
        <i v-else class="fas fa-envelope-open-text" />
      </div>

      <template v-if="viewState === 'loading'">
        <h1>正在验证邮箱</h1>
        <p>请稍候，我们正在检查验证链接。</p>
      </template>

      <template v-else-if="viewState === 'error'">
        <h1>验证链接不可用</h1>
        <p>{{ errorMessage }}</p>
        <BaseButton variant="secondary" @click="router.replace('/home')">返回首页</BaseButton>
      </template>

      <template v-else-if="viewState === 'success'">
        <h1>邮箱绑定成功</h1>
        <p>
          现在可以使用该邮箱和新密码登录当前账号。
          <span class="email-verify__success-note">2 秒后自动返回账户设置</span>
        </p>
        <BaseButton @click="returnToAccount">立即返回账户设置</BaseButton>
      </template>

      <template v-else>
        <div class="email-verify__eyebrow">验证链接已确认</div>
        <h1>设置密码后完成绑定</h1>
        <p>
          待绑定邮箱
          <strong>{{ maskedEmail }}</strong>
        </p>

        <form class="password-form" @submit.prevent="completeBinding">
          <label for="email-binding-password">登录密码</label>
          <BaseInput
            id="email-binding-password"
            v-model="password"
            type="password"
            placeholder="至少 8 位字符"
            :disabled="submitting"
          />

          <label for="email-binding-confirm">确认密码</label>
          <BaseInput
            id="email-binding-confirm"
            v-model="confirmPassword"
            type="password"
            placeholder="再次输入登录密码"
            :disabled="submitting"
            :state="formError ? 'error' : 'default'"
          />

          <p class="password-form__hint" :class="{ error: formError }">
            {{ formError || '密码设置成功后，邮箱才会正式绑定到当前账号。' }}
          </p>

          <BaseButton block html-type="submit" :loading="submitting" :disabled="!canSubmit">
            完成绑定
          </BaseButton>
        </form>
      </template>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AuthLayout, BaseButton, BaseInput } from '@nav/ui'
import { AuthRequestError, useAuthStore } from '@/stores/auth'

type ViewState = 'loading' | 'ready' | 'success' | 'error'

const AUTO_RETURN_DELAY_MS = 2_000

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const viewState = ref<ViewState>('loading')
const maskedEmail = ref('')
const errorMessage = ref('该验证链接无效或已经失效，请重新发起邮箱绑定。')
const password = ref('')
const confirmPassword = ref('')
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

const returnToAccount = () => {
  clearAutoReturn()
  sessionStorage.setItem('open_account_panel', 'true')
  router.replace('/home')
}

const scheduleAutoReturn = () => {
  clearAutoReturn()
  autoReturnTimer = window.setTimeout(returnToAccount, AUTO_RETURN_DELAY_MS)
}

const completeBinding = async () => {
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
    await authStore.completeEmailBinding(token.value, password.value)
    viewState.value = 'success'
    scheduleAutoReturn()
  } catch (error) {
    if (error instanceof AuthRequestError && error.code === 'EMAIL_IN_USE') {
      formError.value = '该邮箱已被使用，无法绑定。请更换邮箱或使用该邮箱登录。'
    } else if (
      error instanceof AuthRequestError &&
      ['EMAIL_BINDING_INVALID', 'EMAIL_BINDING_EXPIRED'].includes(error.code || '')
    ) {
      errorMessage.value = '验证链接无效或已过期，请重新发起邮箱绑定。'
      viewState.value = 'error'
    } else {
      formError.value = '绑定失败，请稍后重试。'
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
    const result = await authStore.validateEmailBinding(token.value)
    maskedEmail.value = result.email
    viewState.value = 'ready'
  } catch (error) {
    if (error instanceof AuthRequestError && error.code === 'EMAIL_IN_USE') {
      errorMessage.value = '该邮箱已被使用，无法继续绑定。'
    }
    viewState.value = 'error'
  }
})

onBeforeUnmount(clearAutoReturn)
</script>

<style scoped lang="scss">
.email-verify {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.email-verify__mark {
  width: 58px;
  height: 58px;
  margin-bottom: 20px;
  border: 1px solid color-mix(in srgb, var(--color-primary) 16%, transparent);
  border-radius: 18px;
  background: var(--primary-soft);
  color: var(--color-primary);
  display: grid;
  place-items: center;
  font-size: 22px;
  box-shadow: 0 12px 28px rgba(79, 125, 243, 0.12);
}

.email-verify__mark--success {
  border-color: rgba(16, 185, 129, 0.2);
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.email-verify__mark--error {
  border-color: rgba(239, 68, 68, 0.18);
  background: rgba(239, 68, 68, 0.08);
  color: var(--color-error);
}

.email-verify__eyebrow {
  margin-bottom: 6px;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.email-verify__success-note {
  display: block;
  margin-top: var(--spacing-sm);
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

h1 {
  margin: 0;
  color: var(--text-main);
  font-size: 25px;
  line-height: 1.25;
}

p {
  margin: 10px 0 24px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.65;
}

.password-form {
  width: 100%;
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;

  label {
    margin-top: 8px;
    color: var(--text-main);
    font-size: 12px;
    font-weight: 700;
  }
}

.password-form__hint {
  min-height: 20px;
  margin: 2px 0 8px;
  font-size: 11px;
  text-align: left;

  &.error {
    color: var(--color-error);
  }
}
</style>
