<template>
  <div class="auth-layout">
    <div class="page">
      <div class="card">
        <!-- Logo in top-left corner -->
        <router-link to="/" class="card-logo" title="返回首页">D</router-link>

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
                  <input
                    v-model="loginForm.email"
                    type="email"
                    placeholder="your@email.com"
                    required
                  />
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
                <button type="button" class="social-btn" title="GitHub 登录">
                  <svg class="social-icon" viewBox="0 0 16 16">
                    <path
                      fill="#111827"
                      fill-rule="evenodd"
                      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 
                        6.53 5.47 7.59.4.07.55-.17.55-.38 
                        0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52 
                        -.01-.53.63-.01 1.08.58 1.23.82.72 
                        1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07 
                        -1.78-.2-3.64-.89-3.64-3.95 
                        0-.87.31-1.59.82-2.15C3.6 6.1 3.32 
                        5.28 3.76 4.18c0 0 .67-.21 2.2.82A7.65 
                        7.65 0 018 4.68c.68 0 1.36.09 
                        2 .26 1.53-1.04 2.2-.82 2.2-.82.44 
                        1.1.16 1.92.08 2.12.51.56.82 1.27.82 
                        2.15 0 3.07-1.87 3.75-3.65 
                        3.95.29.25.54.73.54 
                        1.48 0 1.07-.01 1.93-.01 2.2 0 
                        .21.15.46.55.38A8.012 
                        8.012 0 0016 8c0-4.42-3.58-8-8-8z"
                    />
                  </svg>
                </button>
                <button type="button" class="social-btn" title="Google 登录">
                  <svg class="social-icon" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="#fff"
                      stroke="#e5e7eb"
                      stroke-width="1.2"
                    />
                    <path
                      fill="#2563eb"
                      d="M12 6a6 6 0 0 1 4 1.5l-1.7 
                        1.7A3.5 3.5 0 0 0 12 8.6c-2 
                        0-3.5 1.45-3.5 3.4S10 15.4 
                        12 15.4c1.7 0 2.7-.9 3-2.3H12v-2h5A6 
                        6 0 0 1 12 18c-3.3 0-6-2.7-6-6s2.7-6 
                        6-6Z"
                    />
                  </svg>
                </button>
                <button type="button" class="social-btn" title="微信登录">
                  <svg class="social-icon" viewBox="0 0 24 24">
                    <rect x="3" y="6" width="11" height="8" rx="4" fill="#22c55e" />
                    <circle cx="8" cy="10" r="1" fill="#fff" />
                    <circle cx="12" cy="10" r="1" fill="#fff" />
                    <rect x="10" y="10" width="11" height="8" rx="4" fill="#16a34a" />
                    <circle cx="14.5" cy="14" r="1" fill="#fff" />
                    <circle cx="18.5" cy="14" r="1" fill="#fff" />
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWebsiteStore } from '@/stores/website'
import { isValidEmail, isValidPassword } from '@/utils/validators'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const websiteStore = useWebsiteStore()

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

// Initialize view based on route
onMounted(() => {
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
    await authStore.login(loginForm.email, loginForm.password)
    // Try to sync cloud data if local is empty
    await websiteStore.checkAndRestoreCloudData()
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
    await authStore.login(registerForm.email, registerForm.password)
    // Try to sync cloud data if local is empty
    await websiteStore.checkAndRestoreCloudData()
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

.auth-layout {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  font-family:
    system-ui,
    -apple-system,
    'PingFang SC',
    'Segoe UI',
    Roboto,
    sans-serif;
  /* Background color should be inherited or set here if needed, 
     but assuming body has it or we set it here */
  background-color: #f3f4f8; /* var(--bg-page) */
}

.page {
  width: 100%;
  max-width: 520px;
  /* Padding removed to ensure max-width is the actual content width constraint */
}

/* 品牌区域 - 移除外部品牌区域样式，改为内部样式 */
/* .logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}
.brand-logo {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.35);
} */

/* 卡片 */
.card {
  background: #fff; /* var(--bg-card) */
  border-radius: 26px; /* var(--radius-card) */
  padding: 40px 52px 32px;
  box-shadow: 0 28px 60px rgba(15, 23, 42, 0.16);
  width: 100%;
  position: relative; /* Ensure absolute children are relative to card */
}

/* 顶部居中 Logo */
.card-logo {
  margin: 0 auto 16px; /* Reduced from 32px to bring subtitle closer */
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); /* Match HeaderBar gradient */
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.35);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  /* Text styles for 'D' */
  color: #fff;
  text-decoration: none; /* Remove link underline */
  display: flex; /* Override display: block to flex for centering */
  align-items: center;
  justify-content: center;
  font-size: 26px; /* Scaled up from 18px (32->48) */
  font-weight: bold;
}
.card-logo:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 20px rgba(37, 99, 235, 0.45);
}

/* 登录 / 注册视图容器 */
.auth-views {
  position: relative;
  min-height: 560px;
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
  color: #111827;
}
.header-sub {
  font-size: 14px;
  color: #6b7280; /* var(--text-sub) */
}

.form-group {
  margin-bottom: 18px;
}
.form-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #374151;
  display: inline-flex;
  align-items: center;
}
.form-label span {
  color: #ef4444;
  margin-left: 4px;
}

.input-wrap {
  height: 48px;
  border-radius: 999px; /* var(--radius-input) */
  border: 1px solid #e5e7eb; /* var(--border) */
  background: #f9fafb; /* var(--input-bg) */
  padding: 0 18px;
  display: flex;
  align-items: center;
  transition: 0.2s;
}
.input-wrap:focus-within {
  border-color: #2563eb; /* var(--primary) */
  background: #fff;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.35);
}

.input-icon {
  width: 18px;
  height: 18px;
  margin-right: 10px;
  stroke: #9ca3af;
  stroke-width: 1.8;
  fill: none;
}

input {
  flex: 1;
  border: none;
  background: none;
  font-size: 14px;
  outline: none;
  color: #111827; /* var(--text-main) */
  width: 100%; /* Ensure input takes full width */
}
input::placeholder {
  color: #c1c7d5;
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
  stroke: #9ca3af;
  stroke-width: 1.8;
  fill: none;
}

.btn-primary {
  margin-top: 16px;
  width: 100%;
  height: 50px;
  border-radius: 999px;
  border: none;
  background: #2563eb; /* var(--primary) */
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 20px 36px rgba(37, 99, 235, 0.45);
  transition: 0.15s ease;
}
.btn-primary:hover {
  background: #1d4ed8; /* var(--primary-hover) */
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
  color: #2563eb; /* var(--primary) */
  text-decoration: none;
}

.divider {
  display: flex;
  align-items: center;
  margin: 24px 0 16px;
  font-size: 12px;
  color: #9ca3af;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e5e7eb;
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
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 0.15s;
}
.social-btn:hover {
  background: #eef2ff;
  border-color: #c7d2fe;
}
.social-icon {
  width: 20px;
  height: 20px;
  display: block;
}

.switch-row {
  margin-top: 22px;
  text-align: center;
  font-size: 14px;
  color: #6b7280; /* var(--text-sub) */
}
.switch-row a {
  color: #2563eb; /* var(--primary) */
  font-weight: 500;
  text-decoration: none;
  margin-left: 4px;
}

.legal {
  margin-top: 14px;
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
}
.legal a {
  color: #9ca3af;
  text-decoration: underline;
}

.error-text {
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
  margin-left: 4px;
}

@media (max-width: 640px) {
  .card {
    padding: 32px 22px 24px;
    border-radius: 22px;
  }
}
</style>
