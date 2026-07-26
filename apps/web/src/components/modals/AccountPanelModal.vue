<template>
  <div class="account-panel">
    <aside class="account-panel__sidebar">
      <div class="account-summary">
        <img
          v-if="authStore.user?.avatar_url"
          :src="authStore.user.avatar_url"
          class="account-summary__avatar"
          alt="用户头像"
        />
        <div v-else class="account-summary__avatar account-summary__avatar--fallback">
          {{ userInitial }}
        </div>
        <div class="account-summary__meta">
          <div class="account-summary__name">{{ displayName }}</div>
          <div class="account-summary__email">{{ displayEmail }}</div>
        </div>
      </div>

      <nav class="account-panel__nav" aria-label="账户面板菜单">
        <button
          v-for="item in navItems"
          :key="item.key"
          type="button"
          class="nav-item"
          :class="{ active: activeTab === item.key }"
          @click="selectTab(item.key, $event)"
        >
          <span class="nav-item__icon"><i :class="item.icon" /></span>
          <span class="nav-item__text">
            <span class="nav-item__label">{{ item.label }}</span>
            <span class="nav-item__desc">{{ item.navDesc }}</span>
          </span>
        </button>
      </nav>
    </aside>

    <section class="account-panel__content">
      <!-- 左侧已有菜单标签，右侧不再重复大标题/副标题 -->
      <div class="content-body">
        <div v-if="activeTab === 'account'" class="account-section">
          <section class="account-card">
            <div class="account-card__header">
              <div>
                <h4>个人资料</h4>
                <p>管理公开展示的账号信息</p>
              </div>
            </div>
            <form class="account-profile" @submit.prevent="handleNicknameSave">
              <div class="account-profile__copy">
                <label class="account-profile__label" for="account-nickname">昵称</label>
                <span>用于界面展示，不作为登录凭证</span>
              </div>
              <div class="account-profile__editor">
                <div class="account-profile__controls">
                  <BaseInput
                    id="account-nickname"
                    v-model="nicknameDraft"
                    size="sm"
                    :maxlength="30"
                    :show-char-count="false"
                    placeholder="请输入昵称"
                    :disabled="savingNickname"
                    :state="nicknameError ? 'error' : 'default'"
                    @input="nicknameError = ''"
                  />
                  <BaseButton
                    class="account-profile__save"
                    variant="primary"
                    size="sm"
                    html-type="submit"
                    :loading="savingNickname"
                    :disabled="!canSaveNickname"
                  >
                    保存
                  </BaseButton>
                </div>
                <div class="account-profile__meta">
                  <span :class="{ 'account-profile__error': nicknameError }">
                    {{ nicknameError || '支持 1～30 个字符' }}
                  </span>
                  <span>{{ nicknameDraft.length }}/30</span>
                </div>
              </div>
            </form>
          </section>

          <section class="account-card">
            <div class="account-card__header">
              <div>
                <h4>登录方式</h4>
                <p>绑定后可使用更多方式登录同一个账号</p>
              </div>
            </div>
            <div class="binding-list">
              <div v-for="item in bindingItems" :key="item.key" class="binding-row">
                <div class="binding-main">
                  <span class="binding-icon" :class="item.status">
                    <i :class="item.icon" />
                  </span>
                  <div class="binding-copy">
                    <div class="binding-title-row">
                      <span class="binding-title">{{ item.label }}</span>
                      <span class="binding-badge" :class="item.status">
                        {{ item.status === 'bound' ? '已绑定' : '未绑定' }}
                      </span>
                    </div>
                    <div class="binding-desc">{{ item.description }}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div class="account-danger">
            <div>
              <div class="account-danger__title">退出当前账号</div>
              <div class="account-danger__desc">退出后，本机仍保留当前浏览器中的本地导航数据。</div>
            </div>
            <div class="account-actions">
              <button
                type="button"
                class="logout-button"
                :disabled="loggingOut"
                @click="handleLogout"
              >
                <i v-if="loggingOut" class="fas fa-spinner fa-spin" />
                退出登录
              </button>
            </div>
          </div>
        </div>

        <DataManagementModal v-else-if="activeTab === 'data'" @close="emit('close')" />
        <AIConfigModal v-else-if="activeTab === 'ai'" @close="emit('close')" />
        <SettingsModal v-else-if="activeTab === 'settings'" @close="emit('close')" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { AccountPanelTab } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { BaseButton, BaseInput } from '@nav/ui'
import DataManagementModal from '@/components/modals/DataManagementModal.vue'
import AIConfigModal from '@/components/modals/AIConfigModal.vue'
import SettingsModal from '@/components/modals/SettingsModal.vue'

const props = withDefaults(
  defineProps<{
    initialTab?: AccountPanelTab
  }>(),
  {
    initialTab: 'account'
  }
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUIStore()
const activeTab = ref<AccountPanelTab>(props.initialTab)
const loggingOut = ref(false)
const nicknameDraft = ref('')
const nicknameError = ref('')
const savingNickname = ref(false)

const navItems: Array<{
  key: AccountPanelTab
  label: string
  navDesc: string
  description: string
  icon: string
}> = [
  {
    key: 'account',
    label: '账号',
    navDesc: '登录方式',
    description: '管理登录方式和当前账号状态',
    icon: 'fas fa-user'
  },
  {
    key: 'data',
    label: '数据管理',
    navDesc: '备份导入',
    description: '云同步、历史备份、导入导出和清除数据',
    icon: 'fas fa-database'
  },
  {
    key: 'ai',
    label: 'AI 配置',
    navDesc: '模型密钥',
    description: '配置 AI 服务提供商和默认模型',
    icon: 'fas fa-robot'
  },
  {
    key: 'settings',
    label: '设置',
    navDesc: '偏好',
    description: '调整应用偏好和默认打开页面',
    icon: 'fas fa-sliders-h'
  }
]

watch(
  () => props.initialTab,
  tab => {
    if (tab) activeTab.value = tab
  }
)

watch(
  () => authStore.user?.nickname,
  nickname => {
    nicknameDraft.value = nickname || ''
    nicknameError.value = ''
  },
  { immediate: true }
)

const displayName = computed(() => authStore.user?.nickname || authStore.user?.email || '当前用户')
const displayEmail = computed(() => authStore.user?.email || '第三方账号登录')
const userInitial = computed(() => displayName.value.trim().charAt(0).toUpperCase() || '?')
const normalizedNickname = computed(() => nicknameDraft.value.trim())
const canSaveNickname = computed(() => {
  const nickname = normalizedNickname.value
  return (
    !savingNickname.value &&
    nickname.length >= 1 &&
    nickname.length <= 30 &&
    nickname !== (authStore.user?.nickname || '')
  )
})
const bindingItems = computed(() => [
  {
    key: 'email',
    label: '邮箱登录',
    description: authStore.user?.email || '暂未绑定邮箱',
    icon: 'fas fa-envelope',
    status: authStore.user?.email ? 'bound' : 'unbound'
  },
  {
    key: 'github',
    label: 'GitHub',
    description: '绑定后可使用 GitHub 快速登录',
    icon: 'fab fa-github',
    status: 'unbound'
  },
  {
    key: 'google',
    label: 'Google',
    description: '绑定后可使用 Google 快速登录',
    icon: 'fab fa-google',
    status: 'unbound'
  },
  {
    key: 'linuxdo',
    label: 'LinuxDo',
    description: '绑定后可使用 LinuxDo 快速登录',
    icon: 'fas fa-circle-nodes',
    status: 'unbound'
  }
])

const selectTab = (tab: AccountPanelTab, event?: MouseEvent) => {
  activeTab.value = tab
  const target = event?.currentTarget
  const shouldCenterNavItem =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  if (shouldCenterNavItem && target instanceof HTMLElement) {
    target.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }
}

const handleNicknameSave = async () => {
  if (!canSaveNickname.value) return

  savingNickname.value = true
  nicknameError.value = ''
  try {
    await authStore.updateNickname(normalizedNickname.value)
    uiStore.showToast('昵称已更新', 'success')
  } catch {
    nicknameError.value = '保存失败，请稍后重试'
  } finally {
    savingNickname.value = false
  }
}

const handleLogout = async () => {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await authStore.logout()
    emit('close')
    router.push('/login')
  } finally {
    loggingOut.value = false
  }
}
</script>

<style scoped lang="scss">
.account-panel {
  --account-shell-bg:
    linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.98)), var(--bg-panel);
  --account-sidebar-bg:
    linear-gradient(180deg, rgba(15, 23, 42, 0.02), rgba(15, 23, 42, 0.045)), #f8fafc;
  --account-header-bg:
    linear-gradient(180deg, rgba(248, 250, 252, 0.88), rgba(255, 255, 255, 0.95)), #fff;
  --account-canvas-bg:
    linear-gradient(180deg, rgba(248, 250, 252, 0.68), rgba(255, 255, 255, 0.98)), #fff;
  --account-surface-bg: rgba(255, 255, 255, 0.92);
  --account-control-bg: var(--bg-tile);

  display: grid;
  grid-template-columns: 244px minmax(0, 1fr);
  height: min(720px, calc(90vh - 58px));
  overflow: hidden;
  color: var(--text-main);
  background: var(--account-shell-bg);
}

.account-panel__sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 14px;
  border-right: 1px solid rgba(148, 163, 184, 0.18);
  background: var(--account-sidebar-bg);
}

.account-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 6px 8px;
  border-radius: 10px;
}

.account-summary__avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.account-summary__avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, var(--color-primary) 0%, #0f766e 100%);
  color: var(--color-white);
  font-weight: 700;
}

.account-summary__meta {
  min-width: 0;
}

.account-summary__name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-summary__email {
  margin-top: 1px;
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-panel__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  position: relative;
  width: 100%;
  min-height: 46px;
  padding: 7px 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;

  &:hover {
    background: var(--bg-tile);
    color: var(--text-main);
  }

  &.active {
    background: var(--bg-tile-hover);
    border-color: color-mix(in srgb, var(--color-primary) 16%, transparent);
    color: var(--text-main);
    box-shadow: var(--shadow-sm);

    .nav-item__icon {
      color: var(--color-primary-dark);
      background: var(--primary-soft);
      border-color: color-mix(in srgb, var(--color-primary) 16%, transparent);
    }
  }
}

.nav-item__icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: var(--bg-tile);
  border: 1px solid rgba(148, 163, 184, 0.16);
  transition:
    color 0.16s ease,
    background-color 0.16s ease,
    border-color 0.16s ease;
}

.nav-item__text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.nav-item__label {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
}

.nav-item__desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.25;
}

.account-panel__content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--account-shell-bg);
}

.content-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 22px 30px 30px;
  background: var(--account-canvas-bg);
}

.account-section {
  max-width: 820px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.account-card {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  background: transparent;
  overflow: hidden;
  box-shadow: none;
}

.account-card__header {
  min-height: 62px;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);

  h4 {
    margin: 0;
    color: var(--text-main);
    font-size: 14px;
    font-weight: 740;
  }

  p {
    margin: 3px 0 0;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.4;
  }
}

.account-profile {
  padding: 16px 20px 18px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 28px;
}

.account-profile__copy {
  min-width: 160px;

  span {
    display: block;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
  }
}

.account-profile__label {
  display: block;
  margin-bottom: 3px;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 700;
}

.account-profile__editor {
  width: min(100%, 410px);
  min-width: 0;
}

.account-profile__controls {
  display: flex;
  align-items: flex-start;
  gap: 8px;

  :deep(.base-input) {
    flex: 1;
    min-width: 0;
  }
}

.account-profile__save {
  min-width: 68px;
  flex: 0 0 auto;
}

.account-profile__meta {
  margin-top: 5px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.4;
}

.account-profile__error {
  color: var(--color-error);
}

.binding-list {
  display: flex;
  flex-direction: column;
}

.binding-row {
  min-height: 68px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 18px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);

  &:last-child {
    border-bottom: 0;
  }
}

.binding-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.binding-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: var(--account-control-bg);
  color: var(--text-muted);

  &.bound {
    color: var(--color-primary-dark);
    background: var(--primary-soft);
    border-color: color-mix(in srgb, var(--color-primary) 18%, transparent);
  }
}

.binding-copy {
  min-width: 0;
}

.binding-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.binding-title {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
}

.binding-badge {
  padding: 2px 7px;
  border-radius: 999px;
  color: var(--text-muted);
  background: rgba(148, 163, 184, 0.1);
  font-size: 11px;
  font-weight: 700;

  &.bound {
    color: #047857;
    background: rgba(16, 185, 129, 0.1);
  }
}

.binding-desc {
  margin-top: 3px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-danger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 14px;
  background: transparent;
}

.account-danger__title {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
}

.account-danger__desc {
  margin-top: 3px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.account-actions {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.logout-button {
  height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #dc2626;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    color 0.16s ease;

  &:hover:not(:disabled) {
    background: rgba(220, 38, 38, 0.07);
    color: #b91c1c;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
}

:deep(.data-management-modal__section),
:deep(.ai-config__section),
:deep(.prefs-card) {
  border-color: rgba(148, 163, 184, 0.16);
  background: var(--account-surface-bg);
  box-shadow: none;
}

:deep(.data-management-modal),
:deep(.ai-config),
:deep(.prefs) {
  max-width: none;
}

:global(html[data-theme='dark'] .account-panel) {
  --account-shell-bg: var(--bg-panel);
  --account-sidebar-bg: var(--bg-panel);
  --account-header-bg: var(--bg-panel);
  --account-canvas-bg: var(--bg-panel);
  --account-surface-bg: var(--bg-panel);
  --account-control-bg: var(--bg-tile);
}

@media (max-width: 768px) {
  .account-panel {
    display: flex;
    flex-direction: column;
    grid-template-columns: none;
    height: calc(100vh - 58px);
  }

  .account-panel__sidebar {
    flex: 0 0 auto;
    border-right: 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.16);
    padding: 12px;
  }

  .account-summary {
    display: none;
  }

  .account-panel__nav {
    flex-direction: row;
    overflow-x: auto;
    gap: 8px;
    padding-bottom: 4px;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .nav-item {
    width: auto;
    flex: 0 0 auto;
    min-height: 40px;
    padding: 7px 10px;
    white-space: nowrap;
  }

  .nav-item__icon {
    width: 30px;
    height: 30px;
  }

  .nav-item__desc {
    display: none;
  }

  .content-body {
    padding: 18px 16px 24px;
  }

  .account-danger {
    align-items: flex-start;
    flex-direction: column;
  }

  .account-profile {
    flex-direction: column;
    gap: 12px;
  }

  .account-profile__copy {
    min-width: 0;
  }

  .account-profile__editor {
    width: 100%;
  }

  .binding-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .binding-main {
    width: 100%;
  }
}
</style>
