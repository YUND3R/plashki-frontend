import { ref } from 'vue'
import { defineStore } from 'pinia'

export type DashboardLobbyFilter = 'all' | 'mine' | 'gomafia'

/** Шапка дашборда: фильтр списка лобби на /dashboard */
export const useDashboardUiStore = defineStore('dashboardUi', () => {
  const lobbyFilter = ref<DashboardLobbyFilter>('all')
  /** Поиск по названию турнира / лобби (локальный фильтр списка). */
  const tournamentSearchQuery = ref('')
  /** Режим «Создать лобби» на весь блок main (не модалка). */
  const createLobbyOpen = ref(false)

  function resetLobbyFilter() {
    lobbyFilter.value = 'all'
    tournamentSearchQuery.value = ''
  }

  function closeCreateLobby() {
    createLobbyOpen.value = false
  }

  return {
    lobbyFilter,
    tournamentSearchQuery,
    createLobbyOpen,
    resetLobbyFilter,
    closeCreateLobby,
  }
})
