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
        <SearchSection
          @edit="handleEditWebsite"
          @delete="handleDeleteWebsite"
          @add-site="handleAddSite"
          @manage-tags="openManageTags"
          @manage-categories="openManageCategories"
        />
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
      <ManageCategoriesModal
        @close="() => uiStore.closeModal('manageCategories')"
      />
    </BaseModal>

    <BaseModal
      v-if="uiStore.modalState.manageTags"
      :is-open="uiStore.modalState.manageTags"
      title="管理标签"
      @close="() => uiStore.closeModal('manageTags')"
    >
      <ManageTagsModal
        @close="() => uiStore.closeModal('manageTags')"
      />
    </BaseModal>

    <BaseModal
      v-if="uiStore.modalState.settings"
      :is-open="uiStore.modalState.settings"
      title="设置"
      @close="() => uiStore.closeModal('settings')"
    >
      <SettingsModal
        @close="() => uiStore.closeModal('settings')"
      />
    </BaseModal>

    <BaseModal
      v-if="uiStore.modalState.dataManagement"
      :is-open="uiStore.modalState.dataManagement"
      title="数据管理"
      @close="() => uiStore.closeModal('dataManagement')"
    >
      <DataManagementModal
        @close="() => uiStore.closeModal('dataManagement')"
      />
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
          <BaseButton variant="secondary" @click="closeWebsiteDeleteConfirm">
            取消
          </BaseButton>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { Website } from '@/types'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useUIStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import HeaderBar from '@/components/header/HeaderBar.vue'
import SearchSection from '@/components/SearchSection.vue'
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
const settingsStore = useSettingsStore()

// 响应式状态
const showSettingsDropdown = ref(false)
const addSiteContextCategoryId = ref('')

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
}


// 响应式调整
@media (max-width: 768px) {
  .main-content {
    padding: 1rem 0;
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
</style>
