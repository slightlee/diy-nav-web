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
      :local-stats="
        uiStore.getModalData('syncConflict')?.localStats ?? {
          websites: 0,
          categories: 0,
          tags: 0
        }
      "
      :remote-stats="
        uiStore.getModalData('syncConflict')?.remoteStats ?? {
          websites: 0,
          categories: 0,
          tags: 0
        }
      "
      :remote-date="uiStore.getModalData('syncConflict')?.remoteDate ?? new Date()"
      :loading="cloudSync.isSyncing.value"
      :action="cloudSync.resolvingAction.value"
      @use-cloud="cloudSync.confirmUseCloud"
      @keep-local="cloudSync.confirmKeepLocal"
      @merge="cloudSync.confirmMerge"
    />
  </BaseModal>

  <BaseModal
    v-if="uiStore.modalState.syncRecovery"
    :is-open="uiStore.modalState.syncRecovery"
    title="同步数据需要修复"
    size="sm"
    :show-close-button="false"
    :close-on-overlay="false"
    :close-on-escape="false"
  >
    <SyncRecoveryModal
      :local-stats="
        uiStore.getModalData('syncRecovery')?.localStats ?? {
          websites: 0,
          categories: 0,
          tags: 0
        }
      "
      :failed-at="uiStore.getModalData('syncRecovery')?.failedAt ?? new Date()"
      :loading="cloudSync.isSyncing.value"
      @repair="cloudSync.confirmRepairCloud"
      @disable="cloudSync.confirmDisableBrokenSync"
    />
  </BaseModal>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { useCloudSync } from '@/composables/useCloudSync'
import { BaseModal } from '@nav/ui'
import SyncConflictModal from '@/components/modals/SyncConflictModal.vue'
import SyncRecoveryModal from '@/components/modals/SyncRecoveryModal.vue'

const uiStore = useUIStore()
const cloudSync = useCloudSync()
</script>
