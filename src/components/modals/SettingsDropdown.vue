<template>
  <div class="settings-dropdown">
    <div class="settings-content">
      <!-- 显示设置 -->
      <div v-if="!showBackupForm" class="setting-list">
        <button
          class="setting-item"
          @click="toggleTheme"
        >
          <i class="fas fa-moon" />
          <span>暗色主题</span>
        </button>

        <button
          class="setting-item"
          @click="showBackup"
        >
          <i class="fas fa-download" />
          <span>备份数据</span>
        </button>

        <button
          class="setting-item"
          @click="showImport"
        >
          <i class="fas fa-upload" />
          <span>导入数据</span>
        </button>

        <button
          class="setting-item"
          @click="showSettings"
        >
          <i class="fas fa-cog" />
          <span>系统设置</span>
        </button>
      </div>

      <!-- 备份表单 -->
      <div v-if="showBackupForm" class="backup-form">
        <h3>备份数据</h3>
        <p class="backup-description">
          下载您的网站数据，包含所有网站、分类和标签信息
        </p>
        <div class="backup-actions">
          <button
            :disabled="isExporting"
            class="action-btn"
            @click="exportJSON"
          >
            <i v-if="isExporting" class="fas fa-spinner fa-spin" />
            <span>{{ isExporting ? '导出中...' : '导出JSON' }}</span>
          </button>

          <button
            :disabled="isExporting"
            class="action-btn"
            @click="exportHTML"
          >
            <i v-if="isExporting" class="fas fa-spinner fa-spin" />
            <span>{{ isExporting ? '导出中...' : '导出HTML' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { useUIStore } from '@/stores/ui'
import { downloadFile } from '@/utils/helpers'

const emit = defineEmits<{
  close: []
}>()

// Store
const websiteStore = useWebsiteStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()
const uiStore = useUIStore()

// 状态
const showBackupForm = ref(false)
const isExporting = ref(false)

// 事件处理
const closeDropdown = () => {
  emit('close')
}

const toggleTheme = () => {
  // 切换主题
  const isDark = document.documentElement.classList.contains('dark-theme')
  document.documentElement.classList.toggle('dark-theme', !isDark)
}

const showBackup = () => {
  showBackupForm.value = true
}

const showImport = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async event => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        await websiteStore.importData(data)
        uiStore.showToast('数据导入成功', 'success')
      } catch (error) {
        console.error('导入失败:', error)
        uiStore.showToast('导入失败，请检查文件格式', 'error')
      }
    }
  }
  input.click()
}

const showSettings = () => {
  // 显示设置弹窗
}

const exportJSON = async () => {
  isExporting.value = true

  try {
    const data = websiteStore.exportData()
    const jsonString = JSON.stringify(data, null, 2)
    downloadFile(jsonString, 'diy-nav-backup.json')
    uiStore.showToast('数据备份成功', 'success')
  } catch (error) {
    console.error('导出失败:', error)
    uiStore.showToast('导出失败', 'error')
  } finally {
    isExporting.value = false
    showBackupForm.value = false
  }
}

const exportHTML = async () => {
  isExporting.value = true

  try {
    const data = websiteStore.exportData()

    // 创建HTML文件
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DIY导航 - 数据备份</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    .header { color: #333; margin-bottom: 1rem; }
    .timestamp { color: #666; font-size: 0.875rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DIY导航 - 数据备份</h1>
    <div class="timestamp">备份时间: ${new Date().toLocaleString('zh-CN')}</div>
  </div>
  <pre>${JSON.stringify(data, null, 2)}</pre>
</body>
</html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'diy-nav-backup.html'
    link.click()

    uiStore.showToast('数据备份成功', 'success')
  } catch (error) {
    console.error('导出失败:', error)
    uiStore.showToast('导出失败', 'error')
  } finally {
    isExporting.value = false
    showBackupForm.value = false
  }
}
</script>

<style scoped lang="scss">
.settings-dropdown {
  position: relative;
}

.settings-content {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--neutral-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-card);
  padding: var(--spacing-md);
  min-width: 200px;
  z-index: var(--z-index-dropdown);
}

.setting-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.setting-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm);
  border-radius: var(--border-radius);
  background: transparent;
  color: var(--primary-color);
  cursor: pointer;
  transition: all var(--transition-duration);
  border: 1px solid var(--border-color);
  white-space: nowrap;
  gap: var(--spacing-xs);

  &:hover {
    background: var(--primary-color);
    color: var(--text-inverse);
  }
}

.backup-form {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
  margin-top: var(--spacing-md);
}

.backup-description {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
  font-size: var(--font-size-sm);
  text-align: center;
}

.backup-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
}

.action-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  background: var(--primary-color);
  color: var(--text-inverse);
  border: none;
  cursor: pointer;
  transition: all var(--transition-duration);
  font-size: var(--font-size-sm);

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    opacity: 0.8;
  }
}
</style>
