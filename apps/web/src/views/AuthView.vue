<template>
  <AuthLayout>
    <!-- Logo -->
    <div class="logo-container">
      <BrandLogo link="/" title="返回首页">D</BrandLogo>
    </div>

    <!-- Login/Register Views -->
    <div class="auth-views">
      <!-- Login View -->
      <div class="view" :class="{ active: currentView === 'login' }">
        <div class="header">
          <div class="header-sub">在任意设备上，继续你的高效工作流</div>
        </div>

        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label class="form-label">
              邮箱
              <span>*</span>
            </label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <polyline points="4 7 12 12 20 7" />
              </svg>
              <input v-model="loginForm.email" type="email" placeholder="your@email.com" required />
            </div>
            <div v-if="loginErrors.email" class="error-text">{{ loginErrors.email }}</div>
          </div>

          <div class="form-group">
            <label class="form-label">
              密码
              <span>*</span>
            </label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M9 10V8a3 3 0 0 1 6 0v2" />
              </svg>
              <input
                v-model="loginForm.password"
                :type="showLoginPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                class="pwd"
                required
              />
              <button
                class="toggle-password"
                type="button"
                aria-label="显示或隐藏密码"
                @click="showLoginPassword = !showLoginPassword"
              >
                <svg v-if="!showLoginPassword" class="eye-icon eye-open" viewBox="0 0 24 24">
                  <path
                    d="M2.5 12S5.5 6.5 12 6.5 21.5 12 21.5 12 18.5 17.5 12 17.5 2.5 12 2.5 12Z"
                  />
                  <circle cx="12" cy="12" r="2.6" />
                </svg>
                <svg v-else class="eye-icon eye-closed" viewBox="0 0 24 24">
                  <path d="M4 4l16 16" />
                  <path d="M5 9s2.5-4 7-4 7 4 7 4-2.5 4-7 4c-.7 0-1.37-.07-2-.2" />
                  <path d="M9 13a3 3 0 0 1 4-4" />
                </svg>
              </button>
            </div>
            <div v-if="loginErrors.password" class="error-text">{{ loginErrors.password }}</div>
          </div>

          <button class="btn-primary" type="submit" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>

          <div class="row-helper">
            <a href="#">忘记密码？</a>
          </div>

          <div class="divider"><span>或使用第三方登录</span></div>

          <div class="social-row">
            <button
              type="button"
              class="social-btn"
              title="Linuxdo 登录"
              @click="handleLinuxDoLogin"
            >
              <svg class="social-icon" viewBox="0 0 24 24" fill="none">
                <defs>
                  <clipPath id="linuxdo-clip">
                    <circle cx="12" cy="12" r="12" />
                  </clipPath>
                </defs>
                <g clip-path="url(#linuxdo-clip)">
                  <rect x="0" y="0" width="24" height="8" fill="#000000" />
                  <rect x="0" y="8" width="24" height="8" fill="#FFFFFF" />
                  <rect x="0" y="16" width="24" height="8" fill="#FFB11B" />
                </g>
              </svg>
            </button>
          </div>

          <div class="switch-row">
            还没有账号？
            <a href="#" @click.prevent="switchView('register')">免费注册</a>
          </div>

          <div class="legal">登录即表示你已阅读并同意《用户协议》和《隐私政策》</div>
        </form>
      </div>

      <!-- Register View -->
      <div class="view" :class="{ active: currentView === 'register' }">
        <div class="header">
          <div class="header-sub">同步多端导航配置，随时云端备份</div>
        </div>

        <form @submit.prevent="handleRegister">
          <div class="form-group">
            <label class="form-label">
              邮箱
              <span>*</span>
            </label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <polyline points="4 7 12 12 20 7" />
              </svg>
              <input
                v-model="registerForm.email"
                type="email"
                placeholder="your@email.com"
                required
              />
            </div>
            <div v-if="registerErrors.email" class="error-text">{{ registerErrors.email }}</div>
          </div>

          <div class="form-group">
            <label class="form-label">
              密码
              <span>*</span>
            </label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M9 10V8a3 3 0 0 1 6 0v2" />
              </svg>
              <input
                v-model="registerForm.password"
                :type="showRegisterPassword ? 'text' : 'password'"
                placeholder="至少 8 位字符"
                minlength="8"
                class="pwd"
                required
              />
              <button
                class="toggle-password"
                type="button"
                aria-label="显示或隐藏密码"
                @click="showRegisterPassword = !showRegisterPassword"
              >
                <svg v-if="!showRegisterPassword" class="eye-icon eye-open" viewBox="0 0 24 24">
                  <path
                    d="M2.5 12S5.5 6.5 12 6.5 21.5 12 21.5 12 18.5 17.5 12 17.5 2.5 12 2.5 12Z"
                  />
                  <circle cx="12" cy="12" r="2.6" />
                </svg>
                <svg v-else class="eye-icon eye-closed" viewBox="0 0 24 24">
                  <path d="M4 4l16 16" />
                  <path d="M5 9s2.5-4 7-4 7 4 7 4-2.5 4-7 4c-.7 0-1.37-.07-2-.2" />
                  <path d="M9 13a3 3 0 0 1 4-4" />
                </svg>
              </button>
            </div>
            <div v-if="registerErrors.password" class="error-text">
              {{ registerErrors.password }}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">
              确认密码
              <span>*</span>
            </label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24">
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M9 10V8a3 3 0 0 1 6 0v2" />
              </svg>
              <input
                v-model="registerForm.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="请再次输入密码"
                minlength="8"
                class="pwd"
                required
              />
              <button
                class="toggle-password"
                type="button"
                aria-label="显示或隐藏密码"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <svg v-if="!showConfirmPassword" class="eye-icon eye-open" viewBox="0 0 24 24">
                  <path
                    d="M2.5 12S5.5 6.5 12 6.5 21.5 12 21.5 12 18.5 17.5 12 17.5 2.5 12 2.5 12Z"
                  />
                  <circle cx="12" cy="12" r="2.6" />
                </svg>
                <svg v-else class="eye-icon eye-closed" viewBox="0 0 24 24">
                  <path d="M4 4l16 16" />
                  <path d="M5 9s2.5-4 7-4 7 4 7 4-2.5 4-7 4c-.7 0-1.37-.07-2-.2" />
                  <path d="M9 13a3 3 0 0 1 4-4" />
                </svg>
              </button>
            </div>
            <div v-if="registerErrors.confirmPassword" class="error-text">
              {{ registerErrors.confirmPassword }}
            </div>
          </div>

          <button class="btn-primary" type="submit" :disabled="loading">
            {{ loading ? '注册中...' : '创建账号' }}
          </button>

          <div class="switch-row">
            已经有账号？
            <a href="#" @click.prevent="switchView('login')">去登录</a>
          </div>

          <div class="legal">创建账号即表示你已阅读并同意《用户协议》和《隐私政策》</div>
        </form>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

import { isValidEmail, isValidPassword } from '@/utils/validators'
import { AuthLayout, BrandLogo } from '@nav/ui'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUIStore()

const currentView = ref<'login' | 'register'>('login')
const loading = ref(false)

// Login State
const loginForm = reactive({
  email: '',
  password: ''
})
const showLoginPassword = ref(false)
const loginErrors = reactive({
  email: '',
  password: ''
})

// Register State
const registerForm = reactive({
  email: '',
  password: '',
  confirmPassword: ''
})
const showRegisterPassword = ref(false)
const showConfirmPassword = ref(false)
const registerErrors = reactive({
  email: '',
  password: '',
  confirmPassword: ''
})

const handleLinuxDoLogin = () => {
  const clientId = import.meta.env.VITE_LINUX_DO_CLIENT_ID
  const redirectUri = import.meta.env.VITE_LINUX_DO_REDIRECT_URI

  if (!clientId || !redirectUri) {
    uiStore.showToast('配置缺失: 无法启动登录', 'error')
    return
  }

  // Security: Generate random state for CSRF protection
  const array = new Uint32Array(4)
  window.crypto.getRandomValues(array)
  const state = Array.from(array)
    .map(n => n.toString(16).padStart(8, '0'))
    .join('')

  // Store state for validation on callback
  localStorage.setItem('oauth_state', state)

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    state
  })

  window.location.href = `https://connect.linux.do/oauth2/authorize?${params.toString()}`
}

onMounted(async () => {
  const path = route.path
  if (path === '/register') {
    currentView.value = 'register'
  } else {
    currentView.value = 'login'
  }
})

// Watch route changes to update view
watch(
  () => route.path,
  newPath => {
    if (newPath === '/register') {
      currentView.value = 'register'
    } else if (newPath === '/login') {
      currentView.value = 'login'
    }
  }
)

const switchView = (view: 'login' | 'register') => {
  currentView.value = view
  // Update URL without reloading page
  router.push(view === 'login' ? '/login' : '/register')

  // Clear errors when switching
  loginErrors.email = ''
  loginErrors.password = ''
  registerErrors.email = ''
  registerErrors.password = ''
  registerErrors.confirmPassword = ''
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Unknown error occurred'
}

const handleLogin = async () => {
  loading.value = true
  loginErrors.email = ''
  loginErrors.password = ''

  if (!isValidEmail(loginForm.email)) {
    loginErrors.email = '邮箱格式不正确'
    loading.value = false
    return
  }

  try {
    await authStore.login(loginForm.email, loginForm.password)
    router.push('/')
  } catch (error) {
    const message = getErrorMessage(error)
    if (message.includes('Invalid credentials')) {
      loginErrors.password = '邮箱或密码错误'
    } else {
      loginErrors.password = message || '登录失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  if (registerForm.password !== registerForm.confirmPassword) {
    registerErrors.confirmPassword = '两次输入的密码不一致'
    return
  }

  loading.value = true
  registerErrors.email = ''
  registerErrors.password = ''
  registerErrors.confirmPassword = ''

  let hasError = false
  if (!isValidEmail(registerForm.email)) {
    registerErrors.email = '邮箱格式不正确'
    hasError = true
  }
  if (!isValidPassword(registerForm.password)) {
    registerErrors.password = '密码长度至少为 8 位'
    hasError = true
  }

  if (hasError) {
    loading.value = false
    return
  }

  try {
    await authStore.register(registerForm.email, registerForm.password)
    // Auto login
    await authStore.login(registerForm.email, registerForm.password)
    router.push('/')
  } catch (error) {
    const message = getErrorMessage(error)
    if (message.includes('User already exists')) {
      registerErrors.email = '该邮箱已被注册'
    } else {
      registerErrors.password = message || '注册失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
:root {
  --bg-page: #f3f4f8;
  --bg-card: #fff;
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --text-main: #111827;
  --text-sub: #6b7280;
  --border: #e5e7eb;
  --input-bg: #f9fafb;
  --radius-card: 26px;
  --radius-input: 999px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Layout handled by AuthLayout and BrandLogo */

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

/* 登录 / 注册视图容器 */
.auth-views {
  position: relative;
  min-height: 560px;
  width: 100%; /* Fix: Prevent collapse in flex column */
}
.view {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
}
.view.active {
  opacity: 1;
  pointer-events: auto;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}
.header-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.02em;
  margin-bottom: 8px;
  color: var(--text-main, #111827);
}
.header-sub {
  font-size: 14px;
  color: var(--text-secondary, #6b7280);
}

.form-group {
  margin-bottom: 18px;
}
.form-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-main, #374151);
  display: inline-flex;
  align-items: center;
}
.form-label span {
  color: var(--color-error, #ef4444);
  margin-left: 4px;
}

.input-wrap {
  height: 48px;
  border-radius: 999px; /* var(--radius-input) */
  border: 1px solid var(--border, #e5e7eb);
  background: var(--bg-tile, #f9fafb);
  padding: 0 18px;
  display: flex;
  align-items: center;
  transition: 0.2s;
}
.input-wrap:focus-within {
  border-color: var(--color-primary, #2563eb);
  background: var(--bg-tile-hover, #fff);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.35);
}

.input-icon {
  width: 18px;
  height: 18px;
  margin-right: 10px;
  stroke: var(--text-muted, #9ca3af);
  stroke-width: 1.8;
  fill: none;
}

input {
  flex: 1;
  border: none;
  background: none;
  font-size: 14px;
  outline: none;
  color: var(--text-main, #111827);
  width: 100%; /* Ensure input takes full width */
}
input::placeholder {
  color: var(--text-muted, #c1c7d5);
}

.toggle-password {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex; /* Center icon */
  align-items: center;
}
.eye-icon {
  width: 18px;
  height: 18px;
  stroke: var(--text-muted, #9ca3af);
  stroke-width: 1.8;
  fill: none;
}

.btn-primary {
  margin-top: 16px;
  width: 100%;
  height: 50px;
  border-radius: 999px;
  border: none;
  background: var(--color-primary, #2563eb);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 20px 36px rgba(37, 99, 235, 0.45);
  transition: 0.15s ease;
}
.btn-primary:hover {
  background: var(--color-primary-dark, #1d4ed8);
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.row-helper {
  margin-top: 10px;
  text-align: right;
  font-size: 13px;
}
.row-helper a {
  color: var(--color-primary, #2563eb);
  text-decoration: none;
}

.divider {
  display: flex;
  align-items: center;
  margin: 24px 0 16px;
  font-size: 12px;
  color: var(--text-muted, #9ca3af);
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border, #e5e7eb);
}
.divider span {
  margin: 0 10px;
  white-space: nowrap;
}

/* 三方登录 */
.social-row {
  display: flex;
  justify-content: center;
  gap: 14px;
}
.social-btn {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid var(--border, #e5e7eb);
  background: var(--bg-tile, #f9fafb);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 0.15s;
}
.social-btn:hover {
  background: var(--bg-tile-hover, #eef2ff);
  border-color: var(--color-primary-soft, #c7d2fe);
}
.social-icon {
  width: 20px;
  height: 20px;
  display: block;
}
/* Ensure svg stroke follows theme if set, but some social icons are hardcoded colors usually */

.switch-row {
  margin-top: 22px;
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary, #6b7280);
}
.switch-row a {
  color: var(--color-primary, #2563eb);
  font-weight: 500;
  text-decoration: none;
  margin-left: 4px;
}

.legal {
  margin-top: 14px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted, #9ca3af);
}
.legal a {
  color: var(--text-muted, #9ca3af);
  text-decoration: underline;
}

.error-text {
  color: var(--color-error, #ef4444);
  font-size: 12px;
  margin-top: 4px;
  margin-left: 4px;
}

/* Specific Dark Mode overrides if variables aren't catching everything correctly */
:global([data-theme='dark']) .social-icon polyline,
:global([data-theme='dark']) .social-icon line,
:global([data-theme='dark']) .social-icon path[fill='#111827'] {
  stroke: #e2e8f0;
  fill: #e2e8f0;
}
</style>
