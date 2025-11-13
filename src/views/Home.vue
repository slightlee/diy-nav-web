<template>
  <AppLayout />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import AppLayout from '@/components/AppLayout.vue'

const websiteStore = useWebsiteStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()

// 初始化数据
onMounted(() => {
  websiteStore.initializeData()
  categoryStore.initializeData()
  tagStore.initializeData()
})
</script>

<style scoped lang="scss">
// 页面样式由AppLayout处理
</style>
