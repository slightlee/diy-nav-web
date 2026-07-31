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
      size="sm"
      @close="closeWebsiteDeleteConfirm"
    >
      <div class="delete-confirm-content">
        <p class="delete-confirm-text">确定要删除该网站吗？</p>
        <p class="delete-confirm-warning">
          <i class="fas fa-info-circle" aria-hidden="true" />
          <span>删除后无法恢复，请确认是否继续。</span>
        </p>
      </div>
      <template #footer>
        <div class="delete-confirm-actions">
          <BaseButton variant="ghost" size="sm" @click="closeWebsiteDeleteConfirm">取消</BaseButton>
          <BaseButton
            variant="danger-outline"
            size="sm"
            class="delete-confirm-btn"
            :loading="deletingWebsite"
            @click="confirmDeleteWebsite"
          >
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

.delete-confirm-content {
  display: grid;
  gap: 14px;
}

.delete-confirm-text {
  margin: 0;
  color: var(--text-main);
  font-size: 16px;
  line-height: 1.5;
}

.delete-confirm-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-error) 7%, var(--bg-panel));
  color: color-mix(in srgb, var(--color-error) 72%, var(--text-main));
  font-size: 13px;
  line-height: 1.5;
}

.delete-confirm-warning i {
  flex: 0 0 auto;
}

.delete-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

:deep(.delete-confirm-btn) {
  background-color: transparent !important;
  border-color: color-mix(in srgb, var(--color-error) 28%, var(--border-tile));
  color: color-mix(in srgb, var(--color-error) 82%, var(--text-main));
  box-shadow: none;
}

:deep(.delete-confirm-btn:hover:not(.base-button--disabled):not(.base-button--loading)) {
  background-color: color-mix(in srgb, var(--color-error) 7%, transparent) !important;
  border-color: color-mix(in srgb, var(--color-error) 42%, var(--border-tile));
  color: var(--color-error);
  box-shadow: none;
  transform: none;
}
</style>
