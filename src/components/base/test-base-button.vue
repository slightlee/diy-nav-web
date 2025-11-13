<template>
  <button>{{ text }}</button>
</template>

<script setup lang="ts">
defineProps<{
  text?: string
}>()
</script>
