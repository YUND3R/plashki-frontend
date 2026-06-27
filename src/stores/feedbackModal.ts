import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useFeedbackModalStore = defineStore('feedbackModal', () => {
  const isOpen = ref(false)
  const toastMessage = ref('')
  const toastVisible = ref(false)
  let toastHideTimer: ReturnType<typeof setTimeout> | null = null

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function showToast(message: string, ms = 2600) {
    if (toastHideTimer) {
      clearTimeout(toastHideTimer)
      toastHideTimer = null
    }
    toastMessage.value = message
    toastVisible.value = true
    toastHideTimer = setTimeout(() => {
      toastVisible.value = false
      toastHideTimer = null
    }, ms)
  }

  return { isOpen, toastMessage, toastVisible, open, close, showToast }
})
