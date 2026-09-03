<template>
  <div class="mgmt-workbench">
    <!-- Notice Bar -->
    <div v-if="error" class="notice-bar notice-bar--error">
      <i class="fas fa-circle-exclamation" />
      <span>{{ error }}</span>
    </div>

    <!-- Top Read-only Global Metrics Bar (只读全局统计指标) -->
    <div class="metrics-summary-bar">
      <article class="metric-card">
        <span class="metric-card__label">全部用户</span>
        <div class="metric-card__number">
          <span v-if="loading" class="skeleton skeleton--number" />
          <template v-else>{{ total }}</template>
        </div>
        <div class="metric-card__hint">全站注册账号</div>
      </article>

      <article class="metric-card">
        <span class="metric-card__label">系统管理员</span>
        <div class="metric-card__number">
          <span v-if="loading" class="skeleton skeleton--number" />
          <template v-else>{{ adminCount }}</template>
        </div>
        <div class="metric-card__hint">具备后台权限</div>
      </article>

      <article class="metric-card">
        <span class="metric-card__label">正常账号</span>
        <div class="metric-card__number">
          <span v-if="loading" class="skeleton skeleton--number" />
          <template v-else>{{ activeCount ?? Math.max(0, total - suspendedCount) }}</template>
        </div>
        <div class="metric-card__hint">ACTIVE 状态</div>
      </article>

      <article class="metric-card">
        <span class="metric-card__label">已停用账号</span>
        <div class="metric-card__number">
          <span v-if="loading" class="skeleton skeleton--number" />
          <template v-else>{{ suspendedCount }}</template>
        </div>
        <div class="metric-card__hint">SUSPENDED 状态</div>
      </article>
    </div>

    <!-- Main Table Container (标准结构化数据工作台) -->
    <div class="table-container">
      <!-- Toolbar -->
      <div class="table-toolbar">
        <div class="search-box">
          <i class="fas fa-magnifying-glass search-icon" aria-hidden="true" />
          <input
            v-model="query"
            type="text"
            class="search-input"
            placeholder="按用户昵称或注册邮箱搜索…"
            @keyup.enter="applySearch"
            @input="onSearchInput"
          />
          <button v-if="query" type="button" class="btn-clear" title="清空" @click="clearSearch">
            <i class="fas fa-xmark" />
          </button>
        </div>

        <div class="filter-controls">
          <!-- Role Select -->
          <div class="select-wrap">
            <select v-model="selectedRole" class="custom-select" @change="applyFilter">
              <option value="">全部角色</option>
              <option value="ADMIN">仅管理员</option>
              <option value="USER">仅普通用户</option>
            </select>
            <i class="fas fa-chevron-down select-chevron" />
          </div>

          <!-- Status Select -->
          <div class="select-wrap">
            <select v-model="selectedStatus" class="custom-select" @change="applyFilter">
              <option value="">全部状态</option>
              <option value="ACTIVE">正常账号</option>
              <option value="SUSPENDED">已停用账号</option>
            </select>
            <i class="fas fa-chevron-down select-chevron" />
          </div>

          <BaseButton
            v-if="hasActiveFilters"
            variant="neutral-ghost"
            size="sm"
            @click="resetAllFilters"
          >
            <span>重置筛选</span>
          </BaseButton>
        </div>
      </div>

      <!-- Table Body -->
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-user">用户基础信息</th>
              <th class="col-role">系统角色</th>
              <th class="col-status">账号状态</th>
              <th class="col-activity">最近活跃 / 注册时间</th>
              <th class="col-actions">管理操作</th>
            </tr>
          </thead>

          <!-- Loading State -->
          <tbody v-if="loading">
            <tr>
              <td colspan="5" class="state-cell">
                <div class="loading-inline">
                  <i class="fas fa-circle-notch fa-spin" />
                  <span>正在加载用户数据…</span>
                </div>
              </td>
            </tr>
          </tbody>

          <!-- Empty State -->
          <tbody v-else-if="users.length === 0">
            <tr>
              <td colspan="5" class="state-cell">
                <div class="empty-inline">
                  <i class="fas fa-user-slash" />
                  <span>没有找到符合条件的用户数据</span>
                  <BaseButton
                    v-if="hasActiveFilters"
                    variant="ghost"
                    size="xs"
                    @click="resetAllFilters"
                  >
                    清除筛选条件
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>

          <!-- Rows -->
          <tbody v-else>
            <tr
              v-for="user in users"
              :key="user.id"
              class="data-row"
              :class="{ 'data-row--suspended': user.status === 'SUSPENDED' }"
            >
              <!-- User Info Column -->
              <td class="col-user">
                <div class="user-profile">
                  <img v-if="user.avatar_url" :src="user.avatar_url" class="avatar-img" alt="" />
                  <div v-else class="avatar-fallback">
                    {{ userInitial(user) }}
                  </div>

                  <div class="user-texts">
                    <div class="user-name-line">
                      <span class="user-nickname">{{ user.nickname || '未命名用户' }}</span>
                      <span v-if="user.id === authStore.user?.id" class="badge-self">当前账号</span>
                    </div>
                    <span class="user-email-text" :title="user.email || '未绑定邮箱'">
                      {{ user.email || '第三方快捷登录' }}
                    </span>
                  </div>
                </div>
              </td>

              <!-- Role Column (同构人像系图标与统一尺寸) -->
              <td class="col-role">
                <span
                  class="role-badge"
                  :class="user.role === 'ADMIN' ? 'role-badge--admin' : 'role-badge--user'"
                >
                  <i
                    :class="user.role === 'ADMIN' ? 'fas fa-user-shield' : 'fas fa-user'"
                    class="role-badge__icon"
                  />
                  <span class="role-badge__text">
                    {{ user.role === 'ADMIN' ? '管理员' : '普通用户' }}
                  </span>
                </span>
              </td>

              <!-- Status Column -->
              <td class="col-status">
                <span
                  class="status-pill"
                  :class="
                    user.status === 'ACTIVE' ? 'status-pill--active' : 'status-pill--suspended'
                  "
                >
                  <span class="status-pill__dot" />
                  <span>{{ statusLabel(user.status) }}</span>
                </span>
              </td>

              <!-- Activity Column -->
              <td class="col-activity">
                <div class="activity-text">
                  <span v-if="user.lastLoginAt" class="activity-primary">
                    {{ formatDate(user.lastLoginAt) }}
                  </span>
                  <span v-else class="activity-primary activity-primary--muted">尚未登录</span>
                  <span class="activity-secondary">注册于 {{ formatDate(user.created_at) }}</span>
                </div>
              </td>

              <!-- Actions Column -->
              <td class="col-actions">
                <div class="actions-group">
                  <!-- Role Toggle Action -->
                  <BaseButton
                    v-if="user.id !== authStore.user?.id"
                    variant="neutral-outline"
                    size="xs"
                    :disabled="changingUserId === user.id"
                    @click="confirmToggleRole(user)"
                  >
                    {{
                      changingUserId === user.id
                        ? '处理中…'
                        : user.role === 'ADMIN'
                          ? '收回管理权限'
                          : '设为管理员'
                    }}
                  </BaseButton>
                  <span v-else class="self-disabled-tip">不可修改自己</span>

                  <!-- Status Toggle Action -->
                  <BaseButton
                    v-if="user.id !== authStore.user?.id"
                    :variant="user.status === 'ACTIVE' ? 'danger-ghost' : 'ghost'"
                    size="xs"
                    :disabled="changingUserId === user.id"
                    @click="confirmToggleStatus(user)"
                  >
                    {{ user.status === 'ACTIVE' ? '停用' : '恢复' }}
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Enterprise Pagination Bar (标准企业级分页控制栏) -->
      <div v-if="displayTotal > 0" class="table-pagination-bar">
        <!-- Left: Summary and Page Size -->
        <div class="pagination-summary">
          <span class="total-text">
            共
            <strong>{{ displayTotal }}</strong>
            条记录
          </span>

          <div class="page-size-picker">
            <select v-model="pageSize" class="page-size-select" @change="onPageSizeChange">
              <option :value="10">10 条/页</option>
              <option :value="20">20 条/页</option>
              <option :value="50">50 条/页</option>
              <option :value="100">100 条/页</option>
            </select>
            <i class="fas fa-chevron-down page-size-chevron" />
          </div>
        </div>

        <!-- Right: Pagination Buttons & Quick Jump -->
        <div class="pagination-actions">
          <div class="pager-buttons">
            <!-- Prev Button -->
            <button
              type="button"
              class="pager-btn pager-btn--nav"
              :disabled="currentPage <= 1 || loading"
              title="上一页"
              @click="goToPage(currentPage - 1)"
            >
              <i class="fas fa-chevron-left" />
            </button>

            <!-- Page Number Buttons -->
            <template v-for="(item, index) in pageNumbers" :key="index">
              <span v-if="item === '...'" class="pager-ellipsis">…</span>
              <button
                v-else
                type="button"
                class="pager-btn pager-btn--number"
                :class="{ 'pager-btn--active': item === currentPage }"
                :disabled="loading"
                @click="goToPage(Number(item))"
              >
                {{ item }}
              </button>
            </template>

            <!-- Next Button -->
            <button
              type="button"
              class="pager-btn pager-btn--nav"
              :disabled="currentPage >= totalPages || loading"
              title="下一页"
              @click="goToPage(currentPage + 1)"
            >
              <i class="fas fa-chevron-right" />
            </button>
          </div>

          <!-- Quick Jump -->
          <div v-if="totalPages > 1" class="quick-jump">
            <span>前往</span>
            <input
              v-model="jumpPageInput"
              type="number"
              min="1"
              :max="totalPages"
              class="jump-input"
              @keyup.enter="handleJumpPage"
            />
            <span>页</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Role Confirm Modal -->
    <Teleport to="body">
      <div v-if="confirmRoleTarget" class="modal-backdrop" @click.self="cancelRoleConfirm">
        <div class="modal-card" role="alertdialog" aria-modal="true">
          <div class="modal-card__header">
            <div class="modal-card__icon modal-card__icon--primary">
              <i class="fas fa-user-shield" />
            </div>
            <h4 class="modal-card__title">确认变更用户权限</h4>
          </div>

          <p class="modal-card__desc">
            确定将用户
            <strong>{{ confirmRoleTarget.nickname || confirmRoleTarget.email || '该用户' }}</strong>
            的系统角色变更为
            <strong>{{ confirmRoleTarget.role === 'ADMIN' ? '普通用户' : '管理员' }}</strong>
            ？
          </p>

          <div class="modal-card__actions">
            <BaseButton variant="neutral-ghost" size="sm" @click="cancelRoleConfirm">
              取消
            </BaseButton>
            <BaseButton
              :variant="confirmRoleTarget.role === 'ADMIN' ? 'danger' : 'primary'"
              size="sm"
              @click="executeToggleRole"
            >
              {{ confirmRoleTarget.role === 'ADMIN' ? '确认降为普通用户' : '确认授予管理员' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Status Confirm Modal -->
    <Teleport to="body">
      <div v-if="confirmStatusTarget" class="modal-backdrop" @click.self="cancelStatusConfirm">
        <div class="modal-card" role="alertdialog" aria-modal="true">
          <div class="modal-card__header">
            <div
              class="modal-card__icon"
              :class="
                confirmStatusTarget.status === 'ACTIVE'
                  ? 'modal-card__icon--danger'
                  : 'modal-card__icon--success'
              "
            >
              <i
                :class="
                  confirmStatusTarget.status === 'ACTIVE'
                    ? 'fas fa-user-xmark'
                    : 'fas fa-user-check'
                "
              />
            </div>
            <h4 class="modal-card__title">
              {{ confirmStatusTarget.status === 'ACTIVE' ? '确认停用账号' : '确认恢复账号正常' }}
            </h4>
          </div>

          <p class="modal-card__desc">
            确定将用户
            <strong>
              {{ confirmStatusTarget.nickname || confirmStatusTarget.email || '该用户' }}
            </strong>
            的状态变更为
            <strong>
              {{ confirmStatusTarget.status === 'ACTIVE' ? '已停用（将禁止登录）' : '正常使用' }}
            </strong>
            ？
          </p>

          <div class="modal-card__actions">
            <BaseButton variant="neutral-ghost" size="sm" @click="cancelStatusConfirm">
              取消
            </BaseButton>
            <BaseButton
              :variant="confirmStatusTarget.status === 'ACTIVE' ? 'danger' : 'primary'"
              size="sm"
              @click="executeToggleStatus"
            >
              {{ confirmStatusTarget.status === 'ACTIVE' ? '确认停用账号' : '确认恢复正常' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BaseButton } from '@nav/ui'
import {
  getManagedUsers,
  updateManagedUserRole,
  updateManagedUserStatus,
  type ManagedUser
} from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

const authStore = useAuthStore()
const uiStore = useUIStore()
const users = ref<ManagedUser[]>([])
const total = ref(0)
const displayTotal = ref(0)
const adminCount = ref(0)
const activeCount = ref<number | undefined>(undefined)
const suspendedCount = ref(0)
const query = ref('')
const activeQuery = ref('')
const selectedRole = ref('')
const selectedStatus = ref('')
const loading = ref(false)
const error = ref('')
const changingUserId = ref<string | null>(null)
const confirmRoleTarget = ref<ManagedUser | null>(null)
const confirmStatusTarget = ref<ManagedUser | null>(null)

// Pagination State
const currentPage = ref(1)
const pageSize = ref(10)
const jumpPageInput = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(displayTotal.value / pageSize.value)))

const hasActiveFilters = computed(() =>
  Boolean(activeQuery.value || selectedRole.value || selectedStatus.value)
)

// Smart Page Numbers with Ellipsis
const pageNumbers = computed<(number | string)[]>(() => {
  const totalP = totalPages.value
  const current = currentPage.value

  if (totalP <= 7) {
    return Array.from({ length: totalP }, (_, i) => i + 1)
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', totalP]
  }

  if (current >= totalP - 3) {
    return [1, '...', totalP - 4, totalP - 3, totalP - 2, totalP - 1, totalP]
  }

  return [1, '...', current - 1, current, current + 1, '...', totalP]
})

const loadUsers = async () => {
  loading.value = true
  error.value = ''
  try {
    const offset = (currentPage.value - 1) * pageSize.value
    const response = await getManagedUsers({
      query: activeQuery.value || undefined,
      role: selectedRole.value || undefined,
      status: selectedStatus.value || undefined,
      limit: pageSize.value,
      offset
    })
    if (!response.success || !response.data) throw new Error(response.message || '用户列表加载失败')
    users.value = response.data.users
    total.value = response.data.total
    displayTotal.value =
      (response.data as { filteredTotal?: number }).filteredTotal ?? response.data.total
    adminCount.value = response.data.adminCount
    activeCount.value = response.data.activeCount
    suspendedCount.value = response.data.suspendedCount || 0
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '用户列表加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value || loading.value) return
  currentPage.value = page
  void loadUsers()
}

const onPageSizeChange = () => {
  currentPage.value = 1
  void loadUsers()
}

const handleJumpPage = () => {
  const parsed = parseInt(jumpPageInput.value, 10)
  if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= totalPages.value) {
    goToPage(parsed)
  }
  jumpPageInput.value = ''
}

const applySearch = () => {
  activeQuery.value = query.value.trim()
  currentPage.value = 1
  void loadUsers()
}

const onSearchInput = () => {
  if (!query.value.trim() && activeQuery.value) {
    activeQuery.value = ''
    currentPage.value = 1
    void loadUsers()
  }
}

const clearSearch = () => {
  query.value = ''
  activeQuery.value = ''
  currentPage.value = 1
  void loadUsers()
}

const applyFilter = () => {
  currentPage.value = 1
  void loadUsers()
}

const resetAllFilters = () => {
  query.value = ''
  activeQuery.value = ''
  selectedRole.value = ''
  selectedStatus.value = ''
  currentPage.value = 1
  void loadUsers()
}

const confirmToggleRole = (user: ManagedUser) => {
  confirmRoleTarget.value = user
}

const cancelRoleConfirm = () => {
  confirmRoleTarget.value = null
}

const executeToggleRole = async () => {
  const user = confirmRoleTarget.value
  if (!user) return
  confirmRoleTarget.value = null

  const nextRole: ManagedUser['role'] = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
  changingUserId.value = user.id
  try {
    const response = await updateManagedUserRole(user.id, nextRole)
    if (!response.success || !response.data) throw new Error(response.message || '角色更新失败')
    const index = users.value.findIndex(item => item.id === user.id)
    if (index >= 0) users.value[index] = response.data
    adminCount.value += nextRole === 'ADMIN' ? 1 : -1
    uiStore.showToast(nextRole === 'ADMIN' ? '已授予管理员权限' : '已降为普通用户', 'success')
  } catch (cause) {
    uiStore.showToast(cause instanceof Error ? cause.message : '角色更新失败', 'error')
  } finally {
    changingUserId.value = null
  }
}

const confirmToggleStatus = (user: ManagedUser) => {
  confirmStatusTarget.value = user
}

const cancelStatusConfirm = () => {
  confirmStatusTarget.value = null
}

const executeToggleStatus = async () => {
  const user = confirmStatusTarget.value
  if (!user) return
  confirmStatusTarget.value = null

  const nextStatus: ManagedUser['status'] = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
  changingUserId.value = user.id
  try {
    const response = await updateManagedUserStatus(user.id, nextStatus)
    if (!response.success || !response.data) throw new Error(response.message || '状态更新失败')
    const index = users.value.findIndex(item => item.id === user.id)
    if (index >= 0) users.value[index] = response.data
    suspendedCount.value += nextStatus === 'SUSPENDED' ? 1 : -1
    if (activeCount.value !== undefined) {
      activeCount.value += nextStatus === 'ACTIVE' ? 1 : -1
    }
    uiStore.showToast(nextStatus === 'ACTIVE' ? '账号已恢复正常使用' : '账号已停用', 'success')
  } catch (cause) {
    uiStore.showToast(cause instanceof Error ? cause.message : '状态更新失败', 'error')
  } finally {
    changingUserId.value = null
  }
}

const userInitial = (user: ManagedUser): string => {
  const source = user.nickname || user.email || 'U'
  return source.trim().charAt(0).toUpperCase()
}

const statusLabel = (status: string): string => {
  switch (status) {
    case 'ACTIVE':
      return '正常'
    case 'SUSPENDED':
      return '已停用'
    case 'PENDING_VERIFY':
      return '待验证'
    default:
      return status
  }
}

const formatDate = (dateValue?: string | number | null): string => {
  if (!dateValue) return '—'
  const date = typeof dateValue === 'number' ? new Date(dateValue) : new Date(dateValue)
  if (Number.isNaN(date.getTime())) return String(dateValue)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  void loadUsers()
})
</script>

<style scoped lang="scss">
.mgmt-workbench {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Notice Bar */
.notice-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
}

.notice-bar--error {
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  color: var(--color-error);
  border: 1px solid color-mix(in srgb, var(--color-error) 20%, transparent);
}

/* Top Read-only Metrics Bar */
.metrics-summary-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid var(--border-tile);
  background: var(--bg-panel);
  user-select: none;
}

.metric-card__label {
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

/* Main Table Shell */
.table-container {
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: var(--bg-panel);
  border: 1px solid var(--border-tile);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
  overflow: hidden;
}

/* Toolbar */
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-tile);
  background: color-mix(in srgb, var(--bg-tile) 40%, var(--bg-panel));
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 380px;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  font-size: 12px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 34px;
  padding: 0 32px;
  border-radius: 8px;
  border: 1px solid var(--border-tile);
  background: var(--bg-panel);
  color: var(--text-main);
  font: inherit;
  font-size: 12.5px;
  outline: 0;
  transition: all 0.15s ease;

  &::-webkit-search-decoration,
  &::-webkit-search-cancel-button,
  &::-webkit-search-results-button,
  &::-webkit-search-results-decoration {
    display: none;
  }

  &:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 14%, transparent);
  }
}

.btn-clear {
  position: absolute;
  right: 8px;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;

  &:hover {
    color: var(--text-main);
    background: var(--bg-tile);
  }
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.select-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.custom-select {
  appearance: none;
  height: 34px;
  padding: 0 28px 0 12px;
  border-radius: 8px;
  border: 1px solid var(--border-tile);
  background: var(--bg-panel);
  color: var(--text-main);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  outline: 0;
  cursor: pointer;
  transition: all 0.15s ease;

  &:focus {
    border-color: var(--color-primary);
  }
}

.select-chevron {
  position: absolute;
  right: 10px;
  color: var(--text-muted);
  font-size: 10px;
  pointer-events: none;
}

/* Data Table */
.data-table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;

  thead {
    background: color-mix(in srgb, var(--bg-tile) 65%, var(--bg-panel));
    border-bottom: 1px solid var(--border-tile);

    th {
      padding: 10px 18px;
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.03em;
      white-space: nowrap;
    }
  }

  tbody tr {
    border-bottom: 1px solid color-mix(in srgb, var(--text-muted) 12%, transparent);
    transition: background 0.12s ease;

    &:hover {
      background: color-mix(in srgb, var(--bg-tile) 50%, var(--bg-panel));
    }

    &:last-child {
      border-bottom: 0;
    }

    &.data-row--suspended {
      opacity: 0.72;
    }
  }

  td {
    padding: 14px 18px;
    vertical-align: middle;
  }
}

/* Column Widths & Alignments */
.col-user {
  min-width: 220px;
}

.col-role {
  min-width: 120px;
}

.col-status {
  min-width: 110px;
}

.col-activity {
  min-width: 180px;
}

.col-actions {
  min-width: 180px;
  text-align: right;
}

/* User Profile */
.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-tile);
  flex-shrink: 0;
}

.avatar-fallback {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-primary) 15%, var(--bg-tile));
  color: var(--color-primary-dark);
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent);
}

.user-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-name-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-nickname {
  color: var(--text-main);
  font-size: 13.5px;
  font-weight: 700;
  white-space: nowrap;
}

.badge-self {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--primary-soft);
  color: var(--color-primary-dark);
  font-size: 10px;
  font-weight: 700;
}

.user-email-text {
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

/* Role Badge (严格统一尺寸、清晰边框与独立色彩) */
.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 84px;
  height: 25px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-sizing: border-box;

  &--admin {
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    color: var(--color-primary-dark);
    border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  }

  &--user {
    background: color-mix(in srgb, var(--text-muted) 10%, transparent);
    color: var(--text-secondary);
    border: 1px solid color-mix(in srgb, var(--text-muted) 35%, transparent);
  }
}

.role-badge__icon {
  width: 12px;
  font-size: 11px;
  text-align: center;
  flex-shrink: 0;
}

.role-badge__text {
  flex: 1;
  text-align: center;
}

/* Status Pill */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;

  &--active {
    color: var(--color-success);
    .status-pill__dot {
      background: var(--color-success);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-success) 25%, transparent);
    }
  }

  &--suspended {
    color: var(--color-error);
    .status-pill__dot {
      background: var(--color-error);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-error) 25%, transparent);
    }
  }
}

.status-pill__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* Activity Column */
.activity-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.activity-primary {
  color: var(--text-main);
  font-size: 12px;
  font-weight: 600;

  &--muted {
    color: var(--text-muted);
  }
}

.activity-secondary {
  color: var(--text-muted);
  font-size: 11px;
}

/* Actions Group */
.actions-group {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.self-disabled-tip {
  color: var(--text-muted);
  font-size: 11px;
  font-style: italic;
}

/* States */
.data-table .state-cell {
  text-align: center;
  padding: 48px 0;
}

.loading-inline,
.empty-inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-muted);
  font-size: 13px;

  i {
    font-size: 24px;
    opacity: 0.5;
  }
}

/* Enterprise Pagination Bar */
.table-pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 18px;
  border-top: 1px solid var(--border-tile);
  background: color-mix(in srgb, var(--bg-tile) 40%, var(--bg-panel));
}

.pagination-summary {
  display: flex;
  align-items: center;
  gap: 14px;
}

.total-text {
  color: var(--text-muted);
  font-size: 12.5px;

  strong {
    color: var(--text-main);
    font-weight: 700;
  }
}

.page-size-picker {
  position: relative;
  display: flex;
  align-items: center;
}

.page-size-select {
  appearance: none;
  height: 28px;
  padding: 0 24px 0 8px;
  border-radius: 6px;
  border: 1px solid var(--border-tile);
  background: var(--bg-panel);
  color: var(--text-main);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  outline: 0;
  cursor: pointer;
  transition: all 0.15s ease;

  &:focus {
    border-color: var(--color-primary);
  }
}

.page-size-chevron {
  position: absolute;
  right: 8px;
  color: var(--text-muted);
  font-size: 9px;
  pointer-events: none;
}

.pagination-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.pager-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pager-btn {
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border-radius: 6px;
  border: 1px solid var(--border-tile);
  background: var(--bg-panel);
  color: var(--text-main);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled):not(.pager-btn--active) {
    background: var(--bg-tile);
    border-color: color-mix(in srgb, var(--color-primary) 50%, var(--border-tile));
  }

  &.pager-btn--active {
    background: var(--primary-soft);
    color: var(--color-primary-dark);
    border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
    font-weight: 700;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.pager-ellipsis {
  display: inline-block;
  padding: 0 4px;
  color: var(--text-muted);
  font-size: 12px;
  user-select: none;
}

.quick-jump {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 12px;
}

.jump-input {
  width: 44px;
  height: 28px;
  padding: 0 4px;
  text-align: center;
  border-radius: 6px;
  border: 1px solid var(--border-tile);
  background: var(--bg-panel);
  color: var(--text-main);
  font: inherit;
  font-size: 12px;
  outline: 0;

  &:focus {
    border-color: var(--color-primary);
  }

  /* Hide number arrows */
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }
}

/* Confirmation Modal Card */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  z-index: var(--z-index-modal, 1000);
  display: grid;
  place-items: center;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 420px;
  border-radius: 14px;
  background: var(--bg-panel);
  border: 1px solid var(--border-tile);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-card__icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-size: 16px;

  &--primary {
    background: var(--primary-soft);
    color: var(--color-primary-dark);
  }

  &--danger {
    background: color-mix(in srgb, var(--color-error) 14%, transparent);
    color: var(--color-error);
  }

  &--success {
    background: color-mix(in srgb, var(--color-success) 14%, transparent);
    color: var(--color-success);
  }
}

.modal-card__title {
  margin: 0;
  color: var(--text-main);
  font-size: 16px;
  font-weight: 700;
}

.modal-card__desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;

  strong {
    color: var(--text-main);
  }
}

.modal-card__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 6px;
}

@media (max-width: 768px) {
  .metrics-summary-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .table-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }

  .filter-controls {
    flex-wrap: wrap;
  }

  .table-pagination-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
