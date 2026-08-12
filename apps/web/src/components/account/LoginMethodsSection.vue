<template>
  <div class="login-methods" :aria-busy="loadingMethods">
    <div v-if="loadingMethods" class="login-methods__loading">
      <i class="fas fa-spinner fa-spin" />
      正在读取登录方式…
    </div>

    <div v-else-if="loadError" class="login-methods__error">
      <span>{{ loadError }}</span>
      <BaseButton variant="ghost" size="xs" @click="loadLoginMethods">重新加载</BaseButton>
    </div>

    <template v-else>
      <div v-for="item in bindingItems" :key="item.key" class="login-method">
        <div class="login-method__row">
          <div class="login-method__main">
            <span class="login-method__icon" :class="{ bound: item.bound }">
              <i :class="item.icon" />
            </span>
            <div class="login-method__copy">
              <div class="login-method__title-row">
                <span class="login-method__title">{{ item.label }}</span>
                <span class="login-method__badge" :class="{ bound: item.bound }">
                  {{ item.bound ? '已绑定' : '未绑定' }}
                </span>
              </div>
              <div class="login-method__desc">{{ item.description }}</div>
            </div>
          </div>

          <BaseButton
            v-if="item.bound && item.canUnbind"
            class="login-method__action"
            variant="danger-ghost"
            size="xs"
            @click="openUnbindConfirm(item)"
          >
            解绑
          </BaseButton>
          <span v-else-if="item.bound" class="login-method__required">唯一登录方式</span>
          <BaseButton
            v-else
            class="login-method__action"
            variant="ghost"
            size="xs"
            :disabled="!item.available"
            :loading="pendingProvider === item.key"
            @click="handleBind(item.key)"
          >
            {{ item.available ? '绑定' : '暂不可用' }}
          </BaseButton>
        </div>

        <form
          v-if="item.key === 'email' && emailEditorOpen"
          class="email-binding"
          @submit.prevent="sendEmailVerification"
        >
          <div class="email-binding__controls">
            <BaseInput
              v-model="emailDraft"
              type="email"
              size="sm"
              placeholder="请输入准备绑定的邮箱"
              :disabled="sendingEmail"
              :state="emailError ? 'error' : 'default'"
              @input="emailError = ''"
            />
            <BaseButton
              size="sm"
              html-type="submit"
              :loading="sendingEmail"
              :disabled="!canSendEmail"
            >
              发送验证邮件
            </BaseButton>
          </div>
          <p v-if="emailError" class="email-binding__message email-binding__message--error">
            {{ emailError }}
          </p>
          <div v-else-if="emailSent" class="email-binding__sent">
            <span>
              <i class="fas fa-circle-check" />
              验证邮件已发送，请在 30 分钟内完成验证。
            </span>
            <a v-if="developmentVerificationUrl" :href="developmentVerificationUrl">
              打开开发验证链接
            </a>
          </div>
          <p v-else class="email-binding__message">验证通过并设置密码后，即可使用邮箱密码登录。</p>
        </form>
      </div>
    </template>
  </div>

  <BaseModal
    v-if="unbindTarget"
    :is-open="!!unbindTarget"
    :title="`解绑${unbindTarget.label}`"
    size="sm"
    :show-close-button="!unbinding"
    :close-on-overlay="!unbinding"
    :close-on-escape="!unbinding"
    @close="closeUnbindConfirm"
  >
    <div class="unbind-confirm">
      <p class="unbind-confirm__title">
        确定要解绑
        <strong>{{ unbindTargetName }}</strong>
        吗？
      </p>
      <div class="unbind-confirm__warning">
        <i class="fas fa-triangle-exclamation" aria-hidden="true" />
        <div class="unbind-confirm__warning-copy">
          <p>{{ unbindConsequence }}</p>
          <p>当前账号和导航数据不会被删除。</p>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="unbind-confirm__actions">
        <BaseButton variant="ghost" size="sm" :disabled="unbinding" @click="closeUnbindConfirm">
          取消
        </BaseButton>
        <BaseButton variant="danger" size="sm" :loading="unbinding" @click="confirmUnbind">
          确认解绑
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BaseButton, BaseInput, BaseModal } from '@nav/ui'
import { AuthRequestError, useAuthStore, type LoginMethods } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { startOAuth, type OAuthProvider } from '@/utils/oauth'
import { useUIStore } from '@/stores/ui'

type LoginMethodKey = 'email' | OAuthProvider

interface LoginMethodItem {
  key: LoginMethodKey
  label: string
  icon: string
  bound: boolean
  available: boolean
  canUnbind: boolean
  description: string
}

const providerMeta: Record<OAuthProvider, { label: string; icon: string }> = {
  github: { label: 'GitHub', icon: 'fab fa-github' },
  google: { label: 'Google', icon: 'fab fa-google' },
  linuxdo: { label: 'LinuxDo', icon: 'fas fa-circle-nodes' }
}

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const uiStore = useUIStore()
const methods = ref<LoginMethods | null>(null)
const loadingMethods = ref(true)
const loadError = ref('')
const emailEditorOpen = ref(false)
const emailDraft = ref('')
const emailError = ref('')
const emailSent = ref(false)
const sendingEmail = ref(false)
const developmentVerificationUrl = ref('')
const pendingProvider = ref<OAuthProvider | null>(null)
const unbindTarget = ref<LoginMethodItem | null>(null)
const unbinding = ref(false)

const canSendEmail = computed(
  () =>
    !sendingEmail.value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDraft.value.trim().toLowerCase())
)

const bindingItems = computed<LoginMethodItem[]>(() => {
  const providerBindings = new Set(methods.value?.providers.map(item => item.provider) || [])
  const availableProviders = new Set(methods.value?.availableProviders || [])
  const emailBound = methods.value?.email.bound ?? !!authStore.user?.email

  return [
    {
      key: 'email' as const,
      label: '邮箱登录',
      icon: 'fas fa-envelope',
      bound: emailBound,
      available: true,
      canUnbind: methods.value?.email.canUnbind ?? false,
      description: methods.value?.email.address || '绑定邮箱后可使用邮箱密码登录'
    },
    ...(
      Object.entries(providerMeta) as Array<[OAuthProvider, { label: string; icon: string }]>
    ).map(([provider, meta]) => ({
      key: provider,
      label: meta.label,
      icon: meta.icon,
      bound: providerBindings.has(provider),
      available: availableProviders.has(provider),
      canUnbind:
        methods.value?.providers.find(item => item.provider === provider)?.canUnbind ?? false,
      description: providerBindings.has(provider)
        ? `已绑定，可使用 ${meta.label} 快速登录`
        : availableProviders.has(provider)
          ? `绑定后可使用 ${meta.label} 快速登录`
          : `${meta.label} 登录暂未配置`
    }))
  ]
})

const unbindTargetName = computed(() => {
  const target = unbindTarget.value
  if (!target) return ''
  return target.key === 'email' ? methods.value?.email.address || target.label : target.label
})

const unbindConsequence = computed(() => {
  const target = unbindTarget.value
  if (!target) return ''
  return target.key === 'email'
    ? '解绑后，将无法再使用该邮箱和密码登录。'
    : `解绑后，将无法再使用 ${target.label} 快速登录。`
})

const loadLoginMethods = async () => {
  loadingMethods.value = true
  loadError.value = ''
  try {
    methods.value = await authStore.fetchLoginMethods()
  } catch {
    loadError.value = '登录方式读取失败，请稍后重试。'
  } finally {
    loadingMethods.value = false
  }
}

const handleBind = async (key: LoginMethodKey) => {
  if (key === 'email') {
    emailEditorOpen.value = !emailEditorOpen.value
    return
  }

  pendingProvider.value = key
  try {
    const state = await authStore.createProviderBindingIntent(key)
    await startOAuth(key, state, 'bind', settingsStore.settings.navIcon)
  } catch (error) {
    pendingProvider.value = null
    uiStore.showToast(error instanceof Error ? error.message : '无法启动第三方账号绑定', 'error')
  }
}

const openUnbindConfirm = (item: LoginMethodItem) => {
  if (!item.bound || !item.canUnbind) return
  unbindTarget.value = item
}

const closeUnbindConfirm = () => {
  if (unbinding.value) return
  unbindTarget.value = null
}

const confirmUnbind = async () => {
  const target = unbindTarget.value
  if (!target || unbinding.value) return

  unbinding.value = true
  try {
    if (target.key === 'email') {
      await authStore.unbindEmailLogin()
    } else {
      await authStore.unbindProvider(target.key)
    }
    uiStore.showToast(`${target.label} 已解绑`, 'success')
    unbindTarget.value = null
    await loadLoginMethods()
  } catch (error) {
    if (error instanceof AuthRequestError && error.code === 'LAST_LOGIN_METHOD') {
      uiStore.showToast('至少需要保留一种登录方式，当前方式无法解绑。', 'warning')
    } else {
      uiStore.showToast(error instanceof Error ? error.message : '解绑失败，请稍后重试。', 'error')
    }
  } finally {
    unbinding.value = false
  }
}

const sendEmailVerification = async () => {
  if (!canSendEmail.value) return
  sendingEmail.value = true
  emailError.value = ''
  emailSent.value = false
  developmentVerificationUrl.value = ''
  try {
    const result = await authStore.requestEmailBinding(emailDraft.value.trim().toLowerCase())
    emailSent.value = true
    developmentVerificationUrl.value = result.verificationUrl || ''
  } catch (error) {
    if (error instanceof AuthRequestError && error.code === 'EMAIL_IN_USE') {
      emailError.value = '该邮箱已被使用，无法绑定。请更换邮箱或使用该邮箱登录。'
    } else {
      emailError.value = '验证邮件发送失败，请稍后重试。'
    }
  } finally {
    sendingEmail.value = false
  }
}

onMounted(loadLoginMethods)
</script>

<style scoped lang="scss">
.login-methods {
  display: flex;
  flex-direction: column;
}

.login-methods__loading,
.login-methods__error {
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.login-method {
  padding: 0 18px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);

  &:last-child {
    border-bottom: 0;
  }
}

.login-method__row {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.login-method__main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.login-method__icon {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  background: var(--account-control-bg, var(--bg-tile));
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;

  &.bound {
    border-color: color-mix(in srgb, var(--color-primary) 18%, transparent);
    background: var(--primary-soft);
    color: var(--color-primary-dark);
  }
}

.login-method__copy {
  min-width: 0;
}

.login-method__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-method__title {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
}

.login-method__badge {
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.1);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;

  &.bound {
    background: rgba(16, 185, 129, 0.1);
    color: var(--color-success);
  }
}

.login-method__desc {
  margin-top: 3px;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.login-method__required {
  flex: 0 0 auto;
  min-width: 72px;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  text-align: center;
}

:deep(.login-method__action) {
  min-width: 48px;
  min-height: 30px;
  padding: 0 var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-normal);
}

.unbind-confirm {
  display: grid;
  gap: var(--spacing-md);
}

.unbind-confirm__title {
  margin: 0;
  color: var(--text-main);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-normal);
  line-height: 1.5;
}

.unbind-confirm__title strong {
  font-weight: var(--font-weight-medium);
}

.unbind-confirm__warning {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border: 1px solid color-mix(in srgb, var(--color-error) 12%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-error) 4%, var(--bg-panel));
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.unbind-confirm__warning i {
  flex: 0 0 auto;
  margin-top: 0.2em;
  color: var(--color-error);
}

.unbind-confirm__warning-copy {
  display: grid;
  gap: var(--spacing-xs);
}

.unbind-confirm__warning-copy p {
  margin: 0;
  color: var(--text-main);
}

.unbind-confirm__warning-copy p:last-child {
  color: var(--text-secondary);
}

.unbind-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  width: 100%;
}

.email-binding {
  margin: 0 0 14px 46px;
  padding: 13px;
  border: 1px solid rgba(79, 125, 243, 0.16);
  border-radius: 11px;
  background: color-mix(in srgb, var(--primary-soft) 38%, transparent);
}

.email-binding__controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 9px;
}

.email-binding__message,
.email-binding__sent {
  margin: 7px 1px 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.5;
}

.email-binding__message--error {
  color: var(--color-error);
}

.email-binding__sent {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-success);

  a {
    flex: 0 0 auto;
    color: var(--color-primary);
    text-decoration: none;
  }
}

@media (max-width: 640px) {
  .login-method {
    padding: 0 12px;
  }

  .login-method__row {
    gap: 10px;
  }

  .email-binding {
    margin-left: 0;
  }

  .email-binding__controls {
    grid-template-columns: 1fr;
  }

  .email-binding__sent {
    flex-direction: column;
  }
}
</style>
