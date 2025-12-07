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
          <CompactList fixed-view="recent" :limit="12" @page-count="recentPageCount = $event">
            <template #empty>
              <div class="empty-placeholder">
                <div class="empty-icon-wrapper">
                  <i class="fas fa-history" />
                </div>
                <h3 class="empty-title">暂无最近使用</h3>
                <p class="empty-desc">
                  在 DIY
                  导航中打开的网站，都会自动记录在这里，方便你下一次直接从首页快速回到常用站点。
                </p>
                <div class="empty-actions">
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
                <h3 class="empty-title">暂无常用网站</h3>
                <p class="empty-desc">
                  在「全部」页面给网站打上星标，即可将它们固定为「常用」，优先展示在首页右侧。
                </p>
                <div class="empty-actions">
                  <button class="empty-btn outline" @click="goToAll">去全部页面标记常用</button>
                </div>
                <div class="empty-examples">
                  <span class="example-label">示例：</span>
                  <span class="example-pill">GitHub</span>
                  <span class="example-pill">Google</span>
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
import StatsOverview from '@/components/dashboard/StatsOverview.vue'
import QuickCategoryFilter from '@/components/dashboard/QuickCategoryFilter.vue'
import QuickTagFilter from '@/components/dashboard/QuickTagFilter.vue'
import CategorySelectModal from '@/components/modals/CategorySelectModal.vue'
import TagSelectModal from '@/components/modals/TagSelectModal.vue'
import { useWebsiteStats } from '@/composables/useWebsiteStats'

import { useRouter } from 'vue-router'

const { favoriteTotal } = useWebsiteStats()
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
  border-radius: 18px;
  padding: 24px;
  box-shadow: var(--shadow-card);
  transition:
    background-color 0.3s ease,
    box-shadow 0.3s ease;
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

/* Empty State Styles */
.empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon-wrapper {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #e0e7ff 0%, #f3f4f6 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);

  i {
    font-size: 28px;
    color: #3b82f6;
  }
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0 0 8px 0;
}

.empty-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 24px 0;
}

.empty-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.empty-btn {
  height: 36px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &.outline {
    background: transparent;
    color: var(--color-primary);
    border: 1px solid var(--color-primary);

    &:hover {
      background: rgba(59, 130, 246, 0.05);
    }
  }
}

.empty-examples {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.example-label {
  color: var(--text-muted);
}

.example-pill {
  padding: 2px 8px;
  background: var(--bg-tile);
  border: 1px solid var(--border-tile);
  border-radius: 999px;
  color: var(--text-secondary);
}
</style>
