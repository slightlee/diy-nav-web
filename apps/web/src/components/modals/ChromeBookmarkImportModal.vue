<template>
  <div class="bookmark-import" :aria-busy="running">
    <div class="import-stage-strip" aria-label="导入步骤">
      <div
        v-for="(stage, index) in stages"
        :key="stage.label"
        class="import-stage"
        :class="{ active: stage.active, done: stage.done }"
      >
        <span class="import-stage__index">
          <i v-if="stage.done" class="fas fa-check" />
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span>{{ stage.label }}</span>
      </div>
    </div>

    <template v-if="!task">
      <button
        class="file-drop"
        :class="{ dragging }"
        type="button"
        aria-label="选择或拖入 Chrome 书签文件"
        @click="fileInput?.click()"
        @dragenter.prevent="dragging = true"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="handleDrop"
      >
        <strong>{{ parsing ? '正在读取书签…' : '拖入 bookmarks.html，或点击选择文件' }}</strong>
        <span class="file-drop__action">{{ parsing ? '请稍候' : '选择文件' }}</span>
        <span>支持 Chrome 导出的 HTML 文件，已在浏览器本地解析</span>
      </button>
      <input
        ref="fileInput"
        class="sr-only"
        type="file"
        accept=".html,.htm,text/html"
        @change="handleFileChange"
      />

      <p v-if="fileError" class="inline-alert inline-alert--error">
        <i class="fas fa-exclamation-circle" />
        {{ fileError }}
      </p>
    </template>

    <template v-else-if="task.phase === 'review'">
      <section class="file-review">
        <div class="file-review__heading">
          <div class="file-review__file-icon"><i class="fas fa-file-alt" /></div>
          <div class="file-review__copy">
            <strong>{{ task.fileName }}</strong>
            <span>文件已解析，尚未修改当前数据</span>
          </div>
          <span class="status-badge">待分析</span>
        </div>

        <div class="review-metrics">
          <div>
            <strong>{{ totalCount }}</strong>
            <span>可导入书签</span>
          </div>
          <div>
            <strong>{{ task.folderCount }}</strong>
            <span>文件夹数</span>
          </div>
          <div>
            <strong>{{ task.duplicateCount }}</strong>
            <span>重复已跳过</span>
          </div>
          <div>
            <strong>{{ task.invalidCount }}</strong>
            <span>无效已跳过</span>
          </div>
        </div>
      </section>

      <div class="ai-plan-note">
        <div class="ai-plan-note__icon"><i class="fas fa-wand-magic-sparkles" /></div>
        <div>
          <strong>先统一规划，再逐批整理</strong>
          <p>
            AI
            会先根据书签数量和内容规划一套精简的公共分类与标签体系，再按固定体系整理每个网站，避免一个文件夹或网站单独生成一个分类。
          </p>
        </div>
      </div>

      <div class="overwrite-preview">
        <i class="fas fa-info-circle" />
        <span v-if="hasExistingData">
          分析完成前不会修改数据。确认导入后，将清空当前
          <strong>{{ existingCounts.websites }}</strong>
          个网站、
          <strong>{{ existingCounts.categories }}</strong>
          个分类和
          <strong>{{ existingCounts.tags }}</strong>
          个标签，并整体替换为本次结果。
        </span>
        <span v-else>
          分析完成前不会修改数据。当前没有网站、分类或标签，确认后将直接导入分析结果。
        </span>
      </div>

      <div class="dialog-actions">
        <BaseButton variant="danger-ghost" size="sm" @click="discardConfirm = true">
          取消任务
        </BaseButton>
        <BaseButton variant="primary" shape="rounded" size="sm" @click="run">
          <i class="fas fa-sparkles" />
          开始 AI 整理
        </BaseButton>
      </div>
    </template>

    <template v-else-if="task.phase === 'completed'">
      <section class="completion-panel">
        <div class="completion-panel__icon"><i class="fas fa-check" /></div>
        <div>
          <span class="completion-panel__eyebrow">导入完成</span>
          <h3>{{ successCount }} 个书签已整理到导航</h3>
          <p>
            共生成 {{ task.taxonomy?.categories.length || 0 }} 个分类、
            {{ task.taxonomy?.tags.length || 0 }} 个标签，每个网站均已生成描述并分配标签。
          </p>
        </div>
      </section>
      <div class="dialog-actions dialog-actions--end">
        <BaseButton variant="primary" shape="rounded" size="sm" @click="finishTask">
          完成
        </BaseButton>
      </div>
    </template>

    <template v-else>
      <section class="progress-hero">
        <div class="progress-hero__topline">
          <div>
            <span class="progress-hero__eyebrow">{{ phaseEyebrow }}</span>
            <h3>{{ phaseTitle }}</h3>
          </div>
          <strong>{{ displayPercent }}%</strong>
        </div>
        <div
          class="progress-track"
          role="progressbar"
          :aria-valuenow="displayPercent"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span :style="{ width: `${displayPercent}%` }" />
        </div>
        <div class="progress-metrics">
          <div v-for="metric in progressMetrics" :key="metric.label">
            <span>{{ metric.label }}</span>
            <strong :class="metric.className">{{ metric.value }}</strong>
          </div>
        </div>
      </section>

      <p v-if="task.fatalError" class="inline-alert inline-alert--error">
        <i class="fas fa-exclamation-circle" />
        <span>{{ task.fatalError }}</span>
        <button v-if="needsAIConfig" type="button" @click="emit('configureAi')">去配置 AI</button>
      </p>

      <section v-if="task.taxonomy" class="taxonomy-summary">
        <div class="summary-heading">
          <div>
            <strong>AI 全局整理体系</strong>
            <span>
              {{ task.taxonomy.categories.length }} 个分类 · {{ task.taxonomy.tags.length }} 个标签
            </span>
          </div>
          <button type="button" @click="taxonomyExpanded = !taxonomyExpanded">
            {{ taxonomyExpanded ? '收起' : '查看全部' }}
          </button>
        </div>
        <div class="taxonomy-row">
          <span class="taxonomy-row__label">分类</span>
          <div class="chip-list">
            <span
              v-for="item in visibleCategories"
              :key="item.id"
              class="taxonomy-chip taxonomy-chip--category"
            >
              {{ item.name }}
            </span>
            <span v-if="hiddenCategoryCount" class="taxonomy-more">+{{ hiddenCategoryCount }}</span>
          </div>
        </div>
        <div class="taxonomy-row">
          <span class="taxonomy-row__label">标签</span>
          <div class="chip-list">
            <span v-for="item in visibleTags" :key="item.id" class="taxonomy-chip">
              {{ item.name }}
            </span>
            <span v-if="hiddenTagCount" class="taxonomy-more">+{{ hiddenTagCount }}</span>
          </div>
        </div>
      </section>

      <section v-if="currentBatch.length" class="current-batch">
        <div class="summary-heading">
          <div>
            <strong>当前批次</strong>
            <span>{{ currentBatchHint }}</span>
          </div>
          <i class="fas fa-circle-notch fa-spin" />
        </div>
        <div class="current-batch__list">
          <div v-for="bookmark in currentBatch.slice(0, 5)" :key="bookmark.sourceId">
            <span>{{ bookmark.name }}</span>
            <small>{{ getHostname(bookmark.url) }}</small>
          </div>
          <div v-if="currentBatch.length > 5" class="current-batch__more">
            另有 {{ currentBatch.length - 5 }} 个网站正在处理
          </div>
        </div>
      </section>

      <section v-if="failedBookmarks.length" class="failure-panel">
        <button type="button" class="summary-heading" @click="errorsExpanded = !errorsExpanded">
          <div>
            <strong>{{ failedBookmarks.length }} 个网站暂未成功</strong>
            <span>可单独重试；也可以在最终导入时跳过</span>
          </div>
          <i :class="errorsExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'" />
        </button>
        <div v-if="errorsExpanded" class="failure-list">
          <div v-for="bookmark in failedBookmarks" :key="bookmark.sourceId">
            <div>
              <strong>{{ bookmark.name }}</strong>
              <span>{{ bookmark.url }}</span>
            </div>
            <small>{{ bookmark.failure?.message }}</small>
          </div>
        </div>
      </section>

      <div v-if="task.phase === 'ready'" class="final-confirm">
        <label v-if="hasExistingData" class="confirm-check">
          <input v-model="overwriteConfirmed" type="checkbox" />
          <span>我确认清空当前网站、分类和标签，并用 {{ successCount }} 个成功结果整体覆盖</span>
        </label>
        <p v-else>当前没有网站数据，可以直接完成导入。</p>
      </div>

      <div class="dialog-actions">
        <BaseButton variant="danger-ghost" size="sm" @click="discardConfirm = true">
          放弃任务
        </BaseButton>
        <div class="dialog-actions__primary">
          <BaseButton v-if="running" variant="ghost" size="sm" @click="pause">
            <i class="fas fa-pause" />
            暂停
          </BaseButton>
          <BaseButton
            v-else-if="task.phase === 'paused'"
            variant="primary"
            shape="rounded"
            size="sm"
            @click="run"
          >
            <i class="fas fa-play" />
            继续处理
          </BaseButton>
          <BaseButton
            v-if="task.phase === 'ready' && failedCount"
            variant="ghost"
            size="sm"
            @click="retryFailures"
          >
            重试失败项
          </BaseButton>
          <BaseButton
            v-if="task.phase === 'ready'"
            variant="primary"
            shape="rounded"
            size="sm"
            :disabled="hasExistingData && !overwriteConfirmed"
            @click="confirmApply"
          >
            覆盖导入 {{ successCount }} 个网站
          </BaseButton>
        </div>
      </div>
    </template>

    <div v-if="discardConfirm" class="discard-confirm" role="alert">
      <div>
        <strong>放弃当前导入任务？</strong>
        <span>已完成的 AI 分析进度会被删除，但当前网站数据不会改变。</span>
      </div>
      <div>
        <BaseButton variant="ghost" size="xs" @click="discardConfirm = false">继续任务</BaseButton>
        <BaseButton variant="danger" size="xs" @click="confirmDiscard">确认放弃</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { BaseButton } from '@nav/ui'
import { useWebsiteStore } from '@/stores/website'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { parseChromeBookmarks } from '@/utils/chrome-bookmarks'
import { useBookmarkImport } from '@/composables/useBookmarkImport'

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'imported'): void
  (event: 'configureAi'): void
  (event: 'taskChange', active: boolean): void
}>()

const websiteStore = useWebsiteStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()
const {
  task,
  running,
  successCount,
  failedCount,
  totalCount,
  inProgressCount,
  iconProcessedCount,
  iconSuccessCount,
  iconRemainingCount,
  iconPercent,
  remainingCount,
  percent,
  currentBatch,
  failedBookmarks,
  loadTask,
  startTask,
  run,
  pause,
  retryFailures,
  applyImport,
  discardTask
} = useBookmarkImport()

const fileInput = ref<HTMLInputElement>()
const parsing = ref(false)
const dragging = ref(false)
const fileError = ref('')
const taxonomyExpanded = ref(false)
const errorsExpanded = ref(false)
const overwriteConfirmed = ref(false)
const discardConfirm = ref(false)

const existingCounts = computed(() => ({
  websites: websiteStore.websites.length,
  categories: categoryStore.categories.length,
  tags: tagStore.tags.length
}))
const hasExistingData = computed(
  () =>
    existingCounts.value.websites + existingCounts.value.categories + existingCounts.value.tags > 0
)
const needsAIConfig = computed(() =>
  ['NO_PROVIDER', 'AI_PROVIDER_CONFIG_INVALID'].includes(task.value?.fatalCode || '')
)
const visibleCategories = computed(() => {
  const items = task.value?.taxonomy?.categories || []
  return taxonomyExpanded.value ? items : items.slice(0, 10)
})
const visibleTags = computed(() => {
  const items = task.value?.taxonomy?.tags || []
  return taxonomyExpanded.value ? items : items.slice(0, 12)
})
const hiddenCategoryCount = computed(() =>
  taxonomyExpanded.value
    ? 0
    : Math.max(0, (task.value?.taxonomy?.categories.length || 0) - visibleCategories.value.length)
)
const hiddenTagCount = computed(() =>
  taxonomyExpanded.value
    ? 0
    : Math.max(0, (task.value?.taxonomy?.tags.length || 0) - visibleTags.value.length)
)

const analysisFinished = computed(
  () => successCount.value + failedCount.value === totalCount.value && totalCount.value > 0
)
const isIconPhase = computed(
  () =>
    task.value?.phase === 'icons' ||
    (task.value?.phase === 'paused' &&
      analysisFinished.value &&
      iconProcessedCount.value < successCount.value)
)
const displayPercent = computed(() => (isIconPhase.value ? iconPercent.value : percent.value))
const progressMetrics = computed(() =>
  isIconPhase.value
    ? [
        { label: '待获取', value: successCount.value },
        { label: '已处理', value: iconProcessedCount.value, className: 'is-success' },
        { label: '处理中', value: inProgressCount.value, className: 'is-active' },
        {
          label: '未获取',
          value: iconProcessedCount.value - iconSuccessCount.value,
          className: 'is-error'
        },
        { label: '剩余', value: iconRemainingCount.value }
      ]
    : [
        { label: '总计', value: totalCount.value },
        { label: '已完成', value: successCount.value, className: 'is-success' },
        { label: '处理中', value: inProgressCount.value, className: 'is-active' },
        { label: '失败', value: failedCount.value, className: 'is-error' },
        { label: '剩余', value: remainingCount.value }
      ]
)
const currentBatchHint = computed(() =>
  isIconPhase.value ? '正在批量获取网站图标' : '正在生成描述、分类和标签'
)

const phaseEyebrow = computed(() => {
  if (task.value?.phase === 'taxonomy') return '第 2 步 · 规划体系'
  if (task.value?.phase === 'classifying') return '第 3 步 · 批量整理'
  if (isIconPhase.value) return '第 4 步 · 获取网站图标'
  if (task.value?.phase === 'ready') return '第 5 步 · 等待覆盖导入'
  return '任务已暂停 · 进度已保存'
})
const phaseTitle = computed(() => {
  if (task.value?.phase === 'taxonomy') return '正在提炼公共分类和标签'
  if (task.value?.phase === 'classifying') return '正在逐批生成网站信息'
  if (isIconPhase.value) return '正在补全网站图标'
  if (task.value?.phase === 'ready') return '书签已经整理完成'
  return '可以从当前进度继续'
})
const stages = computed(() => {
  const phase = task.value?.phase
  const hasTaxonomy = Boolean(task.value?.taxonomy)
  const iconsDone = successCount.value > 0 && iconProcessedCount.value === successCount.value
  return [
    { label: '选择文件', active: !task.value, done: Boolean(task.value) },
    { label: '规划体系', active: phase === 'review' || phase === 'taxonomy', done: hasTaxonomy },
    {
      label: 'AI 批量整理',
      active: phase === 'classifying' || (phase === 'paused' && !analysisFinished.value),
      done: analysisFinished.value
    },
    {
      label: '获取网站图标',
      active: isIconPhase.value,
      done: iconsDone
    },
    {
      label: '覆盖导入',
      active: phase === 'ready' || phase === 'applying',
      done: phase === 'completed'
    }
  ]
})

const readFile = async (file: File) => {
  fileError.value = ''
  if (!/\.html?$/i.test(file.name) && file.type !== 'text/html') {
    fileError.value = '请选择 Chrome 导出的 HTML 书签文件'
    return
  }
  if (file.size > 12 * 1024 * 1024) {
    fileError.value = '文件超过 12 MB，请拆分后再导入'
    return
  }

  parsing.value = true
  try {
    const parsed = parseChromeBookmarks(await file.text())
    startTask(file.name, parsed)
    emit('taskChange', true)
  } catch (error) {
    fileError.value = error instanceof Error ? error.message : '书签文件读取失败'
  } finally {
    parsing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const handleFileChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) void readFile(file)
}

const handleDrop = (event: DragEvent) => {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) void readFile(file)
}

const getHostname = (url: string) => {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

const confirmApply = () => {
  try {
    applyImport()
    emit('imported')
  } catch (error) {
    if (task.value) {
      task.value.fatalError = error instanceof Error ? error.message : '导入失败，请重试'
    }
  }
}

const confirmDiscard = () => {
  discardTask()
  discardConfirm.value = false
  emit('taskChange', false)
}

const finishTask = () => {
  discardTask()
  emit('taskChange', false)
  emit('close')
}

onMounted(() => {
  const stored = loadTask()
  emit('taskChange', Boolean(stored))
})

onUnmounted(() => {
  if (running.value) pause()
})
</script>

<style scoped lang="scss">
.bookmark-import {
  position: relative;
  display: grid;
  gap: 18px;
  color: var(--text-main);
}

.import-stage-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--text-muted) 14%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-tile) 72%, transparent);
}

.import-stage {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
}

.import-stage__index {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--text-muted) 24%, transparent);
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
}

.import-stage.active {
  color: var(--color-primary);
  font-weight: 650;
}

.import-stage.active .import-stage__index {
  border-color: color-mix(in srgb, var(--color-primary) 65%, transparent);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.import-stage.done .import-stage__index {
  border-color: var(--color-success);
  background: var(--color-success);
  color: white;
}

.completion-panel h3,
.progress-hero h3 {
  margin: 0;
  font-size: 18px;
  line-height: 1.35;
}

.completion-panel p,
.ai-plan-note p {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.file-drop {
  width: 100%;
  min-height: 132px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed color-mix(in srgb, var(--color-primary) 42%, transparent);
  border-radius: 14px;
  background:
    linear-gradient(
      color-mix(in srgb, var(--color-primary) 3.5%, transparent),
      color-mix(in srgb, var(--color-primary) 3.5%, transparent)
    ),
    var(--bg-panel);
  color: var(--text-main);
  cursor: pointer;
  transition: 160ms ease;
}

.file-drop:hover,
.file-drop.dragging {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 7%, transparent);
  transform: translateY(-1px);
}

.file-drop strong {
  font-size: 15px;
}

.file-drop__action {
  padding: 7px 13px;
  border: 0;
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-primary) 9%, transparent);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 650;
}

.file-drop > span:last-child,
.file-review__copy span,
.summary-heading span {
  color: var(--text-muted);
  font-size: 12px;
}

.status-badge {
  flex: 0 0 auto;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 650;
}

.file-review,
.progress-hero,
.taxonomy-summary,
.current-batch,
.failure-panel,
.completion-panel {
  border: 1px solid color-mix(in srgb, var(--text-muted) 16%, transparent);
  border-radius: 14px;
  background: var(--bg-panel);
}

.file-review__heading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--text-muted) 12%, transparent);
}

.file-review__file-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--bg-tile);
  color: var(--color-primary);
}

.file-review__copy {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.file-review__copy strong {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-metrics,
.progress-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.review-metrics > div,
.progress-metrics > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 14px 16px;
  border-right: 1px solid color-mix(in srgb, var(--text-muted) 10%, transparent);
}

.review-metrics > div:last-child,
.progress-metrics > div:last-child {
  border-right: 0;
}

.review-metrics strong,
.progress-metrics strong {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.review-metrics span,
.progress-metrics span {
  color: var(--text-muted);
  font-size: 11px;
}

.ai-plan-note,
.overwrite-preview,
.inline-alert,
.final-confirm {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 13px 14px;
  border-radius: 11px;
  font-size: 13px;
  line-height: 1.5;
}

.ai-plan-note {
  background: color-mix(in srgb, var(--color-primary) 7%, var(--bg-panel));
}

.ai-plan-note__icon {
  color: var(--color-primary);
  font-size: 16px;
}

.overwrite-preview,
.final-confirm {
  background: color-mix(in srgb, var(--color-warning) 8%, transparent);
  color: color-mix(in srgb, var(--color-warning) 78%, var(--text-main));
}

.overwrite-preview strong {
  font-variant-numeric: tabular-nums;
}

.inline-alert--error {
  background: color-mix(in srgb, var(--color-error) 8%, transparent);
  color: var(--color-error);
}

.inline-alert button,
.summary-heading button {
  margin-left: auto;
  border: 0;
  background: none;
  color: var(--color-primary);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
}

.progress-hero {
  padding: 17px 18px 0;
  overflow: hidden;
}

.progress-hero__topline,
.summary-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.progress-hero__topline > strong {
  color: var(--color-primary);
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}

.progress-hero__eyebrow,
.completion-panel__eyebrow {
  display: block;
  margin-bottom: 4px;
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.progress-track {
  height: 7px;
  margin: 16px 0;
  border-radius: 999px;
  background: var(--bg-tile);
  overflow: hidden;
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primary-dark), var(--color-primary-light));
  transition: width 260ms ease;
}

.progress-metrics {
  grid-template-columns: repeat(5, 1fr);
  margin: 0 -18px;
  border-top: 1px solid color-mix(in srgb, var(--text-muted) 12%, transparent);
}

.progress-metrics .is-success {
  color: var(--color-success);
}

.progress-metrics .is-active {
  color: var(--color-primary);
}

.progress-metrics .is-error {
  color: var(--color-error);
}

.taxonomy-summary,
.current-batch,
.failure-panel {
  padding: 14px 15px;
}

.summary-heading > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.summary-heading strong {
  font-size: 13px;
}

.taxonomy-row {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 8px;
  margin-top: 12px;
}

.taxonomy-row__label {
  padding-top: 4px;
  color: var(--text-muted);
  font-size: 11px;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.taxonomy-chip,
.taxonomy-more {
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--text-muted) 16%, transparent);
  border-radius: 7px;
  background: var(--bg-tile);
  color: var(--text-secondary);
  font-size: 11px;
}

.taxonomy-chip--category {
  border-color: color-mix(in srgb, var(--color-primary) 16%, transparent);
  background: color-mix(in srgb, var(--color-primary) 7%, transparent);
  color: var(--color-primary);
}

.taxonomy-more {
  border-style: dashed;
}

.current-batch__list,
.failure-list {
  display: grid;
  gap: 7px;
  margin-top: 12px;
}

.current-batch__list > div,
.failure-list > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-tile);
}

.current-batch__list span,
.failure-list strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-batch__list small,
.failure-list span,
.failure-list small {
  color: var(--text-muted);
  font-size: 10px;
}

.current-batch__more {
  justify-content: center !important;
  color: var(--text-muted);
  font-size: 11px;
}

.failure-panel > button.summary-heading {
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-main);
  text-align: left;
  cursor: pointer;
}

.failure-list {
  max-height: 210px;
  overflow-y: auto;
}

.failure-list > div > div {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.failure-list small {
  color: var(--color-error);
}

.confirm-check {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  cursor: pointer;
}

.confirm-check input {
  margin-top: 3px;
  accent-color: var(--color-primary);
}

.final-confirm p {
  margin: 0;
}

.dialog-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 2px;
}

.dialog-actions--end {
  justify-content: flex-end;
}

.dialog-actions__primary {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.completion-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px;
  background: color-mix(in srgb, var(--color-success) 5%, var(--bg-panel));
}

.completion-panel__icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--color-success);
  color: white;
  font-size: 18px;
}

.discard-confirm {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--color-error) 22%, transparent);
  border-radius: 12px;
  background: var(--bg-panel);
  box-shadow: var(--shadow-lg);
}

.discard-confirm > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.discard-confirm strong {
  font-size: 13px;
}

.discard-confirm span {
  color: var(--text-secondary);
  font-size: 11px;
}

.discard-confirm > div:last-child {
  display: flex;
  gap: 8px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 640px) {
  .import-stage-strip {
    grid-template-columns: repeat(2, 1fr);
  }

  .review-metrics,
  .progress-metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .progress-metrics > div:nth-child(2),
  .progress-metrics > div:nth-child(4),
  .review-metrics > div:nth-child(2),
  .review-metrics > div:nth-child(4) {
    border-right: 0;
  }

  .dialog-actions,
  .discard-confirm {
    align-items: stretch;
    flex-direction: column;
  }

  .dialog-actions__primary {
    justify-content: stretch;
  }
}
</style>
