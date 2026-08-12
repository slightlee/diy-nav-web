<template>
  <section class="bottom-card">
    <div class="bottom-card__header"><h3 class="bottom-card__title">概览</h3></div>
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-icon"><i class="fas fa-layer-group" /></div>
        <div class="stat-copy">
          <span class="stat-name">网站总数</span>
          <strong class="stat-value" :class="{ 'is-zero': totalSites === 0 }">
            {{ totalSites }}
          </strong>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon"><i class="fas fa-star" /></div>
        <div class="stat-copy">
          <span class="stat-name">常用数量</span>
          <strong class="stat-value" :class="{ 'is-zero': favoriteTotal === 0 }">
            {{ favoriteTotal }}
          </strong>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon"><i class="fas fa-plus-circle" /></div>
        <div class="stat-copy">
          <span class="stat-name">最近 7 天新增</span>
          <strong class="stat-value" :class="{ 'is-zero': recentAdded7d === 0 }">
            {{ recentAdded7d }}
          </strong>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon"><i class="fas fa-clock" /></div>
        <div class="stat-copy">
          <span class="stat-name">今日访问</span>
          <strong class="stat-value" :class="{ 'is-zero': todayVisited === 0 }">
            {{ todayVisited }}
          </strong>
        </div>
      </div>
    </div>
    <div v-if="totalSites === 0" class="stats-suggestion">
      建议先添加几个每天都会访问的网站，后续趋势一目了然。
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * @component StatsOverview
 * @description 仪表盘统计概览组件
 * 展示网站总数、常用网站数、近期新增数和今日访问数等核心指标
 */
import { useWebsiteStats } from '@/composables/useWebsiteStats'

const { totalSites, favoriteTotal, recentAdded7d, todayVisited } = useWebsiteStats()
</script>

<style scoped lang="scss">
.bottom-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-tile);
  border-radius: 18px;
  background: var(--bg-panel);
  padding: 14px 16px 13px;
  box-shadow: var(--shadow-sm);
}
.bottom-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.bottom-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 550;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
}
.bottom-card__title::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--color-primary);
  display: inline-block;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 16px;
}
.stat-item {
  min-width: 0;
  min-height: 30px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.stat-icon {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  border-radius: 8px;
  background: var(--primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--color-primary);
}
.stat-copy {
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: flex-start;
  gap: 8px;
  flex: 1;
}
.stat-name {
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-value {
  font-size: 11px;
  line-height: 1;
  font-weight: 400;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.stat-value.is-zero {
  color: var(--text-muted);
}

.stats-suggestion {
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-muted);
}
</style>
