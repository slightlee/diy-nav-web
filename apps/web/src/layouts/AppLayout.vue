<template>
  <div class="app-container">
    <HeaderBar
      @add-site="handleAddSite"
      @manage-categories="openManageCategories"
      @manage-tags="openManageTags"
      @open-settings="openSettingsModal"
      @open-data-management="openDataManagement"
    />
    <main class="main-content">
      <div class="container">
        <template v-if="isMultiView">
          <div class="two-pane">
            <section class="section-block">
              <div class="section-title-row">
                <h2 class="section-title">
                  <div class="panel-title-pill" />
                  <span>最近使用</span>
                  <span class="count">({{ recentPageCount }})</span>
                </h2>
                <!-- Pagination slot placeholder, handled by CompactList emitting events or using Teleport -->
                <div id="recent-pager-portal" />
              </div>
              <div class="section-content">
                <CompactList
                  fixed-view="recent"
                  :limit="12"
                  @page-count="recentPageCount = $event"
                />
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
        </template>
        <template v-else>
          <SearchSection
            :fixed-view="fixedViewMeta"
            @edit="handleEditWebsite"
            @delete="handleDeleteWebsite"
            @add-site="handleAddSite"
            @manage-tags="openManageTags"
            @manage-categories="openManageCategories"
          />
        </template>
        <div v-if="isMultiView" class="bottom-area">
          <StatsOverview />
          <QuickCategoryFilter @open-more="categorySelectOpen = true" />
          <QuickTagFilter @open-more="tagSelectOpen = true" />
        </div>
      </div>
    </main>
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
    <CategorySelectModal :is-open="categorySelectOpen" @close="categorySelectOpen = false" />
    <TagSelectModal :is-open="tagSelectOpen" @close="tagSelectOpen = false" />
    <BaseModal
      v-if="uiStore.modalState.dataManagement"
      :is-open="uiStore.modalState.dataManagement"
      title="数据管理"
      @close="() => uiStore.closeModal('dataManagement')"
    >
      <DataManagementModal @close="() => uiStore.closeModal('dataManagement')" />
    </BaseModal>
    <BaseModal
      v-if="websiteDeleteConfirmOpen"
      :is-open="websiteDeleteConfirmOpen"
      title="删除网站"
      @close="closeWebsiteDeleteConfirm"
    >
      <div class="app-layout__confirm-content"><p>确定要删除该网站吗？此操作不可恢复。</p></div>
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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { Website } from '@/types'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useUIStore } from '@/stores/ui'
import { useWebsiteStats } from '@/composables/useWebsiteStats'
import { BaseModal, BaseButton } from '@nav/ui'
import HeaderBar from '@/components/header/HeaderBar.vue'
import SearchSection from '@/components/SearchSection.vue'
import CompactList from '@/components/CompactList.vue'
import AddSiteModal from '@/components/modals/AddSiteModal.vue'
import ManageCategoriesModal from '@/components/modals/ManageCategoriesModal.vue'
import ManageTagsModal from '@/components/modals/ManageTagsModal.vue'
import SettingsModal from '@/components/modals/SettingsModal.vue'
import DataManagementModal from '@/components/modals/DataManagementModal.vue'
import CategorySelectModal from '@/components/modals/CategorySelectModal.vue'
import TagSelectModal from '@/components/modals/TagSelectModal.vue'
import ToastContainer from '@/components/toast/ToastContainer.vue'
import StatsOverview from '@/components/dashboard/StatsOverview.vue'
import QuickCategoryFilter from '@/components/dashboard/QuickCategoryFilter.vue'
import QuickTagFilter from '@/components/dashboard/QuickTagFilter.vue'

const websiteStore = useWebsiteStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()
const uiStore = useUIStore()
const route = useRoute()

// Still needed for favorite count in title
const { favoriteTotal } = useWebsiteStats()

const isMultiView = computed(() => Array.isArray(route.meta.multiView))
const addSiteContextCategoryId = ref('')
const recentPageCount = ref(0)
const fixedViewMeta = computed(
  () => route.meta.fixedView as 'recent' | 'favorite' | 'all' | undefined
)

const categorySelectOpen = ref(false)
const tagSelectOpen = ref(false)

const handleAddSite = (contextCategoryId?: string) => {
  addSiteContextCategoryId.value = contextCategoryId || ''
  uiStore.openModal('addSite')
}
const closeAddSite = () => {
  uiStore.closeModal('addSite')
  addSiteContextCategoryId.value = ''
}
const handleEditWebsite = (website: Website) => uiStore.openModal('addSite', website)
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
  } catch {
    uiStore.showToast('删除失败，请重试', 'error')
  } finally {
    deletingWebsite.value = false
  }
}
const handleDeleteWebsite = (websiteId: string) => {
  websiteDeleteTargetId.value = websiteId
  websiteDeleteConfirmOpen.value = true
}
const openManageCategories = () => uiStore.openModal('manageCategories')
const openManageTags = () => uiStore.openModal('manageTags')
const openSettingsModal = () => uiStore.openModal('settings')
const openDataManagement = () => uiStore.openModal('dataManagement')
onMounted(() => {
  websiteStore.initializeData()
  categoryStore.initializeData()
  tagStore.initializeData()
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
  border: 1px solid var(--border-tile);
  border-radius: 18px;
  background: var(--bg-panel);
  padding: 18px 18px 16px;
  min-height: var(--section-min-h);
  box-shadow: var(--shadow-card);
}
.section-title {
  margin: 0;
  color: var(--color-neutral-800);
  font-size: 15px;
  font-weight: 550;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.section-title .count {
  font-size: 12px;
  color: var(--color-neutral-500);
  font-weight: 400;
}
.panel-title-pill {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--color-primary);
}
.section-content {
  flex: 1;
  overflow: auto;
  padding: 6px;
}
.two-pane {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  height: 100%;

  @media (min-width: 768px) {
    grid-template-columns: 1.7fr 1.3fr;
  }
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
  gap: 16px;
}

/* Select Modal Styles */
.select-modal {
  padding: 4px;
}
.select-search-input {
  margin-bottom: 16px;
}
.select-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
  align-content: flex-start;

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--border-tile);
    border-radius: 4px;
  }
}

.chip {
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  background: var(--bg-tile);
  border: 1px solid var(--border-tile);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;

  &:hover {
    background: var(--bg-tile-hover);
    border-color: var(--border-tile-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
    color: var(--color-primary);
  }

  &:active {
    transform: translateY(0);
  }
}

.chip-name {
  font-weight: 500;
}

.chip-count {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--bg-panel);
  color: var(--text-secondary);
  border: 1px solid var(--border-tile);
}

.chip:hover .chip-count {
  background: var(--bg-tile);
  border-color: var(--border-tile-hover);
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
}
</style>
