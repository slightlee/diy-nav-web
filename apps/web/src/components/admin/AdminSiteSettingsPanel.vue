<template>
  <div class="site-workbench">
    <!-- Error Bar -->
    <div v-if="globalError" class="flash-bar flash-bar--error">
      <i class="fas fa-triangle-exclamation" />
      <span>{{ globalError }}</span>
      <button class="flash-close" @click="globalError = ''">
        <i class="fas fa-xmark" />
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading && !form.siteName" class="loading-state">
      <span class="loading-spinner" />
      <span>正在加载站点配置…</span>
    </div>

    <div v-else class="workbench-layout">
      <!-- ── 左侧：配置分组 ── -->
      <aside class="settings-rail">
        <nav class="rail-nav">
          <button
            v-for="g in groups"
            :key="g.key"
            type="button"
            class="group-item"
            :class="{ 'is-active': activeGroup === g.key }"
            @click="activeGroup = g.key"
          >
            <div class="group-icon">
              <!-- Globe SVG -->
              <svg
                v-if="g.key === 'basic'"
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path
                  d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                />
                <path d="M2 12h20" />
              </svg>
              <!-- Mail SVG -->
              <svg
                v-else
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <span class="group-name">{{ g.name }}</span>
            <span
              class="group-status-chip"
              :class="isGroupConfigured(g.key) ? 'is-ok' : 'is-pending'"
            >
              {{ isGroupConfigured(g.key) ? '已配置' : '待配置' }}
            </span>
          </button>
        </nav>
      </aside>

      <!-- ── 右侧：配置卡片 ── -->
      <section class="config-panel">
        <!-- 表单 -->
        <form class="config-form" @submit.prevent="handleSave">
          <!-- 分组 1: 站点基础信息 -->
          <div v-if="activeGroup === 'basic'" class="config-section">
            <div class="brand-preview">
              <img
                v-if="form.siteLogo.trim() && !logoLoadError"
                :src="form.siteLogo.trim()"
                alt="Logo 预览"
                class="brand-preview__logo"
                @error="logoLoadError = true"
                @load="logoLoadError = false"
              />
              <i
                v-else-if="logoLoadError"
                class="fas fa-circle-exclamation brand-preview__logo is-error"
              />
              <i v-else class="fas fa-compass brand-preview__logo is-fallback" />
              <span class="brand-preview__name">{{ form.siteName.trim() || '站点名称' }}</span>
              <span class="brand-preview__badge">导航栏预览</span>
            </div>

            <div class="field">
              <label class="field-label" for="site-name-input">站点名称</label>
              <input
                id="site-name-input"
                v-model="form.siteName"
                type="text"
                class="field-input"
                placeholder="例如：DIY 导航"
                maxlength="64"
              />
              <span class="field-hint">用于浏览器标签页标题、邮件签名与系统通知。</span>
            </div>

            <div class="field">
              <label class="field-label" for="site-logo-input">Logo 图标</label>
              <div class="url-input-wrap">
                <span class="url-badge">URL</span>
                <input
                  id="site-logo-input"
                  v-model="form.siteLogo"
                  type="url"
                  class="field-input field-input--url mono"
                  placeholder="https://cdn.example.com/logo.svg"
                  @input="logoLoadError = false"
                />
                <button
                  v-if="form.siteLogo.trim()"
                  type="button"
                  class="btn-clear"
                  title="清空"
                  @click="
                    form.siteLogo = ''
                    logoLoadError = false
                  "
                >
                  <i class="fas fa-xmark" />
                </button>
              </div>
              <span class="field-hint">显示在顶部导航栏左侧，留空使用系统默认图标。</span>
            </div>
          </div>

          <!-- 分组 2: SMTP 邮件服务 -->
          <div v-else-if="activeGroup === 'smtp'" class="config-section">
            <div class="email-preview">
              <div class="email-preview__meta">
                <div class="email-preview__row">
                  <span class="email-preview__label">发件人</span>
                  <span class="email-preview__val mono">
                    {{ form.smtpUser.trim() || 'service@your-mail.com' }}
                  </span>
                </div>
                <div class="email-preview__row">
                  <span class="email-preview__label">主题</span>
                  <span class="email-preview__val">
                    邮箱验证 - {{ form.siteName.trim() || '站点名称' }}
                  </span>
                </div>
              </div>
              <div class="email-preview__body">
                <p>您好，</p>
                <p>请点击下方按钮完成邮箱验证并设置密码：</p>
                <span class="email-preview__btn">验证邮箱并设置密码</span>
              </div>
            </div>

            <div class="field">
              <label class="field-label" for="webapp-url-input">
                验证邮件跳转地址
                <span class="req">*</span>
              </label>
              <input
                id="webapp-url-input"
                v-model="form.webAppUrl"
                type="url"
                class="field-input mono"
                placeholder="https://nav.example.com"
                required
              />
              <span class="field-hint">验证邮件中按钮的跳转地址。</span>
            </div>

            <div class="field">
              <label class="field-label" for="smtp-user-input">发信邮箱</label>
              <input
                id="smtp-user-input"
                v-model="form.smtpUser"
                type="email"
                class="field-input mono"
                placeholder="例如：service@163.com 或 user@qq.com"
              />
              <span class="field-hint">用于发送验证码与安全通知的发信邮箱。</span>
            </div>

            <div class="field">
              <div class="field-label-row">
                <label class="field-label" for="smtp-password-input">SMTP 授权码</label>
                <span v-if="form.hasSmtpPassword" class="enc-badge">
                  <i class="fas fa-lock" />
                  已加密保存
                </span>
              </div>
              <div class="secret-wrap">
                <input
                  id="smtp-password-input"
                  v-model="form.smtpPassword"
                  :type="showSecret ? 'text' : 'password'"
                  class="field-input mono field-input--secret"
                  :placeholder="
                    form.hasSmtpPassword
                      ? '留空保持当前授权密码不变'
                      : '输入发信邮箱客户端专用授权码'
                  "
                />
                <button
                  type="button"
                  class="eye-btn"
                  :title="showSecret ? '隐藏密码' : '显示密码'"
                  @click="showSecret = !showSecret"
                >
                  <i :class="showSecret ? 'fas fa-eye-slash' : 'fas fa-eye'" />
                </button>
              </div>
              <span class="field-hint">
                邮箱后台生成的客户端专用授权码，非网页登录密码，AES-256 加密保存。
              </span>
            </div>
          </div>

          <!-- 底部操作按钮 -->
          <div class="form-footer">
            <button
              type="button"
              class="btn-secondary"
              :disabled="saving || loading"
              @click="loadSettings"
            >
              重新加载
            </button>
            <button type="submit" class="btn-primary" :disabled="saving || loading">
              <span v-if="saving" class="btn-spinner" />
              <span>{{ saving ? '正在保存…' : '保存配置' }}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { getSiteSettings, updateSiteSettings } from '@/api/admin'
import { useUIStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'

type SettingGroupKey = 'basic' | 'smtp'

interface SettingGroupMeta {
  key: SettingGroupKey
  name: string
  desc: string
}

const groups: SettingGroupMeta[] = [
  {
    key: 'basic',
    name: '站点基础信息',
    desc: '站点名称与 Logo 标识。'
  },
  {
    key: 'smtp',
    name: 'SMTP 邮件服务',
    desc: '验证邮件的发信通道。'
  }
]

const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const loading = ref(false)
const saving = ref(false)
const globalError = ref('')
const showSecret = ref(false)
const logoLoadError = ref(false)
const activeGroup = ref<SettingGroupKey>('basic')

const smtpReady = computed(() => form.hasSmtpPassword && !!form.smtpUser.trim())

const isGroupConfigured = (key: SettingGroupKey) =>
  key === 'basic' ? !!form.siteName.trim() : smtpReady.value

const form = reactive({
  siteName: '',
  siteLogo: '',
  webAppUrl: '',
  smtpUser: '',
  smtpPassword: '',
  hasSmtpPassword: false
})

const loadSettings = async () => {
  loading.value = true
  globalError.value = ''
  try {
    const res = await getSiteSettings()
    if (!res.success || !res.data) {
      throw new Error(res.message || '获取站点配置失败')
    }
    form.siteName = res.data.siteName || ''
    form.siteLogo = res.data.siteLogo || ''
    form.webAppUrl = res.data.webAppUrl || ''
    form.smtpUser = res.data.smtpUser || ''
    form.smtpPassword = ''
    form.hasSmtpPassword = res.data.hasSmtpPassword
    logoLoadError.value = false
  } catch (e) {
    globalError.value = e instanceof Error ? e.message : '获取站点配置失败'
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  if (!form.webAppUrl.trim()) {
    return uiStore.showToast('请填写 Web 应用公开访问地址', 'error')
  }

  const logoUrl = form.siteLogo.trim()
  if (logoUrl && !/^https?:\/\/.+/i.test(logoUrl)) {
    return uiStore.showToast('站点 Logo 必须是有效的完整 HTTP/HTTPS URL 地址', 'error')
  }

  saving.value = true
  globalError.value = ''
  try {
    const res = await updateSiteSettings({
      siteName: form.siteName.trim() || undefined,
      siteLogo: logoUrl,
      webAppUrl: form.webAppUrl.trim(),
      smtpUser: form.smtpUser.trim(),
      smtpPassword: form.smtpPassword.trim() || undefined
    })

    if (!res.success || !res.data) {
      throw new Error(res.message || '保存配置失败')
    }

    form.siteName = res.data.siteName
    form.siteLogo = res.data.siteLogo || ''
    form.webAppUrl = res.data.webAppUrl
    form.smtpUser = res.data.smtpUser
    form.hasSmtpPassword = res.data.hasSmtpPassword
    form.smtpPassword = ''
    showSecret.value = false

    // Immediately sync global store
    void settingsStore.fetchPublicSiteConfig()

    uiStore.showToast('配置已保存并即时生效', 'success')
  } catch (e) {
    const msg = e instanceof Error ? e.message : '保存失败'
    globalError.value = msg
    uiStore.showToast(msg, 'error')
  } finally {
    saving.value = false
  }
}

onMounted(() => void loadSettings())
</script>

<style scoped lang="scss">
.site-workbench {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Error Banner ──────────────────────────────── */
.flash-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;

  &--error {
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-error) 25%, transparent);
    color: var(--color-error);
  }
}

.flash-close {
  margin-left: auto;
  background: transparent;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
}

/* ── Loading ───────────────────────────────────── */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 320px;
  box-sizing: border-box;
  padding: 60px 0;
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

/* ── Main Layout ───────────────────────────────── */
.workbench-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 28px;
}

/* ── Left Rail ─────────────────────────────────── */
.settings-rail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-right: 1px solid var(--border-tile);
  padding: 2px 20px 0 0;
}

.rail-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s ease;
  font-family: inherit;
  text-align: left;
  box-sizing: border-box;

  &:hover {
    background: var(--bg-tile);
  }

  &.is-active {
    background: var(--bg-tile);

    .group-name {
      color: var(--text-main);
      font-weight: 600;
    }

    .group-icon {
      color: var(--color-primary);
    }
  }
}

.group-icon {
  display: grid;
  place-items: center;
  color: var(--text-muted);
  flex-shrink: 0;
  transition: color 0.15s ease;
}

.group-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: color 0.15s;
  white-space: nowrap;
  flex: 1;
}

.group-status-chip {
  font-size: 10px;
  font-weight: 500;
  line-height: 1;
  padding: 3px 7px;
  border-radius: 999px;
  flex-shrink: 0;

  &.is-ok {
    color: var(--color-success);
    background: color-mix(in srgb, var(--color-success) 8%, transparent);
  }

  &.is-pending {
    color: var(--text-muted);
    background: color-mix(in srgb, var(--text-muted) 8%, transparent);
  }
}

/* ── Brand Preview (single inline row) ─────────── */
.brand-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-tile);
  background: var(--bg-panel);
}

.brand-preview__logo {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  object-fit: contain;
  flex-shrink: 0;

  &.is-fallback {
    display: grid;
    place-items: center;
    color: var(--color-primary);
    font-size: 15px;
  }

  &.is-error {
    color: var(--color-error);
    font-size: 15px;
  }
}

.brand-preview__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-preview__badge {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.email-preview {
  width: 100%;
  border-radius: 10px;
  border: 1px solid var(--border-tile);
  background: var(--bg-panel);
  overflow: hidden;
}

.email-preview__meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-tile);
  background: color-mix(in srgb, var(--bg-tile) 55%, var(--bg-panel));
}

.email-preview__row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.email-preview__label {
  width: 44px;
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-muted);
}

.email-preview__val {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &.mono {
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    font-weight: 500;
  }
}

.email-preview__body {
  padding: 14px;

  p {
    margin: 0 0 6px;
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--text-secondary);
  }
}

.email-preview__btn {
  display: inline-block;
  margin: 5px 0 2px;
  padding: 7px 14px;
  border-radius: 7px;
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

/* ── Right Config Card ─────────────────────────── */
.config-panel {
  min-width: 0;
}

.config-form {
  display: flex;
  flex-direction: column;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 26px 26px 24px;
}

/* ── Fields ────────────────────────────────────── */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
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
  font-size: 11px;
  font-weight: 500;
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
  padding: 1px 6px;
  border-radius: 4px;

  i {
    font-size: 9px;
  }
}

.field-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--border-tile);
  background: var(--bg-tile);
  color: var(--text-main);
  font: inherit;
  font-size: 13px;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  box-sizing: border-box;

  &.mono {
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    font-size: 12.5px;
  }

  &--url {
    padding-left: 44px;
    padding-right: 32px;
  }

  &--secret {
    padding-right: 34px;
  }

  &:focus {
    border-color: var(--color-primary);
    background: var(--bg-panel);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 14%, transparent);
  }

  &::placeholder {
    color: var(--text-muted);
    opacity: 0.55;
  }
}

.field-hint {
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.45;

  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    padding: 1px 4px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--text-main) 6%, transparent);
  }
}

.url-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
}

.url-badge {
  position: absolute;
  left: 10px;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  pointer-events: none;
}

.btn-clear {
  position: absolute;
  right: 6px;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.15s ease;

  &:hover {
    color: var(--text-main);
  }
}

/* ── Secret Input Wrap ─────────────────────────── */
.secret-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.eye-btn {
  position: absolute;
  right: 6px;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.15s ease;

  &:hover {
    color: var(--text-main);
  }
}

/* ── Form Footer ───────────────────────────────── */
.form-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin: 0 26px;
  padding: 16px 0 28px;
  border-top: 1px solid var(--border-tile);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid var(--border-tile);
  background: var(--bg-panel);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--color-primary) 35%, var(--border-tile));
    color: var(--text-main);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-primary) 88%, #000);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

@media (max-width: 768px) {
  .workbench-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .settings-rail {
    border-right: none;
    border-bottom: 1px solid var(--border-tile);
    padding: 0 0 12px;
  }
}
</style>
