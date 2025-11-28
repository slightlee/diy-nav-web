<template>
  <AppLayout :key="route.path" />
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

const route = useRoute()
</script>
