<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAutoBackup } from '@/composables/useAutoBackup'

useAutoBackup()
</script>
