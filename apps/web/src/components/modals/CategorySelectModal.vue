<template>
  <BaseModal :is-open="isOpen" title="选择分类" @close="handleClose">
    <div class="select-modal">
      <BaseInput
        v-model="searchKeyword"
        placeholder="搜索分类..."
        class="select-search-input"
        size="md"
        shape="rounded"
      >
        <template #prefix><i class="fas fa-search" style="color: var(--text-muted)" /></template>
      </BaseInput>
      <div class="select-grid">
        <ChoiceChip
          v-for="c in filteredCategories"
          :key="c.id"
          :label="c.name"
          :count="categoryCountMap[c.id] || 0"
          :aria-label="`筛选分类：${c.name}`"
          @click="handleSelect(c.id)"
        />
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
/**
 * @component CategorySelectModal
 * @description 分类选择模态框
 * 用于在全部视图中筛选特定分类
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { BaseModal, BaseInput } from '@nav/ui'
import ChoiceChip from '@/components/ChoiceChip.vue'
import { useCategoryStore } from '@/stores/category'
import { useWebsiteStats } from '@/composables/useWebsiteStats'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const router = useRouter()
const categoryStore = useCategoryStore()
const { categoryCountMap } = useWebsiteStats()

const searchKeyword = ref('')

const filteredCategories = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  const base = [...categoryStore.categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return kw ? base.filter(c => c.name.toLowerCase().includes(kw)) : base
})

const handleClose = () => {
  searchKeyword.value = ''
  emit('close')
}

const handleSelect = (categoryId: string) => {
  router.push({ path: '/all', query: { category: categoryId } })
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
