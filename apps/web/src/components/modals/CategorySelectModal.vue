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
        <button
          v-for="c in filteredCategories"
          :key="c.id"
          class="chip"
          type="button"
          :aria-label="`筛选分类：${c.name}`"
          :title="c.name"
          @click="handleSelect(c.id)"
        >
          <span class="chip-name">{{ c.name }}</span>
          <span class="chip-count">{{ categoryCountMap[c.id] || 0 }}</span>
        </button>
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
import { useCategoryStore } from '@/stores/category'
import { useWebsiteStats } from '@/composables/useWebsiteStats'

const props = defineProps<{
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

.chip {
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  background: var(--bg-tile);
  border: 1px solid var(--border-tile);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;

  &:hover {
    background: var(--bg-hover);
    border-color: var(--color-primary-light);
    color: var(--color-primary);
  }
}

.chip-name {
  font-weight: 500;
}

.chip-count {
  background: var(--bg-body);
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--text-muted);
}
</style>
