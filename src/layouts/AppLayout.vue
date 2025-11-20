<template>
  <div class="app-container">
    <HeaderBar
      @add-site="handleAddSite"
      @manage-categories="openManageCategories"
      @manage-tags="openManageTags"
      @open-settings="openSettingsModal"
      @open-data-management="openDataManagement"
    />

    <!-- 主内容区域 -->
    <main class="main-content">
      <div class="container">
        <template v-if="Array.isArray(route.meta.multiView)">
          <div class="two-pane">
            <section class="section-block">
              <div class="section-title-row">
                <h2 class="section-title">
                  最近使用
                  <span class="count">({{ recentTotal }})</span>
                </h2>
              </div>
              <div class="section-content">
                <CompactList fixed-view="recent" />
              </div>
            </section>
            <section class="section-block">
              <div class="section-title-row">
                <h2 class="section-title">
                  常用
                  <span class="count">({{ favoriteTotal }})</span>
                </h2>
              </div>
              <div class="section-content">
                <CompactList fixed-view="favorite" />
              </div>
            </section>
          </div>
        </template>
        <template v-else>
          <SearchSection
            :fixed-view="fixedViewMeta"
            :hide-view-switch="true"
            @edit="handleEditWebsite"
            @delete="handleDeleteWebsite"
            @add-site="handleAddSite"
            @manage-tags="openManageTags"
            @manage-categories="openManageCategories"
          />
        </template>
        <div v-if="Array.isArray(route.meta.multiView)" class="bottom-area">
          <section class="bottom-card">
            <div class="bottom-card__header">
              <h3 class="bottom-card__title">概览</h3>
            </div>
            <div class="overview-chips">
              <div class="chip overview-chip">
                <i class="fas fa-layer-group" />
                <span class="chip-name">网站总数</span>
                <span class="chip-count">{{ totalSites }}</span>
              </div>
              <div class="chip overview-chip">
                <i class="fas fa-star" />
                <span class="chip-name">常用数量</span>
                <span class="chip-count">{{ favoriteTotal }}</span>
              </div>
              <div class="chip overview-chip">
                <i class="fas fa-plus-circle" />
                <span class="chip-name">最近7天新增</span>
                <span class="chip-count">{{ recentAdded7d }}</span>
              </div>
              <div class="chip overview-chip">
                <i class="fas fa-clock" />
                <span class="chip-name">今日访问</span>
                <span class="chip-count">{{ todayVisited }}</span>
              </div>
            </div>
          </section>

          <section class="bottom-card">
            <div class="bottom-card__header">
              <h3 class="bottom-card__title">分类快捷筛选</h3>
            </div>
            <div class="categories-grid">
              <button
                v-for="c in categoryPopular"
                :key="c.id"
                class="chip category-chip"
                type="button"
                :aria-label="`筛选分类：${c.name}`"
                :title="c.name"
                @click="goToAllWithCategory(c.id)"
                @keydown.enter="goToAllWithCategory(c.id)"
              >
                <span class="chip-name">{{ c.name }}</span>
                <span class="chip-count">{{ categoryCountMap[c.id] || 0 }}</span>
              </button>
              <button
                v-if="hasMoreCategories"
                class="chip more-chip"
                type="button"
                aria-label="更多分类"
                title="更多"
                @click="categorySelectOpen = true"
              >
                <i class="fas fa-chevron-right" />
                <span class="chip-name">更多</span>
              </button>
              <div v-if="categoryPopular.length === 0" class="recent-empty">暂无分类</div>
            </div>
          </section>

          <section class="bottom-card">
            <div class="bottom-card__header">
              <h3 class="bottom-card__title">标签快捷筛选</h3>
            </div>
            <div class="tags-grid">
              <button
                v-for="t in tagPopular"
                :key="t.id"
                class="chip tag-chip"
                type="button"
                :aria-label="`筛选标签：${t.name}`"
                :title="t.name"
                @click="goToAllWithTag(t.id)"
                @keydown.enter="goToAllWithTag(t.id)"
              >
                <span class="chip-dot" :style="{ backgroundColor: t.color }" />
                <span class="chip-name">{{ t.name }}</span>
                <span class="chip-count">{{ tagUsageMap[t.id] || 0 }}</span>
              </button>
              <button
                v-if="hasMoreTags"
                class="chip more-chip"
                type="button"
                aria-label="更多标签"
                title="更多"
                @click="tagSelectOpen = true"
              >
                <i class="fas fa-chevron-right" />
                <span class="chip-name">更多</span>
              </button>
              <div v-if="tagPopular.length === 0" class="recent-empty">暂无标签</div>
            </div>
          </section>
        </div>
      </div>
    </main>

    <!-- 模态框容器 -->
    <BaseModal
      v-if="uiStore.modalState.addSite"
      :is-open="uiStore.modalState.addSite"
      title="添加新网站"
      @close="closeAddSite"
    >
      <AddSiteModal
        :website="uiStore.getModalData('addSite')"
        :context-category-id="addSiteContextCategoryId"
        @close="closeAddSite"
      />
    </BaseModal>

    <BaseModal
      v-if="uiStore.modalState.manageCategories"
      :is-open="uiStore.modalState.manageCategories"
      title="管理分类"
      @close="() => uiStore.closeModal('manageCategories')"
    >
      <ManageCategoriesModal @close="() => uiStore.closeModal('manageCategories')" />
    </BaseModal>

    <BaseModal
      v-if="uiStore.modalState.manageTags"
      :is-open="uiStore.modalState.manageTags"
      title="管理标签"
      @close="() => uiStore.closeModal('manageTags')"
    >
      <ManageTagsModal @close="() => uiStore.closeModal('manageTags')" />
    </BaseModal>

    <BaseModal
      v-if="uiStore.modalState.settings"
      :is-open="uiStore.modalState.settings"
      title="设置"
      @close="() => uiStore.closeModal('settings')"
    >
      <SettingsModal @close="() => uiStore.closeModal('settings')" />
    </BaseModal>

    <BaseModal
      v-if="categorySelectOpen"
      :is-open="categorySelectOpen"
      title="选择分类"
      @close="
        () => {
          categorySelectOpen = false
          categorySearch = ''
        }
      "
    >
      <div class="select-modal">
        <input v-model="categorySearch" class="select-search" type="text" placeholder="搜索分类" />
        <div class="select-grid">
          <button
            v-for="c in filteredCategoriesAll"
            :key="c.id"
            class="chip"
            type="button"
            :aria-label="`筛选分类：${c.name}`"
            :title="c.name"
            @click="
              goToAllWithCategory(c.id)
              categorySelectOpen = false
              categorySearch = ''
            "
          >
            <span class="chip-name">{{ c.name }}</span>
            <span class="chip-count">{{ categoryCountMap[c.id] || 0 }}</span>
          </button>
        </div>
      </div>
    </BaseModal>

    <BaseModal
      v-if="tagSelectOpen"
      :is-open="tagSelectOpen"
      title="选择标签"
      @close="
        () => {
          tagSelectOpen = false
          tagSearch = ''
        }
      "
    >
      <div class="select-modal">
        <input v-model="tagSearch" class="select-search" type="text" placeholder="搜索标签" />
        <div class="select-grid">
          <button
            v-for="t in filteredTagsAll"
            :key="t.id"
            class="chip"
            type="button"
            :aria-label="`筛选标签：${t.name}`"
            :title="t.name"
            @click="
              goToAllWithTag(t.id)
              tagSelectOpen = false
              tagSearch = ''
            "
          >
            <span class="chip-dot" :style="{ backgroundColor: t.color }" />
            <span class="chip-name">{{ t.name }}</span>
            <span class="chip-count">{{ tagUsageMap[t.id] || 0 }}</span>
          </button>
        </div>
      </div>
    </BaseModal>

    <BaseModal
      v-if="uiStore.modalState.dataManagement"
      :is-open="uiStore.modalState.dataManagement"
      title="数据管理"
      @close="() => uiStore.closeModal('dataManagement')"
    >
      <DataManagementModal @close="() => uiStore.closeModal('dataManagement')" />
    </BaseModal>

    <!-- Toast容器 -->
    <BaseModal
      v-if="websiteDeleteConfirmOpen"
      :is-open="websiteDeleteConfirmOpen"
      title="删除网站"
      @close="closeWebsiteDeleteConfirm"
    >
      <div class="app-layout__confirm-content">
        <p>确定要删除该网站吗？此操作不可恢复。</p>
      </div>
      <template #footer>
        <div class="app-layout__confirm-actions">
          <BaseButton variant="secondary" @click="closeWebsiteDeleteConfirm">取消</BaseButton>
          <BaseButton variant="danger" :loading="deletingWebsite" @click="confirmDeleteWebsite">
            <i class="fas fa-trash" />
            删除
          </BaseButton>
        </div>
      </template>
    </BaseModal>
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Website } from '@/types'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import HeaderBar from '@/components/header/HeaderBar.vue'
import SearchSection from '@/components/SearchSection.vue'
import CompactList from '@/components/CompactList.vue'
import AddSiteModal from '@/components/modals/AddSiteModal.vue'
import ManageCategoriesModal from '@/components/modals/ManageCategoriesModal.vue'
import ManageTagsModal from '@/components/modals/ManageTagsModal.vue'
import SettingsModal from '@/components/modals/SettingsModal.vue'
import DataManagementModal from '@/components/modals/DataManagementModal.vue'
import ToastContainer from '@/components/toast/ToastContainer.vue'

// 确保有这些组件文件存在
// 如果不存在，先创建简单版本

// Store初始化
const websiteStore = useWebsiteStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()
const uiStore = useUIStore()
const route = useRoute()
const router = useRouter()

// 响应式状态
const showSettingsDropdown = ref(false)
const addSiteContextCategoryId = ref('')

const recentTotal = computed(() => websiteStore.websites.filter(w => !!w.lastVisited).length)
const favoriteTotal = computed(() => websiteStore.websites.filter(w => !!w.isFavorite).length)

const fixedViewMeta = computed(
  () => route.meta.fixedView as 'recent' | 'favorite' | 'all' | undefined
)

const totalSites = computed(() => websiteStore.websites.length)
const recentAdded7d = computed(() => {
  const ts = Date.now() - 7 * 24 * 60 * 60 * 1000
  return websiteStore.websites.filter(w => w.createdAt.getTime() >= ts).length
})
const todayVisited = computed(() => {
  const d = new Date().toDateString()
  return websiteStore.websites.filter(w => w.lastVisited && w.lastVisited.toDateString() === d)
    .length
})
const categorySelectOpen = ref(false)
const tagSelectOpen = ref(false)
const categorySearch = ref('')
const tagSearch = ref('')
const POPULAR_LIMIT = 10
const categoryPopular = computed(() => {
  return [...categoryStore.categories]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, POPULAR_LIMIT)
})
const tagPopular = computed(() => {
  return [...tagStore.tags].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).slice(0, POPULAR_LIMIT)
})
const filteredCategoriesAll = computed(() => {
  const kw = categorySearch.value.trim().toLowerCase()
  const base = [...categoryStore.categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  if (!kw) return base
  return base.filter(c => c.name.toLowerCase().includes(kw))
})
const filteredTagsAll = computed(() => {
  const kw = tagSearch.value.trim().toLowerCase()
  const base = [...tagStore.tags].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  if (!kw) return base
  return base.filter(t => t.name.toLowerCase().includes(kw))
})
const hasMoreCategories = computed(() => categoryStore.categories.length > POPULAR_LIMIT)
const hasMoreTags = computed(() => tagStore.tags.length > POPULAR_LIMIT)
const tagUsageMap = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {}
  websiteStore.websites.forEach(w =>
    w.tagIds.forEach(id => {
      map[id] = (map[id] || 0) + 1
    })
  )
  return map
})
const categoryCountMap = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {}
  websiteStore.websites.forEach(w => {
    const id = w.categoryId
    if (id) map[id] = (map[id] || 0) + 1
  })
  return map
})
const goToAllWithCategory = (categoryId: string) => {
  router.push({ path: '/all', query: { category: categoryId } })
}
const goToAllWithTag = (tagId: string) => {
  router.push({ path: '/all', query: { tag: tagId } })
}

// 事件处理函数

const handleAddSite = (contextCategoryId?: string) => {
  addSiteContextCategoryId.value = contextCategoryId || ''
  uiStore.openModal('addSite')
}

const closeAddSite = () => {
  uiStore.closeModal('addSite')
  addSiteContextCategoryId.value = ''
}

// 上下文由触发者传入

// 添加键盘快捷键支持
const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey && event.key === 'n') {
    event.preventDefault()
    handleAddSite()
  }
}

const handleEditWebsite = (website: Website) => {
  uiStore.openModal('addSite', website)
}

const websiteDeleteConfirmOpen = ref(false)
const websiteDeleteTargetId = ref<string>('')
const deletingWebsite = ref(false)

const closeWebsiteDeleteConfirm = () => {
  websiteDeleteConfirmOpen.value = false
  websiteDeleteTargetId.value = ''
}

const confirmDeleteWebsite = () => {
  if (!websiteDeleteTargetId.value || deletingWebsite.value) return
  deletingWebsite.value = true
  try {
    websiteStore.deleteWebsite(websiteDeleteTargetId.value)
    uiStore.showToast('网站删除成功', 'success')
    closeWebsiteDeleteConfirm()
  } catch (error) {
    uiStore.showToast('删除失败，请重试', 'error')
  } finally {
    deletingWebsite.value = false
  }
}

const handleDeleteWebsite = (websiteId: string) => {
  websiteDeleteTargetId.value = websiteId
  websiteDeleteConfirmOpen.value = true
}

const toggleSettingsDropdown = () => {
  showSettingsDropdown.value = !showSettingsDropdown.value
}

const openManageCategories = () => {
  uiStore.openModal('manageCategories')
  showSettingsDropdown.value = false
}

const openManageTags = () => {
  uiStore.openModal('manageTags')
  showSettingsDropdown.value = false
}

const openSettingsModal = () => {
  uiStore.openModal('settings')
  showSettingsDropdown.value = false
}

const openDataManagement = () => {
  uiStore.openModal('dataManagement')
  showSettingsDropdown.value = false
}

// 主题切换已迁移至 HeaderBar

// 点击外部关闭下拉菜单
// 下拉开关由 HeaderBar 管理

// 生命周期
onMounted(() => {
  websiteStore.initializeData()
  categoryStore.initializeData()
  tagStore.initializeData()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.app-container {
  min-height: 100vh;
  background-color: var(--color-neutral-50);
  display: flex;
  flex-direction: column;

  --section-min-h: clamp(280px, 28vh, 520px);
}

// 主内容区域样式
.main-content {
  flex: 1;
  padding: 1.5rem 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  height: 100%;
}

.section-block {
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-neutral-200);
  border-radius: 18px;
  background: var(--color-neutral-100);
  padding: 12px;
  min-height: var(--section-min-h);
}

.section-title {
  margin: 0 0 0.5rem 0;
  color: var(--color-neutral-800);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.section-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.section-title .count {
  margin-left: 6px;
  font-size: var(--font-size-sm);
  color: var(--color-neutral-500);
}

.manage-link {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
}

.actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.add-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--color-neutral-200);
  background: var(--color-neutral-100);
  color: var(--color-neutral-700);
}

.section-content {
  flex: 1;
  overflow: auto;
  padding: 6px;
}

.two-pane {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  height: 100%;
}

.section-block :deep(.search-section) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.section-block :deep(.website-grid) {
  flex: 1;
  overflow: auto;
}

// 响应式调整
@media (max-width: 768px) {
  .main-content {
    padding: 1rem 0;
  }
}

@media (min-width: 640px) {
  .app-container {
    --section-min-h: clamp(320px, 30vh, 540px);
  }
}

@media (min-width: 1024px) {
  .app-container {
    --section-min-h: clamp(360px, 32vh, 560px);
  }
}

@media (min-width: 1440px) {
  .app-container {
    --section-min-h: clamp(380px, 34vh, 580px);
  }
}

@media (min-width: 1920px) {
  .app-container {
    --section-min-h: clamp(420px, 36vh, 620px);
  }
}

@media (min-width: 2560px) {
  .app-container {
    --section-min-h: clamp(460px, 38vh, 660px);
  }
}

@media (min-width: 3840px) {
  .app-container {
    --section-min-h: clamp(520px, 40vh, 720px);
  }
}

.app-layout__confirm-content {
  padding: var(--spacing-md) 0;
}

.app-layout__confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
}

.bottom-area {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 18px;

  --chip-area-height: 120px;
}

.bottom-card {
  border: 1px solid var(--color-neutral-200);
  border-radius: 18px;
  background: var(--color-neutral-100);
  padding: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.bottom-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.bottom-card__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.bottom-card__action {
  padding: 4px 10px;
  font-size: var(--font-size-sm);
  color: var(--color-neutral-700);
  background: transparent;
  border: 1px solid var(--color-neutral-200);
  border-radius: 9999px;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.bottom-card__action:hover {
  background-color: var(--color-neutral-100);
  color: var(--color-primary);
  border-color: var(--color-neutral-300);
}

.bottom-card__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
}

.overview-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  height: auto;
  align-content: center;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--color-neutral-200);
  border-radius: 9999px;
  background: var(--color-neutral-100);
  padding: 8px 12px;
  min-height: 32px;
  color: var(--color-neutral-700);
  transition:
    background-color var(--transition-fast),
    transform var(--transition-fast);
}

.chip:hover {
  background: var(--color-neutral-200);
}

.chip:active {
  transform: translateY(1px);
}

.more-chip {
  color: var(--color-neutral-700);
  border-style: dashed;
  background: var(--color-neutral-50);
  padding: 6px 10px;
  gap: 6px;
  min-height: 32px;
}
.more-chip .chip-name {
  font-size: var(--font-size-xs);
}
.more-chip i {
  color: var(--color-neutral-600);
  font-size: var(--font-size-xs);
}
.more-chip:hover {
  color: var(--color-primary);
}

.overview-chip i {
  color: var(--color-neutral-600);
}

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  align-content: flex-start;
  height: auto;
  overflow: visible;
  overscroll-behavior: none;
  mask-image: none;
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
}

.more-dot {
  background-color: var(--color-neutral-400);
}

.chip-name {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-800);
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-count {
  margin-left: auto;
  font-size: var(--font-size-xs);
  color: var(--color-neutral-700);
  background: var(--color-neutral-200);
  border-radius: 10px;
  padding: 0 8px;
}

.categories-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  align-content: flex-start;
  height: auto;
  overflow: visible;
  overscroll-behavior: none;
  mask-image: none;
}

@media (min-width: 768px) {
  .bottom-area {
    --chip-area-height: 140px;
  }
}

@media (min-width: 1024px) {
  .bottom-area {
    --chip-area-height: 160px;
  }
}

@media (max-width: 640px) {
  .overview-chips {
    grid-template-columns: 1fr;
  }
}

/* 移除滚动交互后，无需 snap 对齐 */

.select-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.select-search {
  width: 100%;
  height: 36px;
  border: 1px solid var(--color-neutral-300);
  border-radius: 8px;
  background: var(--color-neutral-100);
  padding: 0 10px;
  color: var(--color-neutral-800);
}

.select-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
