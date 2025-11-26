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
