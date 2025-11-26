<template>
  <div class="manage-tags-modal">
    <!-- 添加新标签表单 -->
    <div class="manage-tags-modal__add-section">
      <h3 class="manage-tags-modal__section-title">
        <i class="fas fa-tag" />
        添加新标签
      </h3>
      <form class="manage-tags-modal__add-form" @submit.prevent="handleAddTag">
        <div class="manage-tags-modal__form-row">
          <BaseInput
            ref="tagNameInputRef"
            v-model="newTag.name"
            placeholder="标签名称"
            required
            :maxlength="15"
          />
          <ColorPicker v-model="newTag.color" />
        </div>
        <BaseButton
          html-type="submit"
          variant="primary"
          :loading="adding"
          :disabled="!newTag.name.trim() || !newTag.color"
        >
          <i class="fas fa-plus" />
          添加
        </BaseButton>
      </form>
    </div>

    <!-- 标签列表 -->
    <div class="manage-tags-modal__list-section">
      <h3 class="manage-tags-modal__section-title">
        <i class="fas fa-list" />
        现有标签
        <span class="manage-tags-modal__count">({{ tags.length }})</span>
      </h3>

      <!-- 空状态 -->
      <EmptyState v-if="tags.length === 0" type="no-tags" :show-action-button="false" />

      <!-- 标签列表 -->
      <div v-else class="manage-tags-modal__tag-list">
        <TransitionGroup name="tag-item" tag="div">
          <TagListItem
            v-for="tag in sortedTags"
            :key="tag.id"
            :tag="tag"
            :editing="editingId === tag.id"
            :usage-count="getWebsiteCount(tag.id)"
            :updating="updating"
            @edit="startEdit(tag)"
            @delete="handleDeleteTag(tag)"
            @save="handleSave"
            @cancel="cancelEdit"
            @dragstart="onDragStart"
            @drop="onDrop"
          />
        </TransitionGroup>
      </div>
    </div>
    <BaseModal
      v-if="deleteConfirmOpen"
      :is-open="deleteConfirmOpen"
      title="删除标签"
      @close="closeDeleteConfirm"
    >
      <div class="manage-tags-modal__confirm-content">
        <p>确定要删除该标签吗？此操作不可恢复。</p>
      </div>
      <template #footer>
        <div class="manage-tags-modal__confirm-actions">
          <BaseButton variant="secondary" @click="closeDeleteConfirm">取消</BaseButton>
          <BaseButton variant="danger" :loading="deleting" @click="confirmDeleteTag">
            <i class="fas fa-trash" />
            删除
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useTagStore } from '@/stores/tag'
import { useWebsiteStore } from '@/stores/website'
import { useUIStore } from '@/stores/ui'
import { BaseInput, BaseButton, BaseModal, EmptyState, ColorPicker } from '@nav/ui'
import type { Tag } from '@/types'
import { ERROR_DUPLICATE_NAME } from '@/types'
import { computeReorderedIds } from '@/utils/helpers'
import TagListItem from './parts/TagListItem.vue'

// Store
const tagStore = useTagStore()
const websiteStore = useWebsiteStore()
const uiStore = useUIStore()

const tagNameInputRef = ref()

const newTag = ref({
  name: '',
  color: ''
})

const editingId = ref<string | null>(null)

const adding = ref(false)
const updating = ref(false)

// 计算属性
const tags = computed(() => tagStore.tags)

const sortedTags = computed(() => {
  return [...tags.value].sort((a, b) => a.order - b.order)
})

const draggingId = ref<string | null>(null)
const onDragStart = (id: string) => {
  draggingId.value = id
}
const onDrop = (targetId: string) => {
  if (!draggingId.value) return
  const orderIds = sortedTags.value.map(t => t.id)
  const nextIds = computeReorderedIds(orderIds, draggingId.value, targetId)
  tagStore.reorderTags(nextIds)
  draggingId.value = null
}

// 获取标签下的网站数量
const getWebsiteCount = (tagId: string): number => {
  return websiteStore.websites.filter(w => w.tagIds.includes(tagId)).length
}

// 统一使用工具函数格式化日期

// 处理添加标签
const handleAddTag = () => {
  if (!newTag.value.name.trim() || !newTag.value.color || adding.value) {
    return
  }

  adding.value = true

  try {
    const exists = tags.value.some(
      t => t.name.toLowerCase() === newTag.value.name.trim().toLowerCase()
    )
    if (exists) {
      uiStore.showToast('标签名称已存在', 'warning')
      return
    }
    tagStore.addTag({
      name: newTag.value.name.trim(),
      color: newTag.value.color
    })

    uiStore.showToast('标签添加成功', 'success')

    // 重置表单
    newTag.value = { name: '', color: '' }

    // 聚焦到输入框
    nextTick()
    tagNameInputRef.value?.focus()
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_DUPLICATE_NAME) {
      uiStore.showToast('标签名称已存在', 'warning')
    } else {
      uiStore.showToast('添加失败，请重试', 'error')
    }
  } finally {
    adding.value = false
  }
}

// 开始编辑
const startEdit = (tag: Tag) => {
  editingId.value = tag.id
}

// 处理更新标签
const handleSave = (payload: { name: string; color: string }) => {
  if (!editingId.value || updating.value) return
  const name = payload.name.trim()
  const color = payload.color
  if (!name || !color) return
  const exists = tags.value.some(
    t => t.id !== editingId.value && t.name.toLowerCase() === name.toLowerCase()
  )
  if (exists) {
    uiStore.showToast('标签名称已存在', 'warning')
    return
  }

  updating.value = true
  try {
    tagStore.updateTag(editingId.value, { name, color })
    uiStore.showToast('标签更新成功', 'success')
    cancelEdit()
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_DUPLICATE_NAME) {
      uiStore.showToast('标签名称已存在', 'warning')
    } else {
      uiStore.showToast('更新失败，请重试', 'error')
    }
  } finally {
    updating.value = false
  }
}

// 取消编辑
const cancelEdit = () => {
  editingId.value = null
}

// 处理删除标签
const handleDeleteTag = (tag: Tag) => {
  const websiteCount = getWebsiteCount(tag.id)

  if (websiteCount > 0) {
    uiStore.showToast(`该标签下还有 ${websiteCount} 个网站，请先移除或删除这些网站`, 'warning')
    return
  }

  deleteTargetId.value = tag.id
  deleteConfirmOpen.value = true
}

// 已移除快捷键

// 生命周期
onMounted(() => {
  tagNameInputRef.value?.focus()
})

const deleteConfirmOpen = ref(false)
const deleteTargetId = ref<string>('')
const deleting = ref(false)

const closeDeleteConfirm = () => {
  deleteConfirmOpen.value = false
  deleteTargetId.value = ''
}

const confirmDeleteTag = () => {
  if (!deleteTargetId.value || deleting.value) return
  deleting.value = true
  try {
    tagStore.deleteTag(deleteTargetId.value)
    uiStore.showToast('标签删除成功', 'success')
    closeDeleteConfirm()
  } catch {
    uiStore.showToast('删除失败，请重试', 'error')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/mixins' as *;

.manage-tags-modal {
  width: 100%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

// 区域标题
.manage-tags-modal__section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-md) 0;
}

.manage-tags-modal__count {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-500);
  font-weight: var(--font-weight-normal);
}

// 添加区域
.manage-tags-modal__add-section {
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.manage-tags-modal__add-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.manage-tags-modal__form-row {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  align-items: stretch;

  > .base-input {
    width: 100%;
    min-width: 0;
  }
}

// 标签列表区域
.manage-tags-modal__list-section {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-bottom: var(--spacing-lg);
}

.manage-tags-modal__tag-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

// 响应式适配
@include mobile {
  .manage-tags-modal {
    max-width: 100%;
  }

  .manage-tags-modal__form-row {
    flex-direction: column;
    align-items: stretch;
  }
}

// 高对比度与动画偏好相关样式由子组件处理
.manage-tags-modal__confirm-content {
  padding: var(--spacing-md) 0;
}

.manage-tags-modal__confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
}
</style>
