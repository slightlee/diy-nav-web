<template>
  <RouterView />
  <GlobalModals />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAutoBackup } from '@/composables/useAutoBackup'
import { useDataSync } from '@/composables/useDataSync'
import GlobalModals from '@/components/GlobalModals.vue'

useAutoBackup()
useDataSync().initSync()
</script>
