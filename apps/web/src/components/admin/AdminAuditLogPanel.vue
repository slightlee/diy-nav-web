<template>
  <div class="audit-workbench">
    <!-- Notice Bar -->
    <div v-if="error" class="notice-bar notice-bar--error">
      <i class="fas fa-circle-exclamation" />
      <span>{{ error }}</span>
    </div>

    <!-- Main Table Container (与用户与权限工作台同构) -->
    <div class="table-container">
      <!-- Toolbar -->
      <div class="table-toolbar">
        <div class="filter-controls">
          <div class="select-wrap">
            <select v-model="selectedAction" class="custom-select" @change="reload">
              <option value="">全部操作</option>
              <option v-for="(label, code) in AUDIT_ACTION_LABELS" :key="code" :value="code">
                {{ label }}
              </option>
            </select>
            <i class="fas fa-chevron-down select-chevron" />
          </div>

          <button type="button" class="refresh-btn" :disabled="loading" title="刷新" @click="load">
            <i class="fas" :class="loading ? 'fa-circle-notch fa-spin' : 'fa-rotate'" />
          </button>
        </div>
      </div>

      <!-- Table Body -->
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-time">时间</th>
              <th class="col-actor">操作人</th>
              <th class="col-action">操作类型</th>
              <th class="col-summary">详情</th>
              <th class="col-ip">IP 地址</th>
            </tr>
          </thead>

          <tbody>
            <!-- Loading State -->
            <tr v-if="loading">
              <td colspan="5" class="state-cell">
                <div class="loading-inline">
                  <i class="fas fa-circle-notch fa-spin" />
                  <span>正在加载操作日志…</span>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-else-if="items.length === 0">
              <td colspan="5" class="state-cell">
                <div class="empty-inline">
                  <i class="fas fa-inbox" />
                  <span>{{ error ? '操作日志加载失败' : '暂无操作记录' }}</span>
                </div>
              </td>
            </tr>

            <!-- Data Rows -->
            <tr v-for="row in items" v-else :key="row.id">
              <td class="col-time">
                <div class="activity-text">
                  <span class="activity-primary">{{ formatDate(row.createdAt) }}</span>
                  <span class="activity-secondary">{{ formatClock(row.createdAt) }}</span>
                </div>
              </td>
              <td class="col-actor">
                <span class="actor-text" :title="row.actorEmail || row.actorUserId || ''">
                  {{ row.actorEmail || row.actorUserId || '—' }}
                </span>
              </td>
              <td>
                <span class="role-badge" :class="actionBadgeClass(row.action)">
                  <span class="role-badge__text">
                    {{ AUDIT_ACTION_LABELS[row.action] ?? row.action }}
                  </span>
                </span>
              </td>
              <td class="col-summary">
                <span class="summary-text">{{ row.summary }}</span>
              </td>
              <td class="col-ip">
                <span class="ip-text">{{ row.ip || '—' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Enterprise Pagination Bar -->
      <div v-if="total > 0" class="table-pagination-bar">
        <!-- Left: Summary and Page Size -->
        <div class="pagination-summary">
          <span class="total-text">
            共
            <strong>{{ total }}</strong>
            条记录
          </span>

          <div class="page-size-picker">
            <select v-model="pageSize" class="page-size-select" @change="reload">
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
            <button
              type="button"
              class="pager-btn pager-btn--nav"
              :disabled="currentPage <= 1 || loading"
              title="上一页"
              @click="goToPage(currentPage - 1)"
            >
              <i class="fas fa-chevron-left" />
            </button>

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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AUDIT_ACTION_LABELS, getAuditLogs, type AuditLogItem } from '@/api/admin'

const items = ref<AuditLogItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const selectedAction = ref('')
const loading = ref(true)
const error = ref('')
const jumpPageInput = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

// Smart Page Numbers with Ellipsis（与用户与权限工作台同款）
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

const pad = (n: number) => String(n).padStart(2, '0')

const formatDate = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const formatClock = (ts: number) => {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const actionBadgeClass = (action: string) => {
  if (action.startsWith('AUTH_')) return 'role-badge--auth'
  if (action.includes('STORAGE')) return 'role-badge--storage'
  return 'role-badge--update'
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await getAuditLogs({
      action: selectedAction.value || undefined,
      limit: pageSize.value,
      offset: (currentPage.value - 1) * pageSize.value
    })
    if (!res.success || !res.data) {
      error.value = res.message || '操作日志加载失败，请稍后重试'
      return
    }
    items.value = res.data.items
    total.value = res.data.total
    // 数据删减/筛选后当前页可能越界，回退到最后一页
    if (items.value.length === 0 && currentPage.value > 1) {
      currentPage.value = Math.min(currentPage.value, totalPages.value)
      if (currentPage.value >= 1) await load()
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '操作日志加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const reload = () => {
  currentPage.value = 1
  void load()
}

const goToPage = (target: number) => {
  if (target < 1 || target > totalPages.value) return
  currentPage.value = target
  void load()
}

const handleJumpPage = () => {
  const target = Number(jumpPageInput.value)
  if (!Number.isInteger(target) || target < 1 || target > totalPages.value) return
  jumpPageInput.value = ''
  goToPage(target)
}

onMounted(load)
</script>

<style scoped lang="scss">
.audit-workbench {
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

.refresh-btn {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-tile);
  border-radius: 8px;
  background: var(--bg-panel);
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    color: var(--text-main);
    border-color: color-mix(in srgb, var(--color-primary) 50%, var(--border-tile));
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
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
  }

  td {
    padding: 14px 18px;
    vertical-align: middle;
  }
}

/* Column Widths & Alignments */
.col-time {
  min-width: 120px;
}

.col-actor {
  min-width: 180px;
  max-width: 240px;
}

.col-action {
  min-width: 130px;
}

.col-summary {
  width: 100%;
}

.col-ip {
  min-width: 120px;
}

/* Activity Column (时间：日期主行 + 时刻次行) */
.activity-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.activity-primary {
  color: var(--text-main);
  font-size: 12px;
  font-weight: 600;
}

.activity-secondary {
  color: var(--text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

/* Actor Column */
.actor-text {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  color: var(--text-main);
  font-size: 12.5px;
  font-weight: 500;
}

/* Action Badge（与角色徽章同款尺寸与边框语言） */
.role-badge {
  display: inline-flex;
  align-items: center;
  height: 25px;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-sizing: border-box;

  &--update {
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    color: var(--color-primary-dark);
    border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  }

  &--storage {
    background: color-mix(in srgb, var(--color-warning) 12%, transparent);
    color: color-mix(in srgb, var(--color-warning) 72%, var(--text-main));
    border: 1px solid color-mix(in srgb, var(--color-warning) 38%, transparent);
  }

  &--auth {
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
    color: var(--color-success);
    border: 1px solid color-mix(in srgb, var(--color-success) 38%, transparent);
  }
}

/* Summary & IP Columns */
.summary-text {
  color: var(--text-main);
  font-size: 12.5px;
}

.ip-text {
  color: var(--text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
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

@media (max-width: 768px) {
  .table-pagination-bar {
    justify-content: center;
  }
}
</style>
