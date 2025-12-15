<template>
  <!-- Sync Conflict Modal -->
  <BaseModal
    v-if="uiStore.modalState.syncConflict"
    :is-open="uiStore.modalState.syncConflict"
    title="数据冲突"
    size="md"
    @close="websiteStore.ignoreCloudData"
  >
    <SyncConflictModal
      :local-count="uiStore.getModalData('syncConflict')?.localCount ?? 0"
      :remote-count="uiStore.getModalData('syncConflict')?.remoteCount ?? 0"
      :remote-date="uiStore.getModalData('syncConflict')?.remoteDate ?? new Date()"
      @use-cloud="websiteStore.confirmRestoreCloud"
      @keep-local="websiteStore.ignoreCloudData"
    />
  </BaseModal>

  <!-- Data Management Modal -->
  <BaseModal
    v-if="uiStore.modalState.dataManagement"
    :is-open="uiStore.modalState.dataManagement"
    title="数据管理"
    size="lg"
    @close="() => uiStore.closeModal('dataManagement')"
  >
    <DataManagementModal @close="() => uiStore.closeModal('dataManagement')" />
  </BaseModal>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { useWebsiteStore } from '@/stores/website'
import { BaseModal } from '@nav/ui'
import SyncConflictModal from '@/components/modals/SyncConflictModal.vue'
import DataManagementModal from '@/components/modals/DataManagementModal.vue'

const uiStore = useUIStore()
const websiteStore = useWebsiteStore()
</script>
