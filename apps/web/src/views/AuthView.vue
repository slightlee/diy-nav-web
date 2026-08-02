<template>
  <AuthLayout>
    <!-- Logo -->
    <div class="logo-container">
      <BrandLogo link="/" title="返回首页">
        {{ NAVIGATION_BRAND_CONFIG.defaultIcon }}
      </BrandLogo>
      <span class="auth-brand-name">{{ NAVIGATION_BRAND_CONFIG.defaultTitle }}</span>
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
              <BaseButton
                variant="neutral-ghost"
                size="sm"
                :icon="showLoginPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"
                :aria-label="showLoginPassword ? '隐藏密码' : '显示密码'"
                @click="showLoginPassword = !showLoginPassword"
              />
            </div>
            <div v-if="loginErrors.password" class="error-text">{{ loginErrors.password }}</div>
          </div>

          <BaseButton block size="lg" class="auth-submit" html-type="submit" :loading="loading">
            {{ loading ? '登录中...' : '登录' }}
          </BaseButton>

          <div class="row-helper">
            <a href="#">忘记密码？</a>
          </div>

          <div class="divider"><span>或使用第三方登录</span></div>

          <div class="social-row">
            <BaseButton
              variant="secondary"
              size="md"
              shape="circle"
              class="social-btn"
              title="GitHub 登录"
              aria-label="GitHub 登录"
              @click="handleGitHubLogin"
            >
              <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                />
              </svg>
            </BaseButton>
            <BaseButton
              variant="secondary"
              size="md"
              shape="circle"
              class="social-btn"
              title="Google 登录"
              aria-label="Google 登录"
              @click="handleGoogleLogin"
            >
              <svg class="social-icon" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </BaseButton>
            <BaseButton
              variant="secondary"
              size="md"
              shape="circle"
              class="social-btn"
              title="Linuxdo 登录"
              aria-label="Linuxdo 登录"
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
            </BaseButton>
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
              <BaseButton
                variant="neutral-ghost"
                size="sm"
                :icon="showRegisterPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"
                :aria-label="showRegisterPassword ? '隐藏密码' : '显示密码'"
                @click="showRegisterPassword = !showRegisterPassword"
              />
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
              <BaseButton
                variant="neutral-ghost"
                size="sm"
                :icon="showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"
                :aria-label="showConfirmPassword ? '隐藏密码' : '显示密码'"
                @click="showConfirmPassword = !showConfirmPassword"
              />
            </div>
            <div v-if="registerErrors.confirmPassword" class="error-text">
              {{ registerErrors.confirmPassword }}
            </div>
          </div>

          <BaseButton block size="lg" class="auth-submit" html-type="submit" :loading="loading">
            {{ loading ? '注册中...' : '创建账号' }}
          </BaseButton>

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
import { NAVIGATION_BRAND_CONFIG } from '@nav/config/brand'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

import { isValidEmail, isValidPassword } from '@/utils/validators'
import { createOAuthLoginState, startOAuth, type OAuthProvider } from '@/utils/oauth'
import { AuthLayout, BaseButton, BrandLogo } from '@nav/ui'

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

const handleOAuthLogin = (provider: OAuthProvider) => {
  try {
    startOAuth(provider, createOAuthLoginState(), 'login')
  } catch (error) {
    uiStore.showToast(error instanceof Error ? error.message : '无法启动第三方登录', 'error')
  }
}

const handleLinuxDoLogin = () => handleOAuthLogin('linuxdo')
const handleGitHubLogin = () => handleOAuthLogin('github')
const handleGoogleLogin = () => handleOAuthLogin('google')

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

<style scoped lang="scss">
@use '@/styles/variables' as *;

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  margin-bottom: 28px;
}

.logo-container :deep(.logo-wrapper) {
  width: 52px;
  height: 52px;
}

.logo-container :deep(.logo) {
  border-radius: 15px;
  background: var(--primary-soft);
  color: var(--color-primary);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.08em;
  box-shadow: none;
}

.logo-container :deep(a.logo:hover) {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--primary-soft) 88%, var(--color-primary) 12%);
  box-shadow: 0 6px 14px rgba(var(--color-primary-rgb), 0.12);
}

.logo-container :deep(.logo-pulse) {
  display: none;
}

.auth-brand-name {
  color: var(--text-main);
  font-size: 20px;
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.02em;
}

/* 登录 / 注册视图容器 */
.auth-views {
  position: relative;
  min-height: 560px;
  width: 100%;
}

.view {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-normal);
}

.view.active {
  opacity: 1;
  pointer-events: auto;
}

.header {
  text-align: center;
  margin-bottom: 28px;
}

.header-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.02em;
  margin-bottom: var(--spacing-md);
  color: var(--text-main);
}

.header-sub {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 10px;
  color: var(--text-main);
  display: inline-flex;
  align-items: center;
}

.form-label span {
  color: var(--color-error);
  margin-left: var(--spacing-xs);
}

.input-wrap {
  height: 52px;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  background: var(--bg-tile);
  padding: 0 var(--spacing-lg);
  display: flex;
  align-items: center;
  transition: all var(--transition-fast);
}

.input-wrap:focus-within {
  border-color: var(--color-primary);
  background: var(--bg-tile-hover);
  box-shadow: 0 0 0 1px rgba(var(--color-primary-rgb), 0.35);
}

.input-icon {
  width: 18px;
  height: 18px;
  margin-right: var(--spacing-md);
  stroke: var(--text-muted);
  stroke-width: 1.8;
  fill: none;
}

input {
  flex: 1;
  border: none;
  background: none;
  font-size: var(--font-size-sm);
  outline: none;
  color: var(--text-main);
  width: 100%;
}

input::placeholder {
  color: var(--text-muted);
}

.auth-submit {
  margin-top: 24px;
}

.row-helper {
  margin-top: var(--spacing-md);
  text-align: right;
  font-size: var(--font-size-sm);
}

.row-helper a {
  color: var(--color-primary);
  text-decoration: none;
}

.divider {
  display: flex;
  align-items: center;
  margin: 28px 0 20px;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--color-border);
}

.divider span {
  margin: 0 var(--spacing-md);
  white-space: nowrap;
}

/* 三方登录 */
.social-row {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.social-btn {
  flex: 0 0 auto;
}

.social-icon {
  width: 20px;
  height: 20px;
  display: block;
}

.switch-row {
  margin-top: 24px;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.switch-row a {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  margin-left: var(--spacing-xs);
}

.legal {
  margin-top: 16px;
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.legal a {
  color: var(--text-muted);
  text-decoration: underline;
}

.error-text {
  color: var(--color-error);
  font-size: var(--font-size-xs);
  margin-top: var(--spacing-xs);
  margin-left: var(--spacing-xs);
}

/* Dark Mode overrides */
:global([data-theme='dark']) .social-icon polyline,
:global([data-theme='dark']) .social-icon line,
:global([data-theme='dark']) .social-icon path[fill='#111827'] {
  stroke: var(--text-main);
  fill: var(--text-main);
}
</style>
