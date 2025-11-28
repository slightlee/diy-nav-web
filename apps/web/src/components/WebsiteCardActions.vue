<template>
  <button
    class="website-card__action-btn website-card__action-btn--favorite"
    :class="[{ 'is-active': props.website.isFavorite }]"
    :title="props.website.isFavorite ? `取消常用` : `添加到常用`"
    @click.stop="emit('favoriteToggle', props.website.id)"
  >
    <i class="fas fa-star" />
  </button>
  <button
    class="website-card__action-btn website-card__action-btn--edit"
    :title="`编辑 ${props.website.name}`"
    @click.stop="emit('edit', props.website)"
  >
    <i class="fas fa-edit" />
  </button>
  <button
    class="website-card__action-btn website-card__action-btn--delete"
    :title="`删除 ${props.website.name}`"
    @click.stop="emit('delete', props.website.id)"
  >
    <i class="fas fa-trash" />
  </button>
</template>

<script setup lang="ts">
import type { Website } from '@/types'

interface Props {
  website: Website
}

const props = defineProps<Props>()

const emit = defineEmits<Emits>()

interface Emits {
  (e: 'favoriteToggle', websiteId: string): void
  (e: 'edit', website: Website): void
  (e: 'delete', websiteId: string): void
}

defineOptions({ name: 'WebsiteCardActions' })
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.website-card__action-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
  font-size: 12px;

  &:hover {
    background-color: var(--bg-tile);
    color: var(--text-main);
    border-color: var(--border-tile);
  }

  &--favorite {
    &.is-active {
      color: var(--color-warning);
    }
  }

  &--delete {
    &:hover {
      color: var(--color-danger);
      background-color: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.2);
    }
  }
}
</style>
