<template>
  <AuthLayout>
    <div v-if="!errorState" class="state-loading">
      <!-- Branded Logo (Pulsing) -->
      <div class="logo-wrapper">
        <BrandLogo :pulsing="true" />
      </div>

      <h2 class="status-title">正在验证身份...</h2>
      <p class="status-desc">请稍候，我们正在建立安全连接</p>

      <!-- Progress Bar -->
      <div class="progress-bar">
        <div class="progress-inner" />
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="state-error">
      <div class="error-icon-wrapper">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="error-icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h2 class="status-title text-error">验证失败</h2>
      <p class="status-desc">{{ errorState }}</p>
      <button class="btn-retry" @click="retryLogin">返回登录页</button>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { AuthLayout, BrandLogo } from '@nav/ui'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUIStore()

const errorState = ref<string | null>(null)

onMounted(async () => {
  const code = route.query.code as string
  const state = route.query.state as string
  const storedState = localStorage.getItem('oauth_state')

  // Artificial delay for smoother UX
  await new Promise(resolve => setTimeout(resolve, 800))

  // Security: Validate CSRF State
  if (!state || state !== storedState) {
    errorState.value = '安全校验失败 (CSRF): 请求来源不可信'
    return
  }

  localStorage.removeItem('oauth_state')

  if (!code) {
    errorState.value = '授权回调异常: 未能获取授权码'
    return
  }

  try {
    await authStore.loginWithProvider('linuxdo', code)

    uiStore.showToast('欢迎回来', 'success')
    router.replace('/')
  } catch (error: unknown) {
    const err = error as Error
    console.error('OAuth Error:', err)
    errorState.value = err.message || '登录验证失败，请重试'
  }
})

const retryLogin = () => {
  router.replace('/login')
}
</script>

<style scoped>
/* Dark mode support logic is handled by AuthLayout now */

.logo-wrapper {
  margin-bottom: 24px;
}

/* Error State Styles */
.state-loading,
.state-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.error-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fee2e2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.error-icon {
  width: 32px;
  height: 32px;
  color: #ef4444;
}

.text-error {
  color: #ef4444;
}

.btn-retry {
  margin-top: 8px;
  padding: 10px 24px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 99px;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retry:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #111827;
}

.status-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
}

.status-desc {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 32px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
}

.progress-inner {
  height: 100%;
  background: #2563eb;
  width: 30%;
  border-radius: 999px;
  animation: progress 1.5s ease-in-out infinite;
}

@keyframes progress {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
    width: 60%;
  }
  100% {
    transform: translateX(200%);
  }
}

/* Dark mode support (if app uses .dark class on html/body) */
@media (prefers-color-scheme: dark) {
  .callback-layout {
    background-color: #0f172a;
  }
  .callback-card {
    background-color: #1e293b;
    box-shadow: 0 28px 60px rgba(0, 0, 0, 0.3);
  }
  .status-title {
    color: #f8fafc;
  }
  .status-desc {
    color: #94a3b8;
  }
  .progress-bar {
    background: #334155;
  }
}
</style>
