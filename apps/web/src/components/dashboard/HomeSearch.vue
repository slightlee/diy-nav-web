<template>
  <div class="home-search">
    <div class="search-wrapper" :class="{ focused: isFocused }">
      <div class="engine-selector" @click="toggleEngineMenu">
        <div class="current-engine">
          <img
            :src="currentEngine.iconUrl"
            :alt="`${currentEngine.name} 图标`"
            class="engine-icon"
          />
          <span class="engine-name">{{ currentEngine.name }}</span>
          <i class="fas fa-chevron-down arrow-icon" />
        </div>

        <div v-if="showEngineMenu" class="engine-menu">
          <div
            v-for="engine in engines"
            :key="engine.key"
            class="engine-option"
            @click.stop="selectEngine(engine)"
          >
            <img :src="engine.iconUrl" :alt="`${engine.name} 图标`" class="engine-icon sm" />
            <span>{{ engine.name }}</span>
          </div>
        </div>
      </div>

      <input
        ref="inputRef"
        v-model="keyword"
        type="text"
        class="search-input"
        placeholder="搜索全网或直接输入网址（如 github.com）"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keydown.enter="handleSearch"
      />

      <button class="search-btn" @click="handleSearch">
        <i class="fas fa-search" />
      </button>
    </div>
    <div v-if="showEngineMenu" class="backdrop" @click="showEngineMenu = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface SearchEngine {
  key: string
  name: string
  iconUrl: string
  url: string
}

const engines: SearchEngine[] = [
  {
    key: 'baidu',
    name: '百度',
    iconUrl: '/icons/search-engines/baidu.svg',
    url: 'https://www.baidu.com/s?wd='
  },
  {
    key: 'google',
    name: 'Google',
    iconUrl: '/icons/search-engines/google.svg',
    url: 'https://www.google.com/search?q='
  },
  {
    key: 'bing',
    name: 'Bing',
    iconUrl: '/icons/search-engines/bing.svg',
    url: 'https://www.bing.com/search?q='
  },
  {
    key: 'github',
    name: 'GitHub',
    iconUrl: '/icons/search-engines/github.svg',
    url: 'https://github.com/search?q='
  }
]

const currentEngineKey = ref('baidu')
const keyword = ref('')
const isFocused = ref(false)
const showEngineMenu = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const currentEngine = computed(
  () => engines.find(e => e.key === currentEngineKey.value) || engines[0]
)

const toggleEngineMenu = () => {
  showEngineMenu.value = !showEngineMenu.value
}

const selectEngine = (engine: SearchEngine) => {
  currentEngineKey.value = engine.key
  showEngineMenu.value = false
  inputRef.value?.focus()
}

const handleSearch = () => {
  if (!keyword.value.trim()) return

  let url = ''
  // Check if it looks like a URL
  if (/^https?:\/\//.test(keyword.value)) {
    url = keyword.value
  } else if (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/.test(keyword.value)) {
    url = `https://${keyword.value}`
  } else {
    url = `${currentEngine.value.url}${encodeURIComponent(keyword.value)}`
  }

  window.open(url, '_blank')
}
</script>

<style scoped lang="scss">
.home-search {
  width: 100%;
  max-width: 800px;
  margin: 0 auto 32px;
  position: relative;
  z-index: 10;
}

.search-wrapper {
  display: flex;
  align-items: center;
  height: 56px;
  background: var(--bg-panel);
  border: 1px solid var(--border-tile);
  border-radius: 999px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  padding: 4px;

  &:hover {
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
  }

  &.focused {
    border-color: var(--color-primary);
    box-shadow: 0 8px 30px rgba(var(--color-primary-rgb), 0.16);
  }
}

.engine-selector {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 16px 0 8px;
  cursor: pointer;
  border-right: 1px solid var(--border-tile);
  user-select: none;
  width: 130px;
}

.current-engine {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 500;
}

.engine-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  object-fit: contain;

  &.sm {
    width: 24px;
    height: 24px;
  }
}

.arrow-icon {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: 4px;
  transition: transform 0.2s;
}

.engine-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: var(--bg-panel);
  border: 1px solid var(--border-tile);
  border-radius: 12px;
  padding: 6px;
  min-width: 140px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 100;
}

.engine-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-main);
  font-size: 14px;
  transition: background 0.2s;

  &:hover {
    background: var(--bg-tile-hover);
  }
}

.search-input {
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  padding: 0 16px;
  font-size: 16px;
  color: var(--text-main);
  outline: none;

  &::placeholder {
    color: var(--text-muted);
  }
}

.search-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 0.2s,
    color 0.2s;
  margin-right: 6px;

  &:hover {
    background: var(--primary-soft);
    color: var(--color-primary-dark);
  }

  &:active {
    background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  }
}

.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9;
  background: transparent;
}

/* Dark mode adjustments */
:global([data-theme='dark']) {
  .search-wrapper {
    background: var(--bg-tile);

    &.focused {
      box-shadow: 0 8px 30px rgba(var(--color-primary-rgb), 0.24);
    }
  }

  .engine-menu {
    background: var(--bg-tile);
  }
}
</style>
