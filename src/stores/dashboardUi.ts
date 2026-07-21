import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type DashboardLobbyFilter = 'all' | 'mine' | 'gomafia'

const CREATE_LOBBY_SESSION_KEY = 'plashki:dashboard:create-lobby-open'

function readCreateLobbyOpenFromSession(): boolean {
  try {
    return sessionStorage.getItem(CREATE_LOBBY_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function writeCreateLobbyOpenToSession(open: boolean) {
  try {
    if (open) sessionStorage.setItem(CREATE_LOBBY_SESSION_KEY, '1')
    else sessionStorage.removeItem(CREATE_LOBBY_SESSION_KEY)
  } catch {
    // sessionStorage недоступен (SSR / приватный режим)
  }
}

/** Шапка дашборда: фильтр списка лобби на /dashboard */
export const useDashboardUiStore = defineStore('dashboardUi', () => {
  const lobbyFilter = ref<DashboardLobbyFilter>('all')
  /** Поиск по названию турнира / лобби (локальный фильтр списка). */
  const tournamentSearchQuery = ref('')
  /** Режим «Создать лобби» на весь блок main (не модалка). */
  const createLobbyOpen = ref(readCreateLobbyOpenFromSession())

  watch(createLobbyOpen, (open) => {
    writeCreateLobbyOpenToSession(open)
  })

  function resetLobbyFilter() {
    lobbyFilter.value = 'all'
    tournamentSearchQuery.value = ''
  }

  function openCreateLobby() {
    createLobbyOpen.value = true
  }

  function closeCreateLobby() {
    createLobbyOpen.value = false
  }

  return {
    lobbyFilter,
    tournamentSearchQuery,
    createLobbyOpen,
    resetLobbyFilter,
    openCreateLobby,
    closeCreateLobby,
  }
})
