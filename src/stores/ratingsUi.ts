import { defineStore } from 'pinia'
import { ref } from 'vue'

type DetailActionHandlers = {
  onAddPlayers: () => void
  onAddGame: () => void
  onEdit: () => void
  onDelete: () => void
}

export type RatingDetailTab = 'table' | 'games'

/** Шапка «Рейтинги» / страница рейтинга: вызовы из MainLayout. */
export const useRatingsUiStore = defineStore('ratingsUi', () => {
  let openCreateHandler: (() => void) | null = null
  let detailActionHandlers: DetailActionHandlers | null = null

  const detailTitle = ref('')
  const detailTab = ref<RatingDetailTab>('table')
  const addGameOpen = ref(false)
  const canAddGame = ref(false)
  const detailDeleting = ref(false)
  const tableSearchQuery = ref('')
  const gamesSearchQuery = ref('')

  function setOpenCreateHandler(fn: (() => void) | null) {
    openCreateHandler = fn
  }

  function requestOpenCreate() {
    openCreateHandler?.()
  }

  function setDetailTitle(title: string) {
    detailTitle.value = title
  }

  function setDetailActionHandlers(handlers: DetailActionHandlers | null) {
    detailActionHandlers = handlers
  }

  function setCanAddGame(value: boolean) {
    canAddGame.value = value
  }

  function setDetailDeleting(value: boolean) {
    detailDeleting.value = value
  }

  function requestAddPlayers() {
    detailActionHandlers?.onAddPlayers()
  }

  function requestAddGame() {
    detailActionHandlers?.onAddGame()
  }

  function requestEdit() {
    detailActionHandlers?.onEdit()
  }

  function requestDelete() {
    detailActionHandlers?.onDelete()
  }

  function setDetailTab(tab: RatingDetailTab) {
    detailTab.value = tab
  }

  function setAddGameOpen(value: boolean) {
    addGameOpen.value = value
  }

  function resetDetailUi() {
    detailTitle.value = ''
    detailTab.value = 'table'
    addGameOpen.value = false
    canAddGame.value = false
    detailDeleting.value = false
    tableSearchQuery.value = ''
    gamesSearchQuery.value = ''
    detailActionHandlers = null
  }

  return {
    detailTitle,
    detailTab,
    addGameOpen,
    canAddGame,
    detailDeleting,
    tableSearchQuery,
    gamesSearchQuery,
    setOpenCreateHandler,
    requestOpenCreate,
    setDetailTitle,
    setDetailTab,
    setAddGameOpen,
    setDetailActionHandlers,
    setCanAddGame,
    setDetailDeleting,
    requestAddPlayers,
    requestAddGame,
    requestEdit,
    requestDelete,
    resetDetailUi,
  }
})
