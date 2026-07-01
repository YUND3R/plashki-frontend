import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { OverlayDesignCode } from '@/api/listQuery'

export type DashboardLobbyFilter = 'all' | 'mine' | 'gomafia'
export type DashboardOverlayDesignFilter = '' | OverlayDesignCode
export type DashboardLobbySortBy = 'created_at' | 'title' | 'max_players'

/** Шапка дашборда: фильтр списка лобби на /dashboard */
export const useDashboardUiStore = defineStore('dashboardUi', () => {
  const lobbyFilter = ref<DashboardLobbyFilter>('all')
  /** Поиск по названию турнира / лобби (подстрочное совпадение). */
  const tournamentSearchQuery = ref('')
  const overlayDesignFilter = ref<DashboardOverlayDesignFilter>('')
  const sortBy = ref<DashboardLobbySortBy>('created_at')
  const sortOrder = ref<'asc' | 'desc'>('desc')
  const lobbyListPage = ref(0)

  function resetLobbyFilter() {
    lobbyFilter.value = 'all'
    tournamentSearchQuery.value = ''
    overlayDesignFilter.value = ''
    sortBy.value = 'created_at'
    sortOrder.value = 'desc'
    lobbyListPage.value = 0
  }

  return {
    lobbyFilter,
    tournamentSearchQuery,
    overlayDesignFilter,
    sortBy,
    sortOrder,
    lobbyListPage,
    resetLobbyFilter,
  }
})
