<template>
  <div class="overview-panel">
    <!-- Error notice -->
    <div v-if="error" class="panel-notice panel-notice--error">
      <i class="fas fa-circle-exclamation" />
      <span>{{ error }}</span>
    </div>

    <!-- Metric Cards Grid -->
    <div class="metrics-grid">
      <!-- 1. Total Users -->
      <article class="metric-card">
        <span class="metric-card__title">全站注册用户</span>
        <div class="metric-card__number">
          <span v-if="loading" class="skeleton skeleton--number" />
          <template v-else>{{ total }}</template>
        </div>
        <div class="metric-card__hint">
          <span v-if="loading" class="skeleton skeleton--hint" />
          <template v-else>普通用户 {{ Math.max(0, total - adminCount) }}</template>
        </div>
      </article>

      <!-- 2. Admins -->
      <article class="metric-card">
        <span class="metric-card__title">管理员账号</span>
        <div class="metric-card__number">
          <span v-if="loading" class="skeleton skeleton--number" />
          <template v-else>{{ adminCount }}</template>
        </div>
        <div class="metric-card__hint">具备后台管控权限</div>
      </article>

      <!-- 3. OAuth Providers -->
      <article class="metric-card">
        <span class="metric-card__title">第三方登录</span>
        <div class="metric-card__number">
          <span v-if="loading" class="skeleton skeleton--number" />
          <template v-else>{{ enabledOAuthCount }} / 3</template>
        </div>
        <div class="metric-card__hint">GitHub / Google / LINUX DO</div>
      </article>

      <!-- 4. Storage Engine -->
      <article class="metric-card">
        <span class="metric-card__title">存储驱动</span>
        <div class="metric-card__number metric-card__number--text">
          <span v-if="loading" class="skeleton skeleton--number" />
          <template v-else>
            {{
              storageConfig?.public.provider ? storageConfig.public.provider.toUpperCase() : 'R2'
            }}
          </template>
        </div>
        <div class="metric-card__hint">公共资源与备份存储</div>
      </article>
    </div>

    <!-- Workspace Links -->
    <div class="quick-nav">
      <div class="quick-nav__grid">
        <RouterLink class="quick-nav-card" to="/admin/users">
          <span class="quick-nav-card__icon">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <div class="quick-nav-card__body">
            <strong>用户与权限管理</strong>
            <p>查看全站账号，调整管理员权限或账号启停状态</p>
          </div>
          <i class="fas fa-arrow-right quick-nav-card__arrow" />
        </RouterLink>

        <RouterLink class="quick-nav-card" to="/admin/config/site">
          <span class="quick-nav-card__icon">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
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
          </span>
          <div class="quick-nav-card__body">
            <strong>站点与邮件服务</strong>
            <p>配置站点默认名称、导航栏 Logo 与 SMTP 发信通道</p>
          </div>
          <i class="fas fa-arrow-right quick-nav-card__arrow" />
        </RouterLink>

        <RouterLink class="quick-nav-card" to="/admin/config/oauth">
          <span class="quick-nav-card__icon">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <div class="quick-nav-card__body">
            <strong>第三方登录配置</strong>
            <p>管理 GitHub、Google 与 LINUX DO 平台认证密钥</p>
          </div>
          <i class="fas fa-arrow-right quick-nav-card__arrow" />
        </RouterLink>

        <RouterLink class="quick-nav-card" to="/admin/config/storage">
          <span class="quick-nav-card__icon">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
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
          </span>
          <div class="quick-nav-card__body">
            <strong>对象存储与备份</strong>
            <p>查看公共资源存储桶、CDN 域名及备份保留策略</p>
          </div>
          <i class="fas fa-arrow-right quick-nav-card__arrow" />
        </RouterLink>
      </div>
    </div>

    <!-- System Info -->
    <section v-if="systemInfo" class="system-info">
      <div class="system-info__item">
        <span class="system-info__label">应用</span>
        <span class="system-info__value">{{ systemInfo.appName }}</span>
      </div>
      <div class="system-info__item">
        <span class="system-info__label">运行环境</span>
        <span class="system-info__value">Node {{ systemInfo.nodeVersion }}</span>
      </div>
      <div class="system-info__item">
        <span class="system-info__label">数据库</span>
        <span class="system-info__value">{{ systemInfo.databaseType }}</span>
      </div>
      <div class="system-info__item">
        <span class="system-info__label">服务环境</span>
        <span class="system-info__value">{{ systemInfo.env }}</span>
      </div>
      <div class="system-info__item">
        <span class="system-info__label">服务端口</span>
        <span class="system-info__value">{{ systemInfo.serverPort }}</span>
      </div>
      <div class="system-info__item">
        <span class="system-info__label">运行时间</span>
        <span class="system-info__value">{{ formatUptime(systemInfo.uptimeSeconds) }}</span>
      </div>
    </section>

    <section v-else-if="loading" class="system-info system-info--skeleton" aria-hidden="true">
      <div v-for="i in 6" :key="i" class="system-info__item">
        <span class="skeleton skeleton--hint" />
        <span class="skeleton skeleton--value" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  getManagedUsers,
  getOAuthConfigs,
  getSystemInfo,
  getStorageConfig,
  type AdminOAuthConfig,
  type SystemInfo,
  type AdminStorageAllConfig
} from '@/api/admin'

const total = ref(0)
const adminCount = ref(0)
const oauthConfigs = ref<AdminOAuthConfig[]>([])
const systemInfo = ref<SystemInfo | null>(null)
const storageConfig = ref<AdminStorageAllConfig | null>(null)
const loading = ref(true)
const error = ref('')

const enabledOAuthCount = computed(() => oauthConfigs.value.filter(c => c.enabled).length)

const loadAllData = async () => {
  loading.value = true
  error.value = ''
  try {
    const [userRes, oauthRes, sysRes, storageRes] = await Promise.all([
      getManagedUsers({ limit: 1, offset: 0 }),
      getOAuthConfigs(),
      getSystemInfo(),
      getStorageConfig()
    ])

    if (userRes.success && userRes.data) {
      total.value = userRes.data.total
      adminCount.value = userRes.data.adminCount
    }
    if (oauthRes.success && oauthRes.data) {
      oauthConfigs.value = oauthRes.data
    }
    if (sysRes.success && sysRes.data) {
      systemInfo.value = sysRes.data
    }
    if (storageRes.success && storageRes.data) {
      storageConfig.value = storageRes.data
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '概览统计数据加载失败'
  } finally {
    loading.value = false
  }
}

const formatUptime = (seconds?: number) => {
  if (!seconds) return '刚刚启动'
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}天${h}小时`
  if (h > 0) return `${h}小时${m}分`
  return `${m}分钟`
}

onMounted(() => {
  void loadAllData()
})
</script>

<style scoped lang="scss">
.overview-panel {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.panel-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
}

.panel-notice--error {
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  color: var(--color-error);
  border: 1px solid color-mix(in srgb, var(--color-error) 20%, transparent);
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  padding: 16px 18px;
  border-radius: 12px;
  background: var(--bg-panel);
  border: 1px solid var(--border-tile);
}

.metric-card__title {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
}

.metric-card__number {
  color: var(--text-main);
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  margin: 8px 0 4px;
  min-height: 29px;
  font-variant-numeric: tabular-nums;
  animation: fade-in 0.25s ease;
}

.metric-card__number--text {
  font-size: 20px;
}

.metric-card__hint {
  color: var(--text-muted);
  font-size: 11.5px;
  min-height: 16px;
}

/* Skeleton placeholders */
.skeleton {
  display: inline-block;
  vertical-align: middle;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--text-muted) 8%, transparent) 25%,
    color-mix(in srgb, var(--text-muted) 16%, transparent) 37%,
    color-mix(in srgb, var(--text-muted) 8%, transparent) 63%
  );
  background-size: 400% 100%;
  animation: skeleton-wave 1.2s ease infinite;
}

.skeleton--number {
  width: 52px;
  height: 24px;
}

.skeleton--value {
  width: 90px;
  height: 14px;
}

.skeleton--hint {
  width: 110px;
  height: 12px;
}

@keyframes skeleton-wave {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: 0 0;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

/* System Info */
.system-info {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 24px;
  padding: 16px 20px;
  border-radius: 12px;
  background: var(--bg-panel);
  border: 1px solid var(--border-tile);
}

.system-info__item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.system-info__label {
  color: var(--text-muted);
  font-size: 11px;
}

.system-info__value {
  color: var(--text-main);
  font-size: 12.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.system-info--skeleton {
  .system-info__item {
    gap: 6px;
  }
}

/* Quick Nav */
.quick-nav {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-nav__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.quick-nav-card {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--bg-panel);
  border: 1px solid var(--border-tile);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--color-primary) 35%, var(--border-tile));

    .quick-nav-card__arrow {
      color: var(--color-primary);
      transform: translateX(2px);
    }
  }
}

.quick-nav-card__icon {
  display: grid;
  place-items: center;
  color: var(--text-secondary);
}

.quick-nav-card__body {
  min-width: 0;

  strong {
    display: block;
    color: var(--text-main);
    font-size: 13px;
    font-weight: 600;
  }

  p {
    margin: 2px 0 0;
    color: var(--text-muted);
    font-size: 11.5px;
    line-height: 1.4;
  }
}

.quick-nav-card__arrow {
  color: var(--text-muted);
  font-size: 11px;
  transition: all 0.15s ease;
}

@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-nav__grid {
    grid-template-columns: 1fr;
  }

  .system-info {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
