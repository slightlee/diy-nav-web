<template>
  <div class="app-container">
    <HeaderBar @add-site="handleAddSite" @open-account-panel="openAccountPanel" />
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
      modal-class="website-form-modal"
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
      v-if="uiStore.modalState.accountPanel"
      :is-open="uiStore.modalState.accountPanel"
      title="账户与设置"
      size="xl"
      @close="closeAccountPanel"
    >
      <AccountPanelModal
        :initial-tab="uiStore.getModalData('accountPanel')?.tab"
        @close="closeAccountPanel"
      />
    </BaseModal>

    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useUIStore } from '@/stores/ui'
import { BaseModal } from '@nav/ui'
import HeaderBar from '@/components/header/HeaderBar.vue'
import AddSiteModal from '@/components/modals/AddSiteModal.vue'
import ManageCategoriesModal from '@/components/modals/ManageCategoriesModal.vue'
import ManageTagsModal from '@/components/modals/ManageTagsModal.vue'
import AccountPanelModal from '@/components/modals/AccountPanelModal.vue'
import ToastContainer from '@/components/toast/ToastContainer.vue'
import type { AccountPanelTab } from '@/types'

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

const openAccountPanel = (tab: AccountPanelTab = 'account') => {
  uiStore.openModal('accountPanel', { tab })
}

const closeAccountPanel = () => {
  uiStore.closeModal('accountPanel')
}

watch(
  () => uiStore.modalState.settings,
  isOpen => {
    if (!isOpen) return
    uiStore.closeModal('settings')
    openAccountPanel('settings')
  }
)

watch(
  () => uiStore.modalState.dataManagement,
  isOpen => {
    if (!isOpen) return
    uiStore.closeModal('dataManagement')
    openAccountPanel('data')
  }
)

watch(
  () => uiStore.modalState.aiSettings,
  isOpen => {
    if (!isOpen) return
    uiStore.closeModal('aiSettings')
    openAccountPanel('ai')
  }
)
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.app-container {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-body);
  overflow: hidden;
}

.main-content {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden auto;
  padding: var(--spacing-xl) 0;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 4px;
  }
}

.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
}
</style>

<style lang="scss">
// Global modal overrides: BaseModal is teleported to body, so scoped styles cannot own these reliably.
.modal-size-xl {
  max-width: 1180px;
  border-radius: 22px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-xl);
}

.modal-size-xl .modal-header {
  padding: 16px 22px;
  border-bottom-color: var(--color-border);
  background: var(--bg-panel);
}

.modal-size-xl .modal-title {
  color: var(--text-main);
  font-size: 16px;
  font-weight: 750;
}

.modal-size-xl .modal-body {
  padding: 0;
  overflow: hidden !important;
}

.modal-size-xl .modal-close-btn {
  border-radius: 999px;
}

.website-form-modal .modal-header,
.website-form-modal .modal-body {
  padding-left: 24px;
  padding-right: 24px;
}

.website-form-modal {
  border: 1px solid var(--color-border);
}

.modal-overlay:has(.modal-size-xl) {
  backdrop-filter: none;
}

@media (max-width: 768px) {
  .modal-size-xl {
    border-radius: 0;
    border: 0;
  }

  .website-form-modal .modal-header,
  .website-form-modal .modal-body {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
