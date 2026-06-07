<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getLobbyFresh, type GameLobby, type LobbyPlayer } from '@/api/lobbies'
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
const designCode = computed(() => String(route.params.design ?? 'classic').trim().toLowerCase())
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
    lobby.value = await getLobbyFresh(lobbyId.value)
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
  applyDocumentTitle()
  loadPersistentMessage()
  loadPopupMessage()
  window.addEventListener('storage', onStorageChanged)
  await loadLobby()
  startPolling()
})

watch([lobbyId, designCode], async () => {
  applyDocumentTitle()
  setActivePopupMessage(null)
  lastPopupMessageId.value = ''
  loadPersistentMessage()
  loadPopupMessage()
  lobby.value = null
  await loadLobby()
  startPolling()
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
  if (prevDocumentTitle.value) document.title = prevDocumentTitle.value
})
</script>

<template>
  <main class="overlay">
    <p v-if="loading" class="overlay__status">Загрузка…</p>
    <p v-else-if="error" class="overlay__status overlay__status--error">{{ error }}</p>
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
}

.overlay__status {
  position: fixed;
  top: 8px;
  left: 8px;
  margin: 0;
  padding: 4px 8px;
  font-size: 13px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.7);
}

.overlay__status--error {
  color: #fca5a5;
}
</style>
