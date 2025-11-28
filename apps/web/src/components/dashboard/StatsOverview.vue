<template>
  <section class="bottom-card">
    <div class="bottom-card__header"><h3 class="bottom-card__title">概览</h3></div>
    <div class="stats-grid">
      <div class="stat-pill">
        <div class="stat-icon"><i class="fas fa-layer-group" /></div>
        <span class="stat-name">网站总数</span>
        <span class="stat-value">{{ totalSites }}</span>
      </div>
      <div class="stat-pill">
        <div class="stat-icon"><i class="fas fa-star" /></div>
        <span class="stat-name">常用数量</span>
        <span class="stat-value">{{ favoriteTotal }}</span>
      </div>
      <div class="stat-pill">
        <div class="stat-icon"><i class="fas fa-plus-circle" /></div>
        <span class="stat-name">最近7天新增</span>
        <span class="stat-value">{{ recentAdded7d }}</span>
      </div>
      <div class="stat-pill">
        <div class="stat-icon"><i class="fas fa-clock" /></div>
        <span class="stat-name">今日访问</span>
        <span class="stat-value">{{ todayVisited }}</span>
      </div>
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
  border: 1px solid var(--border-tile);
  border-radius: 18px;
  background: var(--bg-panel);
  padding: 18px 18px 16px;
  box-shadow: var(--shadow-card);
}
.bottom-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
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
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.stat-pill {
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  background: var(--bg-tile);
  border: 1px solid var(--border-tile);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}
.stat-icon {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--color-primary);
}
.stat-name {
  color: var(--text-secondary);
}
.stat-value {
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--bg-tile-hover);
  font-weight: 500;
  color: var(--text-main);
  border: 1px solid var(--border-tile-hover);
}
</style>
