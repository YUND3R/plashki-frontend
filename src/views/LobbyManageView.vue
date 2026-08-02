<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { listPlayerCards, type PlayerCard } from '@/api/playerCards'
import { ApiError } from '@/api/client'
import { useRoute, useRouter } from 'vue-router'
import uploadPhotoIcon from '@/assets/icons/upload-photo.svg?url'
import timerIcon from '@/assets/icons/timer.svg?url'
import mafiaRoleIcon from '@/assets/icons/mafia.svg?url'
import donRoleIcon from '@/assets/icons/don.svg?url'
import civilianRoleIcon from '@/assets/icons/civilian.svg?url'
import sheriffRoleIcon from '@/assets/icons/sheriff.svg?url'
import votedStatusIcon from '@/assets/icons/voted.svg?url'
import foulStatusIcon from '@/assets/icons/foul.svg?url'
import bestMoveStatusIcon from '@/assets/icons/best_move.svg?url'
import deletedStatusIcon from '@/assets/icons/deleted.svg?url'
import killedStatusIcon from '@/assets/icons/killed.svg?url'
import speechTimerRightArrowIcon from '@/assets/icons/right_arrow.svg?url'
import speechTimerGoSpeakIcon from '@/assets/icons/pause.svg?url'
import speechTimerPauseIcon from '@/assets/icons/go_speek.svg?url'
import LobbyMemberPhotoModal from '@/components/lobby/LobbyMemberPhotoModal.vue'
import LobbyImportedParticipantsModal from '@/components/lobby/LobbyImportedParticipantsModal.vue'
import CardDesignPickerPanel from '@/components/cardDesign/CardDesignPickerPanel.vue'
import AppPageError from '@/components/common/AppPageError.vue'
import {
  clearLobbyBestMove,
  clearLobbySheriffCheck,
  clearLobbyMemberStatus,
  clearLobbyMemberRole,
  deleteLobby,
  getLobby,
  getLobbyOverlayDesigns,
  replaceLobbyMemberCard,
  resetLobbyGameRoles,
  resetLobbyStatuses,
  setLobbyBestMove,
  setLobbyBonusPoints,
  setLobbySheriffCheck,
  setLobbyMemberStatus,
  setLobbyMemberRole,
  setLobbyImportedSelection,
  setLobbyOverlayScreen,
  setLobbyVictoryScoresVisibility,
  swapLobbySeats,
  type GameLobby,
  type LobbyImportedVariant,
  type LobbyPlayer,
} from '@/api/lobbies'
import {
  listRatings,
  type RatingGameResultWrite,
  type RatingGameRole,
  type RatingListItem,
  type RatingWinnerSide,
  syncRatingFromLobby,
} from '@/api/ratings'
import { me } from '@/api/auth'
import { useLobbyManageUiStore } from '@/stores/lobbyManageUi'
import {
  normalizeOverlayDesignCode,
  readOverlayPersistentMessage,
  type OverlayTextTone,
  writeOverlayPersistentMessage,
} from '@/utils/overlayPersistentMessage'
import {
  createOverlayPopupMessageDraft,
  writeOverlayPopupMessage,
} from '@/utils/overlayPopupMessage'
import {
  notifyOverlayLobbyChanged,
  overlayLobbyDataSignature,
} from '@/utils/overlayLobbySync'

const route = useRoute()
const router = useRouter()
const lobbyManageUi = useLobbyManageUiStore()
const { hostMode, designPickerOpen, addToRatingOpen } = storeToRefs(lobbyManageUi)

const lobby = ref<GameLobby | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const currentUserId = ref<string | null>(null)
const swapBusy = ref(false)
const swapHint = ref<string | null>(null)
/** Индекс строки, с которой начали перетаскивание (только хост). */
const dragActiveIndex = ref<number | null>(null)
/** Индекс строки под курсором при перетаскивании. */
const dragOverIndex = ref<number | null>(null)
/** Pointer drag для touch/pen, т.к. HTML5 drag-and-drop на мобильных браузерах почти не работает. */
const touchDragPointerId = ref<number | null>(null)
/** Строка, которую сейчас удерживают перед началом touch-drag. */
const touchDragHoldIndex = ref<number | null>(null)

const SEAT_DND_MIME = 'application/x-plashki-seat'
const SEAT_TOUCH_HOLD_MS = 450
const SEAT_TOUCH_HOLD_MOVE_PX = 28
const SEAT_TOUCH_AUTO_SCROLL_EDGE_PX = 88
const SEAT_TOUCH_AUTO_SCROLL_MAX_STEP_PX = 16

let touchDragHoldTimer: ReturnType<typeof setTimeout> | null = null
let touchDragPendingPointerId: number | null = null
let touchDragPendingIdx: number | null = null
let touchDragPendingStart = { x: 0, y: 0 }
let touchDragCaptureEl: HTMLElement | null = null
let touchDragAutoScrollFrame: number | null = null
let touchDragLastPoint: { x: number; y: number } | null = null
let touchDragScrollHost: HTMLElement | null = null
let suppressRowSelectClick = false

const photoModalOpen = ref(false)
const photoModalPlayer = ref<LobbyPlayer | null>(null)

/** Замена игрока на месте: индекс строки или null. */
const replaceOpenSeatIndex = ref<number | null>(null)
const replaceSearchQuery = ref('')
const rosterCards = ref<PlayerCard[]>([])
const rosterLoadError = ref<string | null>(null)
const replaceRosterLoading = ref(false)
const replaceSubmitting = ref(false)
const replaceSearchInputRef = ref<HTMLInputElement | null>(null)
const isTabletLayout = ref(false)
/** Активная карточка игрока на мобильной панели (фиолетовая рамка). */
const selectedSeatIndex = ref<number | null>(null)
let tabletMq: MediaQueryList | null = null
const roleSubmittingMembershipId = ref<string | null>(null)
const statusSubmittingMembershipId = ref<string | null>(null)
const rolesResetBusy = ref(false)
const deleteBusy = ref(false)
const deleteConfirmOpen = ref(false)
const sheriffChecksModalOpen = ref(false)
const sheriffChecksTargetMembershipId = ref<string | null>(null)
const sheriffChecksValues = ref<string[]>(['', '', '', '', ''])
const sheriffChecksSaving = ref(false)
const sheriffChecksResetting = ref(false)
const sheriffChecksError = ref<string | null>(null)
const bestMoveModalOpen = ref(false)
const bestMoveTargetMembershipId = ref<string | null>(null)
const bestMoveValues = ref<string[]>(['', '', ''])
const bestMoveSaving = ref(false)
const bestMoveResetting = ref(false)
const bestMoveError = ref<string | null>(null)
const importedSelectionBusy = ref(false)
const importedSelectionError = ref<string | null>(null)
const importedSelectedTourKey = ref('')
const importedSelectedTableKey = ref('')
const importedSwitcherRef = ref<HTMLElement | null>(null)
const importedTourMenuOpen = ref(false)
const importedTableMenuOpen = ref(false)
const importedParticipantsModalOpen = ref(false)
const activePersistentDesignCode = ref<'classic' | 'masters-yug25' | 'plus'>('classic')
const persistentMessageDraft = ref('')
const persistentMessageFeedback = ref<string | null>(null)
const overlayScreenSaving = ref(false)
const overlayScreenError = ref<string | null>(null)
const victoryScoresSaving = ref(false)
const bonusPointsModalOpen = ref(false)
const bonusPointsDraft = ref<Record<string, string>>({})
const bonusPointsSaving = ref(false)
const bonusPointsResetting = ref(false)
const bonusPointsError = ref<string | null>(null)
const addToRatingLoading = ref(false)
const addToRatingSubmitting = ref(false)
const addToRatingError = ref<string | null>(null)
const addToRatingSuccess = ref<string | null>(null)
const addToRatingRatings = ref<RatingListItem[]>([])
const addToRatingSelectedId = ref('')
const addToRatingWinnerSide = ref<RatingWinnerSide>('red')
const addToRatingGameTitle = ref('')
const addToRatingCopyPersistentDismissed = ref(false)
const addToRatingPlayedAt = ref('')
const addToRatingRatingMenuOpen = ref(false)
const addToRatingRatingPickerRef = ref<HTMLElement | null>(null)
const PERSISTENT_MESSAGE_MAX_LENGTH = 50
const popupTitleDraft = ref('')
const popupSubtitleDraft = ref('')
const popupDurationDraft = ref('7')
const popupFeedback = ref<string | null>(null)
const lobbyToastVisible = ref(false)
const lobbyToastMessage = ref('')
const POPUP_TEXT_MAX_LENGTH = 120
const popupTitleTone = ref<OverlayTextTone>('green')
const popupSubtitleTone = ref<OverlayTextTone>('green')
const persistentMessageTone = ref<OverlayTextTone>('green')
const persistentMessageOverflow = computed(() =>
  Math.max(0, persistentMessageDraft.value.length - PERSISTENT_MESSAGE_MAX_LENGTH),
)
const toneOptions: Array<{ value: OverlayTextTone; className: string; label: string }> = [
  { value: 'white', className: 'lobby-manage__c-dot--w', label: 'Белый' },
  { value: 'green', className: 'lobby-manage__c-dot--g', label: 'Зеленый' },
  { value: 'yellow', className: 'lobby-manage__c-dot--y', label: 'Желтый' },
  { value: 'red', className: 'lobby-manage__c-dot--r', label: 'Красный' },
]
let popupFeedbackTimer: ReturnType<typeof setTimeout> | null = null
let lobbyToastTimer: ReturnType<typeof setTimeout> | null = null
let persistentFeedbackTimer: ReturnType<typeof setTimeout> | null = null
let speechTimerTickInterval: ReturnType<typeof setInterval> | null = null
let speechTimerStartedAtMs: number | null = null
let speechTimerElapsedBeforeRunSec = 0

const speechTimerElapsedSec = ref(0)
const speechTimerRunning = ref(false)

/** Режим ведущего: вспышка роли после клика → плавное затухание. */
const ROLE_HOST_FLASH_VISIBLE_MS = 580
const ROLE_HOST_FLASH_FADE_MS = 420
type RoleHostFlashPayload = { key: string; phase: 'shown' | 'fade' }

const roleHostFlash = ref<RoleHostFlashPayload | null>(null)
let roleHostFlashToFadeTimer: ReturnType<typeof setTimeout> | null = null
let roleHostFlashCleanupTimer: ReturnType<typeof setTimeout> | null = null

const ROLE_OPTIONS = [
  { value: 'mafia', label: 'Мафия', icon: mafiaRoleIcon },
  { value: 'don', label: 'Дон', icon: donRoleIcon },
  { value: 'peaceful', label: 'Мирный', icon: civilianRoleIcon },
  { value: 'sheriff', label: 'Шериф', icon: sheriffRoleIcon },
] as const

const STATUS_OPTIONS = [
  { value: 'killed', label: 'Убит', icon: killedStatusIcon },
  { value: 'voted', label: 'Заголосован', icon: votedStatusIcon },
  { value: 'deleted', label: 'Удалён', icon: deletedStatusIcon },
  { value: 'foul', label: 'Фол', icon: foulStatusIcon },
  { value: 'best-move', label: 'ЛХ', icon: bestMoveStatusIcon },
] as const

type LobbyRoleValue = (typeof ROLE_OPTIONS)[number]['value']
type LobbyStatusValue = (typeof STATUS_OPTIONS)[number]['value']

function normCardId(s: string | null | undefined): string {
  return (typeof s === 'string' ? s : '').trim().toLowerCase()
}

function normRole(s: string | null | undefined): string {
  return (typeof s === 'string' ? s : '').trim().toLowerCase()
}

function normStatus(s: string | null | undefined): string {
  return (typeof s === 'string' ? s : '').trim().toLowerCase()
}

const lobbyId = computed(() => String(route.params.lobbyId ?? ''))

async function load() {
  const id = lobbyId.value
  if (!id) {
    error.value = 'Не указан лобби'
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  resetSeatDragState()
  swapHint.value = null
  importedSelectionError.value = null
  importedSelectionBusy.value = false
  replaceOpenSeatIndex.value = null
  replaceSearchQuery.value = ''
  try {
    lobby.value = await getLobby(id)
    try {
      const u = await me()
      currentUserId.value = u.id
    } catch {
      currentUserId.value = null
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    lobby.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(lobbyId, load)
watch(lobbyId, () => {
  speechTimerStartedAtMs = null
  speechTimerElapsedBeforeRunSec = 0
  speechTimerElapsedSec.value = 0
  speechTimerRunning.value = false
  clearSpeechTimerTick()
})

let overlaySyncPrimed = false
watch(lobbyId, () => {
  overlaySyncPrimed = false
})

watch(
  () => (lobby.value ? overlayLobbyDataSignature(lobby.value) : ''),
  (signature) => {
    const id = lobbyId.value.trim()
    if (!id || !signature) return
    if (!overlaySyncPrimed) {
      overlaySyncPrimed = true
      return
    }
    notifyOverlayLobbyChanged(id)
  },
)

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDownImported, true)
  document.addEventListener('pointerdown', onDocPointerDownAddToRating, true)
  document.addEventListener('visibilitychange', syncSpeechTimerElapsed)
  window.addEventListener('keydown', onImportedEscapeKey)
  window.addEventListener('keydown', onAddToRatingEscapeKey)
  window.addEventListener('dragend', onGlobalSeatDragEnd)
  window.addEventListener('blur', onWindowSeatDragBlur)
  tabletMq = window.matchMedia('(max-width: 1024px)')
  isTabletLayout.value = tabletMq.matches
  if (typeof tabletMq.addEventListener === 'function') {
    tabletMq.addEventListener('change', onTabletMqChange)
  } else {
    tabletMq.addListener(onTabletMqChange)
  }
})

function clearRoleHostFlashTimers() {
  if (roleHostFlashToFadeTimer) {
    clearTimeout(roleHostFlashToFadeTimer)
    roleHostFlashToFadeTimer = null
  }
  if (roleHostFlashCleanupTimer) {
    clearTimeout(roleHostFlashCleanupTimer)
    roleHostFlashCleanupTimer = null
  }
}

onUnmounted(() => {
  lobbyManageUi.reset()
  clearRoleHostFlashTimers()
  clearFeedbackTimers()
  clearSpeechTimerTick()
  roleHostFlash.value = null
  document.removeEventListener('pointerdown', onDocPointerDownReplace, true)
  document.removeEventListener('pointerdown', onDocPointerDownImported, true)
  document.removeEventListener('pointerdown', onDocPointerDownAddToRating, true)
  document.removeEventListener('visibilitychange', syncSpeechTimerElapsed)
  window.removeEventListener('keydown', onReplaceEscapeKey)
  window.removeEventListener('keydown', onImportedEscapeKey)
  window.removeEventListener('keydown', onAddToRatingEscapeKey)
  window.removeEventListener('dragend', onGlobalSeatDragEnd)
  window.removeEventListener('blur', onWindowSeatDragBlur)
  resetSeatDragState()
  if (tabletMq) {
    if (typeof tabletMq.removeEventListener === 'function') {
      tabletMq.removeEventListener('change', onTabletMqChange)
    } else {
      tabletMq.removeListener(onTabletMqChange)
    }
  }
})

const seatCount = computed(() => lobby.value?.max_players ?? 10)

const seatRows = computed(() => {
  const list = lobby.value?.players ?? []
  const n = seatCount.value
  const rows: (LobbyPlayer | null)[] = []
  for (let i = 0; i < n; i++) rows.push(list[i] ?? null)
  return rows
})

const replaceTargetPlayer = computed(() => {
  const idx = replaceOpenSeatIndex.value
  if (idx === null) return null
  return seatRows.value[idx] ?? null
})

const replaceTargetLabel = computed(() => replaceTargetPlayer.value?.nickname?.trim() || 'игрока')

const isLobbyHost = computed(() => {
  const hid = lobby.value?.host_user_id?.trim() ?? ''
  const uid = currentUserId.value?.trim() ?? ''
  if (!hid || !uid) return false
  return hid.toLowerCase() === uid.toLowerCase()
})

const replaceOtherSeatCardIds = computed(() => {
  const i = replaceOpenSeatIndex.value
  if (i === null) return new Set<string>()
  const ids = seatRows.value
    .map((row, idx) => (idx !== i && row ? normCardId(row.player_card_id) : ''))
    .filter(Boolean)
  return new Set(ids)
})

const filteredReplaceCards = computed(() => {
  const q = replaceSearchQuery.value.trim().toLowerCase()
  let list = rosterCards.value.filter((c) => !replaceOtherSeatCardIds.value.has(normCardId(c.id)))
  if (!q) return list
  return list.filter((c) => {
    const hay = `${c.nickname} ${c.first_name} ${c.last_name}`.toLowerCase()
    return hay.includes(q)
  })
})

const isReplacePanelOpen = computed(() => replaceOpenSeatIndex.value !== null)
/** Режим ведущего: скрывает подсветку ролей (для трансляции). Статусы всегда отображаются. */
const hideRoleMarks = computed(() => hostMode.value)

const sheriffSeatPlayer = computed(() => {
  for (const p of seatRows.value) {
    if (p && isRoleActive(p, 'sheriff')) return p
  }
  return null
})

function flashHostModeRoleClick(membershipId: string, role: LobbyRoleValue) {
  clearRoleHostFlashTimers()
  const key = `${membershipId}:${role}`
  roleHostFlash.value = { key, phase: 'shown' }

  roleHostFlashToFadeTimer = setTimeout(() => {
    roleHostFlashToFadeTimer = null
    const cur = roleHostFlash.value
    if (cur?.key === key && cur.phase === 'shown') roleHostFlash.value = { key, phase: 'fade' }
    roleHostFlashCleanupTimer = setTimeout(() => {
      roleHostFlashCleanupTimer = null
      const cur2 = roleHostFlash.value
      if (cur2?.key === key && cur2.phase === 'fade') roleHostFlash.value = null
    }, ROLE_HOST_FLASH_FADE_MS)
  }, ROLE_HOST_FLASH_VISIBLE_MS)
}

function isRoleHostFlashVisible(p: LobbyPlayer | null, role: LobbyRoleValue): boolean {
  if (!p?.membership_id) return false
  const cur = roleHostFlash.value
  return cur !== null && cur.key === `${p.membership_id}:${role}`
}

function isRoleHostFlashFading(p: LobbyPlayer | null, role: LobbyRoleValue): boolean {
  const cur = roleHostFlash.value
  if (!p?.membership_id || cur === null) return false
  return cur.phase === 'fade' && cur.key === `${p.membership_id}:${role}`
}
const lobbyDisplayName = computed(() => {
  const row = (lobby.value ?? {}) as {
    name?: string | null
    lobby_name?: string | null
    title?: string | null
    lobby_title?: string | null
    id?: string
  }
  const name = [row.name, row.lobby_name, row.title, row.lobby_title].find(
    (x) => typeof x === 'string' && x.trim(),
  )
  if (typeof name === 'string') return name.trim()
  const id = typeof row.id === 'string' ? row.id : ''
  return id ? `Лобби ${id.slice(0, 8)}` : 'Лобби'
})

const importedState = computed(() => lobby.value?.imported_state ?? null)
const importedVariants = computed(() => importedState.value?.variants ?? [])
const importedCurrentKey = computed(() => importedState.value?.current_key?.trim() ?? '')
const hasImportedSelection = computed(() => importedVariants.value.length > 0)

type ImportedTourOption = { key: string; label: string }
type ImportedTableOption = { key: string; label: string }

function tourKeyForVariant(variant: LobbyImportedVariant): string {
  return typeof variant.tour_no === 'number' ? `tour-${variant.tour_no}` : 'tour-unknown'
}

const importedTourOptions = computed<ImportedTourOption[]>(() => {
  const options: ImportedTourOption[] = []
  const seen = new Set<string>()
  for (const variant of importedVariants.value) {
    const key = tourKeyForVariant(variant)
    if (seen.has(key)) continue
    seen.add(key)
    options.push({
      key,
      label: typeof variant.tour_no === 'number' ? `Тур ${variant.tour_no}` : 'Тур не указан',
    })
  }
  return options
})

function tableKeyForVariant(variant: LobbyImportedVariant): string {
  const byLabel = (variant.table_label ?? '').trim()
  if (byLabel) return byLabel.toLowerCase()
  const fromTitle = variant.title.match(/стол\s*\d+/i)?.[0]
  if (fromTitle) return fromTitle.replace(/\s+/g, ' ').trim().toLowerCase()
  const fromKey = variant.key.match(/table-(\d+)/i)?.[1]
  if (fromKey) return `стол ${fromKey}`
  return variant.key
}

const importedTableOptions = computed<ImportedTableOption[]>(() => {
  if (!importedVariants.value.length) return []
  const tourKey = importedSelectedTourKey.value.trim()
  const inTour = importedVariants.value.filter((variant) =>
    !tourKey ? true : tourKeyForVariant(variant) === tourKey,
  )
  const options: ImportedTableOption[] = []
  const seen = new Set<string>()
  for (const variant of inTour) {
    const key = tableKeyForVariant(variant)
    if (seen.has(key)) continue
    seen.add(key)
    options.push({ key, label: importedVariantTableLabel(variant) })
  }
  return options
})

const importedSelectedTourLabel = computed(() => {
  const key = importedSelectedTourKey.value.trim()
  const found = importedTourOptions.value.find((tour) => tour.key === key)
  return found?.label ?? importedTourOptions.value[0]?.label ?? 'Тур'
})

const importedSelectedTableLabel = computed(() => {
  const key = importedSelectedTableKey.value.trim().toLowerCase()
  const found = importedTableOptions.value.find((table) => table.key === key)
  return found?.label ?? importedTableOptions.value[0]?.label ?? 'Стол'
})

function resolveImportedVariantKey(tourKeyRaw: string, tableKeyRaw: string): string {
  const tourKey = tourKeyRaw.trim()
  const tableKey = tableKeyRaw.trim().toLowerCase()
  if (!tourKey || !tableKey) return ''
  const match = importedVariants.value.find(
    (variant) => tourKeyForVariant(variant) === tourKey && tableKeyForVariant(variant) === tableKey,
  )
  return match?.key ?? ''
}

const importedResolvedVariantKey = computed(() =>
  resolveImportedVariantKey(importedSelectedTourKey.value, importedSelectedTableKey.value),
)

const canApplyImportedSelection = computed(() => {
  const key = importedResolvedVariantKey.value.trim()
  if (!key) return false
  return key !== importedCurrentKey.value
})

const importedSelectionSignature = computed(() => {
  const keys = importedVariants.value.map((variant) => variant.key).join('|')
  const current = importedCurrentKey.value
  return `${current}__${keys}`
})

function syncImportedSelectionState() {
  closeImportedMenus()
  if (!importedVariants.value.length) {
    importedSelectedTourKey.value = ''
    importedSelectedTableKey.value = ''
    return
  }
  const active =
    importedVariants.value.find((variant) => variant.key === importedCurrentKey.value) ?? importedVariants.value[0]
  importedSelectedTourKey.value = tourKeyForVariant(active)
  importedSelectedTableKey.value = tableKeyForVariant(active)
}

watch(importedSelectionSignature, () => {
  syncImportedSelectionState()
}, { immediate: true })

watch(importedTableOptions, (tableOptions) => {
  if (!tableOptions.length) {
    importedSelectedTableKey.value = ''
    return
  }
  const selected = importedSelectedTableKey.value.trim().toLowerCase()
  if (selected && tableOptions.some((option) => option.key === selected)) return
  importedSelectedTableKey.value = tableOptions[0].key
})

function selectImportedTour(rawTourKey: string) {
  importedSelectedTourKey.value = rawTourKey.trim()
}

function selectImportedTourOption(tourKey: string) {
  selectImportedTour(tourKey)
  importedTourMenuOpen.value = false
}

function selectImportedTableOption(tableKey: string) {
  importedSelectedTableKey.value = tableKey.trim().toLowerCase()
  importedTableMenuOpen.value = false
}

function importedVariantTableLabel(variant: LobbyImportedVariant): string {
  const fromApi = (variant.table_label ?? '').trim()
  if (fromApi) return fromApi
  const fromTitle = variant.title.match(/стол\s*\d+/i)?.[0]
  if (fromTitle) {
    const normalized = fromTitle.replace(/\s+/g, ' ').trim()
    return normalized[0].toUpperCase() + normalized.slice(1)
  }
  const fromKey = variant.key.match(/table-(\d+)/i)?.[1]
  if (fromKey) return `Стол ${fromKey}`
  return variant.title
}

async function applyImportedSelection() {
  if (!hasImportedSelection.value || importedSelectionBusy.value || !lobbyId.value) return
  const key = importedResolvedVariantKey.value.trim()
  await applyImportedSelectionByKey(key)
}

async function applyImportedSelectionByKey(keyRaw: string) {
  if (!hasImportedSelection.value || importedSelectionBusy.value || !lobbyId.value) return
  const key = keyRaw.trim()
  if (!key || key === importedCurrentKey.value) return
  importedSelectionBusy.value = true
  importedSelectionError.value = null
  try {
    lobby.value = await setLobbyImportedSelection(lobbyId.value, { key })
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      try {
        lobby.value = await getLobby(lobbyId.value)
        importedSelectionError.value = 'Список туров/столов обновлён. Выберите вариант снова.'
      } catch (reloadError) {
        importedSelectionError.value =
          reloadError instanceof Error ? reloadError.message : 'Не удалось обновить лобби после переключения'
      }
      return
    }
    importedSelectionError.value = e instanceof Error ? e.message : String(e)
  } finally {
    importedSelectionBusy.value = false
  }
}

function openImportedParticipantsModal() {
  if (!isLobbyHost.value || !lobbyId.value || !hasImportedSelection.value) return
  if (swapBusy.value || rolesResetBusy.value || replaceSubmitting.value) return
  closeImportedMenus()
  importedParticipantsModalOpen.value = true
}

function toggleImportedTourMenu() {
  if (importedSelectionBusy.value || !isLobbyHost.value) return
  importedTableMenuOpen.value = false
  importedTourMenuOpen.value = !importedTourMenuOpen.value
}

function toggleImportedTableMenu() {
  if (importedSelectionBusy.value || !isLobbyHost.value) return
  importedTourMenuOpen.value = false
  importedTableMenuOpen.value = !importedTableMenuOpen.value
}

function closeImportedMenus() {
  importedTourMenuOpen.value = false
  importedTableMenuOpen.value = false
}

function onDocPointerDownImported(e: PointerEvent) {
  if (!importedTourMenuOpen.value && !importedTableMenuOpen.value) return
  const t = e.target
  if (!(t instanceof Element)) return
  if (importedSwitcherRef.value?.contains(t)) return
  closeImportedMenus()
}

function onDocPointerDownAddToRating(e: PointerEvent) {
  if (!addToRatingRatingMenuOpen.value) return
  const t = e.target
  if (!(t instanceof Element)) return
  if (addToRatingRatingPickerRef.value?.contains(t)) return
  closeAddToRatingRatingMenu()
}

function onAddToRatingEscapeKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (!addToRatingRatingMenuOpen.value) return
  closeAddToRatingRatingMenu()
}

function onImportedEscapeKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (importedParticipantsModalOpen.value) return
  closeImportedMenus()
}

function onReplaceEscapeKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closeReplace()
}

function onDocPointerDownReplace(e: PointerEvent) {
  if (isTabletLayout.value) return
  if (replaceOpenSeatIndex.value === null) return
  const t = e.target
  if (!(t instanceof Element)) return
  /** Вся ячейка ника строки с открытой заменой - не считаем «снаружи» (карандаш, поле, меню). */
  if (t.closest('.lobby-manage__row-nick-cell--replace-open')) return
  closeReplace()
}

function onTabletMqChange(e: MediaQueryListEvent) {
  resetSeatDragState()
  isTabletLayout.value = e.matches
  if (!e.matches) selectedSeatIndex.value = null
  closeReplace()
}

function onMobileRowSelect(idx: number, ev: MouseEvent) {
  if (!isTabletLayout.value) return
  if (suppressRowSelectClick) {
    suppressRowSelectClick = false
    return
  }
  const t = ev.target
  if (!(t instanceof Element)) return
  if (t.closest('button, input, label, a, [contenteditable="true"]')) return
  selectedSeatIndex.value = selectedSeatIndex.value === idx ? null : idx
}

function onDragStart(e: DragEvent, idx: number, p: LobbyPlayer | null) {
  swapHint.value = null
  if (!isLobbyHost.value || swapBusy.value || rolesResetBusy.value || !p?.membership_id) {
    e.preventDefault()
    return
  }
  dragActiveIndex.value = idx
  e.dataTransfer?.setData(SEAT_DND_MIME, String(idx))
  e.dataTransfer?.setData('text/plain', String(idx))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function resetSeatDragState() {
  const activePointerId = touchDragPointerId.value
  if (activePointerId !== null) releaseTouchDragCapture(activePointerId)
  touchDragPointerId.value = null
  removeTouchDragListeners()
  dragActiveIndex.value = null
  dragOverIndex.value = null
  stopTouchDragAutoScroll()
  clearTouchDragHold()
}

function onDragEnd() {
  resetSeatDragState()
}

function onGlobalSeatDragEnd() {
  if (dragActiveIndex.value === null && touchDragPointerId.value === null) return
  resetSeatDragState()
}

function onWindowSeatDragBlur() {
  if (dragActiveIndex.value === null && touchDragPointerId.value === null) return
  resetSeatDragState()
}

function onTableDragLeave(e: DragEvent) {
  const table = e.currentTarget
  const next = e.relatedTarget
  if (!(table instanceof HTMLElement)) return
  if (next instanceof Node && table.contains(next)) return
  dragOverIndex.value = null
}

function seatHasPlayer(idx: number): boolean {
  return !!seatRows.value[idx]?.membership_id
}

function rowIndexFromPoint(clientX: number, clientY: number): number | null {
  const el = document.elementFromPoint(clientX, clientY)
  const row = el?.closest('.lobby-manage__row')
  if (!(row instanceof HTMLElement)) return null
  const raw = row.dataset.rowIndex ?? ''
  const idx = Number.parseInt(raw, 10)
  return Number.isFinite(idx) ? idx : null
}

function resolveSwapTargetIndex(
  clientX: number,
  clientY: number,
  sourceIdx: number | null,
): number | null {
  const idx = rowIndexFromPoint(clientX, clientY)
  if (idx === null || idx === sourceIdx || !seatHasPlayer(idx)) return null
  return idx
}

function getScrollableAncestor(startEl: HTMLElement | null): HTMLElement | null {
  let el: HTMLElement | null = startEl
  while (el) {
    const style = window.getComputedStyle(el)
    const overflowY = style.overflowY
    const canScrollY =
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      el.scrollHeight > el.clientHeight + 1
    if (canScrollY) return el
    el = el.parentElement
  }
  return null
}

function applyTouchDragAutoScrollStep() {
  if (dragActiveIndex.value === null || !touchDragLastPoint) return
  const host = touchDragScrollHost
  const docScroller = document.scrollingElement as HTMLElement | null
  let top = 0
  let bottom = window.innerHeight
  let canScrollUp = false
  let canScrollDown = false
  let scrollByY = (deltaY: number) => window.scrollBy({ top: deltaY })

  if (host) {
    const rect = host.getBoundingClientRect()
    top = rect.top
    bottom = rect.bottom
    canScrollUp = host.scrollTop > 0
    canScrollDown = host.scrollTop + host.clientHeight < host.scrollHeight - 1
    scrollByY = (deltaY: number) => host.scrollBy({ top: deltaY })
  } else if (docScroller) {
    canScrollUp = docScroller.scrollTop > 0
    canScrollDown = docScroller.scrollTop + window.innerHeight < docScroller.scrollHeight - 1
  }

  const fromTop = touchDragLastPoint.y - top
  const fromBottom = bottom - touchDragLastPoint.y
  let delta = 0
  if (fromTop < SEAT_TOUCH_AUTO_SCROLL_EDGE_PX && canScrollUp) {
    const force = (SEAT_TOUCH_AUTO_SCROLL_EDGE_PX - Math.max(fromTop, 0)) / SEAT_TOUCH_AUTO_SCROLL_EDGE_PX
    delta = -Math.max(1, Math.ceil(force * SEAT_TOUCH_AUTO_SCROLL_MAX_STEP_PX))
  } else if (fromBottom < SEAT_TOUCH_AUTO_SCROLL_EDGE_PX && canScrollDown) {
    const force =
      (SEAT_TOUCH_AUTO_SCROLL_EDGE_PX - Math.max(fromBottom, 0)) / SEAT_TOUCH_AUTO_SCROLL_EDGE_PX
    delta = Math.max(1, Math.ceil(force * SEAT_TOUCH_AUTO_SCROLL_MAX_STEP_PX))
  }

  if (!delta) return
  scrollByY(delta)
  if (dragActiveIndex.value !== null && touchDragLastPoint) {
    dragOverIndex.value = resolveSwapTargetIndex(
      touchDragLastPoint.x,
      touchDragLastPoint.y,
      dragActiveIndex.value,
    )
  }
}

function tickTouchDragAutoScroll() {
  if (dragActiveIndex.value === null) {
    stopTouchDragAutoScroll()
    return
  }
  applyTouchDragAutoScrollStep()
  touchDragAutoScrollFrame = window.requestAnimationFrame(tickTouchDragAutoScroll)
}

function startTouchDragAutoScroll(captureEl: HTMLElement | null) {
  touchDragScrollHost = getScrollableAncestor(captureEl)
  if (touchDragAutoScrollFrame !== null) return
  touchDragAutoScrollFrame = window.requestAnimationFrame(tickTouchDragAutoScroll)
}

function stopTouchDragAutoScroll() {
  if (touchDragAutoScrollFrame !== null) {
    window.cancelAnimationFrame(touchDragAutoScrollFrame)
    touchDragAutoScrollFrame = null
  }
  touchDragLastPoint = null
  touchDragScrollHost = null
}

function addTouchDragListeners() {
  window.addEventListener('pointermove', onTouchDragMove, { passive: false })
  window.addEventListener('pointerup', onTouchDragEnd)
  window.addEventListener('pointercancel', onTouchDragCancel)
}

function removeTouchDragListeners() {
  window.removeEventListener('pointermove', onTouchDragMove)
  window.removeEventListener('pointerup', onTouchDragEnd)
  window.removeEventListener('pointercancel', onTouchDragCancel)
}

function releaseTouchDragCapture(pointerId: number) {
  const el = touchDragCaptureEl
  if (!el) return
  try {
    if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId)
  } catch {
    // ignore
  }
  touchDragCaptureEl = null
}

function captureTouchDragPointer(el: HTMLElement | null, pointerId: number) {
  if (!el) return
  try {
    el.setPointerCapture(pointerId)
    touchDragCaptureEl = el
  } catch {
    // ignore
  }
}

function clearTouchDragHold() {
  if (touchDragHoldTimer) {
    clearTimeout(touchDragHoldTimer)
    touchDragHoldTimer = null
  }
  if (touchDragPendingPointerId !== null) {
    releaseTouchDragCapture(touchDragPendingPointerId)
  }
  touchDragPendingPointerId = null
  touchDragPendingIdx = null
  touchDragHoldIndex.value = null
  touchDragLastPoint = null
  window.removeEventListener('pointermove', onTouchDragHoldPendingMove)
  window.removeEventListener('pointerup', onTouchDragHoldPendingUp)
  window.removeEventListener('pointercancel', onTouchDragHoldPendingUp)
}

function activateTouchDrag(pointerId: number, idx: number, captureEl: HTMLElement | null) {
  touchDragHoldIndex.value = null
  touchDragPointerId.value = pointerId
  dragActiveIndex.value = idx
  dragOverIndex.value = null
  suppressRowSelectClick = true
  if (captureEl) captureTouchDragPointer(captureEl, pointerId)
  startTouchDragAutoScroll(captureEl)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(12)
    } catch {
      // ignore
    }
  }
  addTouchDragListeners()
}

function onTouchDragHoldPendingMove(e: PointerEvent) {
  if (touchDragPendingPointerId !== e.pointerId || touchDragPendingIdx === null) return
  const dx = e.clientX - touchDragPendingStart.x
  const dy = e.clientY - touchDragPendingStart.y
  if (Math.hypot(dx, dy) > SEAT_TOUCH_HOLD_MOVE_PX) {
    clearTouchDragHold()
  }
}

function onTouchDragHoldPendingUp(e: PointerEvent) {
  if (touchDragPendingPointerId !== e.pointerId) return
  clearTouchDragHold()
}

async function swapSeatsByIndex(sourceIdx: number, targetIdx: number) {
  if (sourceIdx === targetIdx) {
    onDragEnd()
    return
  }

  const rows = seatRows.value
  const a = rows[sourceIdx]
  const b = rows[targetIdx]
  if (!a?.membership_id) {
    onDragEnd()
    return
  }
  if (!b?.membership_id) {
    swapHint.value = 'Обмен только между двумя занятыми местами: перетащите на строку с игроком.'
    onDragEnd()
    return
  }

  swapBusy.value = true
  swapHint.value = null
  try {
    lobby.value = await swapLobbySeats(lobbyId.value, {
      membership_id_a: a.membership_id,
      membership_id_b: b.membership_id,
    })
  } catch (err) {
    swapHint.value = err instanceof Error ? err.message : String(err)
  } finally {
    swapBusy.value = false
    onDragEnd()
  }
}

function onTouchDragStart(
  e: PointerEvent,
  idx: number,
  p: LobbyPlayer | null,
  captureEl: HTMLElement | null,
  instant = false,
) {
  swapHint.value = null
  if (!isLobbyHost.value || swapBusy.value || rolesResetBusy.value || !p?.membership_id) return

  clearTouchDragHold()
  touchDragLastPoint = { x: e.clientX, y: e.clientY }
  captureTouchDragPointer(captureEl, e.pointerId)

  if (instant) {
    activateTouchDrag(e.pointerId, idx, captureEl)
    return
  }

  touchDragPendingPointerId = e.pointerId
  touchDragPendingIdx = idx
  touchDragHoldIndex.value = idx
  touchDragPendingStart = { x: e.clientX, y: e.clientY }

  window.addEventListener('pointermove', onTouchDragHoldPendingMove, { passive: true })
  window.addEventListener('pointerup', onTouchDragHoldPendingUp)
  window.addEventListener('pointercancel', onTouchDragHoldPendingUp)

  touchDragHoldTimer = window.setTimeout(() => {
    touchDragHoldTimer = null
    const pointerId = touchDragPendingPointerId
    const pendingIdx = touchDragPendingIdx
    const pendingCaptureEl = touchDragCaptureEl
    window.removeEventListener('pointermove', onTouchDragHoldPendingMove)
    window.removeEventListener('pointerup', onTouchDragHoldPendingUp)
    window.removeEventListener('pointercancel', onTouchDragHoldPendingUp)
    touchDragPendingPointerId = null
    touchDragPendingIdx = null
    if (pointerId === null || pendingIdx === null) return
    activateTouchDrag(pointerId, pendingIdx, pendingCaptureEl)
  }, SEAT_TOUCH_HOLD_MS)
}

function onTouchDragNumPointerDown(e: PointerEvent, idx: number, p: LobbyPlayer | null) {
  if (!isTabletLayout.value) return
  if (!isLobbyHost.value || swapBusy.value || rolesResetBusy.value || !p?.membership_id) return
  if (e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()
  const cell = e.currentTarget
  if (!(cell instanceof HTMLElement)) return
  onTouchDragStart(e, idx, p, cell, true)
}

function onTouchDragRowPointerDown(e: PointerEvent, idx: number, p: LobbyPlayer | null) {
  if (!isTabletLayout.value) return
  const t = e.target
  if (!(t instanceof Element)) return
  if (t.closest('.lobby-manage__row-num-cell')) return
  if (t.closest('.lobby-manage__row-dots-cell')) return
  if (t.closest('button, input, label, a, [contenteditable="true"]')) return
  if (!isLobbyHost.value || swapBusy.value || rolesResetBusy.value || !p?.membership_id) return
  const row = e.currentTarget
  if (!(row instanceof HTMLElement)) return
  onTouchDragStart(e, idx, p, row)
}

function onTouchDragMove(e: PointerEvent) {
  if (touchDragPointerId.value !== e.pointerId || dragActiveIndex.value === null) return
  touchDragLastPoint = { x: e.clientX, y: e.clientY }
  dragOverIndex.value = resolveSwapTargetIndex(e.clientX, e.clientY, dragActiveIndex.value)
  applyTouchDragAutoScrollStep()
  e.preventDefault()
}

async function onTouchDragEnd(e: PointerEvent) {
  if (touchDragPointerId.value !== e.pointerId) return
  const sourceIdx = dragActiveIndex.value
  const targetIdx = resolveSwapTargetIndex(e.clientX, e.clientY, sourceIdx)
  resetSeatDragState()
  if (sourceIdx === null || targetIdx === null || swapBusy.value || rolesResetBusy.value) {
    return
  }
  await swapSeatsByIndex(sourceIdx, targetIdx)
}

function onTouchDragCancel(e: PointerEvent) {
  if (touchDragPointerId.value !== e.pointerId) return
  resetSeatDragState()
}

function onDragOver(e: DragEvent, idx: number) {
  if (!isLobbyHost.value || swapBusy.value || rolesResetBusy.value || dragActiveIndex.value === null)
    return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  if (idx === dragActiveIndex.value || !seatHasPlayer(idx)) {
    dragOverIndex.value = null
    return
  }
  dragOverIndex.value = idx
}

async function onDrop(e: DragEvent, targetIdx: number) {
  e.preventDefault()
  if (swapBusy.value || rolesResetBusy.value) {
    resetSeatDragState()
    return
  }
  const raw =
    e.dataTransfer?.getData(SEAT_DND_MIME) || e.dataTransfer?.getData('text/plain') || ''
  const sourceIdx = Number.parseInt(raw, 10)
  if (!Number.isFinite(sourceIdx)) {
    resetSeatDragState()
    return
  }
  resetSeatDragState()
  await swapSeatsByIndex(sourceIdx, targetIdx)
}

function rowPhoto(p: LobbyPlayer | null): string {
  if (!p) return ''
  const lobby = typeof p.lobby_photo_url === 'string' ? p.lobby_photo_url.trim() : ''
  if (lobby) return lobby
  const u = p.photo_urls?.[0]
  return typeof u === 'string' && u.trim() ? u.trim() : ''
}

function rowInitials(p: LobbyPlayer | null): string {
  if (!p) return '?'
  const name = (p.nickname || p.username || '').trim()
  if (name) return name[0]!.toUpperCase()
  return '?'
}

function playerRoleMeta(p: LobbyPlayer | null): { label: string; icon: string; toneClass: string } | null {
  const role = normRole(p?.game_role)
  const opt = ROLE_OPTIONS.find((item) => item.value === role)
  if (!opt) return null
  return {
    label: opt.label,
    icon: opt.icon,
    toneClass: `add-to-rating-panel__player-role-icon--${opt.value}`,
  }
}

function playerBestMoveLabels(p: LobbyPlayer | null): string[] {
  const raw = p?.best_move
  if (!Array.isArray(raw)) return []
  return raw
    .map((value) => (typeof value === 'string' ? value : '').trim())
    .filter(Boolean)
}

const addToRatingHasBestMove = computed(() =>
  (lobby.value?.players ?? []).some((player) => playerBestMoveLabels(player).length > 0),
)

function rowKey(idx: number, p: LobbyPlayer | null): string {
  if (p?.membership_id) return p.membership_id
  return `empty-${idx}`
}

function goDashboard() {
  void router.push({ name: 'dashboard' })
}

function showLobbyToast(text: string, ms = 1800) {
  lobbyToastMessage.value = text
  lobbyToastVisible.value = true
  if (lobbyToastTimer) clearTimeout(lobbyToastTimer)
  lobbyToastTimer = setTimeout(() => {
    lobbyToastTimer = null
    lobbyToastVisible.value = false
  }, ms)
}

function showPopupFeedback(text: string, ms = 1800) {
  popupFeedback.value = text
  if (popupFeedbackTimer) clearTimeout(popupFeedbackTimer)
  popupFeedbackTimer = setTimeout(() => {
    popupFeedbackTimer = null
    popupFeedback.value = null
  }, ms)
}

function showPersistentFeedback(text: string, ms = 1800) {
  persistentMessageFeedback.value = text
  if (persistentFeedbackTimer) clearTimeout(persistentFeedbackTimer)
  persistentFeedbackTimer = setTimeout(() => {
    persistentFeedbackTimer = null
    persistentMessageFeedback.value = null
  }, ms)
}

function clearFeedbackTimers() {
  if (popupFeedbackTimer) {
    clearTimeout(popupFeedbackTimer)
    popupFeedbackTimer = null
  }
  if (persistentFeedbackTimer) {
    clearTimeout(persistentFeedbackTimer)
    persistentFeedbackTimer = null
  }
  if (lobbyToastTimer) {
    clearTimeout(lobbyToastTimer)
    lobbyToastTimer = null
  }
  lobbyToastVisible.value = false
}

function formatSpeechTimerDisplay(totalSec: number): string {
  const total = Math.max(0, totalSec)
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

const speechTimerDisplay = computed(() => formatSpeechTimerDisplay(speechTimerElapsedSec.value))

function clearSpeechTimerTick() {
  if (speechTimerTickInterval) {
    clearInterval(speechTimerTickInterval)
    speechTimerTickInterval = null
  }
}

function getSpeechTimerElapsedSecByClock(nowMs = Date.now()): number {
  if (!speechTimerRunning.value || speechTimerStartedAtMs === null) {
    return speechTimerElapsedBeforeRunSec
  }
  const elapsedWhileRunning = Math.max(0, Math.floor((nowMs - speechTimerStartedAtMs) / 1000))
  return speechTimerElapsedBeforeRunSec + elapsedWhileRunning
}

function syncSpeechTimerElapsed(): void {
  speechTimerElapsedSec.value = getSpeechTimerElapsedSecByClock()
}

function startSpeechTimerTick() {
  clearSpeechTimerTick()
  syncSpeechTimerElapsed()
  speechTimerTickInterval = setInterval(syncSpeechTimerElapsed, 250)
}

function toggleSpeechTimerPause() {
  if (!isLobbyHost.value) return
  if (speechTimerRunning.value) {
    syncSpeechTimerElapsed()
    speechTimerElapsedBeforeRunSec = speechTimerElapsedSec.value
    speechTimerStartedAtMs = null
    speechTimerRunning.value = false
    clearSpeechTimerTick()
    return
  }
  speechTimerStartedAtMs = Date.now()
  speechTimerRunning.value = true
  startSpeechTimerTick()
}

function restartSpeechTimer() {
  if (!isLobbyHost.value) return
  clearSpeechTimerTick()
  speechTimerElapsedBeforeRunSec = 0
  speechTimerElapsedSec.value = 0
  speechTimerStartedAtMs = Date.now()
  speechTimerRunning.value = true
  startSpeechTimerTick()
}

function loadPersistentMessageDraft() {
  if (!lobbyId.value) {
    persistentMessageDraft.value = ''
    persistentMessageTone.value = 'green'
    return
  }
  const data = readOverlayPersistentMessage(lobbyId.value, activePersistentDesignCode.value)
  persistentMessageDraft.value = data.text
  persistentMessageTone.value = data.color
}

function normalizePersistentDesignCode(
  raw: string,
): 'classic' | 'masters-yug25' | 'plus' {
  const normalized = normalizeOverlayDesignCode(raw)
  if (normalized === 'masters-yug25') return 'masters-yug25'
  if (normalized === 'plus') return 'plus'
  return 'classic'
}

async function syncActivePersistentDesignCode() {
  if (!lobbyId.value) {
    activePersistentDesignCode.value = 'classic'
    return
  }
  try {
    const data = await getLobbyOverlayDesigns(lobbyId.value)
    const selected = normalizePersistentDesignCode(data.selected_overlay_design)
    activePersistentDesignCode.value = selected
  } catch {
    activePersistentDesignCode.value = 'classic'
  }
}

watch(
  () => lobbyId.value,
  async () => {
    await syncActivePersistentDesignCode()
    loadPersistentMessageDraft()
    persistentMessageFeedback.value = null
    popupFeedback.value = null
  },
  { immediate: true },
)

function savePersistentMessage() {
  if (!lobbyId.value) return
  const normalized = persistentMessageDraft.value.trim().slice(0, PERSISTENT_MESSAGE_MAX_LENGTH)
  persistentMessageDraft.value = normalized
  writeOverlayPersistentMessage(lobbyId.value, activePersistentDesignCode.value, {
    text: normalized,
    color: persistentMessageTone.value,
  })
  const designLabel = activePersistentDesignCode.value === 'masters-yug25'
    ? 'Masters Yug25'
    : activePersistentDesignCode.value === 'plus'
      ? 'Plus'
      : 'Classic'
  showPersistentFeedback(normalized ? `Плашка сохранена для ${designLabel}.` : 'Сброшено')
}

function resetPersistentMessage() {
  if (!lobbyId.value) return
  persistentMessageDraft.value = ''
  writeOverlayPersistentMessage(lobbyId.value, activePersistentDesignCode.value, {
    text: '',
    color: persistentMessageTone.value,
  })
  showPersistentFeedback('Сброшено')
}

function parsePopupDurationMs(rawDuration: string): number {
  const numeric = Number.parseInt(rawDuration.trim(), 10)
  if (!Number.isFinite(numeric) || numeric <= 0) return 7000
  const seconds = Math.min(Math.max(numeric, 1), 120)
  return seconds * 1000
}

function emitPopupMessage() {
  if (!lobbyId.value) return
  const h1 = popupTitleDraft.value.trim().slice(0, POPUP_TEXT_MAX_LENGTH)
  const h2 = popupSubtitleDraft.value.trim().slice(0, POPUP_TEXT_MAX_LENGTH)
  popupTitleDraft.value = h1
  popupSubtitleDraft.value = h2
  if (!h1 && !h2) {
    showPopupFeedback('Введите H1 или H2', 2200)
    return
  }
  const durationMs = parsePopupDurationMs(popupDurationDraft.value)
  popupDurationDraft.value = String(Math.round(durationMs / 1000))
  const payload = createOverlayPopupMessageDraft({
    h1,
    h2,
    h1_color: popupTitleTone.value,
    h2_color: popupSubtitleTone.value,
    duration_ms: durationMs,
  })
  writeOverlayPopupMessage(lobbyId.value, activePersistentDesignCode.value, payload)
  showPopupFeedback('Показано')
}

function isOverlayScreenActive(screenKey: string): boolean {
  return (lobby.value?.active_overlay_screen ?? '').trim().toLowerCase() === screenKey
}

const bonusPointsWinner = computed<'mafia' | 'peaceful' | null>(() => {
  if (isOverlayScreenActive('victory-mafia')) return 'mafia'
  if (isOverlayScreenActive('victory-peaceful')) return 'peaceful'
  return null
})

function teamPointsForPlayer(player: LobbyPlayer): number {
  const role = (player.game_role ?? '').trim().toLowerCase()
  if (bonusPointsWinner.value === 'mafia') return role === 'mafia' || role === 'don' ? 1 : 0
  if (bonusPointsWinner.value === 'peaceful') return role === 'peaceful' || role === 'sheriff' ? 1 : 0
  return 0
}

function teamPointsForBonusModal(player: LobbyPlayer): number {
  if (addToRatingOpen.value) {
    const role = mapLobbyRoleToRatingRole(player.game_role)
    if (!role) return 0
    return scoreTeamPointByWinner(role, addToRatingWinnerSide.value)
  }
  return teamPointsForPlayer(player)
}

function mapLobbyRoleToRatingRole(role: string | null | undefined): RatingGameRole | null {
  const normalized = (role ?? '').trim().toLowerCase()
  if (normalized === 'peaceful') return 'peaceful'
  if (normalized === 'mafia') return 'mafia'
  if (normalized === 'don') return 'don'
  if (normalized === 'sheriff') return 'sheriff'
  return null
}

const ADD_TO_RATING_REQUIRED_ROLE_COUNTS: Record<RatingGameRole, number> = {
  peaceful: 6,
  mafia: 2,
  don: 1,
  sheriff: 1,
}

const ADD_TO_RATING_REQUIRED_PLAYERS = Object.values(ADD_TO_RATING_REQUIRED_ROLE_COUNTS).reduce(
  (sum, count) => sum + count,
  0,
)

type AddToRatingValidation = {
  ok: boolean
  message: string
}

function validateAddToRatingTable(): AddToRatingValidation {
  const players = lobby.value?.players ?? []

  if (players.length !== ADD_TO_RATING_REQUIRED_PLAYERS) {
    return {
      ok: false,
      message: `На столе должно быть ${ADD_TO_RATING_REQUIRED_PLAYERS} игроков с карточками и ролями.`,
    }
  }

  const roleCounts: Record<RatingGameRole, number> = {
    peaceful: 0,
    mafia: 0,
    don: 0,
    sheriff: 0,
  }
  let missingCardsOrRoles = 0

  for (const player of players) {
    const playerCardId = player.player_card_id?.trim()
    const mappedRole = mapLobbyRoleToRatingRole(player.game_role)
    if (!playerCardId || !mappedRole) {
      missingCardsOrRoles += 1
      continue
    }
    roleCounts[mappedRole] += 1
  }

  if (missingCardsOrRoles > 0) {
    return {
      ok: false,
      message: 'У части игроков не назначены роли или карточки. Заполните стол полностью.',
    }
  }

  const mismatches: string[] = []
  if (roleCounts.peaceful !== ADD_TO_RATING_REQUIRED_ROLE_COUNTS.peaceful) {
    mismatches.push(`мирных ${roleCounts.peaceful}/${ADD_TO_RATING_REQUIRED_ROLE_COUNTS.peaceful}`)
  }
  if (roleCounts.mafia !== ADD_TO_RATING_REQUIRED_ROLE_COUNTS.mafia) {
    mismatches.push(`мафии ${roleCounts.mafia}/${ADD_TO_RATING_REQUIRED_ROLE_COUNTS.mafia}`)
  }
  if (roleCounts.don !== ADD_TO_RATING_REQUIRED_ROLE_COUNTS.don) {
    mismatches.push(`дона ${roleCounts.don}/${ADD_TO_RATING_REQUIRED_ROLE_COUNTS.don}`)
  }
  if (roleCounts.sheriff !== ADD_TO_RATING_REQUIRED_ROLE_COUNTS.sheriff) {
    mismatches.push(`шерифа ${roleCounts.sheriff}/${ADD_TO_RATING_REQUIRED_ROLE_COUNTS.sheriff}`)
  }

  if (mismatches.length) {
    return {
      ok: false,
      message: `Неверный состав ролей: нужно 6 мирных, 2 мафии, 1 дон и 1 шериф (${mismatches.join(', ')}).`,
    }
  }

  return { ok: true, message: '' }
}

function inferWinnerSideFromOverlay(): RatingWinnerSide {
  if (bonusPointsWinner.value === 'mafia') return 'black'
  if (bonusPointsWinner.value === 'peaceful') return 'red'
  return 'red'
}

function scoreTeamPointByWinner(role: RatingGameRole, winnerSide: RatingWinnerSide): number {
  if (winnerSide === 'black') return role === 'mafia' || role === 'don' ? 1 : 0
  return role === 'peaceful' || role === 'sheriff' ? 1 : 0
}

function parseAddToRatingBonusPoints(membershipId: string): number {
  const bonusRaw = Number(bonusPointsDraft.value[membershipId] ?? 0)
  return Number.isFinite(bonusRaw) ? Math.round(bonusRaw * 10) / 10 : 0
}

function totalPointsForAddToRating(player: LobbyPlayer): number {
  const role = mapLobbyRoleToRatingRole(player.game_role)
  if (!role) return 0
  const team = scoreTeamPointByWinner(role, addToRatingWinnerSide.value)
  const bonus = parseAddToRatingBonusPoints(player.membership_id)
  return Math.round((team + bonus) * 10) / 10
}

function buildRatingGameTitleDefault(): string {
  return `${lobbyDisplayName.value} — игра`
}

function readPersistentMessageText(): string {
  const draft = persistentMessageDraft.value.trim()
  if (draft) return draft
  if (!lobbyId.value) return ''
  return readOverlayPersistentMessage(lobbyId.value, activePersistentDesignCode.value).text.trim()
}

const addToRatingPersistentMessageAvailable = computed(() => !!readPersistentMessageText())

const showAddToRatingCopyPersistentButton = computed(
  () =>
    !addToRatingCopyPersistentDismissed.value &&
    addToRatingPersistentMessageAvailable.value &&
    !addToRatingSubmitting.value,
)

function copyAddToRatingTitleFromPersistentMessage() {
  if (addToRatingSubmitting.value) return
  const text = readPersistentMessageText()
  if (!text) return
  addToRatingGameTitle.value = text.slice(0, 255)
  addToRatingCopyPersistentDismissed.value = true
}

function buildRatingGameResults(
  winnerSide: RatingWinnerSide,
): { results: RatingGameResultWrite[]; skippedCount: number } {
  const players = lobby.value?.players ?? []
  const results: RatingGameResultWrite[] = []
  let skippedCount = 0
  for (const player of players) {
    const playerCardId = player.player_card_id?.trim()
    const mappedRole = mapLobbyRoleToRatingRole(player.game_role)
    if (!playerCardId || !mappedRole) {
      skippedCount += 1
      continue
    }
    const bonusSource = addToRatingOpen.value
      ? bonusPointsDraft.value[player.membership_id]
      : undefined
    const bonusRaw = bonusSource !== undefined ? Number(bonusSource) : Number(player.bonus_points ?? 0)
    const bonusPoints = Number.isFinite(bonusRaw) ? Math.round(bonusRaw * 10) / 10 : 0
    const totalPoints = Math.round((scoreTeamPointByWinner(mappedRole, winnerSide) + bonusPoints) * 10) / 10
    results.push({
      player_card_id: playerCardId,
      role: mappedRole,
      bonus_points: bonusPoints,
      total_points: totalPoints,
    })
  }
  return { results, skippedCount }
}

function initBonusPointsDraft() {
  if (!lobby.value) return
  bonusPointsDraft.value = Object.fromEntries(
    lobby.value.players.map((player) => [player.membership_id, String(player.bonus_points ?? 0)]),
  )
}

const addToRatingTransferStats = computed(() => {
  return buildRatingGameResults(addToRatingWinnerSide.value)
})

const addToRatingValidation = computed(() => validateAddToRatingTable())

const addToRatingCanSubmit = computed(
  () =>
    addToRatingValidation.value.ok &&
    !!addToRatingRatings.value.length &&
    !addToRatingLoading.value,
)

const addToRatingSelectedLabel = computed(() => {
  const id = addToRatingSelectedId.value.trim()
  if (!id) return 'Выберите рейтинг'
  return addToRatingRatings.value.find((rating) => rating.id === id)?.name ?? 'Выберите рейтинг'
})

const addToRatingSelectedRating = computed(() => {
  const id = addToRatingSelectedId.value.trim()
  if (!id) return null
  return addToRatingRatings.value.find((rating) => rating.id === id) ?? null
})

function formatAddToRatingEventDate(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function closeAddToRatingRatingMenu() {
  addToRatingRatingMenuOpen.value = false
}

function toggleAddToRatingRatingMenu() {
  if (addToRatingLoading.value || addToRatingSubmitting.value || !addToRatingRatings.value.length) return
  addToRatingRatingMenuOpen.value = !addToRatingRatingMenuOpen.value
}

function selectAddToRatingRating(id: string) {
  addToRatingSelectedId.value = id
  closeAddToRatingRatingMenu()
}

async function openAddToRatingModal() {
  if (!isLobbyHost.value || !lobby.value || addToRatingLoading.value || addToRatingSubmitting.value) return
  lobbyManageUi.openAddToRating()
  addToRatingError.value = null
  addToRatingSuccess.value = null
  loadPersistentMessageDraft()
  addToRatingGameTitle.value = buildRatingGameTitleDefault()
  addToRatingCopyPersistentDismissed.value = false
  addToRatingPlayedAt.value = new Date().toISOString().slice(0, 10)
  addToRatingWinnerSide.value = inferWinnerSideFromOverlay()
  addToRatingSelectedId.value = ''
  addToRatingRatings.value = []
  closeAddToRatingRatingMenu()
  initBonusPointsDraft()
  bonusPointsError.value = null
  addToRatingLoading.value = true
  try {
    const rows = await listRatings()
    addToRatingRatings.value = rows
    addToRatingSelectedId.value = rows[0]?.id ?? ''
    if (!rows.length) addToRatingError.value = 'Сначала создайте турнир в разделе «Создать турнир».'
  } catch (e) {
    addToRatingError.value = e instanceof Error ? e.message : 'Не удалось загрузить список рейтингов'
  } finally {
    addToRatingLoading.value = false
  }
}

function closeAddToRatingModal(forceOrEvent: boolean | Event = false) {
  const force = typeof forceOrEvent === 'boolean' ? forceOrEvent : false
  if (addToRatingSubmitting.value && !force) return
  closeAddToRatingRatingMenu()
  lobbyManageUi.closeAddToRating()
  addToRatingError.value = null
}

async function submitAddToRating() {
  if (!lobby.value || addToRatingSubmitting.value) return
  if (!lobbyId.value) {
    addToRatingError.value = 'Не удалось определить ID лобби.'
    return
  }
  const ratingId = addToRatingSelectedId.value.trim()
  if (!ratingId) {
    addToRatingError.value = 'Выберите рейтинг'
    return
  }
  if (!addToRatingPlayedAt.value.trim()) {
    addToRatingError.value = 'Укажите дату игры'
    return
  }

  const { results } = buildRatingGameResults(addToRatingWinnerSide.value)
  const validation = validateAddToRatingTable()
  if (!validation.ok) {
    addToRatingError.value = validation.message
    return
  }
  if (results.length !== ADD_TO_RATING_REQUIRED_PLAYERS) {
    addToRatingError.value = validation.message || 'Не удалось собрать результаты для всех игроков.'
    return
  }

  addToRatingSubmitting.value = true
  addToRatingError.value = null
  addToRatingSuccess.value = null
  try {
    const bonusSaved = await persistBonusPointsDraft()
    if (!bonusSaved) return

    const syncedResults = buildRatingGameResults(addToRatingWinnerSide.value).results
    await syncRatingFromLobby(ratingId, {
      lobby_id: lobbyId.value,
      played_at: addToRatingPlayedAt.value.trim(),
      winner_side: addToRatingWinnerSide.value,
      title: addToRatingGameTitle.value.trim(),
      total_points: syncedResults.map((row) => ({
        player_card_id: row.player_card_id,
        total_points: row.total_points,
      })),
    })
    await applyLobbyRolesAndStatusesReset()
    closeAddToRatingModal(true)
    showLobbyToast('Игра добавлена в рейтинг', 1800)
  } catch (e) {
    addToRatingError.value = e instanceof Error ? e.message : 'Не удалось добавить игру в рейтинг'
  } finally {
    addToRatingSubmitting.value = false
  }
}

async function setOverlayScreen(screenKey: 'lobby' | 'victory-mafia' | 'victory-peaceful') {
  if (!lobbyId.value || !isLobbyHost.value || overlayScreenSaving.value) return
  overlayScreenSaving.value = true
  overlayScreenError.value = null
  try {
    lobby.value = await setLobbyOverlayScreen(lobbyId.value, { screen_key: screenKey })
    notifyOverlayLobbyChanged(lobbyId.value)
  } catch (e) {
    overlayScreenError.value = e instanceof Error ? e.message : String(e)
  } finally {
    overlayScreenSaving.value = false
  }
}

async function toggleVictoryScores() {
  if (!lobbyId.value || !isLobbyHost.value || victoryScoresSaving.value) return
  victoryScoresSaving.value = true
  overlayScreenError.value = null
  try {
    lobby.value = await setLobbyVictoryScoresVisibility(lobbyId.value, {
      show_scores: !(lobby.value?.show_victory_scores === true),
    })
    notifyOverlayLobbyChanged(lobbyId.value)
  } catch (e) {
    overlayScreenError.value = e instanceof Error ? e.message : String(e)
  } finally {
    victoryScoresSaving.value = false
  }
}

function openBonusPointsModal() {
  if (!isLobbyHost.value || !lobby.value) return
  initBonusPointsDraft()
  bonusPointsError.value = null
  bonusPointsModalOpen.value = true
}

function closeBonusPointsModal() {
  if (bonusPointsSaving.value || bonusPointsResetting.value) return
  bonusPointsModalOpen.value = false
  bonusPointsError.value = null
}

function updateBonusPoints(membershipId: string, value: string) {
  bonusPointsDraft.value = { ...bonusPointsDraft.value, [membershipId]: value }
}

function changeBonusPointsByStep(membershipId: string, delta: number) {
  const current = Number(bonusPointsDraft.value[membershipId] ?? 0)
  const safeCurrent = Number.isFinite(current) ? current : 0
  const next = Math.min(99.9, Math.max(-99.9, Math.round((safeCurrent + delta) * 10) / 10))
  updateBonusPoints(membershipId, next.toFixed(1))
}

async function persistBonusPointsDraft(): Promise<boolean> {
  if (!lobbyId.value || !lobby.value || !isLobbyHost.value || bonusPointsSaving.value || bonusPointsResetting.value) {
    return false
  }
  const entries = lobby.value.players.map((player) => {
    const raw = (bonusPointsDraft.value[player.membership_id] ?? '').trim()
    const points = raw ? Number(raw) : 0
    return { membership_id: player.membership_id, points }
  })
  if (
    entries.some(
      (entry) =>
        !Number.isFinite(entry.points) ||
        Math.abs(entry.points * 10 - Math.round(entry.points * 10)) > 1e-8 ||
        entry.points < -99.9 ||
        entry.points > 99.9,
    )
  ) {
    bonusPointsError.value = 'Укажите значение от −99.9 до 99.9 с шагом 0.1.'
    return false
  }
  bonusPointsSaving.value = true
  bonusPointsError.value = null
  try {
    lobby.value = await setLobbyBonusPoints(lobbyId.value, { bonus_points: entries })
    notifyOverlayLobbyChanged(lobbyId.value)
    return true
  } catch (e) {
    bonusPointsError.value = e instanceof Error ? e.message : String(e)
    return false
  } finally {
    bonusPointsSaving.value = false
  }
}

async function saveBonusPoints() {
  const saved = await persistBonusPointsDraft()
  if (saved) bonusPointsModalOpen.value = false
}

async function resetBonusPoints() {
  if (!lobbyId.value || !lobby.value || !isLobbyHost.value || bonusPointsSaving.value || bonusPointsResetting.value) return
  bonusPointsResetting.value = true
  bonusPointsError.value = null
  try {
    const entries = lobby.value.players.map((player) => ({
      membership_id: player.membership_id,
      points: 0,
    }))
    lobby.value = await setLobbyBonusPoints(lobbyId.value, { bonus_points: entries })
    bonusPointsDraft.value = Object.fromEntries(entries.map((entry) => [entry.membership_id, '0']))
    notifyOverlayLobbyChanged(lobbyId.value)
  } catch (e) {
    bonusPointsError.value = e instanceof Error ? e.message : String(e)
  } finally {
    bonusPointsResetting.value = false
  }
}

function openPhotoModal(p: LobbyPlayer) {
  if (!isLobbyHost.value || swapBusy.value || rolesResetBusy.value || !p.membership_id) return
  void (async () => {
    await syncActivePersistentDesignCode()
    photoModalPlayer.value = p
    photoModalOpen.value = true
  })()
}

function onPhotoModalApplied(next: GameLobby) {
  lobby.value = next
  const membershipId = photoModalPlayer.value?.membership_id
  if (membershipId) {
    photoModalPlayer.value =
      next.players.find((p) => p.membership_id === membershipId) ?? photoModalPlayer.value
  }
  notifyOverlayLobbyChanged(lobbyId.value)
}

watch(photoModalOpen, (isOpen) => {
  if (!isOpen) photoModalPlayer.value = null
})

function closeReplace() {
  replaceOpenSeatIndex.value = null
  replaceSearchQuery.value = ''
  rosterLoadError.value = null
  rosterCards.value = []
  replaceRosterLoading.value = false
}

async function openReplace(seatIdx: number, p: LobbyPlayer) {
  if (!isLobbyHost.value || swapBusy.value || rolesResetBusy.value || replaceSubmitting.value || !p.membership_id)
    return
  replaceOpenSeatIndex.value = seatIdx
  replaceSearchQuery.value = ''
  rosterLoadError.value = null
  rosterCards.value = []
  replaceRosterLoading.value = true
  try {
    const u = await me()
    const raw = await listPlayerCards(u.id)
    rosterCards.value = Array.isArray(raw) ? raw : []
  } catch (e) {
    rosterLoadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    replaceRosterLoading.value = false
    await nextTick()
    replaceSearchInputRef.value?.focus()
  }
}

async function toggleReplace(seatIdx: number, p: LobbyPlayer) {
  if (replaceOpenSeatIndex.value === seatIdx) {
    closeReplace()
    return
  }
  await openReplace(seatIdx, p)
}

async function pickReplaceCard(card: PlayerCard) {
  const idx = replaceOpenSeatIndex.value
  const pl = idx !== null ? seatRows.value[idx] : null
  if (!pl?.membership_id || replaceSubmitting.value) return
  replaceSubmitting.value = true
  swapHint.value = null
  try {
    lobby.value = await replaceLobbyMemberCard(lobbyId.value, pl.membership_id, {
      player_card_id: card.id,
    })
    closeReplace()
  } catch (e) {
    swapHint.value = e instanceof Error ? e.message : String(e)
  } finally {
    replaceSubmitting.value = false
  }
}

function isRoleActive(p: LobbyPlayer | null, role: LobbyRoleValue): boolean {
  return normRole(p?.game_role) === role
}

function isRoleShownActive(p: LobbyPlayer | null, role: LobbyRoleValue): boolean {
  if (!hideRoleMarks.value) return isRoleActive(p, role)
  return isRoleHostFlashVisible(p, role)
}

function isRoleBusy(p: LobbyPlayer | null): boolean {
  return !!p?.membership_id && roleSubmittingMembershipId.value === p.membership_id
}

function isStatusActive(p: LobbyPlayer | null, status: LobbyStatusValue): boolean {
  return normStatus(p?.status) === status
}

function isStatusBusy(p: LobbyPlayer | null): boolean {
  return !!p?.membership_id && statusSubmittingMembershipId.value === p.membership_id
}

async function toggleRole(p: LobbyPlayer | null, role: LobbyRoleValue) {
  if (
    !isLobbyHost.value ||
    swapBusy.value ||
    rolesResetBusy.value ||
    !p?.membership_id ||
    isRoleBusy(p) ||
    isStatusBusy(p)
  ) return
  if (hideRoleMarks.value) flashHostModeRoleClick(p.membership_id, role)
  roleSubmittingMembershipId.value = p.membership_id
  swapHint.value = null
  try {
    lobby.value = isRoleActive(p, role)
      ? await clearLobbyMemberRole(lobbyId.value, p.membership_id)
      : await setLobbyMemberRole(lobbyId.value, p.membership_id, { game_role: role })
  } catch (e) {
    swapHint.value = e instanceof Error ? e.message : String(e)
  } finally {
    roleSubmittingMembershipId.value = null
  }
}

async function toggleStatus(p: LobbyPlayer | null, status: LobbyStatusValue) {
  if (
    !isLobbyHost.value ||
    swapBusy.value ||
    rolesResetBusy.value ||
    !p?.membership_id ||
    isStatusBusy(p) ||
    isRoleBusy(p)
  ) return
  statusSubmittingMembershipId.value = p.membership_id
  swapHint.value = null
  try {
    if (status === 'best-move') {
      // ЛХ — отложенное действие: до «Сохранить» не меняем ни статус,
      // ни payload в lobby, чтобы overlay не показал старые значения.
      openBestMoveModal(p)
      return
    }
    lobby.value = isStatusActive(p, status)
      ? await clearLobbyMemberStatus(lobbyId.value, p.membership_id)
      : await setLobbyMemberStatus(lobbyId.value, p.membership_id, { status })
  } catch (e) {
    swapHint.value = e instanceof Error ? e.message : String(e)
  } finally {
    statusSubmittingMembershipId.value = null
  }
}

async function applyLobbyRolesAndStatusesReset(): Promise<void> {
  const id = lobbyId.value
  if (!id) throw new Error('Не удалось определить ID лобби.')
  await clearLobbyBestMove(id)
  await clearLobbySheriffCheck(id)
  if (lobby.value?.players.length) {
    await setLobbyBonusPoints(id, {
      bonus_points: lobby.value.players.map((player) => ({
        membership_id: player.membership_id,
        points: 0,
      })),
    })
  }
  await resetLobbyGameRoles(id)
  lobby.value = await resetLobbyStatuses(id)
  sheriffChecksValues.value = ['', '', '', '', '']
  sheriffChecksError.value = null
  bestMoveValues.value = ['', '', '']
  bestMoveError.value = null
  initBonusPointsDraft()
}

async function resetAllRolesAndStatuses() {
  if (!isLobbyHost.value || swapBusy.value || rolesResetBusy.value || replaceSubmitting.value) return
  const id = lobbyId.value
  if (!id) return
  rolesResetBusy.value = true
  swapHint.value = null
  try {
    await applyLobbyRolesAndStatusesReset()
  } catch (e) {
    swapHint.value = e instanceof Error ? e.message : String(e)
  } finally {
    rolesResetBusy.value = false
  }
}

function openDeleteConfirm() {
  if (!isLobbyHost.value || deleteBusy.value || !lobbyId.value) return
  deleteConfirmOpen.value = true
}

function closeDeleteConfirm() {
  if (deleteBusy.value) return
  deleteConfirmOpen.value = false
}

async function confirmDeleteLobby() {
  if (!isLobbyHost.value || deleteBusy.value || !lobbyId.value) return
  deleteBusy.value = true
  swapHint.value = null
  try {
    await deleteLobby(lobbyId.value)
    deleteConfirmOpen.value = false
    await router.push({ name: 'dashboard' })
  } catch (e) {
    swapHint.value = e instanceof Error ? e.message : String(e)
  } finally {
    deleteBusy.value = false
  }
}

watch(isReplacePanelOpen, (open) => {
  if (open) {
    void nextTick(() => {
      document.addEventListener('pointerdown', onDocPointerDownReplace, true)
    })
    window.addEventListener('keydown', onReplaceEscapeKey)
  } else {
    document.removeEventListener('pointerdown', onDocPointerDownReplace, true)
    window.removeEventListener('keydown', onReplaceEscapeKey)
  }
})

watch(
  () => lobbyManageUi.designChangedToken,
  async () => {
    await syncActivePersistentDesignCode()
    loadPersistentMessageDraft()
    persistentMessageFeedback.value = null
  },
)

watch(
  () => lobbyManageUi.designPickerOpenToken,
  () => {
    openCardDesignPicker()
  },
)

watch(
  lobbyDisplayName,
  (name) => {
    lobbyManageUi.setDesignPickerLobbyTitle(name)
  },
  { immediate: true },
)

watch(lobbyId, () => {
  lobbyManageUi.closeDesignPicker()
})

function openCardDesignPicker() {
  if (!lobby.value || !lobbyId.value) return
  if (!isLobbyHost.value || swapBusy.value || rolesResetBusy.value || replaceSubmitting.value) return
  lobbyManageUi.openDesignPicker()
}

function onCardDesignSaved() {
  void syncActivePersistentDesignCode()
  lobbyManageUi.notifyDesignChanged()
  lobbyManageUi.closeDesignPicker()
}

function closeCardDesignPicker() {
  lobbyManageUi.closeDesignPicker()
}

watch(
  () => lobbyManageUi.deleteConfirmOpenToken,
  () => {
    openDeleteConfirm()
  },
)

watch(
  () => lobbyManageUi.addToRatingOpenToken,
  () => {
    void openAddToRatingModal()
  },
)

function cardThumb(c: PlayerCard): string {
  const u = c.photo_urls?.[0]
  return typeof u === 'string' && u.trim() ? u.trim() : ''
}

function cardFullName(c: PlayerCard): string {
  const parts = [c.first_name?.trim(), c.last_name?.trim()].filter(Boolean)
  return parts.join(' ')
}

function canOpenSheriffChecks(p: LobbyPlayer | null): boolean {
  return (
    !!p?.membership_id &&
    isLobbyHost.value &&
    !swapBusy.value &&
    !rolesResetBusy.value &&
    !replaceSubmitting.value &&
    !isRoleBusy(p) &&
    !isStatusBusy(p) &&
    isRoleActive(p, 'sheriff')
  )
}

function openSheriffChecksModal(p: LobbyPlayer | null) {
  if (!canOpenSheriffChecks(p) || !p?.membership_id) return
  sheriffChecksTargetMembershipId.value = p.membership_id
  sheriffChecksValues.value = readSheriffChecksFromLobby(lobby.value)
  sheriffChecksError.value = null
  sheriffChecksModalOpen.value = true
}

function closeSheriffChecksModal() {
  if (sheriffChecksSaving.value || sheriffChecksResetting.value) return
  sheriffChecksModalOpen.value = false
  sheriffChecksTargetMembershipId.value = null
  sheriffChecksError.value = null
}

function closeSheriffChecksModalForced() {
  sheriffChecksModalOpen.value = false
  sheriffChecksTargetMembershipId.value = null
  sheriffChecksError.value = null
}

function updateSheriffCheckValue(idx: number, value: string) {
  const next = sheriffChecksValues.value.slice()
  next[idx] = value
  sheriffChecksValues.value = next
}

function readSheriffChecksFromLobby(sourceLobby: GameLobby | null): string[] {
  const source = (sourceLobby ?? {}) as Record<string, unknown>
  const raw = source.sheriff_check
  if (!Array.isArray(raw)) return ['', '', '', '', '']
  const normalized = raw
    .slice(0, 5)
    .map((x) => (typeof x === 'string' ? x : x == null ? '' : String(x)))
  while (normalized.length < 5) normalized.push('')
  return normalized
}

function readBestMoveFromPlayer(player: LobbyPlayer | null): string[] {
  const raw = player?.best_move
  if (!Array.isArray(raw)) return ['', '', '']
  const normalized = raw
    .slice(0, 3)
    .map((x) => (typeof x === 'string' ? x : x == null ? '' : String(x)))
  while (normalized.length < 3) normalized.push('')
  return normalized
}

async function saveSheriffChecks() {
  if (!lobbyId.value || !isLobbyHost.value || sheriffChecksSaving.value || sheriffChecksResetting.value) return
  sheriffChecksSaving.value = true
  sheriffChecksError.value = null
  try {
    const bodyValues = sheriffChecksValues.value.slice(0, 5).map((v) => v.trim())
    while (bodyValues.length < 5) bodyValues.push('')
    lobby.value = await setLobbySheriffCheck(lobbyId.value, { sheriff_check: bodyValues })
    closeSheriffChecksModalForced()
  } catch (e) {
    sheriffChecksError.value = e instanceof Error ? e.message : String(e)
  } finally {
    sheriffChecksSaving.value = false
  }
}

async function resetSheriffChecks() {
  if (!lobbyId.value || !isLobbyHost.value || sheriffChecksSaving.value || sheriffChecksResetting.value) return
  sheriffChecksResetting.value = true
  sheriffChecksError.value = null
  try {
    lobby.value = await clearLobbySheriffCheck(lobbyId.value)
    sheriffChecksValues.value = ['', '', '', '', '']
  } catch (e) {
    sheriffChecksError.value = e instanceof Error ? e.message : String(e)
  } finally {
    sheriffChecksResetting.value = false
  }
}

function canOpenBestMove(p: LobbyPlayer | null): boolean {
  return (
    !!p?.membership_id &&
    isLobbyHost.value &&
    !swapBusy.value &&
    !rolesResetBusy.value &&
    !replaceSubmitting.value
  )
}

function openBestMoveModal(p: LobbyPlayer | null) {
  if (!canOpenBestMove(p) || !p?.membership_id) return
  bestMoveTargetMembershipId.value = p.membership_id
  bestMoveValues.value = readBestMoveFromPlayer(p)
  bestMoveError.value = null
  bestMoveModalOpen.value = true
}

function closeBestMoveModal() {
  if (bestMoveSaving.value || bestMoveResetting.value) return
  bestMoveModalOpen.value = false
  bestMoveTargetMembershipId.value = null
  bestMoveError.value = null
}

function closeBestMoveModalForced() {
  bestMoveModalOpen.value = false
  bestMoveTargetMembershipId.value = null
  bestMoveError.value = null
}

function updateBestMoveValue(idx: number, value: string) {
  const next = bestMoveValues.value.slice()
  next[idx] = value
  bestMoveValues.value = next
}

async function saveBestMove() {
  if (!lobbyId.value || !isLobbyHost.value || bestMoveSaving.value || bestMoveResetting.value) return
  bestMoveSaving.value = true
  bestMoveError.value = null
  try {
    const bodyValues = bestMoveValues.value.slice(0, 3).map((v) => v.trim())
    while (bodyValues.length < 3) bodyValues.push('')
    const hasAnyValue = bodyValues.some((v) => v.length > 0)
    if (!hasAnyValue) {
      const targetMembershipId = bestMoveTargetMembershipId.value
      if (targetMembershipId) {
        // Сначала убираем значения у выбранного игрока, затем его статус,
        // чтобы overlay не показал ЛХ с устаревшими цифрами.
        lobby.value = await setLobbyBestMove(lobbyId.value, {
          membership_id: targetMembershipId,
          best_move: bodyValues,
        })
        const targetPlayer = lobby.value?.players?.find((p) => p.membership_id === targetMembershipId) ?? null
        if (isStatusActive(targetPlayer, 'best-move')) {
          lobby.value = await clearLobbyMemberStatus(lobbyId.value, targetMembershipId)
        }
      }
      bestMoveValues.value = ['', '', '']
      closeBestMoveModalForced()
      return
    }
    const targetMembershipId = bestMoveTargetMembershipId.value
    if (targetMembershipId) {
      lobby.value = await setLobbyBestMove(lobbyId.value, {
        membership_id: targetMembershipId,
        best_move: bodyValues,
      })
      const targetPlayer = lobby.value.players.find((p) => p.membership_id === targetMembershipId) ?? null
      if (!isStatusActive(targetPlayer, 'best-move')) {
        // Статус ставим вторым запросом: overlay увидит его только вместе
        // с уже сохранёнными значениями ЛХ и запустит корректную анимацию.
        lobby.value = await setLobbyMemberStatus(lobbyId.value, targetMembershipId, { status: 'best-move' })
      }
    }
    closeBestMoveModalForced()
  } catch (e) {
    bestMoveError.value = e instanceof Error ? e.message : String(e)
  } finally {
    bestMoveSaving.value = false
  }
}

async function resetBestMove() {
  if (!lobbyId.value || !isLobbyHost.value || bestMoveSaving.value || bestMoveResetting.value) return
  bestMoveResetting.value = true
  bestMoveError.value = null
  try {
    const targetMembershipId = bestMoveTargetMembershipId.value
    if (!targetMembershipId) return
    lobby.value = await setLobbyBestMove(lobbyId.value, {
      membership_id: targetMembershipId,
      best_move: ['', '', ''],
    })
    const targetPlayer = lobby.value.players.find((p) => p.membership_id === targetMembershipId) ?? null
    if (isStatusActive(targetPlayer, 'best-move')) {
      lobby.value = await clearLobbyMemberStatus(lobbyId.value, targetMembershipId)
    }
    bestMoveValues.value = ['', '', '']
  } catch (e) {
    bestMoveError.value = e instanceof Error ? e.message : String(e)
  } finally {
    bestMoveResetting.value = false
  }
}
</script>

<template>
  <section
    class="lobby-manage"
    :class="{
      'lobby-manage--design-picker': designPickerOpen,
      'lobby-manage--add-rating': addToRatingOpen,
    }"
  >
    <p v-if="loading" class="lobby-manage__status">Загрузка лобби…</p>
    <div v-else-if="error" class="lobby-manage__page-error">
      <AppPageError :message="error" @retry="load" />
    </div>

    <template v-else-if="lobby">
      <div v-if="designPickerOpen" class="lobby-manage__design-picker">
        <CardDesignPickerPanel
          :key="lobbyId"
          :lobby-id="lobbyId"
          show-cancel
          save-success-message="Дизайн карточек сохранён."
          @saved="onCardDesignSaved"
          @close="closeCardDesignPicker"
        />
      </div>

      <div v-else-if="addToRatingOpen" class="lobby-manage__add-rating">
        <div class="add-to-rating-panel">
          <div class="add-to-rating-panel__split">
            <section class="add-to-rating-panel__col add-to-rating-panel__col--form">
              <div class="add-to-rating-panel__col-body">
                <div class="add-to-rating-panel__form-fields">
                  <label class="add-to-rating-panel__field add-to-rating-panel__field--title">
                    <div class="add-to-rating-panel__input-wrap">
                      <input
                        v-model="addToRatingGameTitle"
                        type="text"
                        class="add-to-rating-panel__input"
                        :class="{ 'add-to-rating-panel__input--has-action': showAddToRatingCopyPersistentButton }"
                        maxlength="255"
                        placeholder="Название игры"
                        aria-label="Название игры"
                        :disabled="addToRatingSubmitting"
                      />
                      <button
                        v-if="showAddToRatingCopyPersistentButton"
                        type="button"
                        class="add-to-rating-panel__copy-persistent"
                        title="Скопировать из постоянного сообщения"
                        aria-label="Скопировать из постоянного сообщения"
                        @click="copyAddToRatingTitleFromPersistentMessage"
                      >
                        <svg class="add-to-rating-panel__copy-persistent-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path
                            d="M5.5 2.75h6.75a1 1 0 0 1 1 1V10.5M3.75 5.5h6.75a1 1 0 0 1 1 1v6.75a1 1 0 0 1-1 1H3.75a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z"
                            stroke="currentColor"
                            stroke-width="1.35"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                        <span class="add-to-rating-panel__copy-persistent-text">Из постоянного сообщения</span>
                      </button>
                    </div>
                  </label>

                  <label class="add-to-rating-panel__field add-to-rating-panel__field--picker">
                    <div
                      ref="addToRatingRatingPickerRef"
                      class="add-to-rating-panel__picker"
                      :class="{ 'add-to-rating-panel__picker--open': addToRatingRatingMenuOpen }"
                    >
                      <button
                        type="button"
                        class="add-to-rating-panel__select-btn"
                        :disabled="addToRatingLoading || addToRatingSubmitting || !addToRatingRatings.length"
                        :aria-expanded="addToRatingRatingMenuOpen"
                        aria-haspopup="listbox"
                        aria-label="Выбор рейтинга"
                        @click="toggleAddToRatingRatingMenu"
                      >
                        <span
                          class="add-to-rating-panel__select-value"
                          :class="{ 'add-to-rating-panel__select-value--placeholder': !addToRatingSelectedId }"
                        >
                          <span class="add-to-rating-panel__select-name">{{ addToRatingSelectedLabel }}</span>
                          <span
                            v-if="addToRatingSelectedRating?.event_date"
                            class="add-to-rating-panel__select-meta"
                          >
                            {{ formatAddToRatingEventDate(addToRatingSelectedRating.event_date) }}
                          </span>
                        </span>
                        <span class="add-to-rating-panel__select-arrow" aria-hidden="true">
                          <svg viewBox="0 0 16 16" fill="none">
                            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                          </svg>
                        </span>
                      </button>
                      <div
                        v-if="addToRatingRatingMenuOpen"
                        class="add-to-rating-panel__menu"
                        role="listbox"
                        aria-label="Создать турнир"
                      >
                        <button
                          v-for="rating in addToRatingRatings"
                          :key="rating.id"
                          type="button"
                          class="add-to-rating-panel__menu-item"
                          :class="{ 'add-to-rating-panel__menu-item--active': rating.id === addToRatingSelectedId }"
                          role="option"
                          :aria-selected="rating.id === addToRatingSelectedId"
                          @click="selectAddToRatingRating(rating.id)"
                        >
                          <span class="add-to-rating-panel__menu-item-name">{{ rating.name }}</span>
                          <span v-if="rating.event_date" class="add-to-rating-panel__menu-item-meta">
                            {{ formatAddToRatingEventDate(rating.event_date) }}
                          </span>
                        </button>
                      </div>
                    </div>
                  </label>

                  <label class="add-to-rating-panel__field">
                    <input
                      v-model="addToRatingPlayedAt"
                      type="date"
                      class="add-to-rating-panel__input"
                      aria-label="Дата игры"
                      :disabled="addToRatingSubmitting"
                    />
                  </label>
                </div>

                <p v-if="addToRatingLoading" class="add-to-rating-panel__hint">Загружаем рейтинги…</p>
                <p
                  v-else-if="!addToRatingValidation.ok"
                  class="add-to-rating-panel__hint add-to-rating-panel__hint--warn"
                  role="status"
                >
                  {{ addToRatingValidation.message }}
                </p>
                <p v-else class="add-to-rating-panel__hint">
                  Будет добавлено результатов: {{ addToRatingTransferStats.results.length }}
                </p>

                <p
                  v-if="addToRatingSuccess"
                  class="add-to-rating-panel__banner add-to-rating-panel__banner--ok"
                  role="status"
                >
                  {{ addToRatingSuccess }}
                </p>
              </div>
            </section>

            <section class="add-to-rating-panel__col add-to-rating-panel__col--players">
              <div
                class="add-to-rating-panel__table"
                :class="{ 'add-to-rating-panel__table--has-lh': addToRatingHasBestMove }"
              >
                <div class="add-to-rating-panel__players">
                <div
                  v-for="(player, index) in lobby?.players ?? []"
                  :key="player.membership_id"
                  class="add-to-rating-panel__player"
                >
                  <span class="add-to-rating-panel__player-seat">{{ index + 1 }}</span>
                  <div class="add-to-rating-panel__player-main">
                    <img
                      v-if="rowPhoto(player)"
                      :src="rowPhoto(player)"
                      alt=""
                      class="add-to-rating-panel__player-photo"
                    />
                    <span
                      v-else
                      class="add-to-rating-panel__player-photo add-to-rating-panel__player-photo--ph"
                      aria-hidden="true"
                    >
                      {{ rowInitials(player) }}
                    </span>
                    <span class="add-to-rating-panel__player-name">
                      {{ player.nickname || player.username || `Игрок ${index + 1}` }}
                    </span>
                  </div>
                  <span class="add-to-rating-panel__stat add-to-rating-panel__stat--role">
                    <img
                      v-if="playerRoleMeta(player)"
                      :src="playerRoleMeta(player)!.icon"
                      :alt="playerRoleMeta(player)!.label"
                      :title="playerRoleMeta(player)!.label"
                      class="add-to-rating-panel__player-role-icon"
                      :class="playerRoleMeta(player)!.toneClass"
                    />
                    <span v-else class="add-to-rating-panel__stat-empty" aria-hidden="true">—</span>
                  </span>
                  <span
                    v-if="addToRatingHasBestMove"
                    class="add-to-rating-panel__stat add-to-rating-panel__stat--lh"
                  >
                    <span
                      v-if="playerBestMoveLabels(player).length"
                      class="add-to-rating-panel__lh-inline"
                      :title="`Лучший ход: ${playerBestMoveLabels(player).join(', ')}`"
                    >
                      <span class="add-to-rating-panel__lh-label">ЛХ</span>
                      <span class="add-to-rating-panel__lh-values">
                        {{ playerBestMoveLabels(player).join(' ') }}
                      </span>
                    </span>
                    <span v-else class="add-to-rating-panel__stat-empty" aria-hidden="true">—</span>
                  </span>
                  <span class="add-to-rating-panel__stat add-to-rating-panel__stat--total">
                    {{ totalPointsForAddToRating(player).toFixed(1) }}
                  </span>
                  <div class="add-to-rating-panel__stat add-to-rating-panel__stat--bonus">
                    <div class="lobby-manage__bonus-points-stepper add-to-rating-panel__player-stepper">
                    <input
                      class="lobby-manage__bonus-points-input"
                      type="number"
                      inputmode="decimal"
                      min="-99.9"
                      max="99.9"
                      step="0.1"
                      :disabled="addToRatingSubmitting || bonusPointsSaving || bonusPointsResetting"
                      :value="bonusPointsDraft[player.membership_id] ?? '0'"
                      @input="updateBonusPoints(player.membership_id, ($event.target as HTMLInputElement).value)"
                    />
                    <div class="lobby-manage__bonus-points-stepper-actions">
                      <button
                        type="button"
                        tabindex="-1"
                        aria-label="Увеличить на 0.1"
                        :disabled="addToRatingSubmitting || bonusPointsSaving || bonusPointsResetting"
                        @click="changeBonusPointsByStep(player.membership_id, 0.1)"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        tabindex="-1"
                        aria-label="Уменьшить на 0.1"
                        :disabled="addToRatingSubmitting || bonusPointsSaving || bonusPointsResetting"
                        @click="changeBonusPointsByStep(player.membership_id, -0.1)"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                  </div>
                </div>
              </div>

              <div class="add-to-rating-panel__bottom">
                <p class="add-to-rating-panel__panel-note" role="note">
                  <span class="add-to-rating-panel__panel-note-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75" />
                      <path d="M12 8v5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                      <circle cx="12" cy="16.25" r="1" fill="currentColor" />
                    </svg>
                  </span>
                  Проверьте роли, победителя и доп. баллы.
                </p>

                <div class="add-to-rating-panel__winner-controls">
                  <span class="add-to-rating-panel__label add-to-rating-panel__winner-label">Победитель</span>
                  <div
                    class="segmented-filter segmented-filter--inline segmented-filter--compact add-to-rating-panel__winner-toggle"
                    role="group"
                    aria-label="Победитель"
                  >
                    <button
                      type="button"
                      class="segmented-filter__btn"
                      :class="{ 'segmented-filter__btn--active': addToRatingWinnerSide === 'red' }"
                      :aria-pressed="addToRatingWinnerSide === 'red'"
                      :disabled="addToRatingSubmitting"
                      @click="addToRatingWinnerSide = 'red'"
                    >
                      Мирные
                    </button>
                    <button
                      type="button"
                      class="segmented-filter__btn"
                      :class="{ 'segmented-filter__btn--active': addToRatingWinnerSide === 'black' }"
                      :aria-pressed="addToRatingWinnerSide === 'black'"
                      :disabled="addToRatingSubmitting"
                      @click="addToRatingWinnerSide = 'black'"
                    >
                      Мафия
                    </button>
                  </div>
                </div>
              </div>
              </div>

              <p
                v-if="bonusPointsError"
                class="add-to-rating-panel__banner add-to-rating-panel__banner--inline"
                role="alert"
              >
                {{ bonusPointsError }}
              </p>
            </section>
          </div>

          <div class="add-to-rating-panel__footer">
            <p v-if="addToRatingError" class="add-to-rating-panel__footer-error" role="alert">
              {{ addToRatingError }}
            </p>
            <div class="add-to-rating-panel__footer-actions">
              <button
                type="button"
                class="app-modal__btn-secondary"
                :disabled="addToRatingSubmitting"
                @click="closeAddToRatingModal"
              >
                Закрыть
              </button>
              <button
                type="button"
                class="app-modal__btn-primary"
                :disabled="addToRatingLoading || addToRatingSubmitting || rolesResetBusy || !addToRatingCanSubmit || bonusPointsSaving || bonusPointsResetting"
                @click="submitAddToRating"
              >
                {{ addToRatingSubmitting ? 'Добавляем и сбрасываем…' : 'Добавить игру и сбросить роли' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <template v-else>
      <div class="lobby-manage__grid">
        <article class="lobby-manage__card lobby-manage__card--main">
          <p v-if="swapHint" class="lobby-manage__swap-hint" role="status">{{ swapHint }}</p>
          <div
            class="lobby-manage__table-wrap"
            :class="{ 'lobby-manage__table-wrap--replace': isReplacePanelOpen }"
            @dragleave="onTableDragLeave"
          >
            <div
              v-for="(p, idx) in seatRows"
              :key="rowKey(idx, p)"
              class="lobby-manage__row"
              :data-row-index="idx"
              :class="{
                'lobby-manage__row--drag-over': dragOverIndex === idx && dragActiveIndex !== null,
                'lobby-manage__row--drag-source': dragActiveIndex === idx,
                'lobby-manage__row--grab-holding': touchDragHoldIndex === idx && dragActiveIndex === null,
                'lobby-manage__row--replace-open': replaceOpenSeatIndex === idx && !!p?.membership_id,
                'lobby-manage__row--selected': selectedSeatIndex === idx,
              }"
              @click="onMobileRowSelect(idx, $event)"
              @pointerdown="onTouchDragRowPointerDown($event, idx, p)"
              @dragover="onDragOver($event, idx)"
              @drop="onDrop($event, idx)"
            >
              <div class="lobby-manage__grab-outline" aria-hidden="true">
                <svg class="lobby-manage__grab-outline-svg" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    class="lobby-manage__grab-outline-rect"
                    x="0.75"
                    y="0.75"
                    width="calc(100% - 1.5px)"
                    height="calc(100% - 1.5px)"
                    rx="12"
                    ry="12"
                  />
                </svg>
              </div>
              <div
                class="lobby-manage__row-num-cell"
                :class="{
                  'lobby-manage__row-num-cell--drag-active':
                    isLobbyHost && !!p?.membership_id && !swapBusy && !rolesResetBusy,
                }"
                :draggable="!isTabletLayout && isLobbyHost && !!p?.membership_id && !swapBusy && !rolesResetBusy"
                role="button"
                :tabindex="isLobbyHost && p?.membership_id && !swapBusy && !rolesResetBusy ? 0 : -1"
                @pointerdown="onTouchDragNumPointerDown($event, idx, p)"
                :aria-label="
                  isLobbyHost && p?.membership_id
                    ? 'Перетащите на другую строку с игроком, чтобы поменять местами'
                    : 'Место в составе'
                "
                :title="
                  isLobbyHost && p?.membership_id
                    ? 'Перетащите на другого игрока - поменять местами'
                    : isLobbyHost
                      ? 'Пустое место - сюда нельзя перетащить обмен'
                      : 'Порядок может менять только хост лобби.'
                "
                @dragstart.stop="onDragStart($event, idx, p)"
                @dragend.stop="onDragEnd"
              >
                <span class="lobby-manage__row-num">{{ idx + 1 }}</span>
              </div>
              <div class="lobby-manage__row-drag-cell">
                <span
                  class="lobby-manage__row-drag"
                  :class="{
                    'lobby-manage__row-drag--active':
                      isLobbyHost && !!p?.membership_id && !swapBusy && !rolesResetBusy,
                  }"
                  :draggable="isLobbyHost && !!p?.membership_id && !swapBusy && !rolesResetBusy"
                  role="button"
                  :tabindex="isLobbyHost && p?.membership_id && !swapBusy && !rolesResetBusy ? 0 : -1"
                  :aria-label="
                    isLobbyHost && p?.membership_id
                      ? 'Перетащите на другую строку с игроком, чтобы поменять местами'
                      : 'Место в составе'
                  "
                  :title="
                    isLobbyHost && p?.membership_id
                      ? 'Зажмите и перетащите на другого игрока - поменять местами'
                      : isLobbyHost
                        ? 'Пустое место - сюда нельзя перетащить обмен'
                        : 'Порядок может менять только хост лобби.'
                  "
                  @dragstart.stop="onDragStart($event, idx, p)"
                  @dragend.stop="onDragEnd"
                >
                  <svg
                    class="lobby-manage__row-drag-svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <circle cx="9" cy="7" r="1.75" />
                    <circle cx="15" cy="7" r="1.75" />
                    <circle cx="9" cy="12" r="1.75" />
                    <circle cx="15" cy="12" r="1.75" />
                    <circle cx="9" cy="17" r="1.75" />
                    <circle cx="15" cy="17" r="1.75" />
                  </svg>
                </span>
              </div>
              <div class="lobby-manage__row-avatar">
                <button
                  v-if="p?.membership_id && isLobbyHost"
                  type="button"
                  class="lobby-manage__avatar-btn"
                  :disabled="swapBusy || rolesResetBusy"
                  :title="'Выбрать фото для лобби (с карточки игрока)'"
                  :aria-label="`Фото: ${p.nickname}, выбрать для лобби`"
                  @click.stop="openPhotoModal(p)"
                >
                  <img v-if="rowPhoto(p)" :src="rowPhoto(p)" alt="" class="lobby-manage__avatar-img" />
                  <div v-else class="lobby-manage__avatar-ph" aria-hidden="true">
                    <img :src="uploadPhotoIcon" alt="" class="lobby-manage__avatar-upload-icon" />
                  </div>
                </button>
                <template v-else-if="p">
                  <img v-if="rowPhoto(p)" :src="rowPhoto(p)" alt="" class="lobby-manage__avatar-img" />
                  <div v-else class="lobby-manage__avatar-ph" aria-hidden="true">
                    <img :src="uploadPhotoIcon" alt="" class="lobby-manage__avatar-upload-icon" />
                  </div>
                </template>
                <div v-else class="lobby-manage__avatar-ph" aria-hidden="true">
                  <img :src="uploadPhotoIcon" alt="" class="lobby-manage__avatar-upload-icon" />
                </div>
              </div>
              <div
                class="lobby-manage__row-nick-cell"
                :class="{ 'lobby-manage__row-nick-cell--replace-open': replaceOpenSeatIndex === idx }"
              >
                <div
                  class="lobby-manage__nick-line"
                  :class="{ 'lobby-manage__nick-line--replace': replaceOpenSeatIndex === idx && p && !isTabletLayout }"
                >
                  <template v-if="replaceOpenSeatIndex === idx && p && !isTabletLayout">
                    <div class="lobby-manage__nick-replace-col">
                      <input
                        ref="replaceSearchInputRef"
                        v-model="replaceSearchQuery"
                        class="lobby-manage__nick-input"
                        type="text"
                        autocomplete="off"
                        placeholder="Введите никнейм игрока"
                        aria-label="Поиск карточки по никнейму"
                        aria-controls="lobby-replace-listbox"
                        aria-expanded="true"
                        :disabled="replaceSubmitting"
                        @keydown.escape.stop.prevent="closeReplace"
                      />
                      <div id="lobby-replace-listbox" class="lobby-manage__replace-dropdown" role="group" aria-label="Карточки из моих составов">
                        <p v-if="replaceRosterLoading" class="lobby-manage__replace-dropdown-msg">Загрузка…</p>
                        <p v-else-if="rosterLoadError" class="lobby-manage__replace-err" role="alert">{{ rosterLoadError }}</p>
                        <template v-else>
                          <ul v-if="!rosterCards.length" class="lobby-manage__replace-list lobby-manage__replace-list--flat" role="presentation">
                            <li class="lobby-manage__replace-empty">В «Мои составы» пока нет карточек.</li>
                          </ul>
                          <ul
                            v-else-if="!filteredReplaceCards.length"
                            class="lobby-manage__replace-list lobby-manage__replace-list--flat"
                            role="presentation"
                          >
                            <li class="lobby-manage__replace-empty">Все карточки уже заняты в других местах лобби.</li>
                          </ul>
                          <ul v-else class="lobby-manage__replace-list" role="listbox">
                            <li v-for="c in filteredReplaceCards" :key="c.id" class="lobby-manage__replace-item-wrap">
                              <button
                                type="button"
                                class="lobby-manage__replace-item"
                                role="option"
                                :disabled="replaceSubmitting"
                                @click="pickReplaceCard(c)"
                              >
                                <span class="lobby-manage__replace-thumb" aria-hidden="true">
                                  <img v-if="cardThumb(c)" :src="cardThumb(c)" alt="" class="lobby-manage__replace-thumb-img" />
                                  <span v-else class="lobby-manage__replace-thumb-ph">{{ c.nickname?.[0] ?? '?' }}</span>
                                </span>
                                <span class="lobby-manage__replace-item-text">
                                  <span class="lobby-manage__replace-item-nick">{{ c.nickname }}</span>
                                  <span v-if="cardFullName(c)" class="lobby-manage__replace-item-name">{{ cardFullName(c) }}</span>
                                </span>
                              </button>
                            </li>
                          </ul>
                        </template>
                      </div>
                    </div>
                  </template>
                  <span v-else class="lobby-manage__nick-text">{{ p?.nickname ?? '' }}</span>
                  <button
                    v-if="p?.membership_id && isLobbyHost"
                    type="button"
                    class="lobby-manage__nick-edit"
                    :disabled="swapBusy || rolesResetBusy || replaceSubmitting"
                    title="Заменить игрока из «Мои составы»"
                    aria-label="Заменить игрока"
                    @click.stop="toggleReplace(idx, p)"
                  >
                    <svg class="lobby-manage__nick-edit-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                        stroke="currentColor"
                        stroke-width="1.75"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div class="lobby-manage__row-dots-cell">
                <div
                  class="lobby-manage__dot-rect"
                  :class="{ 'lobby-manage__dot-rect--sheriff-active': isRoleActive(p, 'sheriff') && !hideRoleMarks }"
                >
                  <template v-if="isTabletLayout && isRoleActive(p, 'sheriff') && !hideRoleMarks">
                    <button
                      type="button"
                      class="lobby-manage__role-btn lobby-manage__role-btn--sheriff-slot"
                      :class="{
                        'lobby-manage__role-btn--active': isRoleShownActive(p, 'sheriff'),
                        'lobby-manage__role-btn--host-flash-fade': isRoleHostFlashFading(p, 'sheriff'),
                      }"
                      :disabled="!isLobbyHost || swapBusy || rolesResetBusy || !p?.membership_id || isRoleBusy(p)"
                      :title="
                        hideRoleMarks
                          ? 'Шериф'
                          : `Шериф${isRoleActive(p, 'sheriff') ? ' (снять)' : ' (назначить)'}`
                      "
                      :aria-pressed="hideRoleMarks ? false : isRoleActive(p, 'sheriff')"
                      aria-label="Шериф"
                      @click="toggleRole(p, 'sheriff')"
                    >
                      <img :src="sheriffRoleIcon" alt="Шериф" class="lobby-manage__role-icon" />
                    </button>
                    <button
                      type="button"
                      class="lobby-manage__sheriff-checks-btn lobby-manage__sheriff-checks-btn--inline"
                      :disabled="!canOpenSheriffChecks(p)"
                      @click="openSheriffChecksModal(p)"
                    >
                      <img
                        :src="sheriffRoleIcon"
                        alt=""
                        class="lobby-manage__sheriff-checks-btn-icon"
                        width="14"
                        height="14"
                        aria-hidden="true"
                      />
                      <span class="lobby-manage__sheriff-checks-btn-text">Проверки шерифа</span>
                    </button>
                  </template>
                  <template v-else>
                    <template v-for="role in ROLE_OPTIONS" :key="role.value">
                      <button
                        type="button"
                        class="lobby-manage__role-btn"
                        :class="{
                          'lobby-manage__role-btn--active': isRoleShownActive(p, role.value),
                          'lobby-manage__role-btn--host-flash-fade': isRoleHostFlashFading(p, role.value),
                        }"
                        :disabled="!isLobbyHost || swapBusy || rolesResetBusy || !p?.membership_id || isRoleBusy(p)"
                        :title="
                          hideRoleMarks
                            ? role.label
                            : `${role.label}${isRoleActive(p, role.value) ? ' (снять)' : ' (назначить)'}`
                        "
                        :aria-pressed="hideRoleMarks ? false : isRoleActive(p, role.value)"
                        :aria-label="
                          hideRoleMarks
                            ? role.label
                            : `${role.label}: ${isRoleActive(p, role.value) ? 'активна' : 'неактивна'}`
                        "
                        @click="toggleRole(p, role.value)"
                      >
                        <img :src="role.icon" :alt="role.label" class="lobby-manage__role-icon" />
                      </button>
                      <button
                        v-if="!isTabletLayout && !hideRoleMarks && role.value === 'sheriff' && isRoleActive(p, 'sheriff')"
                        type="button"
                        class="lobby-manage__sheriff-checks-btn"
                        :disabled="!canOpenSheriffChecks(p)"
                        @click="openSheriffChecksModal(p)"
                      >
                        Проверки шерифа
                      </button>
                    </template>
                  </template>
                </div>
                <div class="lobby-manage__dot-rect">
                  <template v-for="status in STATUS_OPTIONS" :key="status.value">
                    <button
                      type="button"
                      class="lobby-manage__status-btn"
                      :class="{ 'lobby-manage__status-btn--active': isStatusActive(p, status.value) }"
                      :disabled="
                        !isLobbyHost ||
                        swapBusy ||
                        rolesResetBusy ||
                        !p?.membership_id ||
                        isStatusBusy(p) ||
                        isRoleBusy(p)
                      "
                      :title="status.label + (isStatusActive(p, status.value) ? ' (снять)' : ' (назначить)')"
                      :aria-pressed="isStatusActive(p, status.value)"
                      :aria-label="
                        status.label + ': ' + (isStatusActive(p, status.value) ? 'активен' : 'неактивен')
                      "
                      @click="toggleStatus(p, status.value)"
                    >
                      <img :src="status.icon" :alt="status.label" class="lobby-manage__status-icon" />
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div class="lobby-manage__mobile-dock-wrap">
            <div class="lobby-manage__mobile-dock-timer" aria-label="Таймер речи">
              <span
                class="lobby-manage__mobile-dock-timer-value"
                role="timer"
                aria-live="polite"
                :aria-label="`Прошло ${speechTimerDisplay}`"
              >
                {{ speechTimerDisplay }}
              </span>
              <div class="lobby-manage__mobile-dock-timer-actions">
                <button
                  type="button"
                  class="lobby-manage__mobile-dock-timer-control"
                  :disabled="!isLobbyHost"
                  :aria-label="speechTimerRunning ? 'Пауза' : 'Продолжить'"
                  @click="toggleSpeechTimerPause"
                >
                  <img
                    v-if="speechTimerRunning"
                    :src="speechTimerPauseIcon"
                    alt=""
                    class="lobby-manage__mobile-dock-timer-control-icon"
                    aria-hidden="true"
                  />
                  <img
                    v-else
                    :src="speechTimerGoSpeakIcon"
                    alt=""
                    class="lobby-manage__mobile-dock-timer-control-icon"
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  class="lobby-manage__mobile-dock-timer-control lobby-manage__mobile-dock-timer-control--next"
                  :disabled="!isLobbyHost"
                  aria-label="Обнулить таймер и начать заново"
                  @click="restartSpeechTimer"
                >
                  <img
                    :src="speechTimerRightArrowIcon"
                    alt=""
                    class="lobby-manage__mobile-dock-timer-control-icon lobby-manage__mobile-dock-timer-control-icon--next"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
            <div class="lobby-manage__mobile-dock" aria-label="Панель управления">
              <button
                type="button"
                class="lobby-manage__btn-foot lobby-manage__mobile-dock-btn"
                :disabled="!isLobbyHost || swapBusy || rolesResetBusy || replaceSubmitting || deleteBusy"
                @click="resetAllRolesAndStatuses"
              >
                {{ rolesResetBusy ? 'Сброс…' : 'Сбросить роли и статусы' }}
              </button>
              <label class="lobby-manage__host-toggle lobby-manage__mobile-dock-host">
                <span class="lobby-manage__host-toggle-label-wrap">
                  <span class="lobby-manage__host-toggle-label">Режим ведущего</span>
                  <span
                    class="lobby-manage__host-info"
                    tabindex="0"
                    role="note"
                    aria-label="В режиме ведущего роли участников не отображаются. Это предотвращает случайное раскрытие игровой информации во время игры."
                    @click.stop
                    @mousedown.stop
                  >
                    <span class="lobby-manage__host-info-icon" aria-hidden="true">i</span>
                    <span class="lobby-manage__host-info-tip" role="tooltip">
                      В режиме ведущего роли участников не отображаются. Это предотвращает случайное раскрытие
                      игровой информации во время игры.
                    </span>
                  </span>
                </span>
                <span class="lobby-manage__host-switch" :class="{ 'lobby-manage__host-switch--on': hostMode }">
                  <input v-model="hostMode" type="checkbox" class="lobby-manage__host-switch-input" />
                  <span class="lobby-manage__host-switch-knob" />
                </span>
              </label>
            </div>
            <button
              v-if="hideRoleMarks && sheriffSeatPlayer"
              type="button"
              class="lobby-manage__sheriff-checks-btn lobby-manage__sheriff-checks-btn--foot lobby-manage__mobile-dock-sheriff"
              :disabled="!canOpenSheriffChecks(sheriffSeatPlayer)"
              @click="openSheriffChecksModal(sheriffSeatPlayer)"
            >
              <img
                :src="sheriffRoleIcon"
                alt=""
                class="lobby-manage__sheriff-checks-btn-icon"
                width="14"
                height="14"
                aria-hidden="true"
              />
              Проверки шерифа
            </button>
          </div>

          <div class="lobby-manage__main-actions">
            <button
              type="button"
              class="lobby-manage__btn-foot lobby-manage__main-actions-inline-only"
              :disabled="!isLobbyHost || swapBusy || rolesResetBusy || replaceSubmitting || deleteBusy"
              @click="resetAllRolesAndStatuses"
            >
              {{ rolesResetBusy ? 'Сброс…' : 'Сбросить роли и статусы' }}
            </button>
            <label class="lobby-manage__host-toggle lobby-manage__main-actions-inline-only">
              <span class="lobby-manage__host-toggle-label-wrap">
                <span class="lobby-manage__host-toggle-label">Режим ведущего</span>
                <span
                  class="lobby-manage__host-info"
                  tabindex="0"
                  role="note"
                  aria-label="В режиме ведущего роли участников не отображаются. Это предотвращает случайное раскрытие игровой информации во время игры."
                  @click.stop
                  @mousedown.stop
                >
                  <span class="lobby-manage__host-info-icon" aria-hidden="true">i</span>
                  <span class="lobby-manage__host-info-tip" role="tooltip">
                    В режиме ведущего роли участников не отображаются. Это предотвращает случайное раскрытие
                    игровой информации во время игры.
                  </span>
                </span>
              </span>
              <span class="lobby-manage__host-switch" :class="{ 'lobby-manage__host-switch--on': hostMode }">
                <input v-model="hostMode" type="checkbox" class="lobby-manage__host-switch-input" />
                <span class="lobby-manage__host-switch-knob" />
              </span>
            </label>
            <button
              v-if="hideRoleMarks && sheriffSeatPlayer"
              type="button"
              class="lobby-manage__sheriff-checks-btn lobby-manage__sheriff-checks-btn--foot lobby-manage__main-actions-sheriff-inline"
              :disabled="!canOpenSheriffChecks(sheriffSeatPlayer)"
              @click="openSheriffChecksModal(sheriffSeatPlayer)"
            >
              <img
                :src="sheriffRoleIcon"
                alt=""
                class="lobby-manage__sheriff-checks-btn-icon"
                width="14"
                height="14"
                aria-hidden="true"
              />
              Проверки шерифа
            </button>
          </div>
        </article>

        <aside class="lobby-manage__aside">
          <article class="lobby-manage__card lobby-manage__card--side">
            <div class="lobby-manage__side-head">
              <h2 class="lobby-manage__side-title">Всплывающее сообщение</h2>
            </div>
            <label class="lobby-manage__field">
              <span class="lobby-manage__field-icon">H1</span>
              <input
                v-model="popupTitleDraft"
                class="lobby-manage__field-input"
                type="text"
                :maxlength="POPUP_TEXT_MAX_LENGTH"
                placeholder="Введите заголовок."
              />
              <span class="lobby-manage__color-dots">
                <button
                  v-for="tone in toneOptions"
                  :key="`popup-h1-${tone.value}`"
                  type="button"
                  class="lobby-manage__c-dot"
                  :class="[tone.className, { 'lobby-manage__c-dot--active': popupTitleTone === tone.value }]"
                  :aria-label="`Цвет H1: ${tone.label}`"
                  :title="`Цвет H1: ${tone.label}`"
                  @click="popupTitleTone = tone.value"
                />
              </span>
            </label>
            <label class="lobby-manage__field">
              <span class="lobby-manage__field-icon">H2</span>
              <input
                v-model="popupSubtitleDraft"
                class="lobby-manage__field-input"
                type="text"
                :maxlength="POPUP_TEXT_MAX_LENGTH"
                placeholder="Введите подзаголовок"
              />
              <span class="lobby-manage__color-dots">
                <button
                  v-for="tone in toneOptions"
                  :key="`popup-h2-${tone.value}`"
                  type="button"
                  class="lobby-manage__c-dot"
                  :class="[tone.className, { 'lobby-manage__c-dot--active': popupSubtitleTone === tone.value }]"
                  :aria-label="`Цвет H2: ${tone.label}`"
                  :title="`Цвет H2: ${tone.label}`"
                  @click="popupSubtitleTone = tone.value"
                />
              </span>
            </label>
            <div class="lobby-manage__side-row">
              <label class="lobby-manage__duration">
                <img :src="timerIcon" alt="" class="lobby-manage__duration-icon" />
                <span class="lobby-manage__duration-value">
                  <input v-model="popupDurationDraft" class="lobby-manage__duration-input" type="text" inputmode="numeric" />
                  <span class="lobby-manage__duration-unit">сек</span>
                </span>
                <span class="lobby-manage__duration-label">время отображения</span>
              </label>
              <button type="button" class="lobby-manage__link-action lobby-manage__link-action--full" @click="emitPopupMessage">
                Вывести на экран
              </button>
            </div>
            <p v-if="popupFeedback" class="lobby-manage__popup-feedback" role="status">{{ popupFeedback }}</p>
          </article>

          <article class="lobby-manage__card lobby-manage__card--side">
            <div class="lobby-manage__side-head">
              <h2 class="lobby-manage__side-title">Постоянное сообщение</h2>
            </div>
            <label class="lobby-manage__field">
              <span class="lobby-manage__field-icon">H1</span>
              <input
                v-model="persistentMessageDraft"
                class="lobby-manage__field-input"
                type="text"
                placeholder="Введите текст"
              />
              <span class="lobby-manage__color-dots">
                <button
                  v-for="tone in toneOptions"
                  :key="`persistent-${tone.value}`"
                  type="button"
                  class="lobby-manage__c-dot"
                  :class="[tone.className, { 'lobby-manage__c-dot--active': persistentMessageTone === tone.value }]"
                  :aria-label="`Цвет текста: ${tone.label}`"
                  :title="`Цвет текста: ${tone.label}`"
                  @click="persistentMessageTone = tone.value"
                />
              </span>
            </label>
            <p v-if="persistentMessageOverflow > 0" class="lobby-manage__persistent-limit">
              превышено на {{ persistentMessageOverflow }} (максимум {{ PERSISTENT_MESSAGE_MAX_LENGTH }})
            </p>
            <div class="lobby-manage__persistent-actions">
              <button type="button" class="lobby-manage__link-action" @click="savePersistentMessage">
                Вывести на экран
              </button>
              <button type="button" class="lobby-manage__link-action lobby-manage__link-action--ghost" @click="resetPersistentMessage">
                Сбросить
              </button>
            </div>
            <p v-if="persistentMessageFeedback" class="lobby-manage__persistent-feedback" role="status">
              {{ persistentMessageFeedback }}
            </p>
          </article>

          <article v-if="isLobbyHost" class="lobby-manage__card lobby-manage__card--side lobby-manage__victory-card">
            <div class="lobby-manage__side-head">
              <h2 class="lobby-manage__side-title">Итог игры</h2>
              <label class="lobby-manage__victory-scores-toggle">
                <span>С доп. баллами</span>
                <span class="lobby-manage__host-switch" :class="{ 'lobby-manage__host-switch--on': lobby.show_victory_scores }">
                  <input
                    type="checkbox"
                    class="lobby-manage__host-switch-input"
                    :checked="lobby.show_victory_scores === true"
                    :disabled="victoryScoresSaving"
                    @change="toggleVictoryScores"
                  />
                  <span class="lobby-manage__host-switch-knob" />
                </span>
              </label>
            </div>
            <div class="lobby-manage__victory-actions">
              <button
                v-if="lobby.show_victory_scores"
                type="button"
                class="lobby-manage__link-action lobby-manage__link-action--full"
                @click="openBonusPointsModal"
              >
                Доп. баллы
              </button>
              <button
                type="button"
                class="lobby-manage__link-action"
                :class="{ 'lobby-manage__link-action--active': isOverlayScreenActive('victory-mafia') }"
                :aria-pressed="isOverlayScreenActive('victory-mafia')"
                :disabled="overlayScreenSaving"
                @click="setOverlayScreen('victory-mafia')"
              >
                Победа мафии
              </button>
              <button
                type="button"
                class="lobby-manage__link-action"
                :class="{ 'lobby-manage__link-action--active': isOverlayScreenActive('victory-peaceful') }"
                :aria-pressed="isOverlayScreenActive('victory-peaceful')"
                :disabled="overlayScreenSaving"
                @click="setOverlayScreen('victory-peaceful')"
              >
                Победа мирных
              </button>
              <button
                v-if="isOverlayScreenActive('victory-mafia') || isOverlayScreenActive('victory-peaceful')"
                type="button"
                class="lobby-manage__link-action lobby-manage__link-action--ghost lobby-manage__link-action--full"
                :disabled="overlayScreenSaving"
                @click="setOverlayScreen('lobby')"
              >
                Вернуть плашки
              </button>
            </div>
            <p v-if="overlayScreenError" class="lobby-manage__victory-error" role="alert">{{ overlayScreenError }}</p>
          </article>

          <article v-if="hasImportedSelection" ref="importedSwitcherRef" class="lobby-manage__card lobby-manage__card--side">
            <div class="lobby-manage__side-head">
              <h2 class="lobby-manage__side-title">Тур и стол</h2>
            </div>

            <div class="lobby-manage__imported-fields">
              <div class="lobby-manage__field lobby-manage__imported-field">
                <div class="lobby-manage__imported-picker" :class="{ 'lobby-manage__imported-picker--open': importedTourMenuOpen }">
                  <button
                    type="button"
                    class="lobby-manage__imported-select-btn"
                    :disabled="importedSelectionBusy || !isLobbyHost"
                    :aria-expanded="importedTourMenuOpen"
                    aria-label="Выбор тура"
                    @click="toggleImportedTourMenu"
                  >
                    <span class="lobby-manage__imported-select-text">{{ importedSelectedTourLabel }}</span>
                    <span class="lobby-manage__imported-select-arrow" aria-hidden="true">▾</span>
                  </button>
                  <div v-if="importedTourMenuOpen" class="lobby-manage__imported-menu" role="listbox" aria-label="Туры">
                    <button
                      v-for="tour in importedTourOptions"
                      :key="tour.key"
                      type="button"
                      class="lobby-manage__imported-menu-item"
                      :class="{ 'lobby-manage__imported-menu-item--active': tour.key === importedSelectedTourKey }"
                      @click="selectImportedTourOption(tour.key)"
                    >
                      {{ tour.label }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="lobby-manage__field lobby-manage__imported-field">
                <div class="lobby-manage__imported-picker" :class="{ 'lobby-manage__imported-picker--open': importedTableMenuOpen }">
                  <button
                    type="button"
                    class="lobby-manage__imported-select-btn"
                    :disabled="importedSelectionBusy || !isLobbyHost"
                    :aria-expanded="importedTableMenuOpen"
                    aria-label="Выбор стола"
                    @click="toggleImportedTableMenu"
                  >
                    <span class="lobby-manage__imported-select-text">{{ importedSelectedTableLabel }}</span>
                    <span class="lobby-manage__imported-select-arrow" aria-hidden="true">▾</span>
                  </button>
                  <div v-if="importedTableMenuOpen" class="lobby-manage__imported-menu" role="listbox" aria-label="Столы">
                    <button
                      v-for="table in importedTableOptions"
                      :key="table.key"
                      type="button"
                      class="lobby-manage__imported-menu-item"
                      :class="{ 'lobby-manage__imported-menu-item--active': table.key === importedSelectedTableKey }"
                      @click="selectImportedTableOption(table.key)"
                    >
                      {{ table.label }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="lobby-manage__persistent-actions lobby-manage__imported-actions">
              <button
                type="button"
                class="lobby-manage__link-action"
                :disabled="importedSelectionBusy || !isLobbyHost || !canApplyImportedSelection"
                @click="applyImportedSelection"
              >
                {{ importedSelectionBusy ? '...' : 'Применить' }}
              </button>
              <button
                v-if="isLobbyHost"
                type="button"
                class="lobby-manage__link-action lobby-manage__link-action--ghost"
                title="Список всех участников турнира"
                :disabled="swapBusy || rolesResetBusy || replaceSubmitting || deleteBusy || importedSelectionBusy"
                @click="openImportedParticipantsModal"
              >
                Все участники
              </button>
            </div>
            <p v-if="!isLobbyHost" class="lobby-manage__imported-note">
              Переключать тур/стол может только хост лобби.
            </p>
            <p v-if="importedSelectionError" class="lobby-manage__imported-error" role="alert">{{ importedSelectionError }}</p>
          </article>
        </aside>
      </div>

      <div class="lobby-manage__mobile-bottom-spacer" aria-hidden="true" />

      <div
        v-if="isTabletLayout && replaceOpenSeatIndex !== null"
        class="lobby-manage__modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Замена игрока"
        @click.self="closeReplace"
      >
        <div class="lobby-manage__modal-card lobby-manage__modal-card--replace">
          <div class="lobby-manage__modal-head">
            <h3 class="lobby-manage__modal-title">Заменить игрока: {{ replaceTargetLabel }}</h3>
            <button
              type="button"
              class="lobby-manage__modal-close"
              aria-label="Закрыть"
              title="Закрыть"
              :disabled="replaceSubmitting"
              @click="closeReplace"
            >
              ×
            </button>
          </div>
          <input
            ref="replaceSearchInputRef"
            v-model="replaceSearchQuery"
            class="lobby-manage__nick-input lobby-manage__nick-input--modal"
            type="text"
            autocomplete="off"
            placeholder="Введите никнейм игрока"
            aria-label="Поиск карточки по никнейму"
            :disabled="replaceSubmitting"
            @keydown.escape.stop.prevent="closeReplace"
          />
          <div class="lobby-manage__replace-modal-list" role="group" aria-label="Карточки из моих составов">
            <p v-if="replaceRosterLoading" class="lobby-manage__replace-dropdown-msg">Загрузка…</p>
            <p v-else-if="rosterLoadError" class="lobby-manage__replace-err" role="alert">{{ rosterLoadError }}</p>
            <template v-else>
              <ul v-if="!rosterCards.length" class="lobby-manage__replace-list lobby-manage__replace-list--flat" role="presentation">
                <li class="lobby-manage__replace-empty">В «Мои составы» пока нет карточек.</li>
              </ul>
              <ul
                v-else-if="!filteredReplaceCards.length"
                class="lobby-manage__replace-list lobby-manage__replace-list--flat"
                role="presentation"
              >
                <li class="lobby-manage__replace-empty">Все карточки уже заняты в других местах лобби.</li>
              </ul>
              <ul v-else class="lobby-manage__replace-list" role="listbox">
                <li v-for="c in filteredReplaceCards" :key="c.id" class="lobby-manage__replace-item-wrap">
                  <button
                    type="button"
                    class="lobby-manage__replace-item"
                    role="option"
                    :disabled="replaceSubmitting"
                    @click="pickReplaceCard(c)"
                  >
                    <span class="lobby-manage__replace-thumb" aria-hidden="true">
                      <img v-if="cardThumb(c)" :src="cardThumb(c)" alt="" class="lobby-manage__replace-thumb-img" />
                      <span v-else class="lobby-manage__replace-thumb-ph">{{ c.nickname?.[0] ?? '?' }}</span>
                    </span>
                    <span class="lobby-manage__replace-item-text">
                      <span class="lobby-manage__replace-item-nick">{{ c.nickname }}</span>
                      <span v-if="cardFullName(c)" class="lobby-manage__replace-item-name">{{ cardFullName(c) }}</span>
                    </span>
                  </button>
                </li>
              </ul>
            </template>
          </div>
        </div>
      </div>

      <p class="lobby-manage__meta">
        {{ lobbyDisplayName }}
        <span class="lobby-manage__meta-sep">·</span>
        ID: <code class="lobby-manage__code">{{ lobby.id }}</code>
        ·
        <button type="button" class="lobby-manage__back" @click="goDashboard">← Панель управления</button>
      </p>

      <LobbyMemberPhotoModal
        v-model="photoModalOpen"
        :lobby-id="lobby.id"
        :lobby="lobby"
        :player="photoModalPlayer"
        :overlay-design="activePersistentDesignCode"
        @applied="onPhotoModalApplied"
      />

      <div
        v-if="deleteConfirmOpen"
        class="lobby-manage__modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Подтверждение удаления лобби"
      >
        <div class="lobby-manage__modal-card lobby-manage__modal-card--confirm-delete">
          <div class="lobby-manage__modal-head">
            <h3 class="lobby-manage__modal-title">Удалить лобби?</h3>
            <button
              type="button"
              class="lobby-manage__modal-close"
              aria-label="Закрыть"
              title="Закрыть"
              :disabled="deleteBusy"
              @click="closeDeleteConfirm"
            >
              ×
            </button>
          </div>
          <p class="lobby-manage__modal-status">
            Лобби «{{ lobbyDisplayName }}» будет удалено без возможности восстановления.
          </p>
          <div class="lobby-manage__modal-actions">
            <button
              type="button"
              class="lobby-manage__btn-foot lobby-manage__btn-foot--danger"
              :disabled="deleteBusy"
              @click="confirmDeleteLobby"
            >
              {{ deleteBusy ? 'Удаление…' : 'Удалить лобби' }}
            </button>
            <button
              type="button"
              class="lobby-manage__btn-foot"
              :disabled="deleteBusy"
              @click="closeDeleteConfirm"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>

      <LobbyImportedParticipantsModal v-model="importedParticipantsModalOpen" :lobby-id="lobbyId" />

      <div
        v-if="sheriffChecksModalOpen"
        class="lobby-manage__modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Проверки шерифа"
      >
        <div class="lobby-manage__modal-card lobby-manage__modal-card--sheriff-checks">
          <div class="lobby-manage__modal-head">
            <h3 class="lobby-manage__modal-title">Проверки шерифа</h3>
            <button
              type="button"
              class="lobby-manage__modal-close"
              aria-label="Закрыть"
              title="Закрыть"
              @click="closeSheriffChecksModal"
            >
              ×
            </button>
          </div>

          <div class="lobby-manage__sheriff-checks-form">
            <label v-for="idx in 5" :key="idx" class="lobby-manage__sheriff-checks-field">
              <input
                class="lobby-manage__sheriff-checks-input"
                type="text"
                :value="sheriffChecksValues[idx - 1] ?? ''"
                :placeholder="`N${idx}`"
                @input="updateSheriffCheckValue(idx - 1, ($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>

          <p v-if="sheriffChecksError" class="lobby-manage__modal-status lobby-manage__modal-status--error" role="alert">
            {{ sheriffChecksError }}
          </p>

          <div class="lobby-manage__modal-actions">
            <button
              type="button"
              class="lobby-manage__btn-foot lobby-manage__btn-foot--primary"
              :disabled="sheriffChecksSaving || sheriffChecksResetting"
              @click="saveSheriffChecks"
            >
              {{ sheriffChecksSaving ? 'Сохранение…' : 'Сохранить' }}
            </button>
            <button
              type="button"
              class="lobby-manage__btn-foot"
              :disabled="sheriffChecksSaving || sheriffChecksResetting"
              @click="resetSheriffChecks"
            >
              {{ sheriffChecksResetting ? 'Сброс…' : 'Сброс' }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="bestMoveModalOpen"
        class="lobby-manage__modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Best move"
      >
        <div class="lobby-manage__modal-card lobby-manage__modal-card--best-move">
          <div class="lobby-manage__modal-head">
            <h3 class="lobby-manage__modal-title">Best move</h3>
            <button
              type="button"
              class="lobby-manage__modal-close"
              aria-label="Закрыть"
              title="Закрыть"
              @click="closeBestMoveModal"
            >
              ×
            </button>
          </div>

          <div class="lobby-manage__best-move-form">
            <label v-for="idx in 3" :key="idx" class="lobby-manage__best-move-field">
              <input
                class="lobby-manage__best-move-input"
                type="text"
                :value="bestMoveValues[idx - 1] ?? ''"
                :placeholder="`ЛХ N${idx}`"
                @input="updateBestMoveValue(idx - 1, ($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>

          <p v-if="bestMoveError" class="lobby-manage__modal-status lobby-manage__modal-status--error" role="alert">
            {{ bestMoveError }}
          </p>

          <div class="lobby-manage__modal-actions">
            <button
              type="button"
              class="lobby-manage__btn-foot lobby-manage__btn-foot--primary"
              :disabled="bestMoveSaving || bestMoveResetting"
              @click="saveBestMove"
            >
              {{ bestMoveSaving ? 'Сохранение…' : 'Сохранить' }}
            </button>
            <button
              type="button"
              class="lobby-manage__btn-foot"
              :disabled="bestMoveSaving || bestMoveResetting"
              @click="resetBestMove"
            >
              {{ bestMoveResetting ? 'Сброс…' : 'Сброс' }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="bonusPointsModalOpen && !addToRatingOpen"
        class="lobby-manage__modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Дополнительные баллы"
      >
        <div class="lobby-manage__modal-card lobby-manage__modal-card--bonus-points">
          <div class="lobby-manage__modal-head">
            <h3 class="lobby-manage__modal-title">Дополнительные баллы</h3>
            <button type="button" class="lobby-manage__modal-close" aria-label="Закрыть" @click="closeBonusPointsModal">
              ×
            </button>
          </div>
          <div class="lobby-manage__bonus-points-table">
            <div class="lobby-manage__bonus-points-head">
              <span></span>
              <span>Игрок</span>
              <span>Команда</span>
              <span>Доп.</span>
            </div>
            <div v-for="(player, index) in lobby?.players ?? []" :key="player.membership_id" class="lobby-manage__bonus-points-row">
              <span class="lobby-manage__bonus-points-seat">{{ index + 1 }}</span>
              <span class="lobby-manage__bonus-points-name">{{ player.nickname || player.username || `Игрок ${index + 1}` }}</span>
              <span class="lobby-manage__bonus-points-team">{{ teamPointsForBonusModal(player).toFixed(1) }}</span>
              <div class="lobby-manage__bonus-points-stepper">
                <input
                  class="lobby-manage__bonus-points-input"
                  type="number"
                  inputmode="decimal"
                  min="-99.9"
                  max="99.9"
                  step="0.1"
                  :value="bonusPointsDraft[player.membership_id] ?? '0'"
                  @input="updateBonusPoints(player.membership_id, ($event.target as HTMLInputElement).value)"
                />
                <div class="lobby-manage__bonus-points-stepper-actions">
                  <button type="button" tabindex="-1" aria-label="Увеличить на 0.1" @click="changeBonusPointsByStep(player.membership_id, 0.1)">↑</button>
                  <button type="button" tabindex="-1" aria-label="Уменьшить на 0.1" @click="changeBonusPointsByStep(player.membership_id, -0.1)">↓</button>
                </div>
              </div>
            </div>
          </div>
          <p v-if="bonusPointsError" class="lobby-manage__modal-status lobby-manage__modal-status--error" role="alert">
            {{ bonusPointsError }}
          </p>
          <div class="lobby-manage__modal-actions">
            <button
              type="button"
              class="lobby-manage__btn-foot lobby-manage__btn-foot--primary"
              :disabled="bonusPointsSaving || bonusPointsResetting"
              @click="saveBonusPoints"
            >
              {{ bonusPointsSaving ? 'Сохранение…' : 'Сохранить' }}
            </button>
            <button
              type="button"
              class="lobby-manage__btn-foot"
              :disabled="bonusPointsSaving || bonusPointsResetting"
              @click="resetBonusPoints"
            >
              {{ bonusPointsResetting ? 'Сброс…' : 'Сбросить' }}
            </button>
          </div>
        </div>
      </div>

    </template>
    </template>

    <Transition name="lobby-manage-toast">
      <p v-if="lobbyToastVisible" class="lobby-manage__toast" role="status">
        {{ lobbyToastMessage }}
      </p>
    </Transition>
  </section>
</template>

<style scoped>
.lobby-manage {
  width: 100%;
  max-width: none;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.lobby-manage--design-picker,
.lobby-manage--add-rating {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.lobby-manage__design-picker,
.lobby-manage__add-rating {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

.add-to-rating-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  background: #fff;
  --add-rating-stat-border: rgba(148, 163, 184, 0.22);
  --add-rating-stat-bg: rgba(148, 163, 184, 0.08);
  --add-rating-stat-bg-hover: rgba(148, 163, 184, 0.14);
}

.add-to-rating-panel__split {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 26rem) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 0;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.add-to-rating-panel__col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  background: #fff;
  box-sizing: border-box;
}

.add-to-rating-panel__col--form {
  border-right: 1px solid #e5e7eb;
  overflow: visible;
  z-index: 2;
}

.add-to-rating-panel__col--form .add-to-rating-panel__col-body {
  overflow: visible;
}

.add-to-rating-panel__col--players {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.add-to-rating-panel__col-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.85rem;
  box-sizing: border-box;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 0;
}

.add-to-rating-panel__form-fields {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
  box-sizing: border-box;
}

.add-to-rating-panel__table {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  margin: 0.75rem 0.75rem 0;
  --add-rating-grid: 1.75rem minmax(0, 1fr) 2.75rem 3.85rem 6rem;
}

.add-to-rating-panel__bottom {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 0.75rem;
  margin-top: 0.75rem;
  padding: 0.65rem 0.85rem 0.85rem;
  box-sizing: border-box;
}

.add-to-rating-panel__table--has-lh {
  --add-rating-grid: 1.75rem minmax(0, 1fr) 2.75rem minmax(4.75rem, 5.75rem) 3.85rem 6rem;
}

.add-to-rating-panel__player {
  display: grid;
  grid-template-columns: var(--add-rating-grid);
  align-items: center;
  gap: 0.95rem;
  min-height: 0;
  flex: 1 1 0;
  margin: 0;
  padding: 0.5rem 0.85rem;
  border: none;
  border-radius: 12px;
  background: #f3f4f6;
  box-sizing: border-box;
  transition: background 0.15s ease;
}

.add-to-rating-panel__players {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  gap: 0.4rem;
  padding: 0.15rem 0 0;
}

.add-to-rating-panel__player:hover {
  background: #eceff3;
}

.add-to-rating-panel__player:hover .add-to-rating-panel__stat:not(.add-to-rating-panel__stat--bonus) {
  background: #fff;
  border-color: rgba(148, 163, 184, 0.28);
}

.add-to-rating-panel__player:last-child {
  margin-bottom: 0;
}

.add-to-rating-panel__player-seat {
  color: #94a3b8;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.add-to-rating-panel__player-main {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.add-to-rating-panel__player-photo {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid #e5e7eb;
  background: #f3f4f6;
}

.add-to-rating-panel__player-photo--ph {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef2f7;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
}

.add-to-rating-panel__player-name {
  min-width: 0;
  overflow: hidden;
  color: #111827;
  font-size: 0.9375rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-to-rating-panel__stat {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 2.25rem;
  height: 100%;
  padding: 0.35rem 0.55rem;
  border: 1px solid var(--add-rating-stat-border);
  border-radius: 0.625rem;
  background: #fff;
  box-sizing: border-box;
}

.add-to-rating-panel__stat--role {
  padding: 0.25rem;
}

.add-to-rating-panel__stat--total {
  color: #475569;
  font-size: 0.9375rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.add-to-rating-panel__stat--lh {
  padding-inline: 0.4rem;
}

.add-to-rating-panel__stat--bonus {
  padding: 0;
  overflow: hidden;
  background: #fff;
  border-color: #d1d5db;
}

.add-to-rating-panel__stat--bonus .lobby-manage__bonus-points-stepper {
  width: 100%;
  min-height: 2.25rem;
  height: 100%;
  border: none;
  border-radius: 0;
}

.add-to-rating-panel__stat-empty {
  color: #94a3b8;
  font-size: 0.875rem;
  line-height: 1;
}

.add-to-rating-panel__player-role-icon {
  display: block;
  width: 1.35rem;
  height: 1.35rem;
  flex-shrink: 0;
  object-fit: contain;
}

.add-to-rating-panel__player-role-icon--peaceful {
  filter: brightness(0) saturate(100%) invert(36%) sepia(72%) saturate(1400%) hue-rotate(328deg)
    brightness(95%) contrast(92%);
}

.add-to-rating-panel__player-role-icon--mafia {
  filter: brightness(0) saturate(100%) invert(40%) sepia(52%) saturate(1200%) hue-rotate(196deg)
    brightness(96%) contrast(92%);
}

.add-to-rating-panel__player-role-icon--sheriff {
  filter: brightness(0) saturate(100%) invert(46%) sepia(38%) saturate(900%) hue-rotate(118deg)
    brightness(94%) contrast(90%);
}

.add-to-rating-panel__player-role-icon--don {
  filter: brightness(0) saturate(100%) invert(40%) sepia(52%) saturate(1200%) hue-rotate(196deg)
    brightness(96%) contrast(92%);
}

.add-to-rating-panel__lh-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-width: 0;
}

.add-to-rating-panel__lh-label {
  color: #94a3b8;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
  flex-shrink: 0;
}

.add-to-rating-panel__lh-values {
  color: #334155;
  font-size: 0.875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  white-space: nowrap;
}

.add-to-rating-panel__player-stepper {
  width: 100%;
}

.add-to-rating-panel__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-shrink: 0;
  margin-top: auto;
  padding: 0.625rem 0.75rem;
  border-top: 1px solid #e5e7eb;
  background: #fff;
  box-sizing: border-box;
}

.add-to-rating-panel__footer-error {
  flex: 1 1 auto;
  min-width: min(100%, 12rem);
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: #b91c1c;
}

.add-to-rating-panel__footer-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-left: auto;
}

.add-to-rating-panel__panel-note {
  margin: 0;
  flex: 1 1 auto;
  min-width: min(100%, 12rem);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: #92400e;
  box-sizing: border-box;
}

.add-to-rating-panel__panel-note-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  color: #d97706;
}

.add-to-rating-panel__panel-note-icon svg {
  display: block;
  width: 100%;
  height: 100%;
}

.add-to-rating-panel__banner--inline {
  margin: 0;
  padding: 0.55rem 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.add-to-rating-panel__field {
  display: block;
  min-width: 0;
}

.add-to-rating-panel__field--picker {
  position: relative;
  z-index: 1;
}

.add-to-rating-panel__picker {
  position: relative;
}

.add-to-rating-panel__picker--open {
  z-index: 20;
}

.add-to-rating-panel__select-btn {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 3.375rem;
  padding: 0.7rem 2.5rem 0.7rem 0.9rem;
  font: inherit;
  color: #111827;
  text-align: left;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 10px;
  background: #fff;
  box-sizing: border-box;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

.add-to-rating-panel__select-btn:hover:not(:disabled) {
  border-color: rgba(148, 163, 184, 0.35);
  background: #fafbfc;
}

.add-to-rating-panel__select-btn:focus,
.add-to-rating-panel__select-btn:focus-visible {
  outline: none;
  border-color: #2f6feb;
  box-shadow: 0 0 0 3px rgba(47, 111, 235, 0.12);
}

.add-to-rating-panel__picker--open .add-to-rating-panel__select-btn {
  border-color: #2f6feb;
  box-shadow: 0 0 0 3px rgba(47, 111, 235, 0.12);
}

.add-to-rating-panel__select-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.add-to-rating-panel__select-value {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.add-to-rating-panel__select-name {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-to-rating-panel__select-meta {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-size: 0.75rem;
  line-height: 1.2;
  color: #64748b;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-to-rating-panel__select-value--placeholder .add-to-rating-panel__select-name {
  color: #94a3b8;
  font-weight: 400;
}

.add-to-rating-panel__picker--open .add-to-rating-panel__select-name,
.add-to-rating-panel__picker--open .add-to-rating-panel__select-meta {
  color: inherit;
}

.add-to-rating-panel__picker--open .add-to-rating-panel__select-meta {
  color: #64748b;
}

.add-to-rating-panel__select-arrow {
  position: absolute;
  top: 50%;
  right: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  color: #64748b;
  pointer-events: none;
  transform: translateY(-50%);
  transition: transform 0.15s ease, color 0.15s ease;
}

.add-to-rating-panel__select-arrow svg {
  display: block;
  width: 100%;
  height: 100%;
}

.add-to-rating-panel__picker--open .add-to-rating-panel__select-arrow {
  color: #2f6feb;
  transform: translateY(-50%) rotate(180deg);
}

.add-to-rating-panel__menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  z-index: 21;
  width: 100%;
  max-height: min(16rem, calc(100vh - 10rem));
  overflow-y: auto;
  padding: 0.35rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  box-sizing: border-box;
  box-shadow:
    0 10px 24px rgba(15, 23, 42, 0.08),
    0 2px 6px rgba(15, 23, 42, 0.04);
}

.add-to-rating-panel__menu-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.12rem;
  width: 100%;
  margin: 0;
  padding: 0.6rem 0.7rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.add-to-rating-panel__menu-item-name {
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.25;
  color: #111827;
}

.add-to-rating-panel__menu-item-meta {
  font-size: 0.75rem;
  line-height: 1.2;
  color: #64748b;
}

.add-to-rating-panel__menu-item:hover {
  background: #f8fafc;
}

.add-to-rating-panel__menu-item--active {
  background: #eff6ff;
}

.add-to-rating-panel__menu-item--active .add-to-rating-panel__menu-item-name {
  color: #1d4ed8;
  font-weight: 600;
}

.add-to-rating-panel__menu-item--active .add-to-rating-panel__menu-item-meta {
  color: #3b82f6;
}

.add-to-rating-panel__label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #64748b;
}

.add-to-rating-panel__field--title {
  display: block;
}

.add-to-rating-panel__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
}

.add-to-rating-panel__input--has-action {
  padding-right: 13.5rem;
}

.add-to-rating-panel__copy-persistent {
  position: absolute;
  top: 50%;
  right: 0.45rem;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  max-width: calc(100% - 0.9rem);
  margin: 0;
  padding: 0.42rem 0.62rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.01em;
  color: #64748b;
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  transform: translateY(-50%);
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    transform 0.12s ease;
}

.add-to-rating-panel__copy-persistent-icon {
  width: 0.9rem;
  height: 0.9rem;
  flex-shrink: 0;
}

.add-to-rating-panel__copy-persistent-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.add-to-rating-panel__copy-persistent:hover:not(:disabled) {
  color: #475569;
  background: #f3f4f6;
  border-color: #cbd5e1;
}

.add-to-rating-panel__copy-persistent:active:not(:disabled) {
  transform: translateY(calc(-50% + 1px));
}

.add-to-rating-panel__copy-persistent:disabled {
  color: #94a3b8;
  background: #f8fafc;
  border-color: #e5e7eb;
  cursor: not-allowed;
  opacity: 0.85;
}

.add-to-rating-panel__copy-persistent:focus,
.add-to-rating-panel__copy-persistent:focus-visible {
  outline: 2px solid #cbd5e1;
  outline-offset: 1px;
}

.add-to-rating-panel__input {
  width: 100%;
  box-sizing: border-box;
  min-height: 3.375rem;
  padding: 0.7rem 0.9rem;
  font: inherit;
  font-size: 1rem;
  color: #111827;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 10px;
  background: #fff;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.add-to-rating-panel__input::placeholder {
  color: #94a3b8;
}

.add-to-rating-panel__input:focus,
.add-to-rating-panel__input:focus-visible {
  outline: none;
  border-color: #2f6feb;
  box-shadow: 0 0 0 3px rgba(47, 111, 235, 0.12);
}

.add-to-rating-panel__input:disabled {
  opacity: 0.65;
}

.add-to-rating-panel__winner-controls {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 0.65rem;
  margin-left: auto;
  box-sizing: border-box;
}

.add-to-rating-panel__winner-label {
  margin: 0;
  flex-shrink: 0;
  white-space: nowrap;
}

.add-to-rating-panel__winner-toggle {
  flex: 0 0 auto;
  width: auto;
  max-width: 100%;
}

.add-to-rating-panel__hint {
  margin: 0;
  padding: 0.6rem 0.7rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #64748b;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 10px;
}

.add-to-rating-panel__hint--warn {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.add-to-rating-panel__banner {
  margin: 0;
  padding: 0.55rem 0.65rem;
  font-size: 0.8125rem;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0;
}

.add-to-rating-panel__banner--ok {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #bfdbfe;
}

@media (max-width: 1024px) {
  .add-to-rating-panel__split {
    grid-template-columns: 1fr;
    overflow: hidden;
  }

  .add-to-rating-panel__col--form {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }

  .add-to-rating-panel__col--players {
    min-height: 0;
  }

  .add-to-rating-panel__table {
    --add-rating-grid: 1.5rem minmax(0, 1fr) 2.35rem 3.5rem 5.25rem;
  }

  .add-to-rating-panel__table--has-lh {
    --add-rating-grid: 1.5rem minmax(0, 1fr) 2.35rem minmax(4.25rem, 5rem) 3.5rem 5.25rem;
  }

  .add-to-rating-panel__player {
    min-height: 0;
    gap: 0.65rem;
    padding: 0.45rem 0.65rem;
  }

  .add-to-rating-panel__bottom {
    margin-top: 0.65rem;
    padding: 0.6rem 0.65rem 0.75rem;
  }
}

.lobby-manage__status {
  margin: 0;
  padding: 0 0.75rem;
  font-size: 0.9375rem;
  color: #6b7280;
  box-sizing: border-box;
}

.lobby-manage__status--error {
  color: #b91c1c;
}

.lobby-manage__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  gap: 10px;
  align-items: start;
}

@media (max-width: 1024px) {
  .lobby-manage__grid {
    grid-template-columns: 1fr;
  }
}

.lobby-manage__card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 1rem 1rem 1.1rem;
  box-sizing: border-box;
}

.lobby-manage__card.lobby-manage__card--main {
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0;
}

.lobby-manage__card.lobby-manage__card--side {
  background: #f3f4f6;
  border: none;
  padding: 0.85rem 0.9rem;
}

.lobby-manage__swap-hint {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  color: #4b5563;
  line-height: 1.4;
}

.lobby-manage__imported-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.55rem;
  width: 100%;
  min-width: 0;
}

.lobby-manage__field.lobby-manage__imported-field {
  display: block;
  width: 100%;
  min-width: 0;
  margin-bottom: 0;
  position: relative;
}

.lobby-manage__imported-fields .lobby-manage__imported-picker {
  position: relative;
  z-index: 1;
  width: 100%;
  min-width: 0;
}

.lobby-manage__imported-fields .lobby-manage__imported-picker--open {
  z-index: 30;
}

.lobby-manage__imported-select-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-width: 0;
  min-height: 2.1rem;
  padding: 0.4rem 1.35rem 0.4rem 0.5rem;
  font: inherit;
  font-size: 0.8125rem;
  line-height: 1.2;
  color: #111827;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  box-sizing: border-box;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.lobby-manage__imported-select-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lobby-manage__imported-select-arrow {
  position: absolute;
  right: 0.4rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.62rem;
  color: #6b7280;
  pointer-events: none;
}

.lobby-manage__imported-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  max-height: min(28.5rem, calc(100vh - 8rem));
  overflow-y: auto;
  z-index: 31;
  border: 1px solid #dbe3f1;
  border-radius: 8px;
  background: #fff;
  padding: 0.2rem 0;
  box-sizing: border-box;
}

.lobby-manage__imported-menu-item {
  width: 100%;
  min-height: 1.75rem;
  border: none;
  border-radius: 0;
  background: transparent;
  text-align: left;
  padding: 0.22rem 0.42rem;
  font: inherit;
  font-size: 0.8125rem;
  color: #111827;
  cursor: pointer;
}

.lobby-manage__imported-menu-item:hover {
  background: #f9fafb;
}

.lobby-manage__imported-menu-item--active {
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}

.lobby-manage__imported-select-btn:focus {
  outline: none;
  border-color: #93c5fd;
}

.lobby-manage__imported-select-btn:hover:not(:disabled) {
  border-color: #dbe3f1;
  background: #fff;
}

.lobby-manage__imported-select-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.lobby-manage__imported-note {
  margin: 0;
  font-size: 0.6875rem;
  color: #6b7280;
}

.lobby-manage__imported-error {
  margin: 0.4rem 0 0;
  font-size: 0.75rem;
  line-height: 1.35;
  color: #b91c1c;
}

.lobby-manage__imported-actions {
  margin-top: 0.5rem;
  width: 100%;
}

.lobby-manage__imported-actions .lobby-manage__link-action {
  min-height: 2.05rem;
}

.lobby-manage__table-wrap {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-top: none;
  border-radius: 12px;
  margin-top: 10px;
  margin-left: 10px;
  overflow-x: auto;
  min-width: 0;
  max-width: 100%;
}

.lobby-manage__table-wrap--replace {
  overflow-x: visible;
  overflow-y: visible;
  gap: 0;
  border-radius: 12px;
}

.lobby-manage__row {
  display: grid;
  grid-template-columns: 70px 48px 70px minmax(120px, 1fr) max-content;
  align-items: stretch;
  gap: 0;
  padding: 0;
  height: 70px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 0;
  background: #fff;
  overflow: hidden;
}

.lobby-manage__table-wrap > .lobby-manage__row:first-child {
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}

.lobby-manage__table-wrap > .lobby-manage__row:last-child {
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.lobby-manage__table-wrap > .lobby-manage__row + .lobby-manage__row {
  margin-top: -1px;
}

.lobby-manage__row::after {
  display: none;
}

.lobby-manage__grab-outline {
  display: none;
}

/* Рамка grab/drag: border на ::before поверх ячеек (inset-тень родителя уходит под фон детей). */
.lobby-manage__row--drag-source::before,
.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source)::before {
  content: '';
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: 3px solid #2f6feb;
  border-radius: 12px;
  pointer-events: none;
  z-index: 1;
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source)::before {
  border-color: #60a5fa;
}

.lobby-manage__row--drag-source {
  position: relative;
  z-index: 2;
  outline: none;
}

.lobby-manage__row--drag-source > * {
  position: relative;
  z-index: 0;
}

.lobby-manage__row--drag-source > .lobby-manage__row-nick-cell.lobby-manage__row-nick-cell--replace-open {
  z-index: 6;
}

.lobby-manage__row--drag-source > .lobby-manage__row-num-cell,
.lobby-manage__row--drag-source > .lobby-manage__row-drag-cell,
.lobby-manage__row--drag-source > .lobby-manage__row-avatar,
.lobby-manage__row--drag-source > .lobby-manage__row-nick-cell,
.lobby-manage__row--drag-source > .lobby-manage__row-dots-cell {
  background: #eff6ff;
}

/** Внутренние линии сетки в тон рамке: и периметр (#2f6feb), и разделители между колонками. */
.lobby-manage__row--drag-source > .lobby-manage__row-num-cell {
}

.lobby-manage__row--drag-source > .lobby-manage__row-drag-cell {
}

.lobby-manage__row--drag-source > .lobby-manage__row-nick-cell {
}

.lobby-manage__row--drag-source > .lobby-manage__row-dots-cell {
  border-right: none;
}

/** Иначе .lobby-manage__dot-rect с белым фоном «режет» подсветку строки при grab/drag. */
.lobby-manage__row--drag-source .lobby-manage__dot-rect {
  background: #eff6ff;
}

.lobby-manage__row--drag-source .lobby-manage__dot-rect:first-child {
}

.lobby-manage__row--drag-source .lobby-manage__avatar-ph {
  background: #eff6ff;
}

.lobby-manage__row--drag-source .lobby-manage__row-num {
  color: #2f6feb;
}

.lobby-manage__row--drag-source .lobby-manage__row-drag {
  color: #2f6feb;
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) {
  position: relative;
  z-index: 1;
  outline: none;
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) > * {
  position: relative;
  z-index: 0;
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source)
  > .lobby-manage__row-nick-cell.lobby-manage__row-nick-cell--replace-open {
  z-index: 6;
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) > .lobby-manage__row-num-cell,
.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) > .lobby-manage__row-drag-cell,
.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) > .lobby-manage__row-avatar,
.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) > .lobby-manage__row-nick-cell,
.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) > .lobby-manage__row-dots-cell {
  background: #dbeafe;
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) > .lobby-manage__row-num-cell {
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) > .lobby-manage__row-drag-cell {
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) > .lobby-manage__row-nick-cell {
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) > .lobby-manage__row-dots-cell {
  border-right: none;
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) .lobby-manage__dot-rect {
  background: #dbeafe;
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) .lobby-manage__dot-rect:first-child {
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) .lobby-manage__avatar-ph {
  background: #dbeafe;
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) .lobby-manage__row-num {
  color: #1d4ed8;
}

/** Замена: одна рамка по всей строке (без «рёбер» от inset-теней ячеек). */
.lobby-manage__row--replace-open {
  position: relative;
  z-index: 5;
  outline: none;
  overflow: visible;
}

.lobby-manage__row--drag-source.lobby-manage__row--replace-open {
  outline: none;
}

.lobby-manage__row--replace-open.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) {
}

.lobby-manage__row--replace-open > .lobby-manage__row-num-cell,
.lobby-manage__row--replace-open > .lobby-manage__row-drag-cell,
.lobby-manage__row--replace-open > .lobby-manage__row-avatar,
.lobby-manage__row--replace-open > .lobby-manage__row-nick-cell,
.lobby-manage__row--replace-open > .lobby-manage__row-dots-cell {
  background: #eff6ff;
}

.lobby-manage__row--replace-open .lobby-manage__dot-rect {
  background: #eff6ff;
}

.lobby-manage__row--replace-open .lobby-manage__avatar-btn {
  background: #eff6ff;
}

.lobby-manage__row--replace-open .lobby-manage__avatar-ph {
  background: #eff6ff;
}

.lobby-manage__row--replace-open .lobby-manage__avatar-btn:hover:not(:disabled) {
}

.lobby-manage__row--replace-open .lobby-manage__row-num {
  color: #2f6feb;
}

.lobby-manage__row-num-cell {
  width: 70px;
  height: 70px;
  min-width: 70px;
  min-height: 70px;
  box-sizing: border-box;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-right: 1px solid #e5e7eb;
  background: #fff;
}

.lobby-manage__row-num-cell--drag-active {
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.lobby-manage__row-num-cell--drag-active:active {
  cursor: grabbing;
}

.lobby-manage__row-num-cell--drag-active:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.lobby-manage__row-num {
  font-size: 1.125rem;
  font-weight: 700;
  color: #6b7280;
  text-align: center;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.lobby-manage__row-drag-cell {
  width: 48px;
  min-width: 48px;
  height: 70px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  align-self: stretch;
  background: #fff;
}

.lobby-manage__row-drag {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  border-radius: 8px;
  touch-action: none;
}

.lobby-manage__row-drag--active {
  color: #6b7280;
  cursor: grab;
  user-select: none;
}

.lobby-manage__row-drag--active:active {
  cursor: grabbing;
}

.lobby-manage__row-drag:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.lobby-manage__row-drag-svg {
  display: block;
  width: 26px;
  height: 26px;
}

.lobby-manage__row-avatar {
  width: 70px;
  min-width: 70px;
  height: 70px;
  min-height: 70px;
  align-self: stretch;
  border-radius: 0;
  overflow: hidden;
  background: #fff;
  border: none;
  flex-shrink: 0;
  box-sizing: border-box;
}

.lobby-manage__avatar-btn {
  display: block;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: #fff;
  cursor: pointer;
  overflow: hidden;
}

.lobby-manage__avatar-btn:hover:not(:disabled) {
}

.lobby-manage__avatar-btn:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: -2px;
}

.lobby-manage__avatar-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.lobby-manage__row-nick-cell {
  position: relative;
  min-width: 0;
  height: 70px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  padding: 0 0.5rem;
  box-sizing: border-box;
  border-right: 1px solid #e5e7eb;
  background: #fff;
}

.lobby-manage__row-nick-cell--replace-open {
  z-index: 6;
}

.lobby-manage__nick-line {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2rem;
  min-width: 0;
}

.lobby-manage__nick-line--replace {
  width: 100%;
  min-width: 0;
}

/** Колонка ввода + списка: ширина как у текста ника, без отдельной «коробки» внутри ячейки. */
.lobby-manage__nick-replace-col {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  position: relative;
  box-sizing: border-box;
}

.lobby-manage__nick-text {
  flex: 1 1 auto;
  min-width: 0;
  padding-left: 0.35rem;
  font-size: 0.875rem;
  color: #111827;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lobby-manage__nick-edit {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  margin: 0;
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  color: #6b7280;
  cursor: pointer;
  box-sizing: border-box;
}

.lobby-manage__nick-edit:hover:not(:disabled) {
  border-color: #93c5fd;
  color: #2f6feb;
  background: #eff6ff;
}

.lobby-manage__nick-edit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.lobby-manage__nick-edit-svg {
  display: block;
  width: 16px;
  height: 16px;
}

/**
 * Редактирование в границах ячейки таблицы: без внутренней рамки/подчёркиваний -
 * обводка задаётся строкой (.lobby-manage__row--replace-open).
 */
.lobby-manage__nick-input {
  display: block;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0 0.25rem 0 0.35rem;
  font: inherit;
  font-size: 0.875rem;
  line-height: 1.25;
  color: #111827;
  background: transparent;
  border: none;
  border-radius: 0;
  outline: none;
  box-sizing: border-box;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-appearance: none;
  appearance: none;
}

.lobby-manage__nick-input::placeholder {
  color: #9ca3af;
}

.lobby-manage__nick-input:focus,
.lobby-manage__nick-input:focus-visible {
  outline: none;
  border: none;
}

.lobby-manage__nick-input:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.lobby-manage__replace-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  z-index: 20;
  max-width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  max-height: 13.5rem;
  overflow-y: auto;
  overflow-x: hidden;
}

.lobby-manage__replace-dropdown-msg {
  margin: 0;
  padding: 0.5rem 0.55rem;
  font-size: 0.8125rem;
  color: #6b7280;
}

.lobby-manage__replace-dropdown .lobby-manage__replace-err {
  margin: 0;
  padding: 0.45rem 0.55rem;
}

.lobby-manage__replace-err {
  margin: 0;
  font-size: 0.75rem;
  color: #b91c1c;
}

.lobby-manage__replace-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: #fafafa;
}

.lobby-manage__replace-dropdown .lobby-manage__replace-list {
  max-height: none;
  overflow: visible;
}

.lobby-manage__replace-list--flat {
  background: transparent;
}

.lobby-manage__replace-empty {
  margin: 0;
  padding: 0.65rem 0.5rem;
  font-size: 0.8125rem;
  color: #6b7280;
}

.lobby-manage__replace-item-wrap {
  margin: 0;
  padding: 0;
  border-bottom: 1px solid #e5e7eb;
}

.lobby-manage__replace-item-wrap:last-child {
  border-bottom: none;
}

.lobby-manage__replace-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  margin: 0;
  padding: 0.4rem 0.5rem;
  font: inherit;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #374151;
  box-sizing: border-box;
}

.lobby-manage__replace-item:hover:not(:disabled) {
  background: #eff6ff;
}

.lobby-manage__replace-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lobby-manage__replace-thumb {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  overflow: hidden;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lobby-manage__replace-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.lobby-manage__replace-thumb-ph {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
}

.lobby-manage__replace-item-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.lobby-manage__replace-item-nick {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lobby-manage__replace-item-name {
  font-size: 0.6875rem;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lobby-manage__row-dots-cell {
  --lobby-dot-gap: 0.4rem;
  --lobby-dot-side-pad: 0;
  --lobby-dot-size: 42px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.35rem;
  width: max-content;
  min-width: max-content;
  height: 70px;
  padding: 0 0.35rem;
  flex-shrink: 0;
  box-sizing: border-box;
  background: #fff;
  border-right: none;
  justify-self: end;
}

.lobby-manage__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.lobby-manage__avatar-ph {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #fff;
}

.lobby-manage__avatar-upload-icon {
  display: block;
  width: 22px;
  height: auto;
  opacity: 0.4;
}

.lobby-manage__dot-rect {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--lobby-dot-gap);
  box-sizing: border-box;
  min-width: max-content;
  height: auto;
  min-height: 0;
  border: none;
  border-radius: 0;
  background: #fff;
  padding-block: 0;
  padding-inline: var(--lobby-dot-side-pad);
}

.lobby-manage__dot-rect:first-child {
  padding-right: 0.35rem;
  margin-right: 0.05rem;
}

.lobby-manage__role-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--lobby-dot-size);
  height: var(--lobby-dot-size);
  min-width: var(--lobby-dot-size);
  min-height: var(--lobby-dot-size);
  padding: 0;
  border: none;
  border-radius: 10px;
  background: rgba(107, 114, 128, 0.12);
  cursor: pointer;
  box-sizing: border-box;
  transition:
    background-color 0.15s ease,
    box-shadow 0.15s ease,
    opacity 0.15s ease;
}

.lobby-manage__role-btn:hover:not(:disabled) {
  background: rgba(107, 114, 128, 0.18);
}

.lobby-manage__role-btn:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.lobby-manage__role-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.lobby-manage__role-btn--active {
  background: #eff6ff;
}

.lobby-manage__role-icon {
  display: block;
  width: 62%;
  height: 62%;
  object-fit: contain;
  opacity: 0.92;
  filter: brightness(0) saturate(100%) invert(17%) sepia(8%) saturate(942%) hue-rotate(182deg)
    brightness(95%) contrast(90%);
}

.lobby-manage__role-btn--active .lobby-manage__role-icon {
  opacity: 1;
  filter: brightness(0) saturate(100%) invert(39%) sepia(98%) saturate(1845%) hue-rotate(208deg)
    brightness(97%) contrast(98%);
}

@keyframes lobby-role-host-bg-fade {
  from {
    background: #eff6ff;
  }
  to {
    background: rgba(107, 114, 128, 0.12);
  }
}

@keyframes lobby-role-host-icon-fade {
  from {
    opacity: 1;
    filter: brightness(0) saturate(100%) invert(39%) sepia(98%) saturate(1845%) hue-rotate(208deg)
      brightness(97%) contrast(98%);
  }
  to {
    opacity: 0.92;
    filter: brightness(0) saturate(100%) invert(17%) sepia(8%) saturate(942%) hue-rotate(182deg)
      brightness(95%) contrast(90%);
  }
}

/* Плавное затухание после вспышки в режиме ведущего (появление без анимации). */
.lobby-manage__role-btn--host-flash-fade.lobby-manage__role-btn--active {
  animation: lobby-role-host-bg-fade var(--role-host-flash-ms, 420ms) cubic-bezier(0.33, 1, 0.68, 1) forwards;
}

.lobby-manage__role-btn--host-flash-fade.lobby-manage__role-btn--active .lobby-manage__role-icon {
  animation: lobby-role-host-icon-fade var(--role-host-flash-ms, 420ms) cubic-bezier(0.33, 1, 0.68, 1) forwards;
}

.lobby-manage__status-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--lobby-dot-size);
  height: var(--lobby-dot-size);
  min-width: var(--lobby-dot-size);
  min-height: var(--lobby-dot-size);
  padding: 0;
  flex-shrink: 0;
  border: none;
  border-radius: 10px;
  background: rgba(107, 114, 128, 0.12);
  cursor: pointer;
  box-sizing: border-box;
  transition:
    background-color 0.15s ease,
    box-shadow 0.15s ease,
    opacity 0.15s ease;
}

.lobby-manage__status-btn:hover:not(:disabled) {
  background: rgba(107, 114, 128, 0.18);
}

.lobby-manage__status-btn:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.lobby-manage__status-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.lobby-manage__status-btn--active {
  background: #eff6ff;
}

.lobby-manage__status-icon {
  display: block;
  width: 58%;
  height: 58%;
  object-fit: contain;
  opacity: 0.92;
  filter: brightness(0) saturate(100%) invert(17%) sepia(8%) saturate(942%) hue-rotate(182deg)
    brightness(95%) contrast(90%);
}

.lobby-manage__status-btn--active .lobby-manage__status-icon {
  opacity: 1;
  filter: brightness(0) saturate(100%) invert(39%) sepia(98%) saturate(1845%) hue-rotate(208deg)
    brightness(97%) contrast(98%);
}

.lobby-manage__sheriff-checks-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: var(--lobby-dot-size);
  padding: 0 0.65rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  color: #374151;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}

.lobby-manage__sheriff-checks-btn-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(48%) sepia(38%) saturate(950%) hue-rotate(186deg)
    brightness(97%) contrast(93%);
}

.lobby-manage__sheriff-checks-btn:hover:not(:disabled) {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

.lobby-manage__sheriff-checks-btn:hover:not(:disabled) .lobby-manage__sheriff-checks-btn-icon {
  filter: brightness(0) saturate(100%) invert(39%) sepia(98%) saturate(1845%) hue-rotate(208deg)
    brightness(97%) contrast(98%);
}

.lobby-manage__sheriff-checks-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.lobby-manage__sheriff-checks-btn--foot {
  height: 2.25rem;
}

.lobby-manage__sheriff-checks-btn-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lobby-manage__main-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  margin: 15px 15px 0;
  padding-top: 0;
  border-top: none;
}

.lobby-manage__mobile-dock {
  display: none;
}

.lobby-manage__mobile-dock-wrap {
  display: none;
}

.lobby-manage__mobile-dock-timer {
  display: none;
}

.lobby-manage__main-actions > .lobby-manage__btn-foot,
.lobby-manage__main-actions > .lobby-manage__host-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 2.25rem;
  padding: 0 0.65rem;
  line-height: 1;
}

.lobby-manage__host-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  position: relative;
  z-index: 40;
  padding: 0 0.65rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  box-sizing: border-box;
}

.lobby-manage__host-toggle-label-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.lobby-manage__host-toggle-label {
  font-weight: 500;
  white-space: nowrap;
}

.lobby-manage__host-info {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
  flex-shrink: 0;
  cursor: help;
  outline: none;
}

.lobby-manage__host-info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2rem;
  height: 1.2rem;
  font-size: 0.78rem;
  font-weight: 700;
  font-style: italic;
  line-height: 1;
  color: #6b7280;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 50%;
}

.lobby-manage__host-info:focus-visible .lobby-manage__host-info-icon {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.lobby-manage__host-info-tip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.45rem);
  z-index: 120;
  width: max-content;
  max-width: 18rem;
  padding: 0.5rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 400;
  font-style: normal;
  line-height: 1.35;
  color: #374151;
  text-align: left;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translateX(-50%) translateY(4px);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease,
    visibility 0.15s ease;
}

.lobby-manage__host-info-tip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -4px;
  border: 4px solid transparent;
  border-top-color: #f3f4f6;
}

.lobby-manage__host-info:hover .lobby-manage__host-info-tip,
.lobby-manage__host-info:focus-visible .lobby-manage__host-info-tip,
.lobby-manage__host-info:focus .lobby-manage__host-info-tip {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

.lobby-manage__host-switch {
  position: relative;
  width: 2.5rem;
  height: 1.35rem;
  border-radius: 999px;
  background: #d1d5db;
  flex-shrink: 0;
  transition: background 0.15s ease;
}

.lobby-manage__host-switch--on {
  background: #2f6feb;
}

.lobby-manage__host-switch-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
}

.lobby-manage__host-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(1.35rem - 4px);
  height: calc(1.35rem - 4px);
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s ease;
  pointer-events: none;
}

.lobby-manage__host-switch--on .lobby-manage__host-switch-knob {
  transform: translateX(1.15rem);
}

.lobby-manage__btn-foot {
  padding: 0.4rem 0.65rem;
  line-height: 1;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
}

.lobby-manage__btn-foot--danger {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fef2f2;
}

.lobby-manage__btn-foot--danger:hover:not(:disabled) {
  color: #991b1b;
  border-color: #fca5a5;
  background: #fee2e2;
}

.lobby-manage__mobile-bottom-spacer {
  display: none;
}

.lobby-manage__aside {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  width: min(320px, 100%);
  max-width: 320px;
  padding: 10px 10px 0 0;
  box-sizing: border-box;
}

.lobby-manage__side-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}

.lobby-manage__side-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
  line-height: 1.3;
}

.lobby-manage__victory-hint {
  margin: -0.2rem 0 0.65rem;
  font-size: 0.75rem;
  line-height: 1.35;
  color: #64748b;
}

.lobby-manage__victory-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
}

.lobby-manage__victory-scores-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 600;
}

.lobby-manage__victory-actions .lobby-manage__link-action--active {
  color: #fff;
  border-color: #2f6feb;
  background: #2f6feb;
}

.lobby-manage__victory-actions .lobby-manage__link-action--full {
  grid-column: 1 / -1;
}

.lobby-manage__victory-error {
  margin: 0.55rem 0 0;
  font-size: 0.75rem;
  line-height: 1.35;
  color: #b91c1c;
}

.lobby-manage__field {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.lobby-manage__field-icon {
  font-size: 0.65rem;
  font-weight: 700;
  color: #9ca3af;
  width: 1.5rem;
  text-align: center;
}

.lobby-manage__field-input {
  min-width: 0;
  padding: 0.4rem 0.5rem;
  font: inherit;
  font-size: 0.8125rem;
  color: #111827;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  text-decoration: none;
}

.lobby-manage__field-input::placeholder {
  text-decoration: none;
}

.lobby-manage__color-dots {
  display: flex;
  gap: 0.35rem;
}

.lobby-manage__c-dot {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 50%;
  border: 1px solid transparent;
  padding: 0;
  cursor: pointer;
}

.lobby-manage__c-dot--g {
  background: #22c55e;
}
.lobby-manage__c-dot--y {
  background: #eab308;
}
.lobby-manage__c-dot--r {
  background: #ef4444;
}

.lobby-manage__c-dot--w {
  background: #ffffff;
  border-color: #cbd5e1;
}

.lobby-manage__c-dot--active {
  outline: 2px solid #111827;
  outline-offset: 1px;
}

.lobby-manage__side-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
  margin-top: 0.25rem;
}

.lobby-manage__link-action {
  flex-shrink: 0;
  padding: 0.4rem 0.7rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #2f6feb;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #dbe3f1;
  border-radius: 8px;
  cursor: pointer;
  line-height: 1.2;
}

.lobby-manage__link-action--full {
  width: 100%;
  flex-basis: 100%;
  text-align: center;
}

.lobby-manage__link-action--ghost {
  color: #6b7280;
  border-color: #e5e7eb;
}

.lobby-manage__link-action--ghost:hover {
  color: #374151;
  background: #f9fafb;
}

.lobby-manage__persistent-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.45rem;
  align-items: center;
  width: 100%;
}

.lobby-manage__persistent-actions .lobby-manage__link-action {
  flex: 1.25 1 0;
  text-align: center;
  white-space: nowrap;
  padding: 0.4rem 0.55rem;
}

.lobby-manage__persistent-actions .lobby-manage__link-action--ghost {
  flex: 0.75 1 0;
}

.lobby-manage__persistent-limit {
  margin: 0 0 0.35rem;
  font-size: 0.6875rem;
  color: #6b7280;
  text-align: right;
}

.lobby-manage__persistent-feedback {
  margin: 0.4rem 0 0;
  font-size: 0.75rem;
  color: #1d4ed8;
}

.lobby-manage__duration {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.75rem;
  color: #6b7280;
  white-space: nowrap;
  line-height: 1;
}

.lobby-manage__duration-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.78;
  transform: translate(5px, -1px);
}

.lobby-manage__duration-label {
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.lobby-manage__duration-value {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  line-height: 1;
  margin-left: 7px;
}

.lobby-manage__duration-input {
  width: 3.2rem;
  height: 1.9rem;
  padding: 0 0.4rem;
  box-sizing: border-box;
  font: inherit;
  font-size: 0.75rem;
  color: #111827;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  text-decoration: none;
}

.lobby-manage__duration-unit {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1;
}

.lobby-manage__popup-feedback {
  margin: 0.4rem 0 0;
  font-size: 0.75rem;
  color: #1d4ed8;
}

.lobby-manage__toast {
  position: fixed;
  bottom: max(1.25rem, env(safe-area-inset-bottom, 0px));
  left: 50%;
  z-index: 3200;
  max-width: min(22rem, calc(100vw - 2rem));
  margin: 0;
  padding: 0.75rem 1.15rem;
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.35;
  color: #166534;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 10px;
  box-sizing: border-box;
  text-align: center;
  pointer-events: none;
  transform: translateX(-50%);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.lobby-manage-toast-enter-active,
.lobby-manage-toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.lobby-manage-toast-enter-from,
.lobby-manage-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 0.35rem);
}

.lobby-manage__meta {
  margin: 0;
  padding: 0.75rem 0.75rem 0;
  font-size: 0.8125rem;
  color: #9ca3af;
  box-sizing: border-box;
}

.lobby-manage__meta-sep {
  margin: 0 0.2rem;
}

.lobby-manage__code {
  font-size: 0.75em;
  color: #6b7280;
}

.lobby-manage__back {
  padding: 0;
  font: inherit;
  font-size: inherit;
  color: #2f6feb;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-skip-ink: auto;
  text-underline-offset: 2px;
}

.lobby-manage__modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(0.75rem, env(safe-area-inset-top, 0px))
    max(0.75rem, env(safe-area-inset-right, 0px))
    max(0.75rem, env(safe-area-inset-bottom, 0px))
    max(0.75rem, env(safe-area-inset-left, 0px));
  background: var(--modal-backdrop);
  animation: modal-overlay-in 0.18s ease;
  box-sizing: border-box;
}

.lobby-manage__modal-card {
  width: min(640px, 100%);
  max-height: min(85dvh, 900px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--modal-panel-bg);
  border-radius: var(--modal-panel-radius);
  border: 1px solid var(--modal-panel-border);
  box-shadow: var(--modal-panel-shadow);
  padding: 0;
  box-sizing: border-box;
  animation: modal-panel-in 0.28s var(--modal-ease-out);
}

.lobby-manage__modal-card > :not(.lobby-manage__modal-head):not(.lobby-manage__modal-actions) {
  margin-left: var(--modal-content-x);
  margin-right: var(--modal-content-x);
}

.lobby-manage__modal-card > .lobby-manage__modal-head + * {
  margin-top: 1rem;
}

.lobby-manage__modal-card > .lobby-manage__bonus-points-table,
.lobby-manage__modal-card > .lobby-manage__sheriff-checks-form,
.lobby-manage__modal-card > .lobby-manage__best-move-form {
  margin-bottom: 0.75rem;
}

.lobby-manage__modal-card > .lobby-manage__modal-status--error,
.lobby-manage__modal-card > .lobby-manage__modal-ok {
  margin-bottom: 0.75rem;
}

.lobby-manage__modal-card > .lobby-manage__modal-actions {
  margin-left: 0;
  margin-right: 0;
}

.lobby-manage__modal-card--sheriff-checks {
  width: min(520px, 100%);
}

.lobby-manage__modal-card--best-move {
  width: min(420px, 100%);
}

.lobby-manage__modal-card--bonus-points {
  width: min(500px, 100%);
}

.lobby-manage__modal-card--confirm-delete {
  width: min(500px, 100%);
}

.lobby-manage__modal-card--replace {
  width: min(560px, 100%);
}

.lobby-manage__modal-card--design-picker {
  width: min(920px, 100%);
  max-height: none;
  overflow: visible;
}

.lobby-manage__bonus-points-table {
  display: grid;
  margin-top: 0;
  border-top: 1px solid #eef2f7;
  border-radius: 12px;
  overflow: hidden;
  background: #f9fafb;
}

.lobby-manage__bonus-points-row {
  display: grid;
  grid-template-columns: 1.75rem minmax(0, 1fr) 4rem 5rem;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.75rem;
  padding: 0 0.65rem;
  border-bottom: 1px solid #eef2f7;
  background: #fff;
}

.lobby-manage__bonus-points-row:last-child {
  border-bottom: none;
}

.lobby-manage__bonus-points-head {
  display: grid;
  grid-template-columns: 1.75rem minmax(0, 1fr) 4rem 5rem;
  align-items: center;
  min-height: 2rem;
  gap: 0.55rem;
  padding: 0.45rem 0.65rem 0.35rem;
  color: #64748b;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: #f9fafb;
}

.lobby-manage__bonus-points-head span:nth-child(3),
.lobby-manage__bonus-points-head span:nth-child(4) {
  text-align: center;
}

.lobby-manage__bonus-points-seat {
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
}

.lobby-manage__bonus-points-name {
  min-width: 0;
  overflow: hidden;
  color: #111827;
  font-size: 0.875rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lobby-manage__bonus-points-team {
  color: #334155;
  font-size: 0.8125rem;
  font-weight: 800;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.lobby-manage__bonus-points-input {
  width: 100%;
  min-height: 2rem;
  padding: 0.3rem 0.45rem;
  border: 0;
  border-radius: 6px 0 0 6px;
  background: #fff;
  color: #111827;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  text-align: center;
  box-sizing: border-box;
}

.lobby-manage__bonus-points-input:focus {
  outline: none;
}

.lobby-manage__bonus-points-input::-webkit-inner-spin-button,
.lobby-manage__bonus-points-input::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

.lobby-manage__bonus-points-stepper {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1.45rem;
  min-height: 2rem;
  overflow: hidden;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
}

.lobby-manage__bonus-points-stepper:focus-within {
  border-color: #2f6feb;
}

.lobby-manage__bonus-points-stepper-actions {
  display: grid;
  grid-template-rows: 1fr 1fr;
  border-left: 1px solid #e5e7eb;
}

.lobby-manage__bonus-points-stepper-actions button {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  color: #64748b;
  background: #f8fafc;
  font: inherit;
  font-size: 0.55rem;
  line-height: 1;
  cursor: pointer;
}

.lobby-manage__bonus-points-stepper-actions button + button {
  border-top: 1px solid #e5e7eb;
}

.lobby-manage__bonus-points-stepper-actions button:hover {
  color: #2f6feb;
  background: #eff6ff;
}

.lobby-manage__nick-input--modal {
  width: auto;
  margin-top: 0;
  min-height: 2.5rem;
  padding: 0.55rem 0.75rem;
  font-size: 0.9375rem;
  line-height: 1.35;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.lobby-manage__nick-input--modal:focus,
.lobby-manage__nick-input--modal:focus-visible {
  border-color: #2f6feb;
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.lobby-manage__replace-modal-list {
  margin-top: 0.75rem;
  margin-bottom: 1rem;
  max-height: min(50dvh, 420px);
  overflow: auto;
  border: 1px solid #eef2f7;
  border-radius: 12px;
  background: #f9fafb;
}

.lobby-manage__modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.2rem var(--modal-content-x) 1rem;
  border-bottom: 1px solid var(--modal-head-border);
  flex-shrink: 0;
}

.lobby-manage__modal-title {
  margin: 0;
  font-size: var(--modal-title-size);
  font-weight: 600;
  color: #111827;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.lobby-manage__modal-close {
  border: none;
  background: transparent;
  color: #6b7280;
  border-radius: 10px;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  font: inherit;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.lobby-manage__modal-close:hover:not(:disabled) {
  color: #111827;
  background: #f3f4f6;
}

.lobby-manage__modal-close:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.lobby-manage__modal-status {
  margin: 0 0 0.25rem;
  font-size: 0.9375rem;
  line-height: 1.45;
  color: #4b5563;
}

.lobby-manage__modal-status--error {
  color: #b91c1c;
}

.lobby-manage__design-list {
  margin-top: 0.85rem;
  display: grid;
  grid-template-columns: repeat(3, 280px);
  grid-auto-rows: 1fr;
  justify-content: center;
  gap: 0.55rem;
}

.lobby-manage__design-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-content: start;
  justify-items: start;
  align-items: start;
  width: 280px;
  gap: 0.65rem;
  padding: 0.6rem 0.7rem;
  height: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  box-sizing: border-box;
}

.lobby-manage__design-item:has(.lobby-manage__design-radio:checked) {
  border-color: #60a5fa;
  background: #eff6ff;
}

.lobby-manage__design-item--disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.lobby-manage__design-radio {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.lobby-manage__design-preview {
  position: relative;
  width: 100%;
  max-width: none;
  height: 156px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  overflow: hidden;
  background: #0b1220;
}

.lobby-manage__design-preview-photos {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  height: 100%;
  padding: 0.55rem;
  box-sizing: border-box;
}

.lobby-manage__design-preview-photo-block {
  width: 100%;
  height: 100%;
  min-height: 5.8rem;
  border-radius: 6px;
  border: 1px dashed rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.08);
}

.lobby-manage__design-preview--classic {
  background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
}

.lobby-manage__design-preview--masters-yug25 {
  background: linear-gradient(180deg, #141414 0%, #0a0a0a 100%);
}

.lobby-manage__design-preview--plus {
  background: linear-gradient(135deg, #0f172a 0%, #0b1220 42%, #1e293b 100%);
}

.lobby-manage__design-text {
  display: grid;
  gap: 0.2rem;
  width: 100%;
  min-height: 3.4rem;
}

.lobby-manage__design-headline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.lobby-manage__design-name {
  font-size: 1.08rem;
  font-weight: 600;
  color: #111827;
}

.lobby-manage__design-price {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.45rem;
  padding: 0 0.48rem;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #6b7280;
  background: #f9fafb;
}

.lobby-manage__design-meta {
  font-size: 0.8125rem;
  color: #6b7280;
}

.lobby-manage__modal-actions {
  margin-top: auto;
  padding: 1rem var(--modal-content-x) calc(1.15rem + env(safe-area-inset-bottom, 0px));
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
  border-top: 1px solid var(--modal-head-border);
  background: #fff;
}

.lobby-manage__modal-actions .lobby-manage__btn-foot {
  padding: 0.55rem 1rem;
  font-size: 0.9375rem;
  border-radius: 10px;
}

.lobby-manage__sheriff-checks-form {
  margin-top: 0;
  margin-bottom: 0.75rem;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.55rem;
}

.lobby-manage__sheriff-checks-field {
  display: block;
}

.lobby-manage__sheriff-checks-input {
  width: 100%;
  min-height: 2.8rem;
  padding: 0.75rem 0.8rem;
  font: inherit;
  font-size: 1rem;
  color: #111827;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-sizing: border-box;
}

.lobby-manage__sheriff-checks-input:focus {
  outline: 2px solid #93c5fd;
  outline-offset: 1px;
}

.lobby-manage__best-move-form {
  margin-top: 0.85rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}

.lobby-manage__best-move-field {
  display: block;
}

.lobby-manage__best-move-input {
  width: 100%;
  min-height: 2.8rem;
  padding: 0.75rem 0.8rem;
  font: inherit;
  font-size: 1rem;
  color: #111827;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-sizing: border-box;
}

.lobby-manage__best-move-input:focus {
  outline: 2px solid #93c5fd;
  outline-offset: 1px;
}

.lobby-manage__btn-foot--primary {
  color: #fff;
  background: #2f6feb;
  border-color: #2f6feb;
}

.lobby-manage__btn-foot--primary:hover:not(:disabled) {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.lobby-manage__btn-foot--primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.lobby-manage__modal-ok {
  margin: 0;
  font-size: 0.8125rem;
  color: #1d4ed8;
}

@media (max-width: 1024px) {
  .lobby-manage__main-actions-inline-only,
  .lobby-manage__main-actions-sheriff-inline {
    display: none !important;
  }

  .lobby-manage:not(.lobby-manage--design-picker):not(.lobby-manage--add-rating) {
    padding-bottom: 0;
  }

  .lobby-manage__mobile-bottom-spacer {
    display: block;
    flex-shrink: 0;
    width: 100%;
    height: calc(10.5rem + env(safe-area-inset-bottom, 0px));
    pointer-events: none;
  }

  .lobby-manage:has(.lobby-manage__mobile-dock-sheriff) .lobby-manage__mobile-bottom-spacer {
    height: calc(13.25rem + env(safe-area-inset-bottom, 0px));
  }

  .lobby-manage__mobile-dock-wrap {
    display: flex;
    flex-direction: column;
    gap: 0;
    position: fixed;
    left: max(4px, env(safe-area-inset-left, 0px));
    right: max(4px, env(safe-area-inset-right, 0px));
    bottom: max(4px, env(safe-area-inset-bottom, 0px));
    z-index: 90;
    margin: 0;
    background: #fff;
    border-top: 1px solid #f3f4f6;
    border-radius: 0 0 10px 10px;
    box-sizing: border-box;
    overflow: hidden;
  }

  .lobby-manage__mobile-dock-timer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.65rem 0.75rem 0.55rem;
    border-bottom: 1px solid #f3f4f6;
    box-sizing: border-box;
  }

  .lobby-manage__mobile-dock-timer-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
  }

  .lobby-manage__mobile-dock-timer-control {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.35rem;
    height: 2.35rem;
    margin: 0;
    padding: 0;
    color: #6b7280;
    background: transparent;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    box-sizing: border-box;
  }

  .lobby-manage__mobile-dock-timer-control--next {
    color: #111827;
  }

  .lobby-manage__mobile-dock-timer-control:hover:not(:disabled) {
    background: transparent;
  }

  .lobby-manage__mobile-dock-timer-control--next:hover:not(:disabled) {
    color: #111827;
    background: transparent;
  }

  .lobby-manage__mobile-dock-timer-control:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .lobby-manage__mobile-dock-timer-control-icon {
    display: block;
    width: 0.95rem;
    height: auto;
    object-fit: contain;
    filter: brightness(0) saturate(100%) invert(55%) sepia(5%) saturate(300%) hue-rotate(180deg)
      brightness(95%) contrast(88%);
  }

  .lobby-manage__mobile-dock-timer-control-icon--next {
    width: 1.5rem;
    filter: brightness(0) saturate(100%);
  }

  .lobby-manage__mobile-dock-timer-value {
    margin: 0;
    padding: 0;
    font: inherit;
    font-size: 3.25rem;
    font-weight: 400;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.03em;
    color: #111827;
    line-height: 1;
    flex-shrink: 0;
    min-width: 5.2ch;
    text-align: left;
  }

  .lobby-manage__mobile-dock {
    display: flex;
    position: static;
    margin: 0;
    align-items: center;
    gap: 0.65rem;
    padding: 0.65rem 0.75rem 0.75rem;
    background: transparent;
    border: none;
    border-radius: 0;
    box-sizing: border-box;
  }

  .lobby-manage__mobile-dock-btn,
  .lobby-manage__mobile-dock-host {
    flex: 1 1 0;
    min-width: 0;
    height: 2.75rem;
  }

  .lobby-manage__mobile-dock-btn {
    justify-content: center;
    padding-inline: 0.65rem;
    font-size: 0.8125rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lobby-manage__mobile-dock-host {
    justify-content: space-between;
    padding-inline: 0.75rem;
    font-size: 0.8125rem;
  }

  .lobby-manage__mobile-dock-host .lobby-manage__host-info-tip {
    bottom: calc(100% + 0.55rem);
  }

  .lobby-manage__mobile-dock-sheriff {
    width: 100%;
    height: 2.75rem;
    justify-content: center;
    font-size: 0.8125rem;
    margin: 0;
    border: none;
    border-top: 1px solid #f3f4f6;
    border-radius: 0;
    background: #fff;
  }

  .lobby-manage__card.lobby-manage__card--side {
    padding: 0.75rem 0.8rem;
  }

  .lobby-manage__aside {
    width: 100%;
    max-width: none;
    padding: 10px 10px 0 10px;
    box-sizing: border-box;
  }

  .lobby-manage__aside > .lobby-manage__card.lobby-manage__card--side {
    width: 100%;
  }

  .lobby-manage__table-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    border-top: none;
    overflow: visible;
    margin: 10px 10px 0;
  }

  .lobby-manage__table-wrap--replace {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    border-top: none;
    overflow-x: visible;
    overflow-y: visible;
    margin: 10px 10px 0;
  }

  .lobby-manage__table-wrap > .lobby-manage__row + .lobby-manage__row {
    margin-top: 0;
  }

  .lobby-manage__table-wrap--replace > .lobby-manage__row + .lobby-manage__row {
    margin-top: 0;
  }

  .lobby-manage__row {
    grid-template-columns: 3.25rem 3.25rem minmax(0, 1fr);
    grid-template-rows: 3.25rem auto;
    height: auto;
    min-height: 0;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #fff;
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .lobby-manage__row:has(.lobby-manage__row-num-cell--drag-active) {
    position: relative;
    z-index: 1;
    border-color: transparent;
    cursor: grab;
    touch-action: none;
    overflow: visible;
  }

  .lobby-manage__row:has(.lobby-manage__row-num-cell--drag-active) .lobby-manage__row-num-cell {
    border-top-left-radius: 10px;
    overflow: hidden;
  }

  .lobby-manage__row:has(.lobby-manage__row-num-cell--drag-active) .lobby-manage__row-nick-cell {
    border-top-right-radius: 10px;
    overflow: hidden;
  }

  .lobby-manage__row:has(.lobby-manage__row-num-cell--drag-active) .lobby-manage__row-dots-cell {
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
    overflow: hidden;
  }

  .lobby-manage__row > .lobby-manage__grab-outline {
    --grab-dash-color: #aeb3bc;
    display: block;
    position: absolute;
    inset: -2px;
    box-sizing: border-box;
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    overflow: visible;
    pointer-events: none;
    z-index: 4;
    opacity: 0.92;
    transition: opacity 0.15s ease;
    background: transparent;
  }

  .lobby-manage__grab-outline-svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    shape-rendering: geometricPrecision;
  }

  .lobby-manage__grab-outline-rect {
    fill: none;
    stroke: var(--grab-dash-color);
    stroke-width: 1.5px;
    vector-effect: non-scaling-stroke;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 3 4;
  }

  .lobby-manage__row--grab-holding .lobby-manage__grab-outline {
    --grab-dash-color: #959aa3;
    opacity: 0.72;
  }

  .lobby-manage__row--grab-holding:has(.lobby-manage__row-num-cell--drag-active) {
    touch-action: none;
  }

  .lobby-manage__row--drag-source .lobby-manage__grab-outline {
    display: none;
  }

  .lobby-manage__row--drag-source::before,
  .lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source)::before {
    inset: -2px;
    border-radius: 12px;
    border-width: 2px;
  }

  .lobby-manage__row--drag-source,
  .lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) {
    overflow: visible;
  }

  .lobby-manage__row--drag-source,
  .lobby-manage__row--grab-holding {
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }

  .lobby-manage__row:has(.lobby-manage__row-num-cell--drag-active):active,
  .lobby-manage__row--drag-source {
    cursor: grabbing;
  }

  .lobby-manage__row--selected {
    border: 2px solid #2f6feb;
    box-shadow: 0 0 0 1px #2f6feb;
  }

  .lobby-manage__row--selected:has(.lobby-manage__row-num-cell--drag-active) {
    border-style: solid;
  }

  .lobby-manage__row--selected .lobby-manage__grab-outline {
    display: none;
  }

  .lobby-manage__row--selected > .lobby-manage__row-num-cell,
  .lobby-manage__row--selected > .lobby-manage__row-avatar,
  .lobby-manage__row--selected > .lobby-manage__row-nick-cell,
  .lobby-manage__row--selected > .lobby-manage__row-dots-cell {
    background: #fff;
  }

  .lobby-manage__row::after {
    display: none;
  }

  .lobby-manage__row-num-cell,
  .lobby-manage__row-nick-cell {
    height: 3.25rem;
    min-height: 3.25rem;
  }

  .lobby-manage__row-nick-cell {
    border-right: none;
    padding-right: 0.65rem;
  }

  .lobby-manage__row-drag-cell {
    display: none;
  }

  .lobby-manage__row-num-cell {
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    padding: 0;
    min-width: 3.25rem;
    width: 3.25rem;
    max-width: 3.25rem;
    height: 3.25rem;
    min-height: 3.25rem;
    align-self: stretch;
    border-right: none;
    background: #fff;
    box-sizing: border-box;
  }

  .lobby-manage__row-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    line-height: 1;
    font-size: 1.125rem;
    font-weight: 400;
    color: #374151;
    border: none;
    border-radius: 0;
    background: transparent;
    box-sizing: border-box;
  }

  .lobby-manage__row-num-cell--drag-active {
    cursor: grab;
  }

  .lobby-manage__row-num-cell--drag-active:active {
    cursor: grabbing;
  }

  .lobby-manage__row-avatar {
    width: 3.25rem;
    min-width: 3.25rem;
    max-width: 3.25rem;
    align-self: stretch;
    height: 3.25rem;
    min-height: 3.25rem;
    max-height: 3.25rem;
    aspect-ratio: 1 / 1;
    border-radius: 0;
    overflow: hidden;
  }

  .lobby-manage__avatar-btn {
    width: 100%;
    height: 100%;
  }

  .lobby-manage__avatar-ph {
    background: #d1d5db;
  }

  .lobby-manage__avatar-upload-icon {
    opacity: 0.35;
  }

  .lobby-manage__nick-text {
    padding-left: 0;
    font-size: 1rem;
    font-weight: 400;
    color: #111827;
  }

  .lobby-manage__nick-edit {
    width: 1.75rem;
    height: 1.75rem;
    border: none;
    background: transparent;
  }

  .lobby-manage__row-dots-cell {
    --lobby-dot-gap: 0.2rem;
    grid-column: 1 / -1;
    grid-row: 2;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
    grid-template-rows: minmax(2.25rem, auto);
    align-items: stretch;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    height: auto;
    min-height: 2.75rem;
    padding: 0.35rem 0.45rem 0.45rem;
    border-right: none;
    border-top: 1px solid #eceff3;
    gap: 0;
    background: #fff;
  }

  .lobby-manage__row-dots-cell::before {
    content: '';
    grid-column: 2;
    grid-row: 1;
    width: 1px;
    background: #eceff3;
    align-self: stretch;
  }

  .lobby-manage__dot-rect {
    display: flex;
    align-items: stretch;
    width: 100%;
    min-width: 0;
    height: 100%;
    min-height: 2.25rem;
    gap: var(--lobby-dot-gap);
    padding: 0;
    background: transparent;
  }

  .lobby-manage__dot-rect:first-child {
    grid-column: 1;
    padding-right: 0.35rem;
    margin-right: 0;
    border-right: none;
  }

  .lobby-manage__dot-rect:last-child {
    grid-column: 3;
    padding-left: 0.35rem;
  }

  .lobby-manage__dot-rect--sheriff-active {
    gap: 0.28rem;
  }

  .lobby-manage__dot-rect--sheriff-active .lobby-manage__role-btn--sheriff-slot {
    flex: 0 0 var(--lobby-dot-size, 2.25rem);
    width: var(--lobby-dot-size, 2.25rem);
    min-width: var(--lobby-dot-size, 2.25rem);
    max-width: var(--lobby-dot-size, 2.25rem);
  }

  .lobby-manage__dot-rect--sheriff-active .lobby-manage__sheriff-checks-btn--inline {
    display: inline-flex;
    flex: 1 1 0;
    min-width: 0;
    width: auto;
    height: auto;
    min-height: 2.25rem;
    align-self: stretch;
    justify-content: flex-start;
    border-radius: 10px;
    font-size: 0.75rem;
  }

  .lobby-manage__role-btn,
  .lobby-manage__status-btn {
    flex: 1 1 0;
    min-width: 0;
    width: auto;
    height: auto;
    min-height: 2.25rem;
    align-self: stretch;
    border-radius: 10px;
  }

  .lobby-manage__avatar-btn,
  .lobby-manage__avatar-img,
  .lobby-manage__avatar-ph {
    border-radius: 0;
  }

  .lobby-manage__main-actions {
    margin: 12px 10px 0;
    gap: 0.45rem 0.55rem;
    flex-wrap: wrap;
    overflow: visible;
    position: relative;
    z-index: 12;
  }

  .lobby-manage__main-actions > * {
    flex: 0 0 auto;
  }

  .lobby-manage__main-actions > .lobby-manage__sheriff-checks-btn--foot {
    white-space: nowrap;
  }

  .lobby-manage__sheriff-checks-btn--foot {
    flex: 0 0 auto;
  }

  .lobby-manage__modal-card--design-picker {
    max-height: none;
    overflow: visible;
  }

  .lobby-manage__design-item {
    grid-template-columns: minmax(0, 1fr);
  }

  .lobby-manage__design-preview {
    grid-column: 1;
    width: min(100%, 280px);
    height: 156px;
  }

  .lobby-manage__design-text {
    grid-column: 1;
  }

  .lobby-manage__sheriff-checks-form {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 900px) and (max-width: 1024px) {
  .lobby-manage__row-dots-cell {
    --lobby-dot-gap: 0.14rem;
    min-height: 2.45rem;
    padding: 0.28rem 0.38rem 0.34rem;
  }

  .lobby-manage__dot-rect {
    min-height: 1.95rem;
  }

  .lobby-manage__role-btn,
  .lobby-manage__status-btn {
    min-height: 1.95rem;
    border-radius: 8px;
  }

  .lobby-manage__role-icon,
  .lobby-manage__status-icon {
    width: 50%;
    height: 50%;
    max-width: 18px;
    max-height: 18px;
  }

  .lobby-manage__dot-rect--sheriff-active .lobby-manage__role-btn--sheriff-slot {
    flex-basis: 1.95rem;
    width: 1.95rem;
    min-width: 1.95rem;
    max-width: 1.95rem;
  }

  .lobby-manage__dot-rect--sheriff-active .lobby-manage__sheriff-checks-btn--inline {
    min-height: 1.95rem;
    font-size: 0.6875rem;
  }
}

@media (min-width: 501px) and (max-width: 1024px) {
  .lobby-manage__row-dots-cell {
    grid-template-rows: 2.25rem;
    min-height: 2.95rem;
  }

  .lobby-manage__dot-rect {
    height: 2.25rem;
    min-height: 2.25rem;
    align-items: center;
  }

  .lobby-manage__role-btn,
  .lobby-manage__status-btn {
    flex: 1 1 0;
    width: auto;
    min-width: 0;
    height: 2.25rem;
    min-height: 2.25rem;
    max-height: 2.25rem;
    align-self: center;
  }

  .lobby-manage__role-icon,
  .lobby-manage__status-icon {
    width: 20px;
    height: 20px;
    max-width: 20px;
    max-height: 20px;
    flex: 0 0 20px;
  }

  .lobby-manage__dot-rect--sheriff-active .lobby-manage__sheriff-checks-btn--inline {
    height: 2.25rem;
    min-height: 2.25rem;
    max-height: 2.25rem;
    align-self: center;
  }
}

/*
 * При раскрытой десктопной боковой навигации на узких экранах для таблицы и
 * правой колонки недостаточно места. Оставляем панели в один столбец, пока
 * рабочая область не станет достаточно широкой.
 */
@media (min-width: 1025px) and (max-width: 1360px) {
  .lobby-manage__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .lobby-manage__aside {
    width: 100%;
    max-width: none;
    padding: 10px;
  }

  .lobby-manage__aside > .lobby-manage__card.lobby-manage__card--side {
    width: 100%;
  }
}

@media (max-width: 767px) {
  .lobby-manage__modal-overlay {
    align-items: flex-end;
    padding-left: 0;
    padding-right: 0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .lobby-manage__modal-card {
    width: 100%;
    max-height: min(88dvh, 900px);
    border-radius: var(--modal-panel-radius-mobile);
  }

  .lobby-manage__modal-head {
    padding-top: max(1rem, env(safe-area-inset-top, 0px));
  }
}

@media (max-width: 500px) {
  .lobby-manage__row-dots-cell {
    --lobby-dot-gap: 0.15rem;
    padding-inline: 0.35rem;
  }

  .lobby-manage__role-btn,
  .lobby-manage__status-btn {
    min-height: 2rem;
  }

  .lobby-manage__dot-rect {
    min-height: 2rem;
  }

  .lobby-manage__sheriff-checks-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lobby-manage__best-move-form {
    grid-template-columns: 1fr;
  }
}

</style>
