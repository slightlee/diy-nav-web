<template>
  <div class="storage-workbench">
    <!-- Error Bar -->
    <div v-if="globalError" class="flash-bar flash-bar--error">
      <i class="fas fa-triangle-exclamation" />
      <span>{{ globalError }}</span>
      <button class="flash-close" @click="globalError = ''"><i class="fas fa-xmark" /></button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <span class="loading-spinner" />
      <span>正在加载存储配置…</span>
    </div>

    <div v-else class="workbench-layout">
      <!-- ── LEFT: Purpose Rail ── -->
      <aside class="purpose-rail">
        <div class="rail-nav">
          <button
            v-for="p in purposes"
            :key="p.key"
            type="button"
            class="purpose-item"
            :class="{ 'is-active': activePurpose === p.key }"
            @click="
              activePurpose = p.key
              testResult = null
            "
          >
            <div class="purpose-icon" :class="`purpose-icon--${p.key}`">
              <!-- Real Public Assets SVG -->
              <svg
                v-if="p.key === 'public'"
                viewBox="0 0 24 24"
                width="16"
                height="16"
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

              <!-- Real Archive Database/Disk SVG -->
              <svg
                v-else
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
              </svg>
            </div>
            <span class="purpose-name">{{ p.name }}</span>
            <span class="purpose-provider-badge">
              {{ getProviderShortName(configs[p.key]?.provider ?? 'r2') }}
            </span>
          </button>
        </div>
      </aside>

      <!-- ── RIGHT: Config Panel ── -->
      <section class="config-panel">
        <template v-if="activePurpose">
          <!-- Panel Header -->
          <div class="panel-header">
            <div class="panel-header-left">
              <div>
                <h3 class="panel-title">{{ currentPurposeMeta?.name }}</h3>
                <p class="panel-subtitle">{{ currentPurposeMeta?.desc }}</p>
              </div>
            </div>
            <div v-if="configs[activePurpose]?.updatedAt" class="updated-chip">
              <i class="fas fa-clock" />
              <span>上次保存 {{ formatDate(configs[activePurpose]!.updatedAt) }}</span>
            </div>
          </div>

          <!-- Test Result Banner -->
          <transition name="banner-fade">
            <div
              v-if="testResult"
              class="test-banner"
              :class="testResult.success ? 'test-banner--ok' : 'test-banner--fail'"
            >
              <i :class="testResult.success ? 'fas fa-circle-check' : 'fas fa-circle-xmark'" />
              <span>{{ testResult.message }}</span>
              <button class="flash-close" @click="testResult = null">
                <i class="fas fa-xmark" />
              </button>
            </div>
          </transition>

          <form class="config-form" @submit.prevent="handleSave">
            <!-- ① Provider Selection -->
            <div class="config-section">
              <div class="fields-grid">
                <div class="field field--full">
                  <label class="field-label">选择存储引擎</label>
                  <div class="provider-cards">
                    <label
                      v-for="opt in availableProviders"
                      :key="opt.key"
                      class="provider-card"
                      :class="{ 'is-selected': form.provider === opt.key }"
                    >
                      <input
                        v-model="form.provider"
                        type="radio"
                        name="provider"
                        :value="opt.key"
                        class="sr-only"
                        @change="onProviderChange"
                      />
                      <div class="provider-card-icon" :class="`prov-icon--${opt.key}`">
                        <!-- Cloudflare R2 Cloud SVG -->
                        <svg
                          v-if="opt.key === 'r2'"
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="currentColor"
                        >
                          <path
                            fill="#F38020"
                            d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
                          />
                        </svg>
                        <!-- AWS S3 Bucket SVG -->
                        <svg
                          v-else-if="opt.key === 's3'"
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                        >
                          <path
                            d="M4 6.5C4 5.12 7.58 4 12 4s8 1.12 8 2.5v11c0 1.38-3.58 2.5-8 2.5s-8-1.12-8-2.5v-11z"
                            fill="#FF9900"
                            fill-opacity="0.18"
                            stroke="#E07A00"
                            stroke-width="1.6"
                          />
                          <ellipse
                            cx="12"
                            cy="6.5"
                            rx="8"
                            ry="2.5"
                            fill="#FF9900"
                            stroke="#E07A00"
                            stroke-width="1.6"
                          />
                          <path
                            d="M4 12c0 1.38 3.58 2.5 8 2.5s8-1.12 8-2.5"
                            stroke="#E07A00"
                            stroke-width="1.6"
                          />
                        </svg>
                        <!-- WebDAV Drive SVG -->
                        <svg
                          v-else-if="opt.key === 'webdav'"
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                        >
                          <rect
                            x="3"
                            y="14"
                            width="18"
                            height="6"
                            rx="2"
                            fill="#0284C7"
                            fill-opacity="0.18"
                            stroke="#0284C7"
                            stroke-width="1.6"
                          />
                          <circle cx="16.5" cy="17" r="1" fill="#0284C7" />
                          <circle cx="13.5" cy="17" r="1" fill="#0284C7" />
                          <path
                            d="M6 14V8a4 4 0 0 1 8 0v6M18 14V9a2 2 0 0 0-2-2"
                            stroke="#0284C7"
                            stroke-width="1.6"
                            stroke-linecap="round"
                          />
                        </svg>
                      </div>
                      <div class="provider-card-body">
                        <span class="provider-card-name">{{ opt.name }}</span>
                        <span class="provider-card-sub">{{ opt.sub }}</span>
                      </div>
                      <div class="provider-card-check">
                        <i class="fas fa-check" />
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- ② Credentials -->
            <div class="config-section">
              <!-- R2 / S3 shared credentials -->
              <template v-if="form.provider === 'r2' || form.provider === 's3'">
                <div class="fields-grid">
                  <div v-if="form.provider === 's3'" class="field field--full">
                    <label class="field-label">
                      Endpoint 服务节点
                      <span class="req">*</span>
                    </label>
                    <input
                      v-model="form.endpoint"
                      type="url"
                      class="field-input mono"
                      placeholder="https://s3.us-east-1.amazonaws.com 或自建 MinIO 地址"
                      required
                    />
                  </div>

                  <div v-if="form.provider === 's3'" class="field field--full">
                    <label class="field-label">Region 区域代码</label>
                    <input
                      v-model="form.region"
                      type="text"
                      class="field-input mono"
                      placeholder="例如：us-east-1 或 auto"
                    />
                  </div>

                  <div v-if="form.provider === 'r2'" class="field field--full">
                    <label class="field-label">
                      Account ID
                      <span class="req">*</span>
                    </label>
                    <input
                      v-model="form.accountId"
                      type="text"
                      class="field-input mono"
                      placeholder="Cloudflare 仪表盘右侧的 32 位 Account ID"
                      required
                    />
                  </div>

                  <div class="field">
                    <label class="field-label">
                      存储桶名称 (Bucket)
                      <span class="req">*</span>
                    </label>
                    <input
                      v-model="form.bucketName"
                      type="text"
                      class="field-input mono"
                      placeholder="例如：my-nav-bucket"
                      required
                    />
                  </div>

                  <div class="field">
                    <label class="field-label">
                      Access Key ID
                      <span class="req">*</span>
                    </label>
                    <input
                      v-model="form.accessKeyId"
                      type="text"
                      class="field-input mono"
                      placeholder="例如：AKIAIOSFODNN7EXAMPLE"
                      required
                    />
                  </div>

                  <div class="field field--full">
                    <div class="field-label-row">
                      <label class="field-label">
                        Secret Access Key
                        <span v-if="!form.hasSecret" class="req">*</span>
                      </label>
                      <span v-if="form.hasSecret" class="enc-badge">
                        <i class="fas fa-lock" />
                        已加密
                      </span>
                    </div>
                    <div class="secret-wrap">
                      <input
                        v-model="form.secretAccessKey"
                        :type="showSecret ? 'text' : 'password'"
                        class="field-input mono field-input--with-eye"
                        :placeholder="
                          form.hasSecret ? '留空保持当前密钥不变' : '输入 S3/R2 访问密钥 Secret Key'
                        "
                        :required="!form.hasSecret"
                      />
                      <button type="button" class="eye-btn" @click="showSecret = !showSecret">
                        <i :class="showSecret ? 'fas fa-eye-slash' : 'fas fa-eye'" />
                      </button>
                    </div>
                  </div>
                </div>
              </template>

              <!-- WebDAV credentials -->
              <template v-else-if="form.provider === 'webdav'">
                <div class="fields-grid">
                  <div class="field field--full">
                    <label class="field-label">
                      WebDAV 服务器地址
                      <span class="req">*</span>
                    </label>
                    <input
                      v-model="form.webdavUrl"
                      type="url"
                      class="field-input mono"
                      placeholder="https://dav.jianguoyun.com/dav/"
                      required
                    />
                  </div>

                  <div class="field field--full">
                    <label class="field-label">
                      WebDAV 用户名
                      <span class="req">*</span>
                    </label>
                    <input
                      v-model="form.webdavUsername"
                      type="text"
                      class="field-input mono"
                      placeholder="坚果云注册邮箱或 WebDAV 登录账号"
                      required
                    />
                  </div>

                  <div class="field field--full">
                    <div class="field-label-row">
                      <label class="field-label">
                        应用授权密码
                        <span v-if="!form.hasSecret" class="req">*</span>
                      </label>
                      <span v-if="form.hasSecret" class="enc-badge">
                        <i class="fas fa-lock" />
                        已加密
                      </span>
                    </div>
                    <div class="secret-wrap">
                      <input
                        v-model="form.webdavPassword"
                        :type="showSecret ? 'text' : 'password'"
                        class="field-input mono field-input--with-eye"
                        :placeholder="
                          form.hasSecret
                            ? '留空保持当前密码不变'
                            : '坚果云应用授权密码（非账号密码）'
                        "
                        :required="!form.hasSecret"
                      />
                      <button type="button" class="eye-btn" @click="showSecret = !showSecret">
                        <i :class="showSecret ? 'fas fa-eye-slash' : 'fas fa-eye'" />
                      </button>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <!-- ③ Path Settings -->
            <div class="config-section">
              <div class="fields-grid">
                <!-- Public Base URL: only for public purpose with R2/S3 -->
                <div
                  v-if="activePurpose === 'public' && form.provider !== 'webdav'"
                  class="field field--full"
                >
                  <label class="field-label">公共 CDN 访问域名 (Public Base URL)</label>
                  <input
                    v-model="form.publicBaseUrl"
                    type="url"
                    class="field-input mono"
                    placeholder="https://pub-xxx.r2.dev 或自定义 CDN 域名"
                  />
                  <span class="field-hint">
                    头像与 Favicon 图标的公开外链地址，留空则使用存储桶默认 URL。
                  </span>
                </div>

                <div class="field field--full">
                  <label class="field-label">存储路径</label>
                  <input
                    v-model="form.storagePath"
                    type="text"
                    class="field-input mono"
                    :placeholder="activePurpose === 'backup' ? 'data-backups' : 'icons'"
                  />
                  <span class="field-hint">
                    {{
                      activePurpose === 'backup'
                        ? '数据备份 JSON 文件存放的子路径。'
                        : '图标与头像存放的子路径。'
                    }}
                  </span>
                </div>

                <div v-if="activePurpose === 'backup'" class="field field--full">
                  <label class="field-label">历史快照最大保留数</label>
                  <input
                    v-model.number="form.maxRetainedBackups"
                    type="number"
                    min="1"
                    max="50"
                    class="field-input mono"
                    placeholder="5"
                  />
                  <span class="field-hint">超出时自动删除最旧快照，范围 1–50。</span>
                </div>
              </div>
            </div>

            <!-- ④ Footer Actions -->
            <div class="form-footer">
              <div class="footer-left" />
              <div class="footer-actions">
                <button
                  type="button"
                  class="btn-secondary"
                  :disabled="testing || saving"
                  @click="handleTest"
                >
                  <span v-if="testing" class="btn-spinner" />
                  <span>{{ testing ? '正在测试…' : '测试连接' }}</span>
                </button>
                <button
                  type="button"
                  class="btn-secondary"
                  :disabled="testing || saving"
                  @click="loadConfigs"
                >
                  <span>重新加载</span>
                </button>
                <button type="submit" class="btn-primary" :disabled="saving || testing">
                  <span v-if="saving" class="btn-spinner" />
                  <span>{{ saving ? '正在保存…' : '保存配置' }}</span>
                </button>
              </div>
            </div>
          </form>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  getStorageConfig,
  updateStoragePurpose,
  testStorageProvider,
  type StorageProviderType,
  type StoragePurpose,
  type AdminStoragePurposeConfig,
  type StorageTestResult
} from '@/api/admin'
import { useUIStore } from '@/stores/ui'

interface PurposeMeta {
  key: StoragePurpose
  name: string
  subtitle: string
  desc: string
}

const purposes: PurposeMeta[] = [
  {
    key: 'public',
    name: '公共资源存储',
    subtitle: '图标 · 头像外链',
    desc: '用于存储公共静态资源（图标缓存、头像），支持绑定自定义 CDN 域名以加速分发。'
  },
  {
    key: 'backup',
    name: '备份数据存储',
    subtitle: '快照 · 容灾归档',
    desc: '用于存储系统全量备份快照，支持 Cloudflare R2、AWS S3 及私有 WebDAV 网盘。'
  }
]

const providerOptions: { key: StorageProviderType; name: string; sub: string }[] = [
  { key: 'r2', name: 'Cloudflare R2', sub: '零出网流量费 · S3 兼容' },
  { key: 's3', name: 'AWS S3 / 兼容存储', sub: '标准 S3 协议 · MinIO / 阿里云 OSS' },
  { key: 'webdav', name: 'WebDAV 网盘', sub: '坚果云 · Nextcloud · Alist' }
]

const uiStore = useUIStore()
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const globalError = ref('')
const testResult = ref<StorageTestResult | null>(null)
const showSecret = ref(false)
const activePurpose = ref<StoragePurpose>('public')

const configs = reactive<Record<StoragePurpose, AdminStoragePurposeConfig | null>>({
  public: null,
  backup: null
})

const form = reactive({
  provider: 'r2' as StorageProviderType,
  accountId: '',
  bucketName: '',
  accessKeyId: '',
  secretAccessKey: '',
  endpoint: '',
  region: '',
  publicBaseUrl: '',
  storagePath: '',
  webdavUrl: '',
  webdavUsername: '',
  webdavPassword: '',
  maxRetainedBackups: 5,
  hasSecret: false
})

const currentPurposeMeta = computed(
  () => purposes.find(p => p.key === activePurpose.value) ?? purposes[0]
)

const availableProviders = computed(() =>
  activePurpose.value === 'public'
    ? providerOptions.filter(p => p.key !== 'webdav')
    : providerOptions
)

const getProviderName = (prov: StorageProviderType) =>
  providerOptions.find(p => p.key === prov)?.name ?? prov.toUpperCase()

const getProviderShortName = (prov: StorageProviderType) => {
  switch (prov) {
    case 'r2':
      return 'R2'
    case 's3':
      return 'S3'
    case 'webdav':
      return 'WebDAV'
    default:
      return String(prov).toUpperCase()
  }
}

const syncFormFromConfig = (cfg: AdminStoragePurposeConfig | null) => {
  if (!cfg) return
  form.provider = cfg.provider
  form.accountId = cfg.accountId ?? ''
  form.bucketName = cfg.bucketName ?? ''
  form.accessKeyId = cfg.accessKeyId ?? ''
  form.secretAccessKey = ''
  form.endpoint = cfg.endpoint ?? ''
  form.region = cfg.region ?? ''
  form.publicBaseUrl = cfg.publicBaseUrl ?? ''
  form.storagePath = cfg.storagePath ?? ''
  form.webdavUrl = cfg.webdavUrl ?? ''
  form.webdavUsername = cfg.webdavUsername ?? ''
  form.webdavPassword = ''
  form.maxRetainedBackups = cfg.maxRetainedBackups ?? 5
  form.hasSecret = cfg.hasSecret
  showSecret.value = false
  testResult.value = null
}

const loadConfigs = async () => {
  loading.value = true
  globalError.value = ''
  try {
    const res = await getStorageConfig()
    if (!res.success || !res.data) throw new Error(res.message || '获取存储配置失败')
    configs.public = res.data.public
    configs.backup = res.data.backup
    syncFormFromConfig(configs[activePurpose.value])
  } catch (cause) {
    globalError.value = cause instanceof Error ? cause.message : '获取存储配置失败'
  } finally {
    loading.value = false
  }
}

watch(activePurpose, newPurp => {
  syncFormFromConfig(configs[newPurp])
})

const onProviderChange = () => {
  testResult.value = null
  showSecret.value = false
  const currentSavedConfig = configs[activePurpose.value]
  if (currentSavedConfig && form.provider === currentSavedConfig.provider) {
    // Restore saved DB values for this engine
    form.accountId = currentSavedConfig.accountId ?? ''
    form.bucketName = currentSavedConfig.bucketName ?? ''
    form.accessKeyId = currentSavedConfig.accessKeyId ?? ''
    form.secretAccessKey = ''
    form.endpoint = currentSavedConfig.endpoint ?? ''
    form.region = currentSavedConfig.region ?? 'auto'
    form.publicBaseUrl = currentSavedConfig.publicBaseUrl ?? ''
    form.webdavUrl = currentSavedConfig.webdavUrl ?? ''
    form.webdavUsername = currentSavedConfig.webdavUsername ?? ''
    form.webdavPassword = ''
    form.hasSecret = currentSavedConfig.hasSecret
  } else {
    // Brand new engine not saved in DB: start with clean blank fields
    form.accountId = ''
    form.bucketName = ''
    form.accessKeyId = ''
    form.secretAccessKey = ''
    form.endpoint = ''
    form.region = form.provider === 's3' ? '' : 'auto'
    form.publicBaseUrl = ''
    form.webdavUrl = ''
    form.webdavUsername = ''
    form.webdavPassword = ''
    form.hasSecret = false
  }
}

const handleTest = async () => {
  testing.value = true
  testResult.value = null
  try {
    const res = await testStorageProvider({
      purpose: activePurpose.value,
      provider: form.provider,
      accountId: form.accountId.trim() || undefined,
      bucketName: form.bucketName.trim() || undefined,
      accessKeyId: form.accessKeyId.trim() || undefined,
      secretAccessKey: form.secretAccessKey.trim() || undefined,
      endpoint: form.endpoint.trim() || undefined,
      region: form.region.trim() || undefined,
      webdavUrl: form.webdavUrl.trim() || undefined,
      webdavUsername: form.webdavUsername.trim() || undefined,
      webdavPassword: form.webdavPassword.trim() || undefined
    })
    testResult.value = res.data ?? { success: res.success, message: res.message || '测试完成' }
  } catch (cause) {
    testResult.value = {
      success: false,
      message: cause instanceof Error ? cause.message : '网络异常，连接测试失败'
    }
  } finally {
    testing.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  globalError.value = ''
  try {
    const res = await updateStoragePurpose(activePurpose.value, {
      provider: form.provider,
      accountId: form.accountId.trim() || undefined,
      bucketName: form.bucketName.trim() || undefined,
      accessKeyId: form.accessKeyId.trim() || undefined,
      secretAccessKey: form.secretAccessKey.trim() || undefined,
      endpoint: form.endpoint.trim() || undefined,
      region: form.region.trim() || undefined,
      publicBaseUrl: form.publicBaseUrl.trim() || undefined,
      storagePath: form.storagePath.trim() || undefined,
      webdavUrl: form.webdavUrl.trim() || undefined,
      webdavUsername: form.webdavUsername.trim() || undefined,
      webdavPassword: form.webdavPassword.trim() || undefined,
      maxRetainedBackups: form.maxRetainedBackups
    })

    if (!res.success || !res.data) throw new Error(res.message || '保存配置失败')
    configs[activePurpose.value] = res.data
    syncFormFromConfig(res.data)
    uiStore.showToast(`${currentPurposeMeta.value.name}配置已保存并即时生效`, 'success')
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : '保存配置失败'
    globalError.value = msg
    uiStore.showToast(msg, 'error')
  } finally {
    saving.value = false
  }
}

const formatDate = (ts: number) =>
  new Date(ts).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })

onMounted(() => void loadConfigs())
</script>

<style scoped lang="scss">
.storage-workbench {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Flash error bar ───────────────────────────── */
.flash-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;

  &--error {
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);
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

/* ── Workbench Master-Detail Layout ─────────────── */
.workbench-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 28px;
}

/* ── Left Rail ─────────────────────────────────── */
.purpose-rail {
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

.purpose-item {
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

    .purpose-name {
      color: var(--text-main);
      font-weight: 600;
    }
  }
}

.purpose-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--text-muted);

  &--backup {
    color: #0284c7;
  }
}

.purpose-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  transition: color 0.15s;
  white-space: nowrap;
  flex: 1;
}

.purpose-provider-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--border-tile) 60%, transparent);
  color: var(--text-secondary);
  white-space: nowrap;
  letter-spacing: 0.03em;
}

/* ── Right Config Panel ─────────────────────────── */
.config-panel {
  min-width: 0;
}

.panel-header {
  display: flex;
  align-items: center;
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
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
}

.updated-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-muted);

  i {
    font-size: 10px;
  }
}

.test-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 24px 0;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;

  &--ok {
    background: color-mix(in srgb, var(--color-success) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent);
    color: var(--color-success);
  }

  &--fail {
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-error) 25%, transparent);
    color: var(--color-error);
  }
}

.config-form {
  display: flex;
  flex-direction: column;
}

.config-section {
  padding: 24px 26px;
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &--full {
    grid-column: 1 / -1;
  }
}

.field-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-main);
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.req {
  color: var(--color-error);
}

.enc-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
  padding: 1px 6px;
  border-radius: 4px;

  i {
    font-size: 9px;
  }
}

.provider-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.provider-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-tile);
  background: var(--bg-tile);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--color-primary) 35%, var(--border-tile));
  }

  &.is-selected {
    border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
    background: color-mix(in srgb, var(--color-primary) 5%, var(--bg-tile));

    .provider-card-name {
      color: var(--color-primary-dark);
      font-weight: 700;
    }

    .provider-card-check {
      opacity: 1;
      color: var(--color-primary);
    }
  }

  &-icon {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  &-body {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
  }

  &-name {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-main);
    transition: color 0.15s;
  }

  &-sub {
    font-size: 10.5px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &-check {
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.15s ease;
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
  transition: all 0.15s ease;
  box-sizing: border-box;

  &.mono {
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    font-size: 12.5px;
  }

  &--with-eye {
    padding-right: 36px;
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
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.45;
}

.secret-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.eye-btn {
  position: absolute;
  right: 6px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;

  &:hover {
    color: var(--text-main);
    background: color-mix(in srgb, currentColor 10%, transparent);
  }
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 26px;
  padding: 16px 0 26px;
  border-top: 1px solid var(--border-tile);
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
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
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--color-primary) 40%, var(--border-tile));
    background: color-mix(in srgb, var(--color-primary) 5%, var(--bg-panel));
    color: var(--text-main);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  padding: 0 18px;
  border-radius: 8px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-primary) 85%, #000);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 28%, transparent);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
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

@media (max-width: 768px) {
  .workbench-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .purpose-rail {
    border-right: none;
    border-bottom: 1px solid var(--border-tile);
    padding: 0 0 12px;
  }

  .fields-grid {
    grid-template-columns: 1fr;
  }
}
</style>
