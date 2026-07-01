<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRouter } from 'vue-router'
import type { GameLobby, LobbyListParams } from '@/api/lobbies'
import {
  deleteLobby,
  getLobbyImportedParticipants,
  getLobbyOverlayDesigns,
  importGomafiaTournament,
  listLobbies,
} from '@/api/lobbies'
import { useDashboardUiStore } from '@/stores/dashboardUi'
import type { DashboardLobbyFilter } from '@/stores/dashboardUi'
import deleteLobbyIcon from '@/assets/icons/delete.svg?url'
import goLobbyIcon from '@/assets/icons/go.svg?url'
import CreateLobbyModal from '@/components/dashboard/CreateLobbyModal.vue'

type DashboardLobbyEntry = {
  id: string
  name: string
  createdAt: string
  /** Мест за столом в лобби (показ для обычных лобби). */
  playerCount: number
  /**
   * Для GoMafia: число строк из GET imported-participants (участники турнира), иначе null.
   */
  tournamentHumansCount: number | null
  /** Лобби загружено из GoMafia (иначе создано через «Создать игровое лобби»). */
  fromGomafia: boolean
  /** Текущий overlay-дизайн карточек (название из API или по коду). */
  cardDesignLabel: string
}

function overlayDesignFallbackLabel(code: string): string {
  const value = code.trim().toLowerCase()
  if (!value) return 'Classic'
  return value
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((part) => (part[0] ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}

const router = useRouter()
const dashboardUi = useDashboardUiStore()
const { tournamentSearchQuery, lobbyFilter } = storeToRefs(dashboardUi)
const apiBase = computed(() => import.meta.env.VITE_API_BASE_URL ?? '(не задан - скопируйте .env.example в .env)')

const modalOpen = ref(false)
const importOpen = ref(false)
const importUrl = ref('')
const importSubmitting = ref(false)
const importError = ref<string | null>(null)
const savedLobbies = ref<DashboardLobbyEntry[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const deletingLobbyId = ref<string | null>(null)

const deleteConfirmOpen = ref(false)
const pendingDelete = ref<DashboardLobbyEntry | null>(null)
const deleteActionError = ref<string | null>(null)
const deleteDialogWrapRef = ref<HTMLElement | null>(null)

function lobbyTitle(lobby: GameLobby): string {
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

function lobbyFilterToSource(filter: DashboardLobbyFilter): LobbyListParams['source'] {
  if (filter === 'mine') return 'created'
  if (filter === 'gomafia') return 'imported'
  return 'all'
}

function buildLobbyListParams(): LobbyListParams {
  return { source: lobbyFilterToSource(lobbyFilter.value) }
}

async function refreshLobbies() {
  loading.value = true
  loadError.value = null
  try {
    const list = await listLobbies(buildLobbyListParams())
    const withDesign = await Promise.all(
      list.map(async (lobby): Promise<DashboardLobbyEntry> => {
        let cardDesignLabel = '-'
        try {
          const data = await getLobbyOverlayDesigns(lobby.id)
          const code = (data.selected_overlay_design ?? '').trim()
          const opt = (data.options ?? []).find((o) => o.code === code)
          const title = typeof opt?.title === 'string' ? opt.title.trim() : ''
          cardDesignLabel = title || overlayDesignFallbackLabel(code)
        } catch {
          cardDesignLabel = '-'
        }

        let tournamentHumansCount: number | null = null
        if (lobby.imported_state) {
          try {
            const importedLines = await getLobbyImportedParticipants(lobby.id)
            if (importedLines.length > 0) {
              tournamentHumansCount = importedLines.length
            }
          } catch {
            tournamentHumansCount = null
          }
        }

        return {
          id: lobby.id,
          name: lobbyTitle(lobby),
          createdAt: lobby.created_at,
          playerCount: lobby.players.length,
          tournamentHumansCount,
          fromGomafia: !!lobby.imported_state,
          cardDesignLabel,
        }
      }),
    )
    savedLobbies.value = withDesign
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Не удалось загрузить лобби'
    savedLobbies.value = []
  } finally {
    loading.value = false
  }
}

const filteredSavedLobbies = computed(() => {
  const q = tournamentSearchQuery.value.trim().toLowerCase()
  if (!q) return savedLobbies.value
  return savedLobbies.value.filter((item) => item.name.toLowerCase().includes(q))
})

/** Сообщение, если список пуст при ненулевом списке сохранённых лобби */
const dashboardListEmptyHint = computed(() => {
  const q = tournamentSearchQuery.value.trim()
  if (q && !filteredSavedLobbies.value.length) {
    return 'Ничего не найдено по этому названию.'
  }
  return ''
})

watch(lobbyFilter, () => {
  void refreshLobbies()
})

onMounted(() => {
  void refreshLobbies()
})

onUnmounted(() => {
  dashboardUi.resetLobbyFilter()
})

watch(deleteConfirmOpen, async (open) => {
  if (!open) return
  deleteActionError.value = null
  await nextTick()
  deleteDialogWrapRef.value?.focus()
})

function openDeleteConfirm(item: DashboardLobbyEntry) {
  pendingDelete.value = item
  deleteActionError.value = null
  deleteConfirmOpen.value = true
}

function closeDeleteConfirm() {
  if (deletingLobbyId.value) return
  deleteConfirmOpen.value = false
  pendingDelete.value = null
  deleteActionError.value = null
}

function closeDeleteConfirmForced() {
  deleteConfirmOpen.value = false
  pendingDelete.value = null
  deleteActionError.value = null
}

function onDeleteDialogEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && deleteConfirmOpen.value && !deletingLobbyId.value) {
    e.preventDefault()
    closeDeleteConfirm()
  }
}

function onDeleteBackdropPointerDown() {
  if (!deletingLobbyId.value) closeDeleteConfirm()
}

function openCreateModal() {
  modalOpen.value = true
}

function openImportForm() {
  importOpen.value = true
  importError.value = null
}

function closeImportForm() {
  if (importSubmitting.value) return
  importOpen.value = false
  importUrl.value = ''
  importError.value = null
}

const GOMAFIA_IMPORT_WRONG_URL_MSG = 'Вы указали неверную ссылку'

/** Строго: https://gomafia.pro/tournament/<id>?tab=games (https, хост gomafia.pro, id - только цифры). */
function isValidGomafiaTournamentImportUrl(raw: string): boolean {
  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    return false
  }
  if (u.protocol !== 'https:') return false
  if (u.hostname.toLowerCase() !== 'gomafia.pro') return false
  const path = u.pathname.replace(/\/+$/, '') || '/'
  if (!/^\/tournament\/\d+$/.test(path)) return false
  return u.searchParams.get('tab') === 'games'
}

async function submitImport() {
  const link = importUrl.value.trim()
  if (!link) {
    importError.value = 'Вставьте ссылку на турнир GoMafia'
    return
  }
  if (!isValidGomafiaTournamentImportUrl(link)) {
    importError.value = GOMAFIA_IMPORT_WRONG_URL_MSG
    return
  }

  const parsedUrl = new URL(link)

  importSubmitting.value = true
  importError.value = null
  try {
    const lobby = await importGomafiaTournament({ url: parsedUrl.toString() })
    await refreshLobbies()
    closeImportForm()
    void router.push({ name: 'lobby-manage', params: { lobbyId: lobby.id } })
  } catch (e) {
    importError.value = e instanceof Error ? e.message : 'Не удалось загрузить турнир'
  } finally {
    importSubmitting.value = false
  }
}

function onLobbyCreated(payload: { lobby: GameLobby; name: string }) {
  const { lobby } = payload
  void refreshLobbies()
  void router.push({ name: 'lobby-manage', params: { lobbyId: lobby.id } })
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

function dashboardLobbyPeopleLine(item: DashboardLobbyEntry): string {
  if (item.tournamentHumansCount != null) {
    const n = item.tournamentHumansCount
    return `${n} ${humansWord(n)}`
  }
  return `${item.playerCount} ${playersWord(item.playerCount)}`
}

async function executeDeleteLobby(item: DashboardLobbyEntry) {
  deletingLobbyId.value = item.id
  loadError.value = null
  deleteActionError.value = null
  try {
    await deleteLobby(item.id)
    savedLobbies.value = savedLobbies.value.filter((lobby) => lobby.id !== item.id)
    closeDeleteConfirmForced()
    if (
      router.currentRoute.value?.name === 'lobby-manage' &&
      router.currentRoute.value?.params?.lobbyId === item.id
    ) {
      void router.push({ name: 'dashboard' })
    }
  } catch (e) {
    deleteActionError.value = e instanceof Error ? e.message : 'Не удалось удалить лобби'
  } finally {
    deletingLobbyId.value = null
  }
}

async function confirmDeleteLobby() {
  const item = pendingDelete.value
  if (!item || deletingLobbyId.value) return
  await executeDeleteLobby(item)
}
</script>

<template>
  <section class="dashboard">
    <div class="dashboard__actions">
      <button type="button" class="dashboard-lobby-card dashboard-lobby-card--action" @click="openCreateModal">
        <span class="dashboard-lobby-card__icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </span>
        <span class="dashboard-lobby-card__text">
          <span class="dashboard-lobby-card__title">Создать игровое лобби</span>
          <span class="dashboard-lobby-card__desc">Новая комната для игры</span>
        </span>
      </button>

      <button
        type="button"
        class="dashboard-lobby-card dashboard-lobby-card--action"
        :aria-expanded="importOpen"
        @click="openImportForm"
      >
        <span class="dashboard-lobby-card__icon dashboard-lobby-card__icon--import" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 3v10m0 0l-4-4m4 4l4-4M4 15v3a3 3 0 003 3h10a3 3 0 003-3v-3"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span class="dashboard-lobby-card__text">
          <span class="dashboard-lobby-card__title">Загрузить турнир из GoMafia</span>
          <span class="dashboard-lobby-card__desc">Вставьте ссылку на турнир и загрузите лобби</span>
        </span>
      </button>
    </div>

    <CreateLobbyModal v-model="modalOpen" @created="onLobbyCreated" />

    <p v-if="loading" class="dashboard__text">Загружаем лобби из базы…</p>
    <p v-else-if="loadError" class="dashboard__text dashboard__text--error" role="alert">{{ loadError }}</p>

    <div v-if="savedLobbies.length || tournamentSearchQuery.trim()" class="dashboard__created">
      <div class="dashboard__created-head">
        <h2 class="dashboard__created-title">Созданные лобби</h2>
      </div>
      <ul v-if="filteredSavedLobbies.length" class="dashboard__created-list">
        <li v-for="item in filteredSavedLobbies" :key="item.id">
          <div class="dashboard-lobby-card dashboard-lobby-card--saved-shell">
            <RouterLink
              class="dashboard-lobby-card__nav"
              :to="{ name: 'lobby-manage', params: { lobbyId: item.id } }"
            >
              <span
                class="dashboard-lobby-card__icon"
                :class="item.fromGomafia ? 'dashboard-lobby-card__icon--gomafia' : 'dashboard-lobby-card__icon--saved'"
                aria-hidden="true"
              >
                <img
                  v-if="item.fromGomafia"
                  :src="goLobbyIcon"
                  alt=""
                  class="dashboard-lobby-card__go-icon"
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
              <span class="dashboard-lobby-card__text">
                <span class="dashboard-lobby-card__title">{{ item.name }}</span>
                <span class="dashboard-lobby-card__desc">
                  {{ dashboardLobbyPeopleLine(item) }}
                  <template v-if="formatLobbyDate(item.createdAt)">
                    · {{ formatLobbyDate(item.createdAt) }}
                  </template>
                  <span class="dashboard-lobby-card__design-sep" aria-hidden="true"> · </span>
                  <span class="dashboard-lobby-card__design">Дизайн карточек: {{ item.cardDesignLabel }}</span>
                </span>
              </span>
            </RouterLink>
            <button
              type="button"
              class="dashboard-lobby-card__delete"
              :disabled="deletingLobbyId === item.id"
              :aria-label="`Удалить лобби ${item.name}`"
              @click.stop="openDeleteConfirm(item)"
            >
              <img :src="deleteLobbyIcon" alt="" class="dashboard-lobby-card__delete-img" width="16" height="20" />
            </button>
          </div>
        </li>
      </ul>
      <p v-else-if="!loading" class="dashboard__filter-empty">{{ dashboardListEmptyHint || 'Список лобби пуст.' }}</p>
    </div>

    <p class="dashboard__text">База API: <code>{{ apiBase }}</code></p>
  </section>

  <Teleport to="body">
    <Transition name="app-modal">
      <div v-if="importOpen" class="app-modal dashboard-import-modal" role="presentation">
        <div class="app-modal__backdrop" aria-hidden="true" @click.self="closeImportForm" />
        <div
          class="app-modal__wrap dashboard-import-modal__wrap"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gomafia-import-title"
        >
          <div class="app-modal__panel dashboard-import-modal__panel">
            <div class="app-modal__head">
              <h2 id="gomafia-import-title" class="app-modal__title">Загрузка турнира из GoMafia</h2>
              <button
                type="button"
                class="app-modal__close"
                aria-label="Закрыть"
                :disabled="importSubmitting"
                @click="closeImportForm"
              >
                ×
              </button>
            </div>

            <form class="app-modal__body dashboard-import-modal__body" @submit.prevent="submitImport">
              <p class="dashboard-import-modal__hint">
                На сайте GoMafia откройте страницу турнира и выберите вкладку
                <span class="dashboard-import-modal__hint-em">«Итоги по играм»</span>. Затем скопируйте ссылку и вставьте
                её сюда.
              </p>
              <input
                id="gomafia-import-url"
                v-model="importUrl"
                class="dashboard-import-modal__input"
                type="url"
                name="gomafia_import_url"
                placeholder="https://gomafia.pro/tournament/xxxx?tab=games"
                autocomplete="off"
                :disabled="importSubmitting"
                autofocus
              />
              <p v-if="importError" class="dashboard-import-modal__error" role="alert">{{ importError }}</p>

              <div class="dashboard-import-modal__footer">
                <button type="button" class="app-modal__btn-secondary" :disabled="importSubmitting" @click="closeImportForm">
                  Отмена
                </button>
                <button type="submit" class="app-modal__btn-primary dashboard-import-modal__submit" :disabled="importSubmitting || !importUrl.trim()">
                  {{ importSubmitting ? 'Загрузка...' : 'Загрузить' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="app-modal">
      <div v-if="deleteConfirmOpen" class="app-modal dashboard-delete-modal" role="presentation">
        <div class="app-modal__backdrop" aria-hidden="true" @click.self="onDeleteBackdropPointerDown" />
        <div
          ref="deleteDialogWrapRef"
          class="app-modal__wrap dashboard-delete-modal__wrap"
          tabindex="-1"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-delete-title"
          @keydown="onDeleteDialogEscape"
        >
          <div class="app-modal__panel app-modal__panel--alert dashboard-delete-modal__panel">
            <div class="app-modal__head">
              <h2 id="dashboard-delete-title" class="app-modal__title">Удалить лобби?</h2>
              <button
                type="button"
                class="app-modal__close"
                aria-label="Закрыть"
                :disabled="!!deletingLobbyId"
                @click="closeDeleteConfirm()"
              >
                ×
              </button>
            </div>
            <div class="app-modal__body app-modal__body--tight dashboard-delete-modal__body">
              <p v-if="pendingDelete" class="app-modal__alert-text">
                Удалить лобби <span class="app-modal__embed">«{{ pendingDelete.name }}»</span>? Это действие нельзя
                отменить.
              </p>
              <p v-if="deleteActionError" class="dashboard-delete-modal__error" role="alert">
                {{ deleteActionError }}
              </p>
              <div class="app-modal__actions app-modal__actions--end">
                <button
                  type="button"
                  class="app-modal__btn-secondary"
                  :disabled="!!deletingLobbyId"
                  @click="closeDeleteConfirm()"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  class="app-modal__btn-danger"
                  :disabled="!!deletingLobbyId || !pendingDelete"
                  @click="confirmDeleteLobby"
                >
                  {{ deletingLobbyId ? 'Удаление…' : 'Удалить' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 1200px;
  margin-inline: auto;
  padding: 0.15rem 0 0.5rem;
  box-sizing: border-box;
}

.dashboard__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
}

.dashboard-lobby-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  width: 100%;
  margin: 0;
  padding: 1.15rem 1.15rem 1.2rem;
  text-align: left;
  font: inherit;
  cursor: pointer;
  color: inherit;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-sizing: border-box;
}

.dashboard-lobby-card--action {
  min-width: 0;
  min-height: 6.2rem;
  align-items: center;
  padding: 1.15rem;
}

@media (min-width: 760px) {
  .dashboard__actions {
    flex-direction: row;
    align-items: stretch;
    gap: 0.9rem;
  }

  .dashboard-lobby-card--action {
    flex: 1 1 0;
  }
}

.dashboard-lobby-card:focus {
  outline: none;
}

.dashboard-lobby-card:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.dashboard-lobby-card--saved-shell {
  align-items: center;
  gap: 0.65rem;
  cursor: default;
}

.dashboard-lobby-card__nav {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  text-decoration: none;
  cursor: pointer;
  color: inherit;
}

.dashboard-lobby-card__nav:focus {
  outline: none;
}

.dashboard-lobby-card__nav:focus-visible {
  border-radius: 10px;
  box-shadow: 0 0 0 2px rgba(47, 111, 235, 0.45);
}

.dashboard-lobby-card__delete {
  flex-shrink: 0;
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  min-height: 2.5rem;
  margin: -0.2rem -0.1rem -0.2rem 0;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  box-sizing: border-box;
}

.dashboard-lobby-card__delete:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #e5e7eb;
}

.dashboard-lobby-card__delete:focus {
  outline: none;
}

.dashboard-lobby-card__delete:focus-visible {
  outline: 2px solid #9ca3af;
  outline-offset: 2px;
}

.dashboard-lobby-card__delete:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.dashboard-lobby-card__delete-img {
  display: block;
  width: 16px;
  height: 20px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(50%) sepia(8%) saturate(120%) hue-rotate(177deg) brightness(94%) contrast(91%);
}

.dashboard-delete-modal__wrap {
  max-width: min(24rem, calc(100vw - 1.25rem));
}

.dashboard-delete-modal__body.app-modal__body {
  gap: 0.85rem;
  padding-bottom: 0.75rem;
}

.dashboard-delete-modal__error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.8125rem;
  line-height: 1.45;
}

.dashboard-lobby-card__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 12px;
  background: #eff6ff;
  color: #2f6feb;
}

.dashboard-lobby-card__icon--saved {
  background: #eef4ff;
  color: #2563eb;
}

.dashboard-lobby-card__icon--gomafia {
  background: rgba(137, 119, 254, 0.08);
  color: #8977FE;
}

.dashboard-lobby-card__go-icon {
  display: block;
  width: 26px;
  height: auto;
  max-height: 24px;
  object-fit: contain;
}

.dashboard-lobby-card__icon--import {
  background: rgba(137, 119, 254, 0.22);
  border: 1px solid rgba(137, 119, 254, 0.3);
  color: #8977FE;
}

.dashboard-lobby-card__text {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.dashboard-lobby-card__title {
  font-size: 1.0625rem;
  font-weight: 600;
  color: #111827;
  line-height: 1.3;
}

.dashboard-lobby-card__desc {
  font-size: 0.8125rem;
  color: #6b7280;
  line-height: 1.45;
}

.dashboard-lobby-card__design-sep {
  user-select: none;
}

.dashboard__created {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.dashboard__created-head {
  display: flex;
  align-items: center;
}

.dashboard__filter-empty {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.45;
  color: #6b7280;
}

.dashboard-import-modal__wrap {
  max-width: min(34rem, calc(100vw - 1.25rem));
}

.dashboard-import-modal__panel.app-modal__panel {
  overflow: hidden;
}

.dashboard-import-modal__body.app-modal__body {
  padding: 0.9rem;
  gap: 0.7rem;
}

.dashboard-import-modal__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.dashboard-import-modal__hint {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.52;
  color: #6b7280;
}

.dashboard-import-modal__hint-em {
  font-weight: 600;
  color: #111827;
}

.dashboard-import-modal__input {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font: inherit;
  font-size: 0.9375rem;
  color: #111827;
  background: #fff;
  -webkit-text-fill-color: #111827;
  box-sizing: border-box;
}

.dashboard-import-modal__input:focus {
  outline: none;
  border-color: #2f6feb;
  box-shadow: 0 0 0 2px rgba(47, 111, 235, 0.2);
}

.dashboard-import-modal__input:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.dashboard-import-modal__input::placeholder {
  color: #9ca3af;
  opacity: 1;
  -webkit-text-fill-color: #9ca3af;
}

.dashboard-import-modal__error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.8125rem;
  line-height: 1.45;
}

.dashboard-import-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.15rem;
}

.dashboard-import-modal__submit.app-modal__btn-primary {
  background: #2f6feb;
  background-image: none;
  border-color: #2f6feb;
  box-shadow: none;
}

.dashboard-import-modal__submit.app-modal__btn-primary:hover:not(:disabled) {
  background: #2563eb;
  background-image: none;
  border-color: #2563eb;
  box-shadow: none;
}

.dashboard-import-modal__submit.app-modal__btn-primary:active:not(:disabled) {
  background: #1d4ed8;
  border-color: #1d4ed8;
  box-shadow: none;
}

.dashboard__created-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #374151;
}

.dashboard__created-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.dashboard__text {
  margin: 0.25rem 0 0;
  color: #9ca3af;
  font-size: 0.8125rem;
  line-height: 1.45;
}

.dashboard__text--error {
  color: #b91c1c;
}

.dashboard__text code {
  font-size: 0.78em;
  color: #6b7280;
}
</style>
