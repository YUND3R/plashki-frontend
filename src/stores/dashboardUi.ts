import { ref } from 'vue'
import { defineStore } from 'pinia'

export type DashboardLobbyFilter = 'all' | 'mine' | 'gomafia'

/** Шапка дашборда: фильтр списка лобби на /dashboard */
export const useDashboardUiStore = defineStore('dashboardUi', () => {
  const lobbyFilter = ref<DashboardLobbyFilter>('all')
  /** Поиск по названию турнира / лобби (локальный фильтр списка). */
  const tournamentSearchQuery = ref('')

  function resetLobbyFilter() {
    lobbyFilter.value = 'all'
    tournamentSearchQuery.value = ''
  }

  return {
    lobbyFilter,
    tournamentSearchQuery,
    resetLobbyFilter,
  }
})
