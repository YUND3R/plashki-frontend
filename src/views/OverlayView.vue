<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  getLobbyFresh,
  getLobbyOverlayDesigns,
  getOverlayLive,
  type GameLobby,
  type OverlayGlobalStateResponse,
  type LobbyPlayer,
} from '@/api/lobbies'
import { enrichLobbyPhotoLayouts, applyStablePhotoLayouts } from '@/utils/overlayPhotoLayoutBridge'
import {
  overlayLobbyDataSignature,
  subscribeOverlayLobbyChanged,
} from '@/utils/overlayLobbySync'
import OverlayClassicDesign from '@/components/overlay/designs/OverlayClassicDesign.vue'
import OverlayMastersDesign from '@/components/overlay/designs/OverlayMastersDesign.vue'
import OverlayPlusDesign from '@/components/overlay/designs/OverlayPlusDesign.vue'
import OverlayVictoryClassic from '@/components/overlay/OverlayVictoryClassic.vue'
import OverlayVictoryMasters from '@/components/overlay/OverlayVictoryMasters.vue'
import OverlayVictoryPlus from '@/components/overlay/OverlayVictoryPlus.vue'
import {
  normalizeOverlayDesignCode,
  readOverlayPersistentMessage,
  type OverlayTextTone,
} from '@/utils/overlayPersistentMessage'
import {
  readOverlayPopupMessage,
  type OverlayPopupMessage,
} from '@/utils/overlayPopupMessage'

const route = useRoute()

const lobby = ref<GameLobby | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null
let unsubLobbySync: (() => void) | null = null
let loadSeq = 0
let designsPollTick = 0
const DESIGNS_POLL_EVERY = 10
/** Лёгкий poll /overlay/live (только метаданные OBS). */
const LIVE_POLL_MS = 2000
/** Полный GET /lobbies, если событие из редактора не дошло (OBS на другом ПК). */
const FALLBACK_FULL_FETCH_MS = 30_000

let lastLiveSignature = ''
let previousActiveLobbyId = ''
let lastAppliedLobbySignature = ''
let lastFullFetchAt = 0
let syncFetchPending = false

const isLiveRoute = computed(() => route.name === 'overlay-live')
const routeLobbyId = computed(() => String(route.params.lobbyId ?? '').trim())
const isAutoDesignRoute = computed(() => route.name === 'overlay-lobby' || isLiveRoute.value)
const overlayLiveState = ref<OverlayGlobalStateResponse | null>(null)
const liveActiveLobbyId = ref('')

const routeDesignCode = computed(() => {
  if (route.name !== 'overlay-design') return ''
  return String(route.params.design ?? 'classic').trim().toLowerCase()
})

const lobbyDesignCode = computed(() => {
  const raw = lobby.value?.overlay_design
  if (typeof raw === 'string' && raw.trim()) return raw.trim().toLowerCase()
  return ''
})

const liveDesignCode = computed(() => {
  const raw = overlayLiveState.value?.selected_overlay_design
  return typeof raw === 'string' && raw.trim() ? raw.trim().toLowerCase() : ''
})

const designCode = computed(() => {
  if (isLiveRoute.value) return liveDesignCode.value || lobbyDesignCode.value || 'classic'
  if (isAutoDesignRoute.value) return lobbyDesignCode.value || 'classic'
  return routeDesignCode.value || lobbyDesignCode.value || 'classic'
})
const activeOverlayScreen = computed(() => {
  const raw = isLiveRoute.value
    ? overlayLiveState.value?.active_overlay_screen ?? lobby.value?.active_overlay_screen
    : lobby.value?.active_overlay_screen
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
})
const victoryWinner = computed<'mafia' | 'peaceful' | null>(() => {
  if (activeOverlayScreen.value === 'victory-mafia') return 'mafia'
  if (activeOverlayScreen.value === 'victory-peaceful') return 'peaceful'
  return null
})
const showVictoryScores = computed(() => lobby.value?.show_victory_scores === true)
const prevDocumentTitle = ref('')
const persistentMessage = ref('')
const persistentMessageColor = ref<OverlayTextTone>('green')
const activePopupMessage = ref<OverlayPopupMessage | null>(null)
const lastPopupMessageId = ref('')
let popupHideTimer: ReturnType<typeof setTimeout> | null = null

const designTitle = computed(() => {
  if (designCode.value === 'masters-yug25') return 'Masters Yug25'
  if (designCode.value === 'masters') return 'Masters'
  if (designCode.value === 'plus') return 'Plus'
  return 'Classic'
})

const normalizedDesignCode = computed(() => normalizeOverlayDesignCode(designCode.value))
const effectiveLobbyId = computed(() => (isLiveRoute.value ? liveActiveLobbyId.value : routeLobbyId.value))
const noActiveLiveLobby = computed(
  () => isLiveRoute.value && !loading.value && !error.value && !effectiveLobbyId.value,
)

function applyDocumentTitle() {
  document.title = `Overlay - ${designTitle.value}`
}

const seatRows = computed(() => {
  const maxPlayers = lobby.value?.max_players ?? 10
  const rows: (LobbyPlayer | null)[] = []
  const players = lobby.value?.players ?? []
  for (let i = 0; i < maxPlayers; i++) rows.push(players[i] ?? null)
  return rows
})

const visibleSeatRows = computed(() => {
  const rows = seatRows.value
  const count = 10
  const next: (LobbyPlayer | null)[] = []
  for (let i = 0; i < count; i++) next.push(rows[i] ?? null)
  return next
})

const sheriffChecks = computed(() => {
  const raw = lobby.value?.sheriff_check
  if (!Array.isArray(raw)) return []
  return raw.map((x) => (typeof x === 'string' ? x : x == null ? '' : String(x)))
})

const currentDesignComponent = computed(() => {
  if (designCode.value === 'masters-yug25' || designCode.value === 'masters') return OverlayMastersDesign
  if (designCode.value === 'plus') return OverlayPlusDesign
  return OverlayClassicDesign
})

const currentVictoryComponent = computed(() => {
  if (designCode.value === 'masters-yug25' || designCode.value === 'masters') return OverlayVictoryMasters
  if (designCode.value === 'plus') return OverlayVictoryPlus
  return OverlayVictoryClassic
})

function lobbyDataSignature(value: GameLobby): string {
  return overlayLobbyDataSignature(value)
}

function overlayLiveSignature(state: OverlayGlobalStateResponse | null): string {
  if (!state) return ''
  return JSON.stringify({
    lobby: state.active_lobby_id ?? '',
    screen: state.active_overlay_screen ?? '',
    design: state.selected_overlay_design ?? '',
  })
}

function requestFullLobbyFetch() {
  syncFetchPending = true
  void pollOverlay()
}

function mergeOverlayDesign(fresh: GameLobby, designs: Awaited<ReturnType<typeof getLobbyOverlayDesigns>> | null): GameLobby {
  const overlayDesign =
    (designs?.selected_overlay_design ?? '').trim() ||
    (fresh.overlay_design ?? '').trim() ||
    null
  return overlayDesign ? { ...fresh, overlay_design: overlayDesign } : fresh
}

function mergeOverlayState(
  fresh: GameLobby,
  state: OverlayGlobalStateResponse | null,
): GameLobby {
  if (!state) return fresh
  const overlayDesign =
    (state.selected_overlay_design ?? '').trim() || (fresh.overlay_design ?? '').trim() || null
  return {
    ...fresh,
    overlay_design: overlayDesign,
    active_overlay_screen:
      (state.active_overlay_screen ?? '').trim() || (fresh.active_overlay_screen ?? null),
  }
}

async function enrichLobbyInBackground(merged: GameLobby, seq: number) {
  try {
    const enriched = await enrichLobbyPhotoLayouts(merged)
    if (seq !== loadSeq) return
    if (lobbyDataSignature(enriched) !== lobbyDataSignature(merged)) return
    lobby.value = applyStablePhotoLayouts(lobby.value, enriched)
  } catch {
    // overlay показывает данные лобби и без доп. кадрирования
  }
}

async function fetchFullLobby() {
  if (!effectiveLobbyId.value && !isLiveRoute.value) {
    loading.value = false
    error.value = 'Не указан lobbyId'
    return
  }
  if (isLiveRoute.value && !liveActiveLobbyId.value) {
    lobby.value = null
    error.value = null
    loading.value = false
    return
  }

  const seq = ++loadSeq
  const isInitialLoad = !lobby.value
  if (isInitialLoad) loading.value = true

  try {
    const shouldFetchDesigns =
      !isLiveRoute.value &&
      isAutoDesignRoute.value &&
      (designsPollTick++ % DESIGNS_POLL_EVERY === 0 || !lobby.value?.overlay_design)

    const lobbyIdForFetch = isLiveRoute.value ? liveActiveLobbyId.value : effectiveLobbyId.value
    const freshPromise = getLobbyFresh(lobbyIdForFetch)
    const designsPromise = shouldFetchDesigns
      ? getLobbyOverlayDesigns(lobbyIdForFetch).catch(() => null)
      : Promise.resolve(null)
    const [fresh, designs] = await Promise.all([freshPromise, designsPromise])
    if (seq !== loadSeq) return

    const merged = isLiveRoute.value
      ? mergeOverlayState(fresh, overlayLiveState.value)
      : mergeOverlayDesign(fresh, designs)

    lastFullFetchAt = Date.now()
    const nextSignature = lobbyDataSignature(merged)
    const dataChanged = nextSignature !== lastAppliedLobbySignature

    if (dataChanged) {
      lastAppliedLobbySignature = nextSignature
      lobby.value = applyStablePhotoLayouts(lobby.value, merged)
      void enrichLobbyInBackground(merged, seq)
    }

    error.value = null
  } catch (e) {
    if (seq !== loadSeq) return
    if (!lobby.value) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

async function pollOverlay() {
  let needFull = syncFetchPending || !lobby.value

  if (isLiveRoute.value) {
    try {
      const liveState = await getOverlayLive()
      overlayLiveState.value = liveState
      const nextLobbyId = liveState.active_lobby_id ?? ''
      const liveSig = overlayLiveSignature(liveState)
      const liveMetaChanged = liveSig !== lastLiveSignature
      const lobbySwitched = nextLobbyId !== previousActiveLobbyId

      lastLiveSignature = liveSig
      previousActiveLobbyId = nextLobbyId
      liveActiveLobbyId.value = nextLobbyId

      if (!nextLobbyId) {
        lobby.value = null
        lastAppliedLobbySignature = ''
        error.value = null
        syncFetchPending = false
        loading.value = false
        return
      }

      needFull = needFull || liveMetaChanged || lobbySwitched
    } catch (e) {
      if (!lobby.value) {
        error.value = e instanceof Error ? e.message : String(e)
      }
      return
    }
  } else if (!effectiveLobbyId.value) {
    loading.value = false
    error.value = 'Не указан lobbyId'
    return
  }

  if (!needFull && Date.now() - lastFullFetchAt >= FALLBACK_FULL_FETCH_MS) {
    needFull = true
  }

  if (!needFull) return

  syncFetchPending = false
  await fetchFullLobby()
}

function loadPersistentMessage() {
  if (!effectiveLobbyId.value) {
    persistentMessage.value = ''
    persistentMessageColor.value = 'green'
    return
  }
  const data = readOverlayPersistentMessage(effectiveLobbyId.value, normalizedDesignCode.value)
  persistentMessage.value = data.text
  persistentMessageColor.value = data.color
}

function clearPopupHideTimer() {
  if (!popupHideTimer) return
  clearTimeout(popupHideTimer)
  popupHideTimer = null
}

function setActivePopupMessage(next: OverlayPopupMessage | null) {
  clearPopupHideTimer()
  activePopupMessage.value = next
  if (!next) return
  const elapsedMs = Math.max(0, Date.now() - next.created_at_ms)
  const remainingMs = Math.max(0, next.duration_ms - elapsedMs)
  if (remainingMs <= 0) {
    activePopupMessage.value = null
    return
  }
  popupHideTimer = setTimeout(() => {
    popupHideTimer = null
    if (activePopupMessage.value?.id === next.id) activePopupMessage.value = null
  }, remainingMs)
}

function loadPopupMessage() {
  if (!effectiveLobbyId.value) {
    setActivePopupMessage(null)
    return
  }
  const next = readOverlayPopupMessage(effectiveLobbyId.value, normalizedDesignCode.value)
  if (!next) return
  if (next.id === lastPopupMessageId.value) return
  lastPopupMessageId.value = next.id
  setActivePopupMessage(next)
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(() => {
    void pollOverlay()
  }, LIVE_POLL_MS)
}

async function restartForLobbyChange() {
  loadSeq += 1
  designsPollTick = 0
  lastLiveSignature = ''
  previousActiveLobbyId = ''
  lastAppliedLobbySignature = ''
  lastFullFetchAt = 0
  syncFetchPending = false
  setActivePopupMessage(null)
  lastPopupMessageId.value = ''
  lobby.value = null
  await pollOverlay()
  startPolling()
}

onMounted(async () => {
  prevDocumentTitle.value = document.title
  document.documentElement.classList.add('overlay-page')
  document.body.classList.add('overlay-page')
  applyDocumentTitle()
  loadPersistentMessage()
  loadPopupMessage()
  window.addEventListener('storage', onStorageChanged)
  unsubLobbySync = subscribeOverlayLobbyChanged((event) => {
    if (isLiveRoute.value) {
      if (liveActiveLobbyId.value && event.lobbyId !== liveActiveLobbyId.value) return
      requestFullLobbyFetch()
      return
    }
    if (event.lobbyId === routeLobbyId.value) requestFullLobbyFetch()
  })
  syncFetchPending = true
  await pollOverlay()
  startPolling()
})

watch(
  () => route.fullPath,
  async () => {
    await restartForLobbyChange()
  },
)

watch(designCode, (next, prev) => {
  if (next === prev) return
  applyDocumentTitle()
  setActivePopupMessage(null)
  lastPopupMessageId.value = ''
  loadPersistentMessage()
  loadPopupMessage()
})

function onStorageChanged(e: StorageEvent) {
  if (!e.key || !effectiveLobbyId.value) return
  loadPersistentMessage()
  loadPopupMessage()
}

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  unsubLobbySync?.()
  unsubLobbySync = null
  clearPopupHideTimer()
  window.removeEventListener('storage', onStorageChanged)
  document.documentElement.classList.remove('overlay-page')
  document.body.classList.remove('overlay-page')
  if (prevDocumentTitle.value) document.title = prevDocumentTitle.value
})
</script>

<template>
  <main class="overlay" :class="{ 'overlay--victory': victoryWinner }">
    <div v-if="loading" class="overlay__state">
      <p class="overlay__state-title">Загрузка overlay…</p>
      <p class="overlay__state-hint">Лобби: {{ effectiveLobbyId || '—' }}</p>
    </div>
    <div v-else-if="noActiveLiveLobby" class="overlay__state">
      <p class="overlay__state-title">Нет активного лобби</p>
      <p class="overlay__state-hint">Нажмите «Вывести в OBS» в панели управления лобби.</p>
    </div>
    <div v-else-if="error" class="overlay__state overlay__state--error" role="alert">
      <p class="overlay__state-title">Overlay не загрузился</p>
      <p class="overlay__state-text">{{ error }}</p>
      <ul class="overlay__state-list">
        <li>Бэкенд доступен по адресу из <code>VITE_API_BASE_URL</code></li>
        <li><code>GET /lobbies/{{ effectiveLobbyId }}</code> открыт для overlay (без 401)</li>
        <li>В OBS Browser Source включите прозрачный фон</li>
        <li>URL должен открываться в обычном браузере на этом же ПК</li>
      </ul>
    </div>
    <component
      :is="currentVictoryComponent"
      v-else-if="victoryWinner"
      :winner="victoryWinner"
      :seats="visibleSeatRows"
      :persistent-message="persistentMessage"
      :show-scores="showVictoryScores"
    />
    <OverlayMastersDesign
      v-else-if="designCode === 'masters-yug25' || designCode === 'masters'"
      :seats="visibleSeatRows"
      :sheriff-check="sheriffChecks"
      :persistent-message="persistentMessage"
      :persistent-color="persistentMessageColor"
      :popup-message="activePopupMessage"
    />
    <component
      :is="currentDesignComponent"
      v-else
      :seats="visibleSeatRows"
      :sheriff-check="sheriffChecks"
      :persistent-message="persistentMessage"
      :persistent-color="persistentMessageColor"
      :popup-message="activePopupMessage"
    />
  </main>
</template>

<style scoped>
.overlay {
  min-height: 100vh;
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  color: #fff;
  font-family: Inter, 'Segoe UI', Roboto, Arial, sans-serif;
  display: flex;
  align-items: flex-end;
  background: transparent;
}

.overlay--victory {
  height: 100vh;
  min-height: 0;
  padding: 0;
  align-items: stretch;
}

.overlay__state {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  text-align: center;
  background: rgba(15, 23, 42, 0.92);
}

.overlay__state-title {
  margin: 0 0 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #f8fafc;
}

.overlay__state-hint,
.overlay__state-text {
  margin: 0;
  font-size: 0.875rem;
  color: #cbd5e1;
}

.overlay__state-list {
  margin: 0.85rem 0 0;
  padding-left: 1.1rem;
  max-width: 28rem;
  text-align: left;
  font-size: 0.8125rem;
  color: #94a3b8;
  line-height: 1.45;
}

.overlay__state-list code {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.75rem;
  color: #e2e8f0;
}

.overlay__state--error .overlay__state-title {
  color: #fca5a5;
}

</style>

<style>
html.overlay-page,
body.overlay-page,
body.overlay-page #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent !important;
}
</style>
