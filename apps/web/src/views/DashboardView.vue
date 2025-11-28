<template>
  <AppLayout>
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
          <CompactList fixed-view="recent" :limit="12" @page-count="recentPageCount = $event" />
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
        <div class="section-content"><CompactList fixed-view="favorite" :limit="12" /></div>
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
import StatsOverview from '@/components/dashboard/StatsOverview.vue'
import QuickCategoryFilter from '@/components/dashboard/QuickCategoryFilter.vue'
import QuickTagFilter from '@/components/dashboard/QuickTagFilter.vue'
import CategorySelectModal from '@/components/modals/CategorySelectModal.vue'
import TagSelectModal from '@/components/modals/TagSelectModal.vue'
import { useWebsiteStats } from '@/composables/useWebsiteStats'

const { favoriteTotal } = useWebsiteStats()
const recentPageCount = ref(0)
const categorySelectOpen = ref(false)
const tagSelectOpen = ref(false)
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
  border-radius: 18px;
  padding: 24px;
  box-shadow: var(--shadow-card);
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
  height: 32px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.2;
}

.panel-title-pill {
  width: 6px;
  height: 6px;
  background-color: var(--color-primary);
  border-radius: 50%; // 变成圆点，匹配截图
}

.count {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  font-weight: normal;
  margin-left: 2px;
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
</style>
