<template>
  <div class="oauth-workbench">
    <!-- Error Bar -->
    <div v-if="globalError" class="flash-bar flash-bar--error">
      <i class="fas fa-triangle-exclamation" />
      <span>{{ globalError }}</span>
      <button class="flash-close" @click="globalError = ''"><i class="fas fa-xmark" /></button>
    </div>

    <!-- Loading -->
    <div v-if="loading && configs.length === 0" class="loading-state">
      <span class="loading-spinner" />
      <span>正在同步 OAuth 平台配置…</span>
    </div>

    <div v-else-if="currentProvider" class="workbench-layout">
      <!-- ── LEFT: Platform Rail ── -->
      <aside class="oauth-rail">
        <div class="rail-nav">
          <button
            v-for="p in providers"
            :key="p.key"
            class="platform-item"
            :class="{ 'is-active': activeKey === p.key }"
            @click="activeKey = p.key"
          >
            <div class="platform-icon" :class="`platform-icon--${p.key}`">
              <!-- GitHub SVG -->
              <svg
                v-if="p.key === 'github'"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
                />
              </svg>

              <!-- Google SVG -->
              <svg
                v-else-if="p.key === 'google'"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27A7.17 7.17 0 0 1 4.9 12c0-.79.14-1.56.38-2.27V6.58H1.25A11.96 11.96 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>

              <!-- LINUX DO Official SVG -->
              <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                <defs>
                  <clipPath :id="`linuxdo-clip-rail-${p.key}`">
                    <circle cx="12" cy="12" r="12" />
                  </clipPath>
                </defs>
                <g :clip-path="`url(#linuxdo-clip-rail-${p.key})`">
                  <rect x="0" y="0" width="24" height="8" fill="#000000" />
                  <rect x="0" y="8" width="24" height="8" fill="#FFFFFF" />
                  <rect x="0" y="16" width="24" height="8" fill="#FFB11B" />
                </g>
              </svg>
            </div>
            <div class="platform-body">
              <span class="platform-name">{{ p.name }}</span>
              <span class="platform-sub">{{ p.sub }}</span>
            </div>
            <div class="platform-status-badge">
              <i
                :class="
                  formMap[p.key]?.enabled
                    ? 'fas fa-circle-check text-green'
                    : 'fas fa-circle-info text-muted'
                "
              />
            </div>
          </button>
        </div>

        <!-- Capability callout for active platform -->
        <div class="capability-callout">
          <div
            v-for="cap in currentProviderMeta?.capabilities"
            :key="cap.label"
            class="cap-row"
            :class="cap.ok ? 'cap-row--ok' : 'cap-row--no'"
          >
            <i :class="cap.ok ? 'fas fa-check' : 'fas fa-xmark'" />
            <span>{{ cap.label }}</span>
          </div>
        </div>
      </aside>

      <!-- ── RIGHT: Config Panel ── -->
      <section class="config-panel">
        <!-- Panel Header -->
        <div class="panel-header">
          <div class="panel-header-left">
            <div>
              <h3 class="panel-title">{{ currentProvider.name }} 登录配置</h3>
              <p class="panel-subtitle">
                配置 {{ currentProvider.name }} OAuth 2.0 登录应用凭据与授权回调。
              </p>
            </div>
          </div>
          <div class="panel-header-right">
            <a
              :href="currentProvider.docUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="portal-btn"
            >
              <span>{{ currentProvider.portalAction }}</span>
            </a>
            <div v-if="formMap[activeKey]?.updatedAt" class="updated-chip">
              <i class="fas fa-clock" />
              <span>上次保存 {{ formatDate(formMap[activeKey].updatedAt!) }}</span>
            </div>
          </div>
        </div>

        <form class="config-form" @submit.prevent="handleSave(activeKey)">
          <!-- ① 开启状态控制 -->
          <div class="config-section">
            <div class="status-toggle-card" :class="{ 'is-enabled': formMap[activeKey].enabled }">
              <div class="toggle-card-body">
                <div class="toggle-card-title">
                  <span>允许用户使用 {{ currentProvider.name }} 快捷登录</span>
                  <span
                    class="status-chip"
                    :class="
                      formMap[activeKey].enabled ? 'status-chip--active' : 'status-chip--inactive'
                    "
                  >
                    {{ formMap[activeKey].enabled ? '已启用' : '未开启' }}
                  </span>
                </div>
                <p class="toggle-card-desc">
                  开启后，登录和注册界面将自动展示 {{ currentProvider.name }} 一键登录按钮。
                </p>
              </div>
              <label
                class="switch-control"
                :title="formMap[activeKey].enabled ? '点击关闭' : '点击开启'"
              >
                <input v-model="formMap[activeKey].enabled" type="checkbox" />
                <span class="switch-control__track" />
              </label>
            </div>
          </div>

          <!-- ② 客户端凭据 -->
          <div class="config-section">
            <div class="fields-grid">
              <div class="field">
                <label class="field-label">
                  Client ID
                  <span class="req">*</span>
                </label>
                <input
                  v-model="formMap[activeKey].clientId"
                  type="text"
                  class="field-input mono"
                  :placeholder="`${currentProvider.name} 提供的 Client ID`"
                  required
                />
                <span class="field-hint">
                  在 {{ currentProvider.name }} 开发者后台创建的 OAuth 应用公开标识。
                </span>
              </div>

              <div class="field">
                <div class="field-label-row">
                  <label class="field-label">
                    Client Secret
                    <span v-if="!formMap[activeKey].hasSecret" class="req">*</span>
                  </label>
                  <span v-if="formMap[activeKey].hasSecret" class="enc-badge">
                    <i class="fas fa-lock-keyhole" />
                    已加密保存
                  </span>
                </div>
                <div class="secret-wrap">
                  <input
                    v-model="formMap[activeKey].clientSecret"
                    :type="showSecretMap[activeKey] ? 'text' : 'password'"
                    class="field-input mono"
                    :placeholder="
                      formMap[activeKey].hasSecret
                        ? '留空保持当前密钥不变'
                        : `输入 ${currentProvider.name} Client Secret`
                    "
                    :required="!formMap[activeKey].hasSecret"
                  />
                  <button
                    type="button"
                    class="eye-btn"
                    :title="showSecretMap[activeKey] ? '隐藏密码' : '显示密码'"
                    @click="showSecretMap[activeKey] = !showSecretMap[activeKey]"
                  >
                    <i :class="showSecretMap[activeKey] ? 'fas fa-eye-slash' : 'fas fa-eye'" />
                  </button>
                </div>
                <span class="field-hint">安全加密存储在数据库中，留空保存时不会覆盖已有密钥。</span>
              </div>
            </div>
          </div>

          <!-- ③ 授权回调与权限 -->
          <div class="config-section">
            <div class="fields-grid">
              <div class="field field--full">
                <div class="field-label-row">
                  <label class="field-label">
                    授权回调地址 (Redirect URI)
                    <span class="req">*</span>
                  </label>
                  <span class="field-hint">需完整复制到 {{ currentProvider.name }} 开发者后台</span>
                </div>
                <div class="url-copy-wrap">
                  <input
                    v-model="formMap[activeKey].redirectUri"
                    type="url"
                    class="field-input field-input--copy mono"
                    placeholder="https://your-domain.com/oauth2/callback"
                    required
                  />
                  <button
                    type="button"
                    class="copy-btn"
                    :class="{ 'is-copied': copiedKey === activeKey }"
                    title="复制到剪贴板"
                    @click="handleCopy(formMap[activeKey].redirectUri, activeKey)"
                  >
                    <i :class="copiedKey === activeKey ? 'fas fa-check' : 'fas fa-copy'" />
                    <span>{{ copiedKey === activeKey ? '已复制' : '复制' }}</span>
                  </button>
                </div>
                <span class="field-hint">
                  用户完成 {{ currentProvider.name }} 授权后，系统回调处理登录验证的完整入口。
                </span>
              </div>

              <div class="field field--full">
                <label class="field-label">请求的授权作用域 (Scopes)</label>
                <div class="scopes-tag-group">
                  <span v-for="s in currentProvider.scopes" :key="s" class="scope-tag">
                    <i class="fas fa-shield-check" />
                    {{ s }}
                  </span>
                  <span class="scopes-desc">
                    （仅读取用户基本资料、头像与邮箱，用于创建或关联本地账号）
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- ④ Footer Actions -->
          <div class="form-footer">
            <div class="footer-left" />
            <div class="footer-actions">
              <button
                type="button"
                class="btn-reset"
                :disabled="savingKey === activeKey || loading"
                @click="loadConfigs"
              >
                <span>重新加载</span>
              </button>
              <button type="submit" class="btn-save" :disabled="savingKey === activeKey || loading">
                <span v-if="savingKey === activeKey" class="btn-spinner" />
                <span>{{ savingKey === activeKey ? '正在保存…' : '保存配置' }}</span>
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { getOAuthConfigs, updateOAuthConfig, type AdminOAuthConfig } from '@/api/admin'
import { useUIStore } from '@/stores/ui'

type OAuthProviderKey = 'github' | 'google' | 'linuxdo'

interface ProviderItem {
  key: OAuthProviderKey
  name: string
  sub: string
  docUrl: string
  portalAction: string
  scopes: string[]
  capabilities: { label: string; ok: boolean }[]
}

const providers: ProviderItem[] = [
  {
    key: 'github',
    name: 'GitHub',
    sub: '代码托管平台',
    docUrl: 'https://github.com/settings/developers',
    portalAction: '前往 GitHub 申请凭据',
    scopes: ['read:user', 'user:email'],
    capabilities: [
      { label: '支持一键登录 & 绑定', ok: true },
      { label: '自动拉取 GitHub 头像', ok: true },
      { label: 'AES-256 加密存储密钥', ok: true }
    ]
  },
  {
    key: 'google',
    name: 'Google',
    sub: '谷歌账号登录',
    docUrl: 'https://console.cloud.google.com/apis/credentials',
    portalAction: '前往 Google Cloud 申请凭据',
    scopes: ['openid', 'profile', 'email'],
    capabilities: [
      { label: 'Google OAuth 2.0 协议', ok: true },
      { label: '自动拉取 Google 资料', ok: true },
      { label: 'AES-256 加密存储密钥', ok: true }
    ]
  },
  {
    key: 'linuxdo',
    name: 'LINUX DO',
    sub: '技术社区 Connect',
    docUrl: 'https://connect.linux.do',
    portalAction: '前往 LINUX DO 登记应用',
    scopes: ['user', 'user:email'],
    capabilities: [
      { label: 'LINUX DO Connect 授权', ok: true },
      { label: '社区信任等级与身份绑定', ok: true },
      { label: 'AES-256 加密存储密钥', ok: true }
    ]
  }
]

const uiStore = useUIStore()
const configs = ref<AdminOAuthConfig[]>([])
const loading = ref(false)
const globalError = ref('')
const savingKey = ref<string | null>(null)
const copiedKey = ref<string | null>(null)
const activeKey = ref<OAuthProviderKey>('github')

const currentProvider = computed(
  () => providers.find(p => p.key === activeKey.value) ?? providers[0]
)
const currentProviderMeta = computed(() => currentProvider.value)

const formMap = reactive<
  Record<
    OAuthProviderKey,
    {
      enabled: boolean
      clientId: string
      clientSecret: string
      redirectUri: string
      hasSecret: boolean
      updatedAt?: number
    }
  >
>({
  github: { enabled: false, clientId: '', clientSecret: '', redirectUri: '', hasSecret: false },
  google: { enabled: false, clientId: '', clientSecret: '', redirectUri: '', hasSecret: false },
  linuxdo: { enabled: false, clientId: '', clientSecret: '', redirectUri: '', hasSecret: false }
})

const showSecretMap = reactive<Record<OAuthProviderKey, boolean>>({
  github: false,
  google: false,
  linuxdo: false
})

const loadConfigs = async () => {
  loading.value = true
  globalError.value = ''
  try {
    const res = await getOAuthConfigs()
    if (!res.success || !res.data) throw new Error(res.message || '获取配置失败')
    configs.value = res.data
    res.data.forEach(item => {
      if (item.provider in formMap) {
        const form = formMap[item.provider as OAuthProviderKey]
        form.enabled = item.enabled
        form.clientId = item.clientId
        form.redirectUri = item.redirectUri
        form.hasSecret = item.hasSecret
        form.updatedAt = item.updatedAt
        form.clientSecret = ''
      }
    })
  } catch (cause) {
    globalError.value = cause instanceof Error ? cause.message : '获取 OAuth 配置失败'
  } finally {
    loading.value = false
  }
}

const handleSave = async (providerKey: OAuthProviderKey) => {
  const form = formMap[providerKey]
  if (!form.clientId.trim()) {
    uiStore.showToast('请填写 Client ID', 'error')
    return
  }
  if (!form.redirectUri.trim()) {
    uiStore.showToast('请填写回调地址 (Redirect URI)', 'error')
    return
  }
  if (!form.hasSecret && !form.clientSecret.trim()) {
    uiStore.showToast('首次配置请填写 Client Secret', 'error')
    return
  }

  savingKey.value = providerKey
  globalError.value = ''
  try {
    const res = await updateOAuthConfig(providerKey, {
      enabled: form.enabled,
      clientId: form.clientId.trim(),
      redirectUri: form.redirectUri.trim(),
      clientSecret: form.clientSecret.trim() ? form.clientSecret.trim() : undefined
    })

    if (!res.success || !res.data) {
      throw new Error(res.message || '保存配置失败')
    }

    form.hasSecret = res.data.hasSecret
    form.updatedAt = res.data.updatedAt
    form.clientSecret = ''
    showSecretMap[providerKey] = false

    uiStore.showToast(`${providerKey.toUpperCase()} 登录配置已保存并即时生效`, 'success')
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : '保存配置失败'
    globalError.value = msg
    uiStore.showToast(msg, 'error')
  } finally {
    savingKey.value = null
  }
}

const handleCopy = async (text: string, key: string) => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    uiStore.showToast('回调地址已复制到剪贴板', 'success')
    setTimeout(() => {
      if (copiedKey.value === key) copiedKey.value = null
    }, 2000)
  } catch {
    uiStore.showToast('复制失败，请手动选择复制', 'error')
  }
}

const formatDate = (ts: number) =>
  new Date(ts).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })

onMounted(() => void loadConfigs())
</script>

<style scoped lang="scss">
/* ── Root ───────────────────────────────────────── */
.oauth-workbench {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Flash Bars ─────────────────────────────────── */
.flash-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 500;

  i {
    flex-shrink: 0;
    font-size: 13px;
  }

  &--error {
    background: color-mix(in srgb, var(--color-error) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-error) 20%, transparent);
    color: var(--color-error);
  }
}

.flash-close {
  margin-left: auto;
  background: transparent;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  padding: 2px 4px;
  border-radius: 4px;

  &:hover {
    opacity: 1;
    background: color-mix(in srgb, currentColor 12%, transparent);
  }
}

/* ── Loading ────────────────────────────────────── */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 0;
  min-height: 320px;
  box-sizing: border-box;
  color: var(--text-muted);
  font-size: 13px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-tile);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

/* ── Workbench Layout ───────────────────────────── */
.workbench-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 28px;
}

/* ── LEFT: Platform Rail ────────────────────────── */
.oauth-rail {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-tile);
  padding: 2px 20px 0 0;
}

.rail-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 4px;
}

.platform-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  text-align: left;
  transition: all 0.15s ease;
  width: 100%;
  font-family: inherit;

  &:hover {
    background: var(--bg-tile);
  }

  &.is-active {
    background: var(--bg-tile);

    .platform-name {
      color: var(--text-main);
      font-weight: 600;
    }
  }
}

.platform-icon {
  display: grid;
  place-items: center;
  font-size: 16px;
  flex-shrink: 0;

  &--github {
    color: var(--text-secondary);
  }

  &--google {
    color: #4285f4;
  }

  &--linuxdo {
    color: #ffb11b;
  }
}

.platform-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.platform-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.15s;
}

.platform-sub {
  font-size: 10.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.platform-status-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  flex-shrink: 0;

  .text-green {
    color: var(--color-success);
  }

  .text-muted {
    color: var(--text-muted);
    opacity: 0.5;
  }
}

/* Capability callout */
.capability-callout {
  margin-top: auto;
  padding: 12px 14px;
  border-top: 1px solid var(--border-tile);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cap-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;

  i {
    font-size: 10px;
    flex-shrink: 0;
  }

  &--ok {
    color: var(--color-success);
  }

  &--no {
    color: var(--text-muted);
    opacity: 0.55;
  }
}

/* ── RIGHT: Config Panel ── */
.config-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 26px 18px;
  border-bottom: 1px solid var(--border-tile);
}

.panel-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.panel-subtitle {
  margin: 3px 0 0;
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.4;
}

.panel-header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.portal-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
  transition: all 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--color-primary) 15%, transparent);
    transform: translateY(-1px);
  }

  i {
    font-size: 10px;
  }
}

.updated-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;

  i {
    font-size: 10px;
  }
}

/* ── Config Form ── */
.config-form {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px 26px;
}

/* Status Toggle Card */
.status-toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 10px;
  border: 1px solid var(--border-tile);
  background: var(--bg-tile);
  transition: all 0.15s ease;

  &.is-enabled {
    border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
    background: color-mix(in srgb, var(--color-primary) 4%, var(--bg-panel));
  }
}

.toggle-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toggle-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
}

.toggle-card-desc {
  margin: 0;
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.4;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;

  &--active {
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
    color: var(--color-success);
  }

  &--inactive {
    background: color-mix(in srgb, var(--text-muted) 12%, transparent);
    color: var(--text-muted);
  }
}

/* Switch control */
.switch-control {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  cursor: pointer;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  &__track {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--border-tile) 80%, #94a3b8);
    border-radius: 24px;
    transition: all 0.2s ease;

    &::before {
      position: absolute;
      content: '';
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
  }

  input:checked + &__track {
    background: var(--color-primary);
  }

  input:checked + &__track::before {
    transform: translateX(20px);
  }
}

/* ── Fields ── */
.fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &--full {
    grid-column: 1 / -1;
  }
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.req {
  color: var(--color-error);
  margin-left: 2px;
}

.enc-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
  color: var(--color-success);
  font-size: 10.5px;
  font-weight: 600;
}

.field-input {
  width: 100%;
  height: 38px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid var(--border-tile);
  background: var(--bg-tile);
  color: var(--text-main);
  font: inherit;
  font-size: 12.5px;
  outline: 0;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    background 0.15s;
  box-sizing: border-box;

  &.mono {
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, monospace;
    font-size: 12px;
  }

  &--copy {
    padding-right: 76px;
  }

  &:focus {
    border-color: var(--color-primary);
    background: var(--bg-panel);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 10%, transparent);
  }

  &::placeholder {
    color: var(--text-muted);
    opacity: 0.55;
  }
}

.field-hint {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}

.secret-wrap {
  position: relative;
  display: flex;
  align-items: center;

  .field-input {
    padding-right: 36px;
  }
}

.eye-btn {
  position: absolute;
  right: 8px;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    color: var(--text-secondary);
  }
}

.url-copy-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.copy-btn {
  position: absolute;
  right: 6px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-radius: 5px;
  border: 1px solid var(--border-tile);
  background: var(--bg-panel);
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  &.is-copied {
    border-color: var(--color-success);
    background: color-mix(in srgb, var(--color-success) 10%, transparent);
    color: var(--color-success);
  }
}

/* Scopes Tag Group */
.scopes-tag-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 4px 0;
}

.scope-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  background: color-mix(in srgb, var(--color-primary) 8%, var(--bg-tile));
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
  color: var(--color-primary-dark, var(--color-primary));

  i {
    font-size: 10px;
  }
}

.scopes-desc {
  font-size: 11.5px;
  color: var(--text-muted);
}

/* ── Footer ── */
.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 26px;
  padding: 16px 0 26px;
  border-top: 1px solid var(--border-tile);
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-reset {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--border-tile);
  background: var(--bg-panel);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;

  i {
    font-size: 12px;
  }

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--color-primary) 40%, var(--border-tile));
    background: color-mix(in srgb, var(--color-primary) 5%, var(--bg-panel));
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.btn-save {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 18px;
  border-radius: 8px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;

  i {
    font-size: 12px;
  }

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-primary) 85%, #000);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 30%, transparent);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .workbench-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .oauth-rail {
    border-right: none;
    border-bottom: 1px solid var(--border-tile);
    padding: 0 0 12px;
  }

  .capability-callout {
    display: none;
  }

  .fields-grid {
    grid-template-columns: 1fr;
  }

  .panel-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .panel-header-right {
    align-items: flex-start;
  }
}
</style>
