import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ModalState, ToastMessage, ModalPayloads } from '@/types'

export const useUIStore = defineStore('ui', () => {
  const modalState = ref<ModalState>({
    addSite: false,
    manageCategories: false,
    manageTags: false,
    settings: false,
    dataManagement: false,
    syncConflict: false
  })

  const modalData = ref<Partial<ModalPayloads>>({})
  const toasts = ref<ToastMessage[]>([])
  const isLoading = ref(false)
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

  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const showLoading = (message?: string) => {
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
