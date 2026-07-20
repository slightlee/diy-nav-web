<template>
  <!-- Sync Conflict Modal -->
  <BaseModal
    v-if="uiStore.modalState.syncConflict"
    :is-open="uiStore.modalState.syncConflict"
    title="数据冲突"
    size="md"
    :show-close-button="false"
    :close-on-overlay="false"
    :close-on-escape="false"
  >
    <SyncConflictModal
      :local-count="uiStore.getModalData('syncConflict')?.localCount ?? 0"
      :remote-count="uiStore.getModalData('syncConflict')?.remoteCount ?? 0"
      :remote-date="uiStore.getModalData('syncConflict')?.remoteDate ?? new Date()"
      @use-cloud="cloudSync.confirmUseCloud"
      @keep-local="cloudSync.confirmKeepLocal"
    />
  </BaseModal>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { useCloudSync } from '@/composables/useCloudSync'
import { BaseModal } from '@nav/ui'
import SyncConflictModal from '@/components/modals/SyncConflictModal.vue'

const uiStore = useUIStore()
const cloudSync = useCloudSync()
</script>
