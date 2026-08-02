<template>
  <BaseButton
    variant="neutral-ghost"
    size="sm"
    icon="fas fa-star"
    class="website-card__action-btn website-card__action-btn--favorite"
    :class="[{ 'is-active': props.website.isFavorite }]"
    :title="props.website.isFavorite ? `取消常用` : `添加到常用`"
    :aria-label="
      props.website.isFavorite
        ? `取消常用 ${props.website.name}`
        : `添加到常用 ${props.website.name}`
    "
    @click.stop="emit('favoriteToggle', props.website.id)"
  />
  <BaseButton
    variant="neutral-ghost"
    size="sm"
    icon="fas fa-edit"
    class="website-card__action-btn website-card__action-btn--edit"
    :title="`编辑 ${props.website.name}`"
    :aria-label="`编辑 ${props.website.name}`"
    @click.stop="emit('edit', props.website)"
  />
  <BaseButton
    variant="danger-ghost"
    size="sm"
    icon="fas fa-trash"
    class="website-card__action-btn website-card__action-btn--delete"
    :title="`删除 ${props.website.name}`"
    :aria-label="`删除 ${props.website.name}`"
    @click.stop="emit('delete', props.website.id)"
  />
</template>

<script setup lang="ts">
import { BaseButton } from '@nav/ui'
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
  font-size: var(--font-size-xs);

  &--favorite {
    &.is-active {
      color: var(--color-warning);
    }
  }
}
</style>
