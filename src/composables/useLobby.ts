import { ref } from 'vue'
import { createLobby, getLobby, type GameLobby } from '@/api/lobbies'

/** В API нет GET /lobbies - только создание и получение по id. */
export function useLobby() {
  const lobby = ref<GameLobby | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function createNew() {
    loading.value = true
    error.value = null
    try {
      lobby.value = await createLobby({ title: 'Новое лобби' })
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function loadById(lobbyId: string) {
    loading.value = true
    error.value = null
    try {
      lobby.value = await getLobby(lobbyId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  return { lobby, loading, error, createNew, loadById }
}
