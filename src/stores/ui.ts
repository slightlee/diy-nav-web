import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ModalState, ToastMessage, ModalPayloads } from '@/types'

export const useUIStore = defineStore('ui', () => {
  // 状态
  const modalState = ref<ModalState>({
    addSite: false,
    manageCategories: false,
    manageTags: false,
    settings: false,
    dataManagement: false
  })

  const modalData = ref<Partial<ModalPayloads>>({})
  const toasts = ref<ToastMessage[]>([])
  const isLoading = ref(false)
  const sidebarOpen = ref(false)

  // 动作
  const openModal = <K extends keyof ModalState>(modalName: K, data?: ModalPayloads[K]) => {
    modalState.value[modalName] = true
    if (data !== undefined) {
      modalData.value[modalName] = data
    }
  }

  const closeModal = (modalName: keyof ModalState) => {
    modalState.value[modalName] = false
    // 清除模态框数据
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

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info', duration: number = 3000) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2)

    const toast: ToastMessage = {
      id,
      message,
      type,
      duration
    }

    toasts.value.push(toast)

    // 自动移除
    setTimeout(() => {
      const index = toasts.value.findIndex(t => t.id === id)
      if (index !== -1) {
        toasts.value.splice(index, 1)
      }
    }, duration)
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }

  return {
    // 状态
    modalState,
    modalData,
    toasts,
    isLoading,
    sidebarOpen,

    // 动作
    openModal,
    closeModal,
    closeAllModals,
    getModalData,
    showToast,
    removeToast,
    setLoading,
    toggleSidebar
  }
})
