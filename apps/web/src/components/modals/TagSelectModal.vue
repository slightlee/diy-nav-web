<template>
  <BaseModal :is-open="isOpen" title="选择标签" @close="handleClose">
    <div class="select-modal">
      <BaseInput
        v-model="searchKeyword"
        placeholder="搜索标签..."
        class="select-search-input"
        size="md"
        shape="rounded"
      >
        <template #prefix><i class="fas fa-search" style="color: var(--text-muted)" /></template>
      </BaseInput>
      <div class="select-grid">
        <ChoiceChip
          v-for="t in filteredTags"
          :key="t.id"
          :label="t.name"
          :count="tagUsageMap[t.id] || 0"
          :aria-label="`筛选标签：${t.name}`"
          @click="handleSelect(t.id)"
        />
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
/**
 * @component TagSelectModal
 * @description 标签选择模态框
 * 用于在全部视图中筛选特定标签
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { BaseModal, BaseInput } from '@nav/ui'
import ChoiceChip from '@/components/ChoiceChip.vue'
import { useTagStore } from '@/stores/tag'
import { useWebsiteStats } from '@/composables/useWebsiteStats'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const router = useRouter()
const tagStore = useTagStore()
const { tagUsageMap } = useWebsiteStats()

const searchKeyword = ref('')

const filteredTags = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  const base = [...tagStore.tags].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return kw ? base.filter(t => t.name.toLowerCase().includes(kw)) : base
})

const handleClose = () => {
  searchKeyword.value = ''
  emit('close')
}

const handleSelect = (tagId: string) => {
  router.push({ path: '/all', query: { tag: tagId } })
  handleClose()
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.select-modal {
  padding: 1rem;
}

.select-search-input {
  margin-bottom: 1rem;
}

.select-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}
</style>
