import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
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
    host: true
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia']
  }
})
