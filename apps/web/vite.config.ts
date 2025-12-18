import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const envDir = resolve(__dirname, '../../')
  const env = loadEnv(mode, envDir, '')
  Object.assign(process.env, env)
  return {
    envDir,
    base: process.env.VITE_BASE ?? '/',
    plugins: [vue() as Plugin],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '$border-radius: 0.5rem;'
        }
      }
    },
    server: {
      port: 3000,
      open: false,
      host: true,
      proxy: {
        '/api': {
          // 本地开发代理目标始终指向后端服务端口
          target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8787',
          changeOrigin: true
        }
      }
    },
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia']
    }
  }
})
