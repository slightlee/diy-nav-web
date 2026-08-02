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
      @close="requestCloseAddSite"
    >
      <AddSiteModal
        :website="uiStore.getModalData('addSite')?.website"
        :context-category-id="uiStore.getModalData('addSite')?.categoryId"
        @close="requestCloseAddSite"
        @dirty-change="addSiteDirty = $event"
      />
    </BaseModal>

    <BaseModal
      :is-open="discardAddSiteConfirmOpen"
      title="放弃未保存内容？"
      size="sm"
      modal-class="discard-add-site-modal"
      @close="discardAddSiteConfirmOpen = false"
    >
      <div class="discard-confirm-content">
        <p>当前填写的内容还没有保存。</p>
        <p class="discard-confirm-warning">
          <i class="fas fa-info-circle" aria-hidden="true" />
          <span>关闭后，这些内容将不会保留。</span>
        </p>
      </div>
      <template #footer>
        <div class="discard-confirm-actions">
          <BaseButton variant="primary" size="sm" @click="discardAddSiteConfirmOpen = false">
            继续编辑
          </BaseButton>
          <BaseButton variant="danger-ghost" size="sm" @click="confirmDiscardAddSite">
            放弃并关闭
          </BaseButton>
        </div>
      </template>
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
import { computed, onMounted, ref, watch } from 'vue'
import { useUIStore } from '@/stores/ui'
import { BaseButton, BaseModal } from '@nav/ui'
import HeaderBar from '@/components/header/HeaderBar.vue'
import AddSiteModal from '@/components/modals/AddSiteModal.vue'
import ManageCategoriesModal from '@/components/modals/ManageCategoriesModal.vue'
import ManageTagsModal from '@/components/modals/ManageTagsModal.vue'
import AccountPanelModal from '@/components/modals/AccountPanelModal.vue'
import ToastContainer from '@/components/toast/ToastContainer.vue'
import type { AccountPanelTab } from '@/types'

const uiStore = useUIStore()
const addSiteDirty = ref(false)
const discardAddSiteConfirmOpen = ref(false)

const addSiteTitle = computed(() => {
  return uiStore.getModalData('addSite')?.website ? '编辑网站' : '添加网站'
})

const handleAddSite = () => {
  uiStore.openModal('addSite', {})
}

const closeAddSite = () => {
  addSiteDirty.value = false
  discardAddSiteConfirmOpen.value = false
  uiStore.closeModal('addSite')
}

const requestCloseAddSite = () => {
  if (addSiteDirty.value) {
    discardAddSiteConfirmOpen.value = true
    return
  }
  closeAddSite()
}

const confirmDiscardAddSite = () => {
  closeAddSite()
}

const openAccountPanel = (tab: AccountPanelTab = 'account') => {
  uiStore.openModal('accountPanel', { tab })
}

const closeAccountPanel = () => {
  uiStore.closeModal('accountPanel')
}

onMounted(() => {
  if (sessionStorage.getItem('open_account_panel') !== 'true') return
  sessionStorage.removeItem('open_account_panel')
  openAccountPanel('account')
})

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

.discard-confirm-content {
  display: grid;
  gap: 14px;
}

.discard-confirm-content p {
  margin: 0;
  color: var(--text-main);
  font-size: 16px;
  line-height: 1.5;
}

.discard-confirm-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-tile);
  color: var(--text-secondary) !important;
  font-size: 13px !important;
}

.discard-confirm-warning i {
  flex: 0 0 auto;
}

.discard-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
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

/* 未保存确认层必须覆盖在添加/编辑网站弹窗之上。 */
.modal-overlay:has(.discard-add-site-modal) {
  z-index: calc(var(--z-index-modal, 1000) + 1);
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
