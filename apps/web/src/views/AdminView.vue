<template>
  <AppLayout>
    <div v-if="isAdmin" class="admin-shell">
      <!-- Sidebar -->
      <aside class="admin-sidebar" aria-label="管理后台主菜单">
        <!-- Sidebar Brand Header -->
        <div class="sidebar-header">
          <span class="sidebar-header__icon">
            <i class="fas fa-sliders" />
          </span>
          <div class="sidebar-header__text">
            <h1 class="sidebar-header__title">管理控制台</h1>
            <span class="sidebar-header__sub">系统管理与配置</span>
          </div>
        </div>

        <!-- Navigation Groups -->
        <nav class="sidebar-menu">
          <!-- Group 1: Monitor -->
          <div class="menu-section">
            <span class="menu-section__label">概览</span>
            <RouterLink
              class="menu-link"
              :class="{ 'is-active': route.name === 'admin' }"
              to="/admin"
            >
              <svg
                class="menu-link__svg"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span class="menu-link__text">系统概览</span>
            </RouterLink>
          </div>

          <!-- Group 2: Access -->
          <div class="menu-section">
            <span class="menu-section__label">用户</span>
            <RouterLink
              class="menu-link"
              :class="{ 'is-active': route.name === 'admin-users' }"
              to="/admin/users"
            >
              <svg
                class="menu-link__svg"
                viewBox="0 0 24 24"
                width="16"
                height="16"
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
              <span class="menu-link__text">用户与权限</span>
            </RouterLink>
          </div>

          <!-- Group 3: Config -->
          <div class="menu-section">
            <span class="menu-section__label">配置</span>
            <RouterLink
              class="menu-link"
              :class="{ 'is-active': route.name === 'admin-config-site' }"
              to="/admin/config/site"
            >
              <svg
                class="menu-link__svg"
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
              <span class="menu-link__text">站点与邮件</span>
            </RouterLink>

            <RouterLink
              class="menu-link"
              :class="{ 'is-active': route.name === 'admin-config-oauth' }"
              to="/admin/config/oauth"
            >
              <svg
                class="menu-link__svg"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span class="menu-link__text">第三方登录</span>
            </RouterLink>

            <RouterLink
              class="menu-link"
              :class="{ 'is-active': route.name === 'admin-config-storage' }"
              to="/admin/config/storage"
            >
              <svg
                class="menu-link__svg"
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
              <span class="menu-link__text">对象存储</span>
            </RouterLink>
          </div>

          <!-- Group 4: Audit -->
          <div class="menu-section">
            <span class="menu-section__label">安全</span>
            <RouterLink
              class="menu-link"
              :class="{ 'is-active': route.name === 'admin-audit-logs' }"
              to="/admin/audit-logs"
            >
              <svg
                class="menu-link__svg"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
              <span class="menu-link__text">操作日志</span>
            </RouterLink>
          </div>
        </nav>

        <!-- Back to Navigation Link -->
        <RouterLink class="sidebar-back" to="/home">
          <i class="fas fa-arrow-left" />
          <span>返回主页</span>
        </RouterLink>
      </aside>

      <!-- Main Content -->
      <main class="admin-main">
        <div class="admin-view-body">
          <header class="admin-page-header">
            <h2>{{ pageTitle }}</h2>
          </header>
          <AdminOverviewPanel v-if="route.name === 'admin'" />
          <AdminManagementPanel v-else-if="route.name === 'admin-users'" />
          <AdminSiteSettingsPanel v-else-if="route.name === 'admin-config-site'" />
          <AdminOAuthPanel v-else-if="route.name === 'admin-config-oauth'" />
          <AdminStoragePanel v-else-if="route.name === 'admin-config-storage'" />
          <AdminAuditLogPanel v-else-if="route.name === 'admin-audit-logs'" />
        </div>
      </main>
    </div>

    <!-- Denied verification state -->
    <section v-else class="admin-denied">
      <div class="admin-denied__box">
        <i class="fas fa-spinner fa-spin" aria-hidden="true" />
        <h2>正在验证管理权限…</h2>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import AdminOverviewPanel from '@/components/admin/AdminOverviewPanel.vue'
import AdminManagementPanel from '@/components/admin/AdminManagementPanel.vue'
import AdminSiteSettingsPanel from '@/components/admin/AdminSiteSettingsPanel.vue'
import AdminOAuthPanel from '@/components/admin/AdminOAuthPanel.vue'
import AdminStoragePanel from '@/components/admin/AdminStoragePanel.vue'
import AdminAuditLogPanel from '@/components/admin/AdminAuditLogPanel.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.hasCheckedSession && authStore.user?.role === 'ADMIN')

const PAGE_META: Record<string, string> = {
  admin: '系统概览',
  'admin-users': '用户与权限',
  'admin-config-site': '站点与邮件',
  'admin-config-oauth': '第三方登录',
  'admin-config-storage': '对象存储',
  'admin-audit-logs': '操作日志'
}

const pageTitle = computed(() => PAGE_META[String(route.name)] ?? '管理控制台')

watch(
  () => [authStore.hasCheckedSession, authStore.user?.role] as const,
  ([hasCheckedSession, role]) => {
    if (hasCheckedSession && role !== 'ADMIN') void router.replace('/home')
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.admin-shell {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  min-height: calc(100vh - 130px);
  border-radius: 14px;
  background: var(--bg-panel);
  border: 1px solid var(--border-tile);
  overflow: hidden;
  margin-bottom: 24px;

  /* 控制台整体为白底卡片，全局的 border-tile 在白底上低于可见阈值，
     后台范围内统一加深一档（暗色主题按同比例混合，保持原强度） */
  --border-tile: color-mix(in srgb, var(--text-muted) 30%, var(--bg-panel));
}

/* Sidebar */
.admin-sidebar {
  display: flex;
  flex-direction: column;
  padding: 18px 12px;
  background: color-mix(in srgb, var(--bg-tile) 70%, var(--bg-panel));
  border-right: 1px solid var(--border-tile);
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--text-muted) 12%, transparent);
}

.sidebar-header__icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--primary-soft);
  color: var(--color-primary-dark);
  font-size: 14px;
}

.sidebar-header__text {
  display: flex;
  flex-direction: column;
}

.sidebar-header__title {
  margin: 0;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
}

.sidebar-header__sub {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 11px;
}

/* Menu */
.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.menu-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-section__label {
  padding: 0 8px 4px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
}

.menu-link {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    color: var(--text-main);
    background: var(--bg-tile);
  }

  &.is-active {
    background: var(--primary-soft);
    color: var(--color-primary-dark);
    font-weight: 700;
    border-color: color-mix(in srgb, var(--color-primary) 18%, transparent);

    .menu-link__icon,
    .menu-link__svg {
      color: var(--color-primary-dark);
    }
  }
}

.menu-link__svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--text-muted);
  transition: color 0.15s ease;
}

.menu-link:hover .menu-link__svg {
  color: var(--text-main);
}

.menu-link__icon {
  width: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}

.sidebar-back {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-tile);
  background: var(--bg-panel);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s ease;

  &:hover {
    background: var(--bg-tile);
    color: var(--text-main);
  }
}

/* Main Content */
.admin-main {
  min-width: 0;
  padding: 24px 28px 32px;
  overflow-y: auto;
}

.admin-view-body {
  min-width: 0;
  max-width: 1120px;
}

/* Page Header */
.admin-page-header {
  margin-bottom: 20px;

  h2 {
    margin: 0;
    color: var(--text-main);
    font-size: 19px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
}

/* Denied verification */
.admin-denied {
  min-height: 360px;
  display: grid;
  place-items: center;
}

.admin-denied__box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-muted);

  i {
    font-size: 24px;
    color: var(--color-primary);
  }

  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-main);
  }
}

@media (max-width: 820px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }

  .admin-sidebar {
    border-right: 0;
    border-bottom: 1px solid var(--border-tile);
  }

  .sidebar-menu {
    flex-flow: row wrap;
  }

  .admin-main {
    padding: 18px;
  }
}
</style>
