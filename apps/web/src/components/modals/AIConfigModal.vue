<template>
  <div class="ai-config">
    <div class="ai-config__section">
      <div class="section-header">
        <div class="section-icon blue">
          <i class="fas fa-robot" />
        </div>
        <div class="section-info">
          <h3 class="section-title">AI 服务配置</h3>
          <p class="section-description">配置兼容 OpenAI 或 Claude 协议的模型服务</p>
        </div>
      </div>

      <div v-if="!authStore.isAuthenticated" class="login-prompt">
        <div class="login-prompt__content">
          <i class="fas fa-lock login-prompt__icon" />
          <h4 class="login-prompt__title">需要登录</h4>
          <p class="login-prompt__desc">登录后可配置 AI 服务并在多设备同步使用。</p>
          <BaseButton
            variant="primary"
            shape="rounded"
            size="md"
            class="ai-action-btn"
            @click="handleGoLogin"
          >
            去登录
          </BaseButton>
        </div>
      </div>

      <div v-else class="ai-config__content">
        <div class="provider-list">
          <div class="provider-list__header">
            <h4 class="provider-list__title">已配置服务</h4>
            <div class="provider-list__actions">
              <BaseButton
                variant="neutral-ghost"
                shape="rounded"
                size="sm"
                :loading="aiStore.isLoading"
                @click="reloadProviders"
              >
                刷新
              </BaseButton>
              <BaseButton variant="primary" shape="rounded" size="sm" @click="handleCreate">
                添加服务
              </BaseButton>
            </div>
          </div>

          <div v-if="aiStore.isLoading" class="provider-state">
            <i class="fas fa-spinner fa-spin" />
            <span>加载中...</span>
          </div>
          <div v-else-if="aiStore.providers.length === 0" class="provider-state text-muted">
            暂无 AI 服务，请在下方添加
          </div>
          <div v-else class="provider-cards">
            <div
              v-for="provider in aiStore.providers"
              :key="provider.id"
              class="provider-card"
              :class="{ 'is-editing': editingId === provider.id }"
            >
              <div class="provider-main">
                <div class="provider-title">
                  <span>{{ provider.name }}</span>
                  <span v-if="isProviderDefault(provider)" class="badge badge-primary">默认</span>
                </div>
                <div class="provider-meta">
                  <span class="meta-item">协议：{{ getProtocolLabel(provider.type) }}</span>
                  <span v-if="provider.model" class="meta-item">模型：{{ provider.model }}</span>
                  <span v-if="provider.baseUrl" class="meta-item">URL：{{ provider.baseUrl }}</span>
                </div>
              </div>
              <div class="provider-actions">
                <BaseButton
                  v-if="!isProviderDefault(provider)"
                  variant="neutral-ghost"
                  size="xs"
                  :loading="settingDefaultId === provider.id"
                  @click="handleSetDefault(provider.id)"
                >
                  设为默认
                </BaseButton>
                <BaseButton
                  variant="ghost"
                  size="xs"
                  :loading="editingId === provider.id && loadingDetail"
                  @click="handleEdit(provider.id)"
                >
                  {{ editingId === provider.id ? '编辑中' : '编辑' }}
                </BaseButton>
                <BaseButton
                  variant="danger-ghost"
                  size="xs"
                  :loading="removingIds[provider.id] === true"
                  @click="handleRemove(provider.id)"
                >
                  删除
                </BaseButton>
              </div>
            </div>
          </div>
        </div>

        <template v-if="isFormOpen">
          <div class="divider" />

          <form ref="formSection" class="provider-form" @submit.prevent="handleAdd">
            <div class="provider-form__header">
              <div>
                <h4 class="provider-form__title">{{ formTitle }}</h4>
                <p class="provider-form__description">
                  {{
                    editingId
                      ? '留空 API Key 将继续使用已保存的密钥'
                      : '填写完成后可先测试连接，再保存配置'
                  }}
                </p>
              </div>
              <span v-if="editingId" class="editing-badge">编辑中</span>
            </div>

            <div class="form-grid">
              <label class="form-field">
                <span class="field-label">配置名称</span>
                <input v-model="form.name" type="text" placeholder="例如：DeepSeek" />
                <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
              </label>

              <label class="form-field">
                <span class="field-label">接口协议</span>
                <select v-model="form.type">
                  <option
                    v-for="option in protocolOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <span class="field-hint">{{ selectedProtocol.hint }}</span>
              </label>

              <label class="form-field">
                <span class="field-label">API Key</span>
                <input
                  v-model="form.apiKey"
                  type="password"
                  autocomplete="new-password"
                  :placeholder="apiKeyPlaceholder"
                />
                <span v-if="hasSavedApiKey" class="field-hint">已安全保存，留空表示不修改</span>
                <span v-if="errors.apiKey" class="field-error">{{ errors.apiKey }}</span>
              </label>

              <label class="form-field">
                <span class="field-label">Base URL（可选）</span>
                <input
                  v-model="form.baseUrl"
                  type="url"
                  :placeholder="selectedProtocol.baseUrlPlaceholder"
                />
              </label>

              <label class="form-field">
                <span class="field-label-row">
                  <span class="field-label">模型名称</span>
                  <button
                    v-if="form.type === 'openai'"
                    type="button"
                    class="model-fetch-btn"
                    :disabled="loadingModels || (!form.apiKey.trim() && !hasSavedApiKey)"
                    @click="handleFetchModels"
                  >
                    <i
                      class="fas"
                      :class="loadingModels ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-down'"
                    />
                    {{ loadingModels ? '获取中' : '获取模型' }}
                  </button>
                </span>
                <div
                  ref="modelSelectRef"
                  class="model-select"
                  :class="{ 'is-open': modelMenuOpen }"
                >
                  <input
                    v-model="form.model"
                    type="text"
                    autocomplete="off"
                    :placeholder="selectedProtocol.modelPlaceholder"
                    @focus="handleModelFocus"
                  />
                  <button
                    v-if="form.type === 'openai' && modelOptions.length"
                    type="button"
                    class="model-select-toggle"
                    aria-label="展开模型列表"
                    :aria-expanded="modelMenuOpen"
                    @click="toggleModelMenu"
                  >
                    <i class="fas fa-chevron-down" />
                  </button>
                  <div
                    v-if="modelMenuOpen && modelOptions.length"
                    class="model-options"
                    :class="{ 'is-upward': modelMenuPlacement === 'up' }"
                    :style="{ maxHeight: `${modelMenuMaxHeight}px` }"
                    role="listbox"
                  >
                    <button
                      v-for="model in modelOptions"
                      :key="model"
                      type="button"
                      class="model-option"
                      :class="{ 'is-selected': form.model === model }"
                      role="option"
                      :aria-selected="form.model === model"
                      @click="selectModel(model)"
                    >
                      <span>{{ model }}</span>
                      <i v-if="form.model === model" class="fas fa-check" />
                    </button>
                  </div>
                </div>
                <span class="field-hint">
                  留空使用协议默认模型：{{ selectedProtocol.modelPlaceholder }}
                </span>
                <span v-if="modelFetchError" class="field-error">{{ modelFetchError }}</span>
                <span v-else-if="modelOptions.length" class="field-hint">
                  已获取 {{ modelOptions.length }} 个模型，可直接选择或手动修改
                </span>
              </label>
            </div>

            <div
              v-if="formTestResult"
              class="form-test-result"
              :class="formTestResult.connected ? 'is-success' : 'is-error'"
            >
              <i
                class="fas"
                :class="formTestResult.connected ? 'fa-check-circle' : 'fa-times-circle'"
              />
              <span>{{ formTestResult.connected ? '连接成功，可以保存' : '连接失败' }}</span>
              <span v-if="formTestResult.error" class="form-test-result__detail">
                {{ formTestResult.error }}
              </span>
            </div>

            <div class="form-actions">
              <BaseButton
                variant="neutral-ghost"
                shape="rounded"
                size="xs"
                class="form-test-btn"
                :loading="testingForm"
                @click="handleTestForm"
              >
                <i class="fas fa-flask" />
                测试连接
              </BaseButton>
              <div class="form-actions__primary">
                <BaseButton variant="ghost" shape="rounded" size="sm" @click="cancelEdit">
                  取消
                </BaseButton>
                <BaseButton
                  variant="primary"
                  shape="rounded"
                  size="sm"
                  :loading="submitting"
                  class="ai-action-btn"
                  html-type="submit"
                >
                  {{ editingId ? '保存修改' : '保存配置' }}
                </BaseButton>
              </div>
            </div>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { BaseButton } from '@nav/ui'
import { useAuthStore } from '@/stores/auth'
import { useAIStore } from '@/stores/ai'
import { useUIStore } from '@/stores/ui'
import {
  fetchAIProviderModels,
  setDefaultAIProvider,
  testAIProviderConfig,
  type AIProvider,
  type AIProtocol
} from '@/api/ai'

const emit = defineEmits(['close'])
const router = useRouter()
const authStore = useAuthStore()
const aiStore = useAIStore()
const uiStore = useUIStore()

const submitting = ref(false)
const removingIds = reactive<Record<string, boolean>>({})
const editingId = ref<string | null>(null)
const loadingDetail = ref(false)
const isCreating = ref(false)
const hasSavedApiKey = ref(false)
const testingForm = ref(false)
const settingDefaultId = ref<string | null>(null)
const selectedDefaultId = ref<string | null>(null)
const formSection = ref<HTMLElement | null>(null)
const formTestResult = ref<{ connected: boolean; error?: string } | null>(null)
const modelOptions = ref<string[]>([])
const loadingModels = ref(false)
const modelFetchError = ref('')
const modelSelectRef = ref<HTMLElement | null>(null)
const modelMenuOpen = ref(false)
const modelMenuPlacement = ref<'down' | 'up'>('down')
const modelMenuMaxHeight = ref(220)

const protocolOptions: Array<{
  value: AIProtocol
  label: string
  hint: string
  apiKeyPlaceholder: string
  baseUrlPlaceholder: string
  modelPlaceholder: string
}> = [
  {
    value: 'openai',
    label: 'OpenAI 兼容协议',
    hint: '适用于 OpenAI、DeepSeek、通义千问等兼容接口',
    apiKeyPlaceholder: 'sk-...',
    baseUrlPlaceholder: 'https://api.openai.com/v1',
    modelPlaceholder: 'gpt-4o-mini'
  },
  {
    value: 'claude',
    label: 'Claude 兼容协议',
    hint: '适用于 Anthropic Claude Messages API 兼容接口',
    apiKeyPlaceholder: 'sk-ant-...',
    baseUrlPlaceholder: 'https://api.anthropic.com/v1',
    modelPlaceholder: 'claude-3-haiku-20240307'
  }
]

const form = reactive({
  name: '',
  type: 'openai' as AIProtocol,
  apiKey: '',
  baseUrl: '',
  model: ''
})

const errors = reactive({
  name: '',
  apiKey: ''
})

const selectedProtocol = computed(
  () => protocolOptions.find(option => option.value === form.type) ?? protocolOptions[0]
)
const isFormOpen = computed(() => isCreating.value || editingId.value !== null)
const formTitle = computed(() =>
  editingId.value ? `编辑 ${form.name || 'AI 服务'}` : '新增 AI 服务'
)
const apiKeyPlaceholder = computed(() =>
  hasSavedApiKey.value ? '已保存，输入新 Key 可替换' : selectedProtocol.value.apiKeyPlaceholder
)

const getProtocolLabel = (protocol: AIProtocol) =>
  protocolOptions.find(option => option.value === protocol)?.label ?? protocol

const handleGoLogin = () => {
  emit('close')
  router.push('/login')
}

const resetErrors = () => {
  errors.name = ''
  errors.apiKey = ''
}

const resetForm = () => {
  form.name = ''
  form.type = 'openai'
  form.apiKey = ''
  form.baseUrl = ''
  form.model = ''
  hasSavedApiKey.value = false
  formTestResult.value = null
  modelOptions.value = []
  modelFetchError.value = ''
  modelMenuOpen.value = false
  isCreating.value = false
  editingId.value = null
}

const handleDocumentPointerDown = (event: PointerEvent) => {
  if (!modelSelectRef.value?.contains(event.target as Node)) {
    modelMenuOpen.value = false
  }
}

const handleModelFocus = () => {
  if (modelOptions.value.length) {
    modelMenuOpen.value = true
    void nextTick(updateModelMenuPlacement)
  }
}

const toggleModelMenu = () => {
  if (!modelOptions.value.length) return
  modelMenuOpen.value = !modelMenuOpen.value
  if (modelMenuOpen.value) void nextTick(updateModelMenuPlacement)
}

const selectModel = (model: string) => {
  form.model = model
  modelMenuOpen.value = false
}

const updateModelMenuPlacement = () => {
  const element = modelSelectRef.value
  if (!element || !modelOptions.value.length) return

  const rect = element.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom - 8
  const spaceAbove = rect.top - 8
  const preferredHeight = Math.min(220, modelOptions.value.length * 32 + 8)
  const shouldOpenUp = spaceBelow < preferredHeight && spaceAbove > spaceBelow

  modelMenuPlacement.value = shouldOpenUp ? 'up' : 'down'
  modelMenuMaxHeight.value = Math.max(
    96,
    Math.min(preferredHeight, shouldOpenUp ? spaceAbove : spaceBelow)
  )
}

const scrollToForm = async () => {
  await nextTick()
  formSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const handleCreate = () => {
  resetForm()
  isCreating.value = true
  void scrollToForm()
}

const reloadProviders = async () => {
  if (!authStore.isAuthenticated) return
  selectedDefaultId.value = null
  await aiStore.loadProviders()
}

const isProviderDefault = (provider: AIProvider) =>
  selectedDefaultId.value ? provider.id === selectedDefaultId.value : provider.isDefault

const handleEdit = async (id: string) => {
  if (loadingDetail.value) return
  loadingDetail.value = true
  resetErrors()
  try {
    const detail = await aiStore.loadProviderDetail(id)
    editingId.value = id
    form.name = detail.name
    form.type = detail.type
    form.apiKey = ''
    form.baseUrl = detail.baseUrl || ''
    form.model = detail.model || ''
    hasSavedApiKey.value = detail.hasApiKey
    formTestResult.value = null
    isCreating.value = false
    void scrollToForm()
  } catch (e) {
    const message = e instanceof Error ? e.message : '加载失败'
    uiStore.showToast(message, 'error')
  } finally {
    loadingDetail.value = false
  }
}

const cancelEdit = () => {
  resetForm()
}

const handleAdd = async () => {
  if (submitting.value) return
  resetErrors()

  if (!form.name.trim()) {
    errors.name = '名称不能为空'
  }
  if (!form.apiKey.trim() && !hasSavedApiKey.value) {
    errors.apiKey = 'API Key 不能为空'
  }
  if (errors.name || errors.apiKey) return

  submitting.value = true
  try {
    const payload = {
      name: form.name.trim(),
      type: form.type,
      apiKey: form.apiKey.trim() || undefined,
      baseUrl: form.baseUrl.trim() ? form.baseUrl.trim() : undefined,
      model: form.model.trim() ? form.model.trim() : undefined
    }

    if (editingId.value) {
      await aiStore.updateProvider(editingId.value, payload)
      uiStore.showToast('AI 配置已更新', 'success')
    } else {
      await aiStore.addProvider(payload)
      uiStore.showToast('AI 配置已保存', 'success')
    }
    resetForm()
  } catch (e) {
    const message = e instanceof Error ? e.message : '保存失败'
    uiStore.showToast(message, 'error')
  } finally {
    submitting.value = false
  }
}

const handleTestForm = async () => {
  if (testingForm.value) return
  resetErrors()

  if (!form.apiKey.trim() && !hasSavedApiKey.value) {
    errors.apiKey = '请先填写 API Key'
    return
  }

  testingForm.value = true
  formTestResult.value = null
  try {
    formTestResult.value = await testAIProviderConfig({
      providerId: editingId.value || undefined,
      type: form.type,
      apiKey: form.apiKey.trim() || undefined,
      baseUrl: form.baseUrl.trim() || undefined,
      model: form.model.trim() || undefined
    })
  } catch (e) {
    formTestResult.value = {
      connected: false,
      error: e instanceof Error ? e.message : '测试失败'
    }
  } finally {
    testingForm.value = false
  }
}

const handleFetchModels = async () => {
  if (loadingModels.value || form.type !== 'openai') return
  resetErrors()
  modelFetchError.value = ''

  if (!form.apiKey.trim() && !hasSavedApiKey.value) {
    errors.apiKey = '请先填写 API Key'
    return
  }

  loadingModels.value = true
  try {
    modelOptions.value = await fetchAIProviderModels({
      providerId: editingId.value || undefined,
      type: form.type,
      apiKey: form.apiKey.trim() || undefined,
      baseUrl: form.baseUrl.trim() || undefined,
      model: form.model.trim() || undefined
    })
    modelMenuOpen.value = false
    if (modelOptions.value.length === 0) {
      modelFetchError.value = '服务未返回可用模型，请手动输入模型名称'
    }
  } catch (e) {
    modelOptions.value = []
    modelFetchError.value = e instanceof Error ? e.message : '获取模型失败，请手动输入'
  } finally {
    loadingModels.value = false
  }
}

const handleSetDefault = async (id: string) => {
  if (settingDefaultId.value) return
  settingDefaultId.value = id
  try {
    if (typeof aiStore.setDefaultProvider === 'function') {
      await aiStore.setDefaultProvider(id)
    } else {
      // 兼容开发环境热更新残留的旧 Store 实例，避免按钮失效。
      const provider = await setDefaultAIProvider(id)
      aiStore.$patch({
        providers: aiStore.providers.map(item => ({
          ...item,
          isDefault: item.id === provider.id
        }))
      })
    }
    selectedDefaultId.value = id
    uiStore.showToast('默认 AI 服务已更新', 'success')
  } catch (e) {
    const message = e instanceof Error ? e.message : '设置失败'
    uiStore.showToast(message, 'error')
  } finally {
    settingDefaultId.value = null
  }
}

const handleRemove = async (id: string) => {
  if (removingIds[id]) return
  if (!window.confirm('确定要删除该 AI 服务吗？此操作不可恢复。')) return
  removingIds[id] = true
  try {
    await aiStore.removeProvider(id)
    if (editingId.value === id) resetForm()
    uiStore.showToast('已删除', 'success')
  } catch (e) {
    const message = e instanceof Error ? e.message : '删除失败'
    uiStore.showToast(message, 'error')
  } finally {
    removingIds[id] = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  window.addEventListener('resize', updateModelMenuPlacement)
  window.addEventListener('scroll', updateModelMenuPlacement, true)
  if (authStore.isAuthenticated) {
    aiStore.loadProviders()
    resetForm()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  window.removeEventListener('resize', updateModelMenuPlacement)
  window.removeEventListener('scroll', updateModelMenuPlacement, true)
})

watch(
  () => authStore.isAuthenticated,
  isAuthed => {
    if (isAuthed) {
      aiStore.loadProviders()
      resetForm()
    } else {
      aiStore.clearState()
      resetForm()
    }
  }
)

watch(
  () => [form.type, form.apiKey, form.baseUrl],
  () => {
    formTestResult.value = null
    modelOptions.value = []
    modelFetchError.value = ''
    modelMenuOpen.value = false
  }
)

watch(
  () => form.model,
  () => {
    formTestResult.value = null
  }
)
</script>

<style scoped lang="scss">
.ai-config {
  width: 100%;
}

.ai-config__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--account-surface-bg, var(--bg-panel));
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.section-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;

  &.blue {
    background-color: var(--primary-soft);
    color: var(--color-primary);
  }
}

.section-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin: 0;
  line-height: 1.4;
}

.section-description {
  font-size: 14px;
  color: var(--color-neutral-500);
  margin: 0;
}

.login-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 36px 20px;
  background-color: var(--color-neutral-50);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--color-border);
}

.login-prompt__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 320px;
  gap: 6px;
}

.login-prompt__icon {
  font-size: 40px;
  color: var(--color-primary);
  margin-bottom: 8px;
  opacity: 0.9;
}

.login-prompt__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin: 0;
}

.login-prompt__desc {
  font-size: 14px;
  color: var(--color-neutral-500);
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.ai-config__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.provider-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.provider-list__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-list__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0;
}

.provider-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  color: var(--color-neutral-500);
  font-size: 14px;
}

.provider-state.text-muted {
  color: var(--color-neutral-400);
}

.provider-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.provider-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--account-control-bg, var(--bg-panel));
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.provider-card.is-editing {
  border-color: rgba(var(--color-primary-rgb), 0.42);
  background-color: rgba(var(--color-primary-rgb), 0.035);
}

.provider-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-neutral-800);
}

.provider-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-neutral-500);
}

.provider-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.badge-primary {
  background-color: var(--primary-soft);
  color: var(--color-primary);
}

.divider {
  height: 0;
  border-top: 1px solid var(--color-border);
  margin: 0;
}

.provider-form__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 12px 0;
}

.provider-form {
  scroll-margin-top: 24px;
  padding: 16px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.18);
  border-radius: var(--radius-lg);
  background-color: rgba(var(--color-primary-rgb), 0.025);
}

.provider-form__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.provider-form__description {
  margin: 3px 0 0;
  color: var(--color-neutral-500);
  font-size: 12px;
  line-height: 1.45;
}

.editing-badge {
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: var(--radius-md);
  background: var(--primary-soft);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--color-neutral-700);
}

.form-field input,
.form-field select {
  height: 36px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 0 10px;
  font-size: 13px;
  color: var(--color-neutral-800);
  background-color: var(--account-control-bg, var(--bg-tile));
}

.model-select {
  position: relative;
}

.model-select input {
  width: 100%;
  padding-right: 36px;
}

.model-select-toggle {
  position: absolute;
  top: 50%;
  right: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--color-neutral-500);
  background: transparent;
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    transform 0.15s ease;
}

.model-select-toggle:hover {
  color: var(--color-primary);
  background-color: rgba(var(--color-primary-rgb), 0.06);
}

.model-select.is-open .model-select-toggle {
  color: var(--color-primary);
  transform: translateY(-50%) rotate(180deg);
}

.model-options {
  position: absolute;
  z-index: 5;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  display: flex;
  max-height: 220px;
  flex-direction: column;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--account-surface-bg, var(--bg-panel));
  box-shadow: var(--shadow-md, 0 8px 24px rgba(30, 42, 65, 0.12));
}

.model-options.is-upward {
  top: auto;
  bottom: calc(100% + 4px);
}

.model-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--color-neutral-700);
  background: transparent;
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.model-option:hover,
.model-option.is-selected {
  color: var(--color-primary);
  background-color: rgba(var(--color-primary-rgb), 0.08);
}

.model-option i {
  font-size: 11px;
}

.form-field--switch {
  align-items: flex-start;
}

.field-label {
  font-weight: 600;
  color: var(--color-neutral-700);
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.model-fetch-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.model-fetch-btn:hover:not(:disabled) {
  color: var(--color-primary-dark, var(--color-primary));
}

.model-fetch-btn:disabled {
  color: var(--color-neutral-400);
  cursor: not-allowed;
}

.field-hint {
  color: var(--color-neutral-500);
  font-size: 11px;
  line-height: 1.45;
}

.field-error {
  font-size: 12px;
  color: var(--color-error);
}

.form-actions {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.form-actions__primary {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-test-btn {
  min-height: 28px;
  padding: 0 4px;
  gap: 5px;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 500;
}

.form-test-btn:hover:not(.base-button--disabled):not(.base-button--loading) {
  color: var(--color-primary-dark, var(--color-primary));
  background: color-mix(in srgb, var(--color-primary) 6%, transparent);
}

.form-test-result {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 5px 7px;
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  font-size: 12px;
  line-height: 1.45;
}

.form-test-result.is-success {
  background: color-mix(in srgb, var(--color-success) 8%, transparent);
  color: var(--color-success);
}

.form-test-result.is-error {
  background: color-mix(in srgb, var(--color-error) 7%, transparent);
  color: var(--color-error);
}

.form-test-result__detail {
  flex-basis: 100%;
  padding-left: 18px;
  overflow-wrap: anywhere;
}

.ai-action-btn {
  min-width: 96px;
  justify-content: center;
}

.ai-action-btn :deep(.button-text) {
  width: 100%;
  text-align: center;
}

@media (max-width: 768px) {
  .provider-card {
    flex-direction: column;
    align-items: stretch;
  }

  .provider-actions {
    justify-content: flex-end;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .form-actions__primary,
  .form-actions :deep(button) {
    width: 100%;
  }

  .provider-list__header {
    align-items: flex-start;
  }
}
</style>
