<template>
  <RouterView />
  <GlobalModals />
  <AIAssistant />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAutoBackup } from '@/composables/useAutoBackup'
import { useDataSync } from '@/composables/useDataSync'
import GlobalModals from '@/components/GlobalModals.vue'
import AIAssistant from '@/components/ai/AIAssistant.vue'

useAutoBackup()
useDataSync().initSync()
</script>
