import { ref } from 'vue'
import { defineStore } from 'pinia'

/** Состояние UI «Управление лобби» (режим ведущего, вызовы модалок из шапки и т.д.). */
export const useLobbyManageUiStore = defineStore('lobbyManageUi', () => {
  const hostMode = ref(false)
  const designPickerOpenToken = ref(0)
  const designChangedToken = ref(0)
  const deleteConfirmOpenToken = ref(0)

  function requestOpenDesignPicker() {
    designPickerOpenToken.value += 1
  }

  function requestOpenDeleteConfirm() {
    deleteConfirmOpenToken.value += 1
  }

  function notifyDesignChanged() {
    designChangedToken.value += 1
  }

  function reset() {
    hostMode.value = false
    designPickerOpenToken.value = 0
    designChangedToken.value = 0
    deleteConfirmOpenToken.value = 0
  }

  return {
    hostMode,
    designPickerOpenToken,
    designChangedToken,
    deleteConfirmOpenToken,
    requestOpenDesignPicker,
    notifyDesignChanged,
    requestOpenDeleteConfirm,
    reset,
  }
})
