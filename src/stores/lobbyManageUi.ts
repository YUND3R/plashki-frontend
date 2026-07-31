import { ref } from 'vue'
import { defineStore } from 'pinia'

/** Состояние UI «Управление лобби» (режим ведущего, вызовы модалок из шапки и т.д.). */
export const useLobbyManageUiStore = defineStore('lobbyManageUi', () => {
  const hostMode = ref(false)
  const designPickerOpen = ref(false)
  const designPickerOpenToken = ref(0)
  const designPickerLobbyTitle = ref('')
  const addToRatingOpen = ref(false)
  const designChangedToken = ref(0)
  const deleteConfirmOpenToken = ref(0)
  const addToRatingOpenToken = ref(0)

  /** Запрос на открытие: LobbyManageView проверяет права и вызывает openDesignPicker(). */
  function requestOpenDesignPicker() {
    designPickerOpenToken.value += 1
  }

  function openDesignPicker() {
    designPickerOpen.value = true
  }

  function closeDesignPicker() {
    designPickerOpen.value = false
  }

  function openAddToRating() {
    addToRatingOpen.value = true
  }

  function closeAddToRating() {
    addToRatingOpen.value = false
  }

  function setDesignPickerLobbyTitle(title: string) {
    designPickerLobbyTitle.value = title.trim()
  }

  function requestOpenDeleteConfirm() {
    deleteConfirmOpenToken.value += 1
  }

  /** Запрос на открытие: LobbyManageView проверяет права и вызывает openAddToRatingModal(). */
  function requestOpenAddToRating() {
    addToRatingOpenToken.value += 1
  }

  function notifyDesignChanged() {
    designChangedToken.value += 1
  }

  function reset() {
    hostMode.value = false
    designPickerOpen.value = false
    designPickerOpenToken.value = 0
    designPickerLobbyTitle.value = ''
    addToRatingOpen.value = false
    designChangedToken.value = 0
    deleteConfirmOpenToken.value = 0
    addToRatingOpenToken.value = 0
  }

  return {
    hostMode,
    designPickerOpen,
    designPickerOpenToken,
    designPickerLobbyTitle,
    addToRatingOpen,
    designChangedToken,
    deleteConfirmOpenToken,
    addToRatingOpenToken,
    requestOpenDesignPicker,
    openDesignPicker,
    closeDesignPicker,
    openAddToRating,
    closeAddToRating,
    setDesignPickerLobbyTitle,
    notifyDesignChanged,
    requestOpenDeleteConfirm,
    requestOpenAddToRating,
    reset,
  }
})
