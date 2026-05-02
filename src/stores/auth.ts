import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getAccessToken, loadAccessTokenFromStorage, setAccessToken } from '@/api/client'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getAccessToken())

  function syncToken() {
    token.value = getAccessToken()
  }

  function setToken(value: string | null) {
    setAccessToken(value)
    syncToken()
  }

  function hydrateFromStorage() {
    loadAccessTokenFromStorage()
    syncToken()
  }

  return { token, setToken, syncToken, hydrateFromStorage }
})
