<template>
  <AppLayout>
    <HomeSearch />
    <div class="two-pane">
      <section class="section-block">
        <div class="section-title-row">
          <h2 class="section-title">
            <div class="panel-title-pill" />
            <span>最近使用</span>
            <span class="count">({{ recentPageCount }})</span>
          </h2>
          <div id="recent-pager-portal" />
        </div>
        <div class="section-content">
          <CompactList fixed-view="recent" :limit="12" @page-count="recentPageCount = $event">
            <template #empty>
              <div class="empty-placeholder">
                <div class="empty-icon-wrapper">
                  <i class="fas fa-history" />
                </div>
                <h3 class="empty-title">还没有访问记录</h3>
                <p class="empty-desc">打开网站后，会自动出现在这里。</p>
                <div v-if="totalSites > 0" class="empty-actions">
                  <button class="empty-btn outline" @click="goToAll">浏览全部网站</button>
                </div>
              </div>
            </template>
          </CompactList>
        </div>
      </section>
      <section class="section-block">
        <div class="section-title-row">
          <h2 class="section-title">
            <div class="panel-title-pill" />
            <span>常用</span>
            <span class="count">({{ favoriteTotal }})</span>
          </h2>
          <div id="favorite-pager-portal" />
        </div>
        <div class="section-content">
          <CompactList fixed-view="favorite" :limit="12">
            <template #empty>
              <div class="empty-placeholder">
                <div class="empty-icon-wrapper">
                  <i class="fas fa-star" />
                </div>
                <h3 class="empty-title">还没有常用网站</h3>
                <p class="empty-desc">给网站点亮星标，它就会固定在首页。</p>
                <div v-if="totalSites > 0" class="empty-actions">
                  <button class="empty-btn outline" @click="goToAll">去全部页面标记常用</button>
                </div>
              </div>
            </template>
          </CompactList>
        </div>
      </section>
    </div>
    <div class="bottom-area">
      <StatsOverview />
      <QuickCategoryFilter @open-more="categorySelectOpen = true" />
      <QuickTagFilter @open-more="tagSelectOpen = true" />
    </div>

    <CategorySelectModal :is-open="categorySelectOpen" @close="categorySelectOpen = false" />
    <TagSelectModal :is-open="tagSelectOpen" @close="tagSelectOpen = false" />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import CompactList from '@/components/CompactList.vue'
import HomeSearch from '@/components/dashboard/HomeSearch.vue'
import StatsOverview from '@/components/dashboard/StatsOverview.vue'
import QuickCategoryFilter from '@/components/dashboard/QuickCategoryFilter.vue'
import QuickTagFilter from '@/components/dashboard/QuickTagFilter.vue'
import CategorySelectModal from '@/components/modals/CategorySelectModal.vue'
import TagSelectModal from '@/components/modals/TagSelectModal.vue'
import { useWebsiteStats } from '@/composables/useWebsiteStats'

import { useRouter } from 'vue-router'

const { totalSites, favoriteTotal } = useWebsiteStats()
const recentPageCount = ref(0)
const categorySelectOpen = ref(false)
const tagSelectOpen = ref(false)

const router = useRouter()

const goToAll = () => {
  router.push('/all')
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.two-pane {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);

  @include desktop {
    grid-template-columns: repeat(2, 1fr);
  }
}

.section-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 0;

  // Card 样式复刻
  background: var(--bg-panel);
  border: 1px solid var(--border-tile);
  border-radius: var(--radius-card);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-sm);
  transition:
    background-color var(--transition-slow),
    box-shadow var(--transition-slow);
}

.section-content {
  display: flex;
  flex: 1;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
  height: var(--spacing-2xl);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-main);
  line-height: var(--line-height-tight);
}

.panel-title-pill {
  width: var(--spacing-sm);
  height: var(--spacing-sm);
  background-color: var(--color-primary);
  border-radius: 50%;
}

.count {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  font-weight: var(--font-weight-normal);
  margin-left: var(--spacing-xs);
}

.bottom-area {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-lg);

  @include desktop {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Empty State Styles */
.empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
  max-width: 300px;
  margin: 0 auto;
}

.empty-icon-wrapper {
  width: 52px;
  height: 52px;
  background: var(--primary-soft);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;

  i {
    font-size: 19px;
    color: var(--color-primary);
  }
}

.empty-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-main);
  margin: 0 0 7px;
}

.empty-desc {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  line-height: var(--line-height-relaxed);
  margin: 0 0 16px;
}

.empty-actions {
  display: flex;
  gap: var(--spacing-md);
}

.empty-btn {
  height: 32px;
  padding: 0 14px;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  transition: all var(--transition-fast);

  &.outline {
    background: transparent;
    color: var(--color-primary);
    border: 1px solid var(--color-primary);

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 5%, transparent);
    }
  }
}
</style>
