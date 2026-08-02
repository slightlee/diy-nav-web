<template>
  <div class="ai-config">
    <div class="ai-config__section">
      <div class="section-header">
        <div class="section-icon blue">
          <i class="fas fa-robot" />
        </div>
        <div class="section-info">
          <h3 class="section-title">AI 服务配置</h3>
          <p class="section-description">为当前账号添加和管理 AI 服务提供商</p>
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
            <h4 class="provider-list__title">已配置提供商</h4>
            <BaseButton
              variant="ghost"
              shape="rounded"
              size="sm"
              :loading="aiStore.isLoading"
              class="ai-action-btn"
              @click="reloadProviders"
            >
              刷新
            </BaseButton>
          </div>

          <div v-if="aiStore.isLoading" class="provider-state">
            <i class="fas fa-spinner fa-spin" />
            <span>加载中...</span>
          </div>
          <div v-else-if="aiStore.providers.length === 0" class="provider-state text-muted">
            暂无配置，请在下方添加
          </div>
          <div v-else class="provider-cards">
            <div v-for="provider in aiStore.providers" :key="provider.id" class="provider-card">
              <div class="provider-main">
                <div class="provider-title">
                  <span>{{ provider.name }}</span>
                  <span v-if="provider.isDefault" class="badge badge-primary">默认</span>
                </div>
                <div class="provider-meta">
                  <span class="meta-item">{{ provider.type.toUpperCase() }}</span>
                  <span v-if="provider.model" class="meta-item">模型：{{ provider.model }}</span>
                  <span v-if="provider.baseUrl" class="meta-item">URL：{{ provider.baseUrl }}</span>
                </div>
                <div
                  v-if="testResults[provider.id]"
                  class="provider-test"
                  :class="testResults[provider.id].connected ? 'ok' : 'error'"
                >
                  {{ testResults[provider.id].connected ? '连接成功' : '连接失败' }}
                  <span v-if="testResults[provider.id].error" class="error-detail">
                    （{{ testResults[provider.id].error }}）
                  </span>
                </div>
              </div>
              <div class="provider-actions">
                <BaseButton
                  variant="ghost"
                  size="xs"
                  :loading="editingId === provider.id && loadingDetail"
                  @click="handleEdit(provider.id)"
                >
                  编辑
                </BaseButton>
                <BaseButton
                  variant="ghost"
                  size="xs"
                  :loading="testingIds[provider.id] === true"
                  @click="handleTest(provider.id)"
                >
                  测试
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

        <div class="divider" />

        <form class="provider-form" @submit.prevent="handleAdd">
          <h4 class="provider-form__title">
            {{ editingId ? '编辑提供商' : '新增提供商' }}
          </h4>

          <div class="form-grid">
            <label class="form-field">
              <span class="field-label">名称</span>
              <input v-model="form.name" type="text" placeholder="如：个人 OpenAI" />
              <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
            </label>

            <label class="form-field">
              <span class="field-label">类型</span>
              <select v-model="form.type">
                <option value="openai">OpenAI</option>
                <option value="claude">Claude</option>
                <option value="qwen">通义千问</option>
                <option value="ernie">文心一言</option>
                <option value="custom">自定义</option>
              </select>
            </label>

            <label class="form-field">
              <span class="field-label">API Key</span>
              <input v-model="form.apiKey" type="text" placeholder="sk-..." />
              <span v-if="errors.apiKey" class="field-error">{{ errors.apiKey }}</span>
            </label>

            <label class="form-field">
              <span class="field-label">
                Base URL{{ form.type === 'custom' ? '' : '（可选）' }}
              </span>
              <input v-model="form.baseUrl" type="url" placeholder="https://api.openai.com/v1" />
              <span v-if="errors.baseUrl" class="field-error">{{ errors.baseUrl }}</span>
            </label>

            <label class="form-field">
              <span class="field-label">模型{{ form.type === 'custom' ? '' : '（可选）' }}</span>
              <input v-model="form.model" type="text" placeholder="gpt-4o-mini" />
              <span v-if="errors.model" class="field-error">{{ errors.model }}</span>
            </label>

            <label class="form-field form-field--switch">
              <span class="field-label">设为默认</span>
              <div class="switch">
                <input v-model="form.isDefault" type="checkbox" />
                <span class="slider round" />
              </div>
            </label>
          </div>

          <div class="form-actions">
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
            <BaseButton
              v-if="editingId"
              variant="ghost"
              shape="rounded"
              size="sm"
              class="ai-action-btn"
              @click="cancelEdit"
            >
              取消编辑
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { BaseButton } from '@nav/ui'
import { useAuthStore } from '@/stores/auth'
import { useAIStore } from '@/stores/ai'
import { useUIStore } from '@/stores/ui'
import { testAIProvider } from '@/api/ai'

const emit = defineEmits(['close'])
const router = useRouter()
const authStore = useAuthStore()
const aiStore = useAIStore()
const uiStore = useUIStore()

const submitting = ref(false)
const testingIds = reactive<Record<string, boolean>>({})
const removingIds = reactive<Record<string, boolean>>({})
const testResults = reactive<Record<string, { connected: boolean; error?: string }>>({})
const editingId = ref<string | null>(null)
const loadingDetail = ref(false)

const form = reactive({
  name: '',
  type: 'openai' as 'openai' | 'claude' | 'qwen' | 'ernie' | 'custom',
  apiKey: '',
  baseUrl: '',
  model: '',
  isDefault: false
})

const errors = reactive({
  name: '',
  apiKey: '',
  baseUrl: '',
  model: ''
})

const handleGoLogin = () => {
  emit('close')
  router.push('/login')
}

const resetErrors = () => {
  errors.name = ''
  errors.apiKey = ''
  errors.baseUrl = ''
  errors.model = ''
}

const resetForm = () => {
  form.name = ''
  form.type = 'openai'
  form.apiKey = ''
  form.baseUrl = ''
  form.model = ''
  form.isDefault = aiStore.providers.length === 0
  editingId.value = null
}

const reloadProviders = async () => {
  if (!authStore.isAuthenticated) return
  await aiStore.loadProviders()
}

const handleEdit = async (id: string) => {
  if (loadingDetail.value) return
  loadingDetail.value = true
  resetErrors()
  try {
    const detail = await aiStore.loadProviderDetail(id)
    editingId.value = id
    form.name = detail.name
    form.type = detail.type
    form.apiKey = detail.apiKey
    form.baseUrl = detail.baseUrl || ''
    form.model = detail.model || ''
    form.isDefault = detail.isDefault
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
  if (!form.apiKey.trim()) {
    errors.apiKey = 'API Key 不能为空'
  }
  if (form.type === 'custom') {
    if (!form.baseUrl.trim()) {
      errors.baseUrl = 'Base URL 不能为空'
    }
    if (!form.model.trim()) {
      errors.model = '模型不能为空'
    }
  }
  if (errors.name || errors.apiKey) return
  if (errors.baseUrl || errors.model) return

  submitting.value = true
  try {
    const payload = {
      name: form.name.trim(),
      type: form.type,
      apiKey: form.apiKey.trim(),
      baseUrl: form.baseUrl.trim() ? form.baseUrl.trim() : undefined,
      model: form.model.trim() ? form.model.trim() : undefined,
      isDefault: form.isDefault
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

const handleTest = async (id: string) => {
  if (testingIds[id]) return
  testingIds[id] = true
  try {
    const result = await testAIProvider(id)
    testResults[id] = result
  } catch (e) {
    testResults[id] = {
      connected: false,
      error: e instanceof Error ? e.message : '测试失败'
    }
  } finally {
    testingIds[id] = false
  }
}

const handleRemove = async (id: string) => {
  if (removingIds[id]) return
  if (!window.confirm('确定要删除该提供商吗？此操作不可恢复。')) return
  removingIds[id] = true
  try {
    await aiStore.removeProvider(id)
    delete testResults[id]
    uiStore.showToast('已删除', 'success')
  } catch (e) {
    const message = e instanceof Error ? e.message : '删除失败'
    uiStore.showToast(message, 'error')
  } finally {
    removingIds[id] = false
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    aiStore.loadProviders()
    resetForm()
  }
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
    color: #3b82f6;
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

.provider-test {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-neutral-500);
}

.provider-test.ok {
  color: #059669;
}

.provider-test.error {
  color: #dc2626;
}

.error-detail {
  color: inherit;
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
  background-color: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
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

.form-field--switch {
  align-items: flex-start;
}

.field-label {
  font-weight: 600;
  color: var(--color-neutral-700);
}

.field-error {
  font-size: 12px;
  color: var(--color-error);
}

.form-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ai-action-btn {
  min-width: 96px;
  justify-content: center;
}

.ai-action-btn :deep(.button-text) {
  width: 100%;
  text-align: center;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0 0 0 0;
  background-color: var(--color-neutral-300);
  transition: 0.4s;
}

.slider::before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.4s;
}

input:checked + .slider {
  background-color: var(--color-primary);
}

input:checked + .slider::before {
  transform: translateX(20px);
}

.slider.round {
  border-radius: 24px;
}

.slider.round::before {
  border-radius: 50%;
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
    justify-content: stretch;
  }

  .form-actions :deep(button) {
    width: 100%;
  }
}
</style>
