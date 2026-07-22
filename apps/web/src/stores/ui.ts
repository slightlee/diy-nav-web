import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ModalState, ToastMessage, ModalPayloads } from '@/types'

export const useUIStore = defineStore('ui', () => {
  const modalState = ref<ModalState>({
    addSite: false,
    manageCategories: false,
    manageTags: false,
    accountPanel: false,
    settings: false,
    dataManagement: false,
    aiSettings: false,
    syncConflict: false,
    syncRecovery: false
  })

  const modalData = ref<Partial<ModalPayloads>>({})
  const toasts = ref<ToastMessage[]>([])
  const isLoading = ref(false)
  const loadingMessage = ref('加载中…')
  const sidebarOpen = ref(false)

  const openModal = <K extends keyof ModalState>(modalName: K, data?: ModalPayloads[K]) => {
    modalState.value[modalName] = true
    if (data !== undefined) modalData.value[modalName] = data
  }

  const closeModal = (modalName: keyof ModalState) => {
    modalState.value[modalName] = false
    delete modalData.value[modalName]
  }

  const closeAllModals = () => {
    Object.keys(modalState.value).forEach(key => {
      modalState.value[key as keyof ModalState] = false
    })
    modalData.value = {}
  }

  const getModalData = <K extends keyof ModalState>(modalName: K) => {
    return modalData.value[modalName] as ModalPayloads[K] | undefined
  }

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    duration = 3000
  ) => {
    const exists = toasts.value.some(t => t.message === message && t.type === type)
    if (exists) return
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2)
    const toast: ToastMessage = { id, message, type, duration }
    toasts.value.push(toast)
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) toasts.value.splice(index, 1)
  }

  const setLoading = (loading: boolean, message = '加载中…') => {
    isLoading.value = loading
    if (loading) loadingMessage.value = message
  }

  const showLoading = (message = '加载中…') => {
    loadingMessage.value = message
    isLoading.value = true
    return {
      close: () => {
        isLoading.value = false
      }
    }
  }

  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }

  return {
    modalState,
    modalData,
    toasts,
    isLoading,
    loadingMessage,
    sidebarOpen,
    openModal,
    closeModal,
    closeAllModals,
    getModalData,
    showToast,
    removeToast,
    setLoading,
    showLoading,
    toggleSidebar
  }
})
