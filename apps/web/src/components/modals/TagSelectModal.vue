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
        <button
          v-for="t in filteredTags"
          :key="t.id"
          class="chip"
          type="button"
          :aria-label="`筛选标签：${t.name}`"
          :title="t.name"
          @click="handleSelect(t.id)"
        >
          <span class="chip-dot" :style="{ backgroundColor: t.color }" />
          <span class="chip-name">{{ t.name }}</span>
          <span class="chip-count">{{ tagUsageMap[t.id] || 0 }}</span>
        </button>
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
import { useTagStore } from '@/stores/tag'
import { useWebsiteStats } from '@/composables/useWebsiteStats'

const props = defineProps<{
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

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
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
