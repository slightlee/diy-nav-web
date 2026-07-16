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
      <header class="content-header">
        <div class="content-title-group">
          <h3>{{ activeItem.label }}</h3>
          <p>{{ activeItem.description }}</p>
        </div>
      </header>

      <div class="content-body">
        <div v-if="activeTab === 'account'" class="account-section">
          <section class="account-card account-card--primary">
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
                <button class="binding-action" type="button" disabled>
                  {{ item.actionLabel }}
                </button>
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
const activeTab = ref<AccountPanelTab>(props.initialTab)
const loggingOut = ref(false)

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
    description: '管理备份、恢复、导入导出和清除数据',
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

const activeItem = computed(
  () => navItems.find(item => item.key === activeTab.value) || navItems[0]
)
const displayName = computed(() => authStore.user?.nickname || authStore.user?.email || '当前用户')
const displayEmail = computed(() => authStore.user?.email || '第三方账号登录')
const userInitial = computed(() => displayName.value.trim().charAt(0).toUpperCase() || '?')
const bindingItems = computed(() => [
  {
    key: 'email',
    label: '邮箱登录',
    description: authStore.user?.email || '暂未绑定邮箱',
    icon: 'fas fa-envelope',
    status: authStore.user?.email ? 'bound' : 'unbound',
    actionLabel: authStore.user?.email ? '换绑' : '即将支持'
  },
  {
    key: 'github',
    label: 'GitHub',
    description: '绑定后可使用 GitHub 快速登录',
    icon: 'fab fa-github',
    status: 'unbound',
    actionLabel: '即将支持'
  },
  {
    key: 'google',
    label: 'Google',
    description: '绑定后可使用 Google 快速登录',
    icon: 'fab fa-google',
    status: 'unbound',
    actionLabel: '即将支持'
  },
  {
    key: 'linuxdo',
    label: 'LinuxDo',
    description: '绑定后可使用 LinuxDo 快速登录',
    icon: 'fas fa-circle-nodes',
    status: 'unbound',
    actionLabel: '即将支持'
  }
])

const selectTab = (tab: AccountPanelTab, event?: MouseEvent) => {
  activeTab.value = tab
  const target = event?.currentTarget
  if (target instanceof HTMLElement) {
    target.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
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
  display: grid;
  grid-template-columns: 244px minmax(0, 1fr);
  height: min(720px, calc(90vh - 58px));
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.98)), var(--bg-panel);
}

.account-panel__sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 14px;
  border-right: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.02), rgba(15, 23, 42, 0.045)), #f8fafc;
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
  background: linear-gradient(145deg, #2563eb 0%, #0f766e 100%);
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
    background: rgba(255, 255, 255, 0.72);
    color: var(--text-main);
  }

  &.active {
    background: #fff;
    border-color: rgba(37, 99, 235, 0.16);
    color: #0f172a;
    box-shadow:
      0 8px 18px rgba(15, 23, 42, 0.06),
      inset 0 0 0 1px rgba(255, 255, 255, 0.7);

    .nav-item__icon {
      color: #2563eb;
      background: #eff6ff;
      border-color: rgba(37, 99, 235, 0.16);
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
  background: rgba(255, 255, 255, 0.52);
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
  background: #fff;
}

.content-header {
  min-height: 72px;
  padding: 0 30px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.88), rgba(255, 255, 255, 0.95)), #fff;
  display: flex;
  align-items: center;

  h3 {
    margin: 0;
    color: var(--text-main);
    font-size: 20px;
    font-weight: 740;
    letter-spacing: 0;
  }

  p {
    margin: 2px 0 0;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.5;
  }
}

.content-title-group {
  min-width: 0;
}

.content-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 22px 30px 30px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.68), rgba(255, 255, 255, 0.98)), #fff;
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
  background: rgba(255, 255, 255, 0.92);
  overflow: hidden;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.04);
}

.account-card--primary {
  border-color: rgba(37, 99, 235, 0.12);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.055);
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

.binding-list {
  display: flex;
  flex-direction: column;
}

.binding-row {
  min-height: 68px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  background: var(--bg-tile);
  color: var(--text-muted);

  &.bound {
    color: #2563eb;
    background: #eff6ff;
    border-color: rgba(37, 99, 235, 0.18);
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

.binding-action {
  height: 30px;
  min-width: 72px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(248, 250, 252, 0.92);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: not-allowed;
}

.account-danger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.68);
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
:deep(.settings-section) {
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.04);
}

:deep(.data-management-modal),
:deep(.ai-config),
:deep(.settings-content) {
  max-width: none;
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

  .content-header,
  .content-body {
    padding-left: 16px;
    padding-right: 16px;
  }

  .content-header {
    min-height: 76px;
    padding-top: 0;
  }

  .content-body {
    padding-top: 18px;
  }

  .account-danger {
    align-items: flex-start;
    flex-direction: column;
  }

  .binding-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .binding-main {
    width: 100%;
  }

  .binding-action {
    align-self: flex-start;
  }
}
</style>
