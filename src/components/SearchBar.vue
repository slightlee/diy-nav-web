<template>
  <div class="search-section">
    <div class="search-container">
      <input
        v-model="searchKeyword"
        type="text"
        placeholder="搜索网站..."
        class="search-input"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWebsiteStore } from '@/stores/website'

const websiteStore = useWebsiteStore()

// 计算属性
const searchKeyword = computed({
  get() {
    return websiteStore.searchFilters.keyword
  },
  set(value: string) {
    websiteStore.setSearchFilters({ keyword: value })
  }
})

const filteredWebsites = computed(() => websiteStore.filteredWebsites)
</script>

<style scoped lang="scss" src="@/styles/mixins.scss">
.search-section {
  margin-bottom: 2rem;
}

.search-container {
  max-width: 600px;
  margin: 0 auto;
}

.search-input {
  @include input-base;
  width: 100%;
  padding: $spacing-sm;
  border: 1px solid $color-border;
  border-radius: $border-radius-md;
  font-size: $font-size-base;
  background-color: $color-white;
  color: $color-neutral-800;
  transition: all $transition-normal;
  outline: none;

  &:focus {
    border-color: $color-primary;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

.search-results {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm 0;
  margin-top: auto;
  font-size: $font-size-sm;
  color: $color-neutral-600;
}

.results-count {
  font-weight: 500;
}

.clear-button {
  padding: $spacing-xs $spacing-sm;
  border: 1px solid $color-border;
  border-radius: $border-radius-sm;
  background-color: $color-neutral;
  color: $color-neutral-800;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background-color: $color-neutral-dark;
    color: $color-white;
  }
}
</style>
