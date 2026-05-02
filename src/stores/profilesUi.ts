import { ref } from 'vue'
import { defineStore } from 'pinia'

/** Шапка «Мои игроки»: поиск, счётчик, вызов «Создать» (без Teleport). */
export const useProfilesUiStore = defineStore('profilesUi', () => {
  const searchQuery = ref('')
  /** Всего карточек игроков — обновляет ProfilesView после загрузки списка. */
  const playerCardsTotal = ref(0)

  let openCreateHandler: (() => void) | null = null

  function setOpenCreateHandler(fn: (() => void) | null) {
    openCreateHandler = fn
  }

  function requestOpenCreate() {
    openCreateHandler?.()
  }

  function resetSearch() {
    searchQuery.value = ''
  }

  return {
    searchQuery,
    playerCardsTotal,
    setOpenCreateHandler,
    requestOpenCreate,
    resetSearch,
  }
})
