<template>
  <div class="app-container">
    <HeaderBar
      @add-site="handleAddSite"
      @open-settings="openSettingsModal"
      @open-data-management="openDataManagement"
    />
    <main class="main-content">
      <div class="container">
        <slot />
      </div>
    </main>

    <!-- Modals -->
    <BaseModal
      v-if="uiStore.modalState.addSite"
      :is-open="uiStore.modalState.addSite"
      :title="addSiteTitle"
      @close="closeAddSite"
    >
      <AddSiteModal
        :website="uiStore.getModalData('addSite')?.website"
        :context-category-id="uiStore.getModalData('addSite')?.categoryId"
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
      v-if="uiStore.modalState.dataManagement"
      :is-open="uiStore.modalState.dataManagement"
      title="数据管理"
      size="lg"
      @close="() => uiStore.closeModal('dataManagement')"
    >
      <DataManagementModal @close="() => uiStore.closeModal('dataManagement')" />
    </BaseModal>

    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { BaseModal } from '@nav/ui'
import HeaderBar from '@/components/header/HeaderBar.vue'
import AddSiteModal from '@/components/modals/AddSiteModal.vue'
import ManageCategoriesModal from '@/components/modals/ManageCategoriesModal.vue'
import ManageTagsModal from '@/components/modals/ManageTagsModal.vue'
import SettingsModal from '@/components/modals/SettingsModal.vue'
import DataManagementModal from '@/components/modals/DataManagementModal.vue'
import ToastContainer from '@/components/toast/ToastContainer.vue'

const uiStore = useUIStore()

const addSiteTitle = computed(() => {
  return uiStore.getModalData('addSite')?.website ? '编辑网站' : '添加网站'
})

const handleAddSite = () => {
  uiStore.openModal('addSite', {})
}

const closeAddSite = () => {
  uiStore.closeModal('addSite')
}

const openSettingsModal = () => uiStore.openModal('settings')
const openDataManagement = () => uiStore.openModal('dataManagement')
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-body);
}

.main-content {
  flex: 1;
  width: 100%;
  padding: var(--spacing-xl) 0;
}

.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
}
</style>
