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

    <!-- Sync Loading Indicator -->
    <Transition name="fade-slide">
      <div v-if="visibleSyncState !== 'hidden'" class="sync-pill" :class="visibleSyncState">
        <div v-if="visibleSyncState === 'syncing'" class="icon-wrapper spin">
          <svg viewBox="0 0 24 24" class="icon">
            <path
              d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
            />
          </svg>
        </div>
        <div v-else class="icon-wrapper check">
          <svg viewBox="0 0 24 24" class="icon">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span class="text">
          {{ visibleSyncState === 'syncing' ? '正在同步数据...' : '同步完成' }}
        </span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useWebsiteStore } from '@/stores/website'
import { useAuthStore } from '@/stores/auth'
import { BaseModal } from '@nav/ui'
import HeaderBar from '@/components/header/HeaderBar.vue'
import AddSiteModal from '@/components/modals/AddSiteModal.vue'
import ManageCategoriesModal from '@/components/modals/ManageCategoriesModal.vue'
import ManageTagsModal from '@/components/modals/ManageTagsModal.vue'
import SettingsModal from '@/components/modals/SettingsModal.vue'
import DataManagementModal from '@/components/modals/DataManagementModal.vue'
import ToastContainer from '@/components/toast/ToastContainer.vue'

const uiStore = useUIStore()
const websiteStore = useWebsiteStore()
const authStore = useAuthStore()

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

// Sync State Management with "Success" feedback
type SyncState = 'hidden' | 'syncing' | 'success'
const visibleSyncState = ref<SyncState>('hidden')

watch(
  () => websiteStore.isSyncing,
  isSyncing => {
    if (isSyncing) {
      visibleSyncState.value = 'syncing'
    } else if (visibleSyncState.value === 'syncing') {
      // Only show success if we were previously syncing
      visibleSyncState.value = 'success'
      setTimeout(() => {
        visibleSyncState.value = 'hidden'
      }, 2000)
    }
  }
)

// Sync data on app load if authenticated
onMounted(() => {
  if (authStore.isAuthenticated) {
    websiteStore.checkAndRestoreCloudData()
  }
})
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

// Premium Sync Pill Styles
.sync-pill {
  position: fixed;
  inset: 88px auto auto 50%; // Highly visible area below header
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  padding: 10px 20px;
  border-radius: 12px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 10px 15px -3px rgba(0, 0, 0, 0.05),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 100;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-main);
  border: 1px solid rgba(255, 255, 255, 0.5);

  .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;

    .icon {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }

  // State specific styles
  &.syncing {
    .icon-wrapper {
      color: var(--color-primary);
    }
    .icon {
      stroke: var(--color-primary);
    }
  }

  &.success {
    color: #059669; // Emerald-600 for text
    background: rgba(236, 253, 245, 0.95); // Emerald-50
    border-color: rgba(16, 185, 129, 0.2);

    .icon-wrapper {
      color: #059669;
    }
    .icon {
      stroke: #059669;
      animation: check-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
  }

  // Animations
  .spin .icon {
    animation: spin 1.5s linear infinite;
  }
}

// Transition effects
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px); // Slide down from top
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes check-pop {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>

<style lang="scss">
// Global overrides for theme adaptation (must be non-scoped to effectively target global theme attributes)
[data-theme='dark'] .sync-pill {
  background: rgba(15, 23, 42, 0.85) !important; // Slate-900 transparent
  border-color: rgba(255, 255, 255, 0.1) !important;
  color: #f1f5f9 !important; // Slate-100

  .icon-wrapper .icon {
    stroke: #e2e8f0; // Slate-200
  }

  &.syncing {
    .icon-wrapper .icon {
      stroke: #60a5fa; // Blue-400
    }
  }

  &.success {
    background: rgba(6, 78, 59, 0.9) !important; // Emerald-900 transparent
    border-color: rgba(5, 150, 105, 0.3) !important;
    color: #34d399 !important; // Emerald-400

    .icon-wrapper {
      color: #34d399;
    }
    .icon {
      stroke: #34d399;
    }
  }
}
</style>
