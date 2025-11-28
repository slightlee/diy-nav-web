<template>
  <AppLayout>
    <SearchSection
      :fixed-view="fixedViewMeta"
      @edit="handleEditWebsite"
      @delete="handleDeleteWebsite"
      @add-site="handleAddSite"
      @manage-tags="openManageTags"
      @manage-categories="openManageCategories"
    />

    <BaseModal
      v-if="websiteDeleteConfirmOpen"
      :is-open="websiteDeleteConfirmOpen"
      title="删除网站"
      @close="closeWebsiteDeleteConfirm"
    >
      <div class="app-layout__confirm-content"><p>确定要删除该网站吗？此操作不可恢复。</p></div>
      <template #footer>
        <div class="app-layout__confirm-actions">
          <BaseButton variant="secondary" @click="closeWebsiteDeleteConfirm">取消</BaseButton>
          <BaseButton variant="danger" :loading="deletingWebsite" @click="confirmDeleteWebsite">
            <i class="fas fa-trash" />
            删除
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import SearchSection from '@/components/SearchSection.vue'
import { useUIStore } from '@/stores/ui'
import { useWebsiteStore } from '@/stores/website'
import type { Website } from '@/types'
import { BaseModal, BaseButton } from '@nav/ui'

const route = useRoute()
const uiStore = useUIStore()
const websiteStore = useWebsiteStore()

const fixedViewMeta = computed(
  () => route.meta.fixedView as 'recent' | 'favorite' | 'all' | undefined
)

const handleEditWebsite = (website: Website) => uiStore.openModal('addSite', { website })

const handleAddSite = (contextCategoryId?: string) => {
  uiStore.openModal('addSite', { categoryId: contextCategoryId })
}

const openManageTags = () => uiStore.openModal('manageTags')
const openManageCategories = () => uiStore.openModal('manageCategories')

// Delete Logic
const websiteDeleteConfirmOpen = ref(false)
const websiteDeleteTargetId = ref<string>('')
const deletingWebsite = ref(false)

const handleDeleteWebsite = (id: string) => {
  websiteDeleteTargetId.value = id
  websiteDeleteConfirmOpen.value = true
}

const closeWebsiteDeleteConfirm = () => {
  websiteDeleteConfirmOpen.value = false
  websiteDeleteTargetId.value = ''
}

const confirmDeleteWebsite = async () => {
  if (!websiteDeleteTargetId.value || deletingWebsite.value) return
  deletingWebsite.value = true
  try {
    await websiteStore.deleteWebsite(websiteDeleteTargetId.value)
    uiStore.showToast('网站删除成功', 'success')
    closeWebsiteDeleteConfirm()
  } catch {
    uiStore.showToast('删除失败，请重试', 'error')
  } finally {
    deletingWebsite.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.app-layout__confirm-content {
  padding: var(--spacing-md) 0;
  color: var(--color-neutral-600);
}

.app-layout__confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
}
</style>
