<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  getLobbyImportedParticipants,
  listMyLobbies,
  type GameLobby,
} from '@/api/lobbies'
import CardDesignPickerPanel from '@/components/cardDesign/CardDesignPickerPanel.vue'
import goLobbyIcon from '@/assets/icons/go.svg?url'

type DashboardLobbyEntry = {
  id: string
  name: string
  createdAt: string
  playerCount: number
  tournamentHumansCount: number | null
  fromGomafia: boolean
}

const savedLobbies = ref<DashboardLobbyEntry[]>([])
const selectedLobbyId = ref('')
const loading = ref(false)

function lobbyTitleFromLobby(lobby: GameLobby): string {
  const row = lobby as GameLobby & {
    name?: string | null
    lobby_name?: string | null
    title?: string | null
    lobby_title?: string | null
  }
  const title = [row.name, row.lobby_name, row.title, row.lobby_title].find(
    (value) => typeof value === 'string' && value.trim(),
  )
  if (typeof title === 'string') return title.trim()
  return `Лобби ${lobby.id.slice(0, 8)}`
}

function formatLobbyDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function playersWord(n: number): string {
  const m = n % 100
  const m10 = n % 10
  if (m10 === 1 && m !== 11) return 'игрок'
  if (m10 >= 2 && m10 <= 4 && (m < 12 || m > 14)) return 'игрока'
  return 'игроков'
}

function humansWord(n: number): string {
  const m = n % 100
  const m10 = n % 10
  if (m10 === 1 && m !== 11) return 'человек'
  if (m10 >= 2 && m10 <= 4 && (m < 12 || m > 14)) return 'человека'
  return 'человек'
}

function lobbyPeopleLine(lobby: DashboardLobbyEntry): string {
  if (lobby.tournamentHumansCount != null) {
    const n = lobby.tournamentHumansCount
    return `${n} ${humansWord(n)}`
  }
  return `${lobby.playerCount} ${playersWord(lobby.playerCount)}`
}

function lobbyDesc(lobby: DashboardLobbyEntry): string {
  const parts = [lobbyPeopleLine(lobby)]
  const date = formatLobbyDate(lobby.createdAt)
  if (date) parts.push(date)
  return parts.join(' · ')
}

async function loadLobbies() {
  loading.value = true
  try {
    const list = await listMyLobbies()
    savedLobbies.value = await Promise.all(
      list.map(async (lobby): Promise<DashboardLobbyEntry> => {
        let tournamentHumansCount: number | null = null
        if (lobby.imported_state) {
          try {
            const importedLines = await getLobbyImportedParticipants(lobby.id)
            if (importedLines.length > 0) tournamentHumansCount = importedLines.length
          } catch {
            tournamentHumansCount = null
          }
        }

        return {
          id: lobby.id,
          name: lobbyTitleFromLobby(lobby),
          createdAt: lobby.created_at,
          playerCount: lobby.players.length,
          tournamentHumansCount,
          fromGomafia: !!lobby.imported_state,
        }
      }),
    )
  } catch {
    savedLobbies.value = []
  } finally {
    loading.value = false
  }

  if (!savedLobbies.value.length) {
    selectedLobbyId.value = ''
    return
  }
  const exists = savedLobbies.value.some((x) => x.id === selectedLobbyId.value)
  if (!exists) selectedLobbyId.value = savedLobbies.value[0].id
}

onMounted(async () => {
  await loadLobbies()
})
</script>

<template>
  <section class="card-design">
    <article class="card-design__panel">
      <div v-if="!savedLobbies.length && !loading" class="card-design__empty">
        <h2 class="card-design__empty-title">Нет доступных лобби</h2>
        <p class="card-design__empty-text">
          Сначала создайте игровое лобби на панели управления, затем вернитесь сюда и выберите дизайн
          карточек.
        </p>
        <RouterLink class="card-design__empty-link" :to="{ name: 'dashboard' }">
          Перейти к панели управления
        </RouterLink>
      </div>

      <template v-else>
        <div class="card-design__layout">
          <aside class="card-design__lobbies" aria-label="Ваши лобби">
            <ul class="card-design__lobby-list">
              <li v-for="lobby in savedLobbies" :key="lobby.id">
                <button
                  type="button"
                  class="card-design__lobby-item"
                  :class="{ 'card-design__lobby-item--selected': selectedLobbyId === lobby.id }"
                  :disabled="loading"
                  @click="selectedLobbyId = lobby.id"
                >
                  <span
                    class="card-design__lobby-icon"
                    :class="
                      lobby.fromGomafia
                        ? 'card-design__lobby-icon--gomafia'
                        : 'card-design__lobby-icon--saved'
                    "
                    aria-hidden="true"
                  >
                    <img
                      v-if="lobby.fromGomafia"
                      :src="goLobbyIcon"
                      alt=""
                      class="card-design__lobby-go-icon"
                      width="26"
                      height="24"
                    />
                    <svg
                      v-else
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>
                  <span class="card-design__lobby-text">
                    <span class="card-design__lobby-title">{{ lobby.name }}</span>
                    <span class="card-design__lobby-desc">{{ lobbyDesc(lobby) }}</span>
                  </span>
                </button>
              </li>
            </ul>
          </aside>

          <CardDesignPickerPanel v-if="selectedLobbyId" :key="selectedLobbyId" :lobby-id="selectedLobbyId" />
        </div>
      </template>
    </article>
  </section>
</template>

<style scoped>
.card-design {
  width: 100%;
  margin: 0;
  padding: 0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.card-design__panel {
  border: none;
  border-radius: 0;
  background: transparent;
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.card-design__layout {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 0;
  align-items: stretch;
  flex: 1;
  min-height: 0;
  background: #fff;
}

.card-design__lobbies {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  min-height: 0;
  height: 100%;
  padding: 0;
  border-right: 1px solid #e5e7eb;
  overflow: hidden;
}

.card-design__lobby-list {
  list-style: none;
  margin: 0;
  padding: 0.75rem;
  display: grid;
  gap: 0.5rem;
  align-content: start;
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.card-design__lobby-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
  padding: 0.65rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.card-design__lobby-item:hover:not(:disabled) {
  border-color: #cbd5e1;
  background: #f9fafb;
}

.card-design__lobby-item--selected {
  border-color: #60a5fa;
  background: #eff6ff;
}

.card-design__lobby-item:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 1px;
}

.card-design__lobby-item:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.card-design__lobby-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 10px;
  background: #eff6ff;
  color: #2f6feb;
}

.card-design__lobby-icon--saved {
  background: #eef4ff;
  color: #2563eb;
}

.card-design__lobby-icon--gomafia {
  background: rgba(137, 119, 254, 0.08);
  color: #8977fe;
}

.card-design__lobby-go-icon {
  display: block;
  width: 22px;
  height: auto;
  max-height: 20px;
  object-fit: contain;
}

.card-design__lobby-text {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.card-design__lobby-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-design__lobby-desc {
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.35;
}

.card-design__empty {
  display: grid;
  gap: 0.65rem;
  padding: 1.5rem 0.5rem;
  text-align: center;
}

.card-design__empty-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #111827;
}

.card-design__empty-text {
  margin: 0 auto;
  max-width: 28rem;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: #6b7280;
}

.card-design__empty-link {
  justify-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.35rem;
  padding: 0 0.9rem;
  border-radius: 8px;
  background: #2f6feb;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
}

.card-design__empty-link:hover {
  background: #2563eb;
}

@media (max-width: 860px) {
  .card-design__layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .card-design__lobbies {
    height: auto;
    max-height: 40vh;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }

  .card-design__lobby-list {
    max-height: 28vh;
  }
}
</style>
