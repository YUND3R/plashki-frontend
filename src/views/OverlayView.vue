<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getLobbyFresh, getLobbyOverlayDesigns, type GameLobby, type LobbyPlayer } from '@/api/lobbies'
import { enrichLobbyPhotoLayouts } from '@/utils/overlayPhotoLayoutBridge'
import OverlayClassicDesign from '@/components/overlay/designs/OverlayClassicDesign.vue'
import OverlayMastersDesign from '@/components/overlay/designs/OverlayMastersDesign.vue'
import OverlayPlusDesign from '@/components/overlay/designs/OverlayPlusDesign.vue'
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

const lobbyId = computed(() => String(route.params.lobbyId ?? '').trim())
const isAutoDesignRoute = computed(() => route.name === 'overlay-lobby')

const routeDesignCode = computed(() => {
  if (route.name !== 'overlay-design') return ''
  return String(route.params.design ?? 'classic').trim().toLowerCase()
})

const lobbyDesignCode = computed(() => {
  const raw = lobby.value?.overlay_design
  if (typeof raw === 'string' && raw.trim()) return raw.trim().toLowerCase()
  return ''
})

const designCode = computed(() => {
  if (isAutoDesignRoute.value) return lobbyDesignCode.value || 'classic'
  return routeDesignCode.value || lobbyDesignCode.value || 'classic'
})
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

const bestMove = computed(() => {
  const raw = lobby.value?.best_move
  if (!Array.isArray(raw)) return []
  return raw.map((x) => (typeof x === 'string' ? x : x == null ? '' : String(x)))
})

const currentDesignComponent = computed(() => {
  if (designCode.value === 'masters-yug25' || designCode.value === 'masters') return OverlayMastersDesign
  if (designCode.value === 'plus') return OverlayPlusDesign
  return OverlayClassicDesign
})

async function loadLobby() {
  if (!lobbyId.value) {
    loading.value = false
    error.value = 'Не указан lobbyId'
    return
  }
  if (!lobby.value) loading.value = true
  error.value = null
  try {
    const freshPromise = getLobbyFresh(lobbyId.value)
    const designsPromise = isAutoDesignRoute.value
      ? getLobbyOverlayDesigns(lobbyId.value).catch(() => null)
      : Promise.resolve(null)
    const [fresh, designs] = await Promise.all([freshPromise, designsPromise])
    const overlayDesign =
      (designs?.selected_overlay_design ?? '').trim() ||
      (fresh.overlay_design ?? '').trim() ||
      null
    const merged = overlayDesign ? { ...fresh, overlay_design: overlayDesign } : fresh
    try {
      lobby.value = await enrichLobbyPhotoLayouts(merged)
    } catch {
      lobby.value = merged
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function loadPersistentMessage() {
  if (!lobbyId.value) {
    persistentMessage.value = ''
    persistentMessageColor.value = 'green'
    return
  }
  const data = readOverlayPersistentMessage(lobbyId.value, normalizedDesignCode.value)
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
  if (!lobbyId.value) {
    setActivePopupMessage(null)
    return
  }
  const next = readOverlayPopupMessage(lobbyId.value, normalizedDesignCode.value)
  if (!next) return
  if (next.id === lastPopupMessageId.value) return
  lastPopupMessageId.value = next.id
  setActivePopupMessage(next)
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(() => {
    void loadLobby()
  }, 1000)
}

onMounted(async () => {
  prevDocumentTitle.value = document.title
  document.documentElement.classList.add('overlay-page')
  document.body.classList.add('overlay-page')
  applyDocumentTitle()
  loadPersistentMessage()
  loadPopupMessage()
  window.addEventListener('storage', onStorageChanged)
  await loadLobby()
  startPolling()
})

watch(lobbyId, async () => {
  setActivePopupMessage(null)
  lastPopupMessageId.value = ''
  lobby.value = null
  await loadLobby()
  startPolling()
})

watch(designCode, (next, prev) => {
  if (next === prev) return
  applyDocumentTitle()
  setActivePopupMessage(null)
  lastPopupMessageId.value = ''
  loadPersistentMessage()
  loadPopupMessage()
})

function onStorageChanged(e: StorageEvent) {
  if (!e.key || !lobbyId.value) return
  loadPersistentMessage()
  loadPopupMessage()
}

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  clearPopupHideTimer()
  window.removeEventListener('storage', onStorageChanged)
  document.documentElement.classList.remove('overlay-page')
  document.body.classList.remove('overlay-page')
  if (prevDocumentTitle.value) document.title = prevDocumentTitle.value
})
</script>

<template>
  <main class="overlay">
    <div v-if="loading" class="overlay__state">
      <p class="overlay__state-title">Загрузка overlay…</p>
      <p class="overlay__state-hint">Лобби: {{ lobbyId || '—' }}</p>
    </div>
    <div v-else-if="error" class="overlay__state overlay__state--error" role="alert">
      <p class="overlay__state-title">Overlay не загрузился</p>
      <p class="overlay__state-text">{{ error }}</p>
      <ul class="overlay__state-list">
        <li>Бэкенд доступен по адресу из <code>VITE_API_BASE_URL</code></li>
        <li><code>GET /lobbies/{{ lobbyId }}</code> открыт для overlay (без 401)</li>
        <li>В OBS Browser Source включите прозрачный фон</li>
        <li>URL должен открываться в обычном браузере на этом же ПК</li>
      </ul>
    </div>
    <OverlayMastersDesign
      v-else-if="designCode === 'masters-yug25' || designCode === 'masters'"
      :seats="visibleSeatRows"
      :sheriff-check="sheriffChecks"
      :best-move="bestMove"
      :persistent-message="persistentMessage"
      :persistent-color="persistentMessageColor"
      :popup-message="activePopupMessage"
    />
    <component
      :is="currentDesignComponent"
      v-else
      :seats="visibleSeatRows"
      :sheriff-check="sheriffChecks"
      :best-move="bestMove"
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
  background: transparent !important;
}
</style>
