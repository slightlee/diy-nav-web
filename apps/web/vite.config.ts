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
        '/api/icon': {
          target: env.VITE_ICON_API_URL || 'http://localhost:8787',
          changeOrigin: true
        }
      }
    },
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia']
    }
  }
})
