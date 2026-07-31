<template>
  <div class="manage-tags-modal">
    <div class="modal-content-wrapper">
      <!-- 标签列表 -->
      <div class="tag-list-container">
        <!-- 空状态 -->
        <div v-if="tags.length === 0" class="tag-empty-state">
          <span class="tag-empty-state__icon" aria-hidden="true">
            <i class="fas fa-tags" />
          </span>
          <strong>暂无标签</strong>
          <p>创建标签后，可以更快筛选网站。</p>
        </div>

        <!-- 标签列表 -->
        <TransitionGroup v-else name="list" tag="div" class="tag-list">
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

      <!-- 添加新标签 (Bottom) -->
      <div class="add-tag-section">
        <button v-if="!adding" class="add-tag-btn" @click="adding = true">
          <i class="fas fa-plus" />
          <span>添加标签</span>
        </button>

        <div v-else class="add-tag-form">
          <div class="form-row">
            <BaseInput
              ref="tagNameInputRef"
              v-model="newTag.name"
              placeholder="标签名称"
              class="tag-input"
              required
              :maxlength="15"
              @keyup.enter="handleAddTag"
            />
            <ColorPicker v-model="newTag.color" />
            <div class="form-actions">
              <BaseButton
                variant="primary"
                size="sm"
                class="tag-submit-btn"
                :loading="submitting"
                :disabled="!newTag.name.trim() || !newTag.color"
                @click="handleAddTag"
              >
                确定
              </BaseButton>
              <BaseButton variant="ghost" size="sm" class="tag-cancel-btn" @click="cancelAdd">
                取消
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <BaseModal :is-open="deleteConfirmOpen" title="删除标签" size="sm" @close="closeDeleteConfirm">
      <div class="delete-confirm-content">
        <p class="delete-confirm-text">
          确定要删除标签“{{ tags.find(t => t.id === deleteTargetId)?.name }}”吗？
        </p>
        <p class="delete-confirm-warning">
          <i class="fas fa-info-circle" aria-hidden="true" />
          <span>删除后无法恢复，请确认是否继续。</span>
        </p>
      </div>
      <template #footer>
        <div class="modal-footer-actions">
          <BaseButton variant="ghost" size="sm" @click="closeDeleteConfirm">取消</BaseButton>
          <BaseButton
            variant="danger-outline"
            size="sm"
            class="delete-confirm-btn"
            :loading="deleting"
            @click="confirmDeleteTag"
          >
            删除
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useTagStore } from '@/stores/tag'
import { useWebsiteStore } from '@/stores/website'
import { useUIStore } from '@/stores/ui'
import { BaseInput, BaseButton, BaseModal, ColorPicker } from '@nav/ui'
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
  color: '#3B82F6'
})

const editingId = ref<string | null>(null)

const adding = ref(false)
const submitting = ref(false)
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

// 处理添加标签
const handleAddTag = async () => {
  if (!newTag.value.name.trim() || !newTag.value.color || submitting.value) {
    return
  }

  submitting.value = true

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
    newTag.value = { name: '', color: '#3B82F6' }
    adding.value = false
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_DUPLICATE_NAME) {
      uiStore.showToast('标签名称已存在', 'warning')
    } else {
      uiStore.showToast('添加失败，请重试', 'error')
    }
  } finally {
    submitting.value = false
  }
}

const cancelAdd = () => {
  adding.value = false
  newTag.value = { name: '', color: '#3B82F6' }
}

// Watch adding state to focus input
watch(adding, val => {
  if (val) {
    nextTick(() => {
      tagNameInputRef.value?.focus()
    })
  }
})

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
  padding: 0;
}

.modal-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tag-list-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 2px;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag-empty-state {
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);

  strong {
    color: var(--text-main);
    font-size: 18px;
  }

  p {
    margin: 0;
    color: var(--text-muted);
    font-size: 13px;
  }
}

.tag-empty-state__icon {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--primary-soft);
  color: var(--color-primary);
  font-size: 20px;
}

.add-tag-section {
  margin-top: 4px;
}

.add-tag-btn {
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border: none;
  border-radius: 10px;
  background-color: transparent;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  &:hover {
    color: var(--color-primary);
    background-color: var(--primary-soft);
  }
}

.add-tag-form {
  background-color: var(--bg-tile);
  border-radius: 12px;
  padding: 12px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tag-input {
  flex: 1;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.tag-submit-btn),
:deep(.tag-cancel-btn) {
  min-height: 36px;
  border-radius: 10px;
  box-shadow: none;
}

:deep(.tag-submit-btn:focus-visible),
:deep(.tag-cancel-btn:focus-visible) {
  outline: none;
  box-shadow: none;
}

.delete-confirm-text {
  color: var(--text-main);
  font-size: 16px;
  line-height: 1.5;
  margin: 0;
}

.delete-confirm-content {
  display: grid;
  gap: 14px;
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

.modal-footer-actions {
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

/* List Transitions */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-active {
  position: absolute;
}
</style>
