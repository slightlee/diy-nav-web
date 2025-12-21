/**
 * AI Store
 * Manages AI-related state for the application
 */

import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import {
  getAIProviders,
  addAIProvider,
  deleteAIProvider,
  getAIUsage,
  type AIProvider,
  type AIProviderInput,
  type AIUsageStats
} from '@/api/ai'
import { useAuthStore } from './auth'

export const useAIStore = defineStore('ai', () => {
  const authStore = useAuthStore()

  // State
  const providers = ref<AIProvider[]>([])
  const usage = ref<AIUsageStats | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const isAvailable = computed(() => authStore.isAuthenticated)
  const defaultProvider = computed(() => providers.value.find(p => p.isDefault))
  const hasProviders = computed(() => providers.value.length > 0)

  /**
   * Load user's AI providers
   */
  async function loadProviders() {
    if (!authStore.isAuthenticated) return

    isLoading.value = true
    error.value = null
    try {
      providers.value = await getAIProviders()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Add a new AI provider
   */
  async function addProvider(input: AIProviderInput) {
    isLoading.value = true
    error.value = null
    try {
      const provider = await addAIProvider(input)
      providers.value.push(provider)
      return provider
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Remove an AI provider
   */
  async function removeProvider(id: string) {
    isLoading.value = true
    error.value = null
    try {
      await deleteAIProvider(id)
      const index = providers.value.findIndex(p => p.id === id)
      if (index !== -1) {
        providers.value.splice(index, 1)
      }
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load usage statistics
   */
  async function loadUsage() {
    if (!authStore.isAuthenticated) return

    try {
      usage.value = await getAIUsage()
    } catch (e) {
      error.value = (e as Error).message
    }
  }

  /**
   * Clear all AI state (e.g., on logout)
   */
  function clearState() {
    providers.value = []
    usage.value = null
    error.value = null
  }

  return {
    // State
    providers: readonly(providers),
    usage: readonly(usage),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Computed
    isAvailable,
    defaultProvider,
    hasProviders,

    // Actions
    loadProviders,
    addProvider,
    removeProvider,
    loadUsage,
    clearState
  }
})
