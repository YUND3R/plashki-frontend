<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { listPlayerCards, type PlayerCard } from '@/api/playerCards'
import { ApiError } from '@/api/client'
import { useRoute, useRouter } from 'vue-router'
import uploadPhotoIcon from '@/assets/icons/upload-photo.svg?url'
import mafiaRoleIcon from '../../mafia.svg?url'
import donRoleIcon from '../../don.svg?url'
import civilianRoleIcon from '../../civilian.svg?url'
import sheriffRoleIcon from '../../sheriff.svg?url'
import votedStatusIcon from '../../voted.svg?url'
import foulStatusIcon from '../../foul.svg?url'
import bestMoveStatusIcon from '../../best_move.svg?url'
import deletedStatusIcon from '../../deleted.svg?url'
import killedStatusIcon from '../../killed.svg?url'
import LobbyMemberPhotoModal from '@/components/lobby/LobbyMemberPhotoModal.vue'
import LobbyImportedParticipantsModal from '@/components/lobby/LobbyImportedParticipantsModal.vue'
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
  setLobbySheriffCheck,
  setLobbyOverlayDesign,
  setLobbyMemberStatus,
  setLobbyMemberRole,
  setLobbyImportedSelection,
  swapLobbySeats,
  type GameLobby,
  type LobbyImportedVariant,
  type LobbyOverlayDesignOption,
  type LobbyPlayer,
} from '@/api/lobbies'
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

const route = useRoute()
const router = useRouter()
const lobbyManageUi = useLobbyManageUiStore()
const { hostMode } = storeToRefs(lobbyManageUi)

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

const SEAT_DND_MIME = 'application/x-plashki-seat'

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
const roleSubmittingMembershipId = ref<string | null>(null)
const statusSubmittingMembershipId = ref<string | null>(null)
const rolesResetBusy = ref(false)
const deleteBusy = ref(false)
const deleteConfirmOpen = ref(false)
const cardDesignModalOpen = ref(false)
const cardDesignLoading = ref(false)
const cardDesignSaving = ref(false)
const cardDesignError = ref<string | null>(null)
const cardDesignSaveMessage = ref<string | null>(null)
const cardDesignOptions = ref<LobbyOverlayDesignOption[]>([])
const selectedCardDesign = ref('')
const initialCardDesign = ref('')
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
const PERSISTENT_MESSAGE_MAX_LENGTH = 120
const popupTitleDraft = ref('')
const popupSubtitleDraft = ref('')
const popupDurationDraft = ref('7')
const popupFeedback = ref<string | null>(null)
const POPUP_TEXT_MAX_LENGTH = 120
const popupTitleTone = ref<OverlayTextTone>('green')
const popupSubtitleTone = ref<OverlayTextTone>('green')
const persistentMessageTone = ref<OverlayTextTone>('green')
const toneOptions: Array<{ value: OverlayTextTone; className: string; label: string }> = [
  { value: 'white', className: 'lobby-manage__c-dot--w', label: 'Белый' },
  { value: 'green', className: 'lobby-manage__c-dot--g', label: 'Зеленый' },
  { value: 'yellow', className: 'lobby-manage__c-dot--y', label: 'Желтый' },
  { value: 'red', className: 'lobby-manage__c-dot--r', label: 'Красный' },
]
let popupFeedbackTimer: ReturnType<typeof setTimeout> | null = null
let persistentFeedbackTimer: ReturnType<typeof setTimeout> | null = null

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
  dragActiveIndex.value = null
  dragOverIndex.value = null
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

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDownImported, true)
  window.addEventListener('keydown', onImportedEscapeKey)
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
  roleHostFlash.value = null
  document.removeEventListener('pointerdown', onDocPointerDownReplace, true)
  document.removeEventListener('pointerdown', onDocPointerDownImported, true)
  window.removeEventListener('keydown', onReplaceEscapeKey)
  window.removeEventListener('keydown', onImportedEscapeKey)
  window.removeEventListener('pointermove', onTouchDragMove)
  window.removeEventListener('pointerup', onTouchDragEnd)
  window.removeEventListener('pointercancel', onTouchDragCancel)
})

const seatCount = computed(() => lobby.value?.max_players ?? 10)

const seatRows = computed(() => {
  const list = lobby.value?.players ?? []
  const n = seatCount.value
  const rows: (LobbyPlayer | null)[] = []
  for (let i = 0; i < n; i++) rows.push(list[i] ?? null)
  return rows
})

const isLobbyHost = computed(() => {
  const hid = lobby.value?.host_user_id
  const uid = currentUserId.value
  if (!hid || !uid) return false
  return hid === uid
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

function onImportedEscapeKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (importedParticipantsModalOpen.value) return
  closeImportedMenus()
}

function onReplaceEscapeKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closeReplace()
}

function onDocPointerDownReplace(e: PointerEvent) {
  if (replaceOpenSeatIndex.value === null) return
  const t = e.target
  if (!(t instanceof Element)) return
  /** Вся ячейка ника строки с открытой заменой — не считаем «снаружи» (карандаш, поле, меню). */
  if (t.closest('.lobby-manage__row-nick-cell--replace-open')) return
  closeReplace()
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

function onDragEnd() {
  dragActiveIndex.value = null
  dragOverIndex.value = null
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

function rowIndexFromPoint(clientX: number, clientY: number): number | null {
  const el = document.elementFromPoint(clientX, clientY)
  const row = el?.closest('.lobby-manage__row')
  if (!(row instanceof HTMLElement)) return null
  const raw = row.dataset.rowIndex ?? ''
  const idx = Number.parseInt(raw, 10)
  return Number.isFinite(idx) ? idx : null
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

function onTouchDragStart(e: PointerEvent, idx: number, p: LobbyPlayer | null) {
  if (e.pointerType === 'mouse') return
  swapHint.value = null
  if (!isLobbyHost.value || swapBusy.value || rolesResetBusy.value || !p?.membership_id) {
    e.preventDefault()
    return
  }
  touchDragPointerId.value = e.pointerId
  dragActiveIndex.value = idx
  dragOverIndex.value = null
  addTouchDragListeners()
  e.preventDefault()
}

function onTouchDragMove(e: PointerEvent) {
  if (touchDragPointerId.value !== e.pointerId || dragActiveIndex.value === null) return
  const targetIdx = rowIndexFromPoint(e.clientX, e.clientY)
  dragOverIndex.value =
    targetIdx !== null && targetIdx !== dragActiveIndex.value ? targetIdx : null
  e.preventDefault()
}

async function onTouchDragEnd(e: PointerEvent) {
  if (touchDragPointerId.value !== e.pointerId) return
  const sourceIdx = dragActiveIndex.value
  const targetIdx = rowIndexFromPoint(e.clientX, e.clientY)
  touchDragPointerId.value = null
  removeTouchDragListeners()
  if (sourceIdx === null || targetIdx === null || swapBusy.value || rolesResetBusy.value) {
    onDragEnd()
    return
  }
  await swapSeatsByIndex(sourceIdx, targetIdx)
}

function onTouchDragCancel(e: PointerEvent) {
  if (touchDragPointerId.value !== e.pointerId) return
  touchDragPointerId.value = null
  removeTouchDragListeners()
  onDragEnd()
}

function onDragOver(e: DragEvent, idx: number) {
  if (!isLobbyHost.value || swapBusy.value || rolesResetBusy.value || dragActiveIndex.value === null)
    return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dragOverIndex.value = idx === dragActiveIndex.value ? null : idx
}

async function onDrop(e: DragEvent, targetIdx: number) {
  dragOverIndex.value = null
  if (swapBusy.value || rolesResetBusy.value) {
    onDragEnd()
    return
  }
  const raw =
    e.dataTransfer?.getData(SEAT_DND_MIME) || e.dataTransfer?.getData('text/plain') || ''
  const sourceIdx = Number.parseInt(raw, 10)
  if (!Number.isFinite(sourceIdx)) {
    onDragEnd()
    return
  }
  await swapSeatsByIndex(sourceIdx, targetIdx)
}

function rowPhoto(p: LobbyPlayer | null): string {
  if (!p) return ''
  const lobby = typeof p.lobby_photo_url === 'string' ? p.lobby_photo_url.trim() : ''
  if (lobby) return lobby
  const u = p.photo_urls?.[0]
  return typeof u === 'string' && u.trim() ? u.trim() : ''
}

function rowKey(idx: number, p: LobbyPlayer | null): string {
  if (p?.membership_id) return p.membership_id
  return `empty-${idx}`
}

function goDashboard() {
  void router.push({ name: 'dashboard' })
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
    activePersistentDesignCode.value = normalizePersistentDesignCode(data.selected_overlay_design)
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

function openPhotoModal(p: LobbyPlayer) {
  if (!isLobbyHost.value || swapBusy.value || rolesResetBusy.value || !p.membership_id) return
  photoModalPlayer.value = p
  photoModalOpen.value = true
}

function onPhotoModalApplied(next: GameLobby) {
  lobby.value = next
  photoModalPlayer.value = null
}

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
      if (!isStatusActive(p, status)) {
        lobby.value = await setLobbyMemberStatus(lobbyId.value, p.membership_id, { status })
      }
      const latest = lobby.value?.players?.find((x) => x.membership_id === p.membership_id) ?? p
      openBestMoveModal(latest)
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

async function resetAllRolesAndStatuses() {
  if (!isLobbyHost.value || swapBusy.value || rolesResetBusy.value || replaceSubmitting.value) return
  const id = lobbyId.value
  if (!id) return
  rolesResetBusy.value = true
  swapHint.value = null
  try {
    await clearLobbyBestMove(id)
    await clearLobbySheriffCheck(id)
    await resetLobbyGameRoles(id)
    lobby.value = await resetLobbyStatuses(id)
    sheriffChecksValues.value = ['', '', '', '', '']
    sheriffChecksError.value = null
    bestMoveValues.value = ['', '', '']
    bestMoveError.value = null
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
  () => lobbyManageUi.designPickerOpenToken,
  () => {
    void openCardDesignModal()
  },
)

watch(
  () => lobbyManageUi.designChangedToken,
  async () => {
    await syncActivePersistentDesignCode()
    loadPersistentMessageDraft()
    persistentMessageFeedback.value = null
  },
)

watch(
  () => lobbyManageUi.deleteConfirmOpenToken,
  () => {
    openDeleteConfirm()
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

const canSaveCardDesign = computed(() => {
  if (!selectedCardDesign.value) return false
  if (cardDesignSaving.value) return false
  return selectedCardDesign.value !== initialCardDesign.value
})

function subscriptionLabel(raw: string): string {
  const s = raw.trim().toLowerCase()
  if (s === 'free') return 'Бесплатно'
  if (s === 'premium') return 'Premium'
  if (s === 'standard') return 'Standard'
  return raw
}

async function loadCardDesignOptions() {
  if (!lobbyId.value) return
  cardDesignLoading.value = true
  cardDesignError.value = null
  cardDesignSaveMessage.value = null
  try {
    const data = await getLobbyOverlayDesigns(lobbyId.value)
    cardDesignOptions.value = data.options ?? []
    selectedCardDesign.value = data.selected_overlay_design ?? ''
    initialCardDesign.value = data.selected_overlay_design ?? ''
  } catch (e) {
    cardDesignError.value = e instanceof Error ? e.message : String(e)
    cardDesignOptions.value = []
    selectedCardDesign.value = ''
    initialCardDesign.value = ''
  } finally {
    cardDesignLoading.value = false
  }
}

async function openCardDesignModal() {
  if (!isLobbyHost.value || swapBusy.value || rolesResetBusy.value || replaceSubmitting.value) return
  cardDesignModalOpen.value = true
  await loadCardDesignOptions()
}

function closeCardDesignModal() {
  cardDesignModalOpen.value = false
  cardDesignError.value = null
  cardDesignSaveMessage.value = null
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

function readBestMoveFromLobby(sourceLobby: GameLobby | null): string[] {
  const source = (sourceLobby ?? {}) as Record<string, unknown>
  const raw = source.best_move
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
  bestMoveValues.value = readBestMoveFromLobby(lobby.value)
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
        const targetPlayer = lobby.value?.players?.find((p) => p.membership_id === targetMembershipId) ?? null
        if (isStatusActive(targetPlayer, 'best-move')) {
          await clearLobbyMemberStatus(lobbyId.value, targetMembershipId)
        }
      }
      lobby.value = await clearLobbyBestMove(lobbyId.value)
      bestMoveValues.value = ['', '', '']
      closeBestMoveModalForced()
      return
    }
    lobby.value = await setLobbyBestMove(lobbyId.value, { best_move: bodyValues })
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
    lobby.value = await clearLobbyBestMove(lobbyId.value)
    bestMoveValues.value = ['', '', '']
  } catch (e) {
    bestMoveError.value = e instanceof Error ? e.message : String(e)
  } finally {
    bestMoveResetting.value = false
  }
}

async function saveCardDesign() {
  if (!canSaveCardDesign.value || !lobbyId.value) return
  cardDesignSaving.value = true
  cardDesignError.value = null
  cardDesignSaveMessage.value = null
  try {
    await setLobbyOverlayDesign(lobbyId.value, { overlay_design: selectedCardDesign.value })
    initialCardDesign.value = selectedCardDesign.value
    lobbyManageUi.notifyDesignChanged()
    cardDesignSaveMessage.value = 'Дизайн карточек сохранён.'
  } catch (e) {
    cardDesignError.value = e instanceof Error ? e.message : String(e)
  } finally {
    cardDesignSaving.value = false
  }
}
</script>

<template>
  <section class="lobby-manage">
    <p v-if="loading" class="lobby-manage__status">Загрузка лобби…</p>
    <p v-else-if="error" class="lobby-manage__status lobby-manage__status--error" role="alert">
      {{ error }}
    </p>

    <template v-else-if="lobby">
      <div class="lobby-manage__grid">
        <article class="lobby-manage__card lobby-manage__card--main">
          <p v-if="swapHint" class="lobby-manage__swap-hint" role="status">{{ swapHint }}</p>
          <div class="lobby-manage__table-wrap" :class="{ 'lobby-manage__table-wrap--replace': isReplacePanelOpen }">
            <div
              v-for="(p, idx) in seatRows"
              :key="rowKey(idx, p)"
              class="lobby-manage__row"
              :data-row-index="idx"
              :class="{
                'lobby-manage__row--drag-over': dragOverIndex === idx && dragActiveIndex !== null,
                'lobby-manage__row--drag-source': dragActiveIndex === idx,
                'lobby-manage__row--replace-open': replaceOpenSeatIndex === idx && !!p?.membership_id,
              }"
              @dragover="onDragOver($event, idx)"
              @drop="onDrop($event, idx)"
            >
              <div class="lobby-manage__row-num-cell">
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
                      ? 'Зажмите и перетащите на другого игрока — поменять местами'
                      : isLobbyHost
                        ? 'Пустое место — сюда нельзя перетащить обмен'
                        : 'Порядок может менять только хост лобби.'
                  "
                  @dragstart.stop="onDragStart($event, idx, p)"
                  @dragend.stop="onDragEnd"
                  @pointerdown.stop="onTouchDragStart($event, idx, p)"
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
                  :class="{ 'lobby-manage__nick-line--replace': replaceOpenSeatIndex === idx && p }"
                >
                  <template v-if="replaceOpenSeatIndex === idx && p">
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
                    @click.stop="replaceOpenSeatIndex === idx ? closeReplace() : openReplace(idx, p)"
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
                <div class="lobby-manage__dot-rect">
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
                      v-if="role.value === 'sheriff' && isRoleActive(p, 'sheriff')"
                      type="button"
                      class="lobby-manage__sheriff-checks-btn"
                      :disabled="!canOpenSheriffChecks(p)"
                      @click="openSheriffChecksModal(p)"
                    >
                      Проверки шерифа
                    </button>
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

          <div class="lobby-manage__main-actions">
            <button
              type="button"
              class="lobby-manage__btn-foot"
              :disabled="!isLobbyHost || swapBusy || rolesResetBusy || replaceSubmitting || deleteBusy"
              @click="resetAllRolesAndStatuses"
            >
              {{ rolesResetBusy ? 'Сброс…' : 'Сбросить роли и статусы' }}
            </button>
            <label class="lobby-manage__host-toggle">
              <span class="lobby-manage__host-toggle-label">Режим ведущего</span>
              <span class="lobby-manage__host-switch" :class="{ 'lobby-manage__host-switch--on': hostMode }">
                <input v-model="hostMode" type="checkbox" class="lobby-manage__host-switch-input" />
                <span class="lobby-manage__host-switch-knob" />
              </span>
            </label>
            <div v-if="hasImportedSelection" ref="importedSwitcherRef" class="lobby-manage__imported-switcher">
              <div class="lobby-manage__imported-group">
                <div class="lobby-manage__imported-picker">
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
              <div class="lobby-manage__imported-group">
                <div class="lobby-manage__imported-picker">
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
                  <div
                    v-if="importedTableMenuOpen"
                    class="lobby-manage__imported-menu"
                    role="listbox"
                    aria-label="Столы"
                  >
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
              <button
                type="button"
                class="lobby-manage__imported-btn lobby-manage__imported-btn--apply"
                :disabled="importedSelectionBusy || !isLobbyHost || !canApplyImportedSelection"
                @click="applyImportedSelection"
              >
                {{ importedSelectionBusy ? '...' : 'Применить' }}
              </button>
            </div>
            <button
              v-if="hasImportedSelection && isLobbyHost"
              type="button"
              class="lobby-manage__btn-foot lobby-manage__imported-participants-open"
              :disabled="swapBusy || rolesResetBusy || replaceSubmitting || deleteBusy || importedSelectionBusy"
              @click="openImportedParticipantsModal"
            >
              Список всех участников турнира
            </button>
            <p v-if="!isLobbyHost && hasImportedSelection" class="lobby-manage__imported-note">
              Переключать тур/стол может только хост лобби.
            </p>
            <p v-if="importedSelectionError" class="lobby-manage__imported-error" role="alert">{{ importedSelectionError }}</p>
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
              <button type="button" class="lobby-manage__link-action" @click="emitPopupMessage">Вывести на экран</button>
              <label class="lobby-manage__duration">
                время отображения на экране в секундах
                <input v-model="popupDurationDraft" class="lobby-manage__duration-input" type="text" inputmode="numeric" />
              </label>
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
                :maxlength="PERSISTENT_MESSAGE_MAX_LENGTH"
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
            <p class="lobby-manage__persistent-counter">
              {{ persistentMessageDraft.length }}/{{ PERSISTENT_MESSAGE_MAX_LENGTH }}
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
        </aside>
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
        :player="photoModalPlayer"
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

      <div
        v-if="cardDesignModalOpen"
        class="lobby-manage__modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Выбор дизайна карточек"
      >
        <div class="lobby-manage__modal-card">
          <div class="lobby-manage__modal-head">
            <h3 class="lobby-manage__modal-title">Выбрать дизайн карточек</h3>
            <button
              type="button"
              class="lobby-manage__modal-close"
              aria-label="Закрыть"
              title="Закрыть"
              @click="closeCardDesignModal"
            >
              ×
            </button>
          </div>

          <p v-if="cardDesignLoading" class="lobby-manage__modal-status">Загрузка дизайнов…</p>
          <p v-else-if="cardDesignError" class="lobby-manage__modal-status lobby-manage__modal-status--error" role="alert">
            {{ cardDesignError }}
          </p>
          <div
            v-else-if="cardDesignOptions.length"
            class="lobby-manage__design-list"
            role="radiogroup"
            aria-label="Список доступных дизайнов"
          >
            <label
              v-for="item in cardDesignOptions"
              :key="item.code"
              class="lobby-manage__design-item"
              :class="{ 'lobby-manage__design-item--disabled': !item.selectable }"
            >
              <input
                v-model="selectedCardDesign"
                class="lobby-manage__design-radio"
                type="radio"
                name="lobby-overlay-design"
                :value="item.code"
                :disabled="!item.selectable || cardDesignSaving"
              />
              <span class="lobby-manage__design-text">
                <span class="lobby-manage__design-name">{{ item.title }}</span>
                <span class="lobby-manage__design-meta">
                  Подписка: {{ subscriptionLabel(item.required_subscription) }} · Анимации:
                  {{ item.animation_supported ? 'Да' : 'Нет' }}
                </span>
              </span>
            </label>
          </div>
          <p v-else class="lobby-manage__modal-status">Нет доступных дизайнов.</p>

          <div class="lobby-manage__modal-actions">
            <button type="button" class="lobby-manage__btn-foot" :disabled="!canSaveCardDesign" @click="saveCardDesign">
              {{ cardDesignSaving ? 'Сохранение…' : 'Сохранить' }}
            </button>
            <p v-if="cardDesignSaveMessage" class="lobby-manage__modal-ok" role="status">{{ cardDesignSaveMessage }}</p>
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

    </template>
  </section>
</template>

<style scoped>
.lobby-manage {
  width: 100%;
  max-width: none;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
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

.lobby-manage__imported-switcher {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  justify-content: flex-end;
  gap: 0.7rem;
  align-items: center;
}

@media (max-width: 860px) {
  .lobby-manage__imported-switcher {
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;
    justify-content: stretch;
  }
}

.lobby-manage__imported-group {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  position: relative;
}

.lobby-manage__imported-picker {
  position: relative;
}

.lobby-manage__imported-select-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  width: 145px;
  height: 1.95rem;
  padding: 0.22rem 1.2rem 0.22rem 0.42rem;
  font: inherit;
  font-size: 0.8125rem;
  line-height: 1;
  color: #111827;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: #fff;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  box-sizing: border-box;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s ease;
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
  bottom: calc(100% + 4px);
  left: 0;
  width: 145px;
  max-height: min(28.5rem, calc(100vh - 8rem));
  overflow-y: auto;
  z-index: 30;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  box-shadow: none;
  padding: 0;
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

@media (max-width: 860px) {
  .lobby-manage__imported-select-btn,
  .lobby-manage__imported-menu {
    width: 100%;
  }
}

.lobby-manage__imported-select-btn:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: none;
}

.lobby-manage__imported-select-btn:hover:not(:disabled) {
  border-color: #cbd5e1;
  background-color: #fff;
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
  margin: 0;
  font-size: 0.6875rem;
  color: #b91c1c;
}

.lobby-manage__imported-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.95rem;
  min-width: 66px;
  padding: 0.18rem 0.38rem;
  font: inherit;
  font-size: 0.6875rem;
  line-height: 1;
  font-weight: 600;
  color: #374151;
  background: #f9fafb;
  border: 1px solid #dbe3f1;
  border-radius: 6px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
  white-space: nowrap;
}

.lobby-manage__imported-btn:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.lobby-manage__imported-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lobby-manage__imported-btn--apply {
  min-width: 86px;
  border-color: #2f6feb;
  background: #2f6feb;
  color: #fff;
}

.lobby-manage__imported-btn--apply:hover:not(:disabled) {
  border-color: #1d4ed8;
  background: #1d4ed8;
  color: #fff;
}

.lobby-manage__table-wrap {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-top: 1px solid #e5e7eb;
  overflow-x: auto;
  min-width: 0;
  max-width: 100%;
}

.lobby-manage__table-wrap--replace {
  overflow-x: visible;
  overflow-y: visible;
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
  border: none;
  background: transparent;
}

.lobby-manage__row::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: #e5e7eb;
  pointer-events: none;
  z-index: 0;
}

/* Рамка grab/drag: border на ::before поверх ячеек (inset-тень родителя уходит под фон детей). */
.lobby-manage__row--drag-source::before,
.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source)::before {
  content: '';
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: 3px solid #2f6feb;
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
  box-shadow: none;
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
  box-shadow: inset 1px 0 0 #93c5fd;
}

.lobby-manage__row--drag-source > .lobby-manage__row-drag-cell {
  box-shadow: inset 1px 0 0 #93c5fd, inset -1px 0 0 #93c5fd;
}

.lobby-manage__row--drag-source > .lobby-manage__row-nick-cell {
  box-shadow: inset 1px 0 0 #93c5fd, inset -1px 0 0 #93c5fd;
}

.lobby-manage__row--drag-source > .lobby-manage__row-dots-cell {
  border-right: 1px solid #93c5fd;
}

/** Иначе .lobby-manage__dot-rect с белым фоном «режет» подсветку строки при grab/drag. */
.lobby-manage__row--drag-source .lobby-manage__dot-rect {
  background: #eff6ff;
}

.lobby-manage__row--drag-source .lobby-manage__dot-rect:first-child {
  box-shadow: inset -1px 0 0 #93c5fd;
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
  box-shadow: none;
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
  box-shadow: inset 1px 0 0 #38bdf8;
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) > .lobby-manage__row-drag-cell {
  box-shadow: inset 1px 0 0 #38bdf8, inset -1px 0 0 #38bdf8;
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) > .lobby-manage__row-nick-cell {
  box-shadow: inset 1px 0 0 #38bdf8, inset -1px 0 0 #38bdf8;
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) > .lobby-manage__row-dots-cell {
  border-right: 1px solid #38bdf8;
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) .lobby-manage__dot-rect {
  background: #dbeafe;
}

.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) .lobby-manage__dot-rect:first-child {
  box-shadow: inset -1px 0 0 #38bdf8;
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
  box-shadow: inset 0 0 0 2px #2f6feb;
}

.lobby-manage__row--drag-source.lobby-manage__row--replace-open {
  outline: none;
  box-shadow: none;
}

.lobby-manage__row--replace-open.lobby-manage__row--drag-over:not(.lobby-manage__row--drag-source) {
  box-shadow: none;
}

.lobby-manage__row--replace-open > .lobby-manage__row-num-cell,
.lobby-manage__row--replace-open > .lobby-manage__row-drag-cell,
.lobby-manage__row--replace-open > .lobby-manage__row-avatar,
.lobby-manage__row--replace-open > .lobby-manage__row-nick-cell,
.lobby-manage__row--replace-open > .lobby-manage__row-dots-cell {
  box-shadow: none;
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
  box-shadow: none;
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
  background: #fff;
  box-shadow: inset 1px 0 0 #e5e7eb;
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
  box-shadow: inset 1px 0 0 #e5e7eb, inset -1px 0 0 #e5e7eb;
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
  box-shadow: inset 0 0 0 2px #2f6feb;
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
  background: #fff;
  box-shadow: inset 1px 0 0 #e5e7eb, inset -1px 0 0 #e5e7eb;
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
 * Редактирование в границах ячейки таблицы: без внутренней рамки/подчёркиваний —
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
  box-shadow: none;
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
  box-shadow: none;
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
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
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
  border-right: 1px solid #e5e7eb;
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
  box-shadow: inset -1px 0 0 #e5e7eb;
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
  box-shadow: inset 0 0 0 2px #93c5fd;
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
    box-shadow: inset 0 0 0 2px #93c5fd;
  }
  to {
    background: rgba(107, 114, 128, 0.12);
    box-shadow: inset 0 0 0 2px transparent;
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
  box-shadow: inset 0 0 0 2px #93c5fd;
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

.lobby-manage__sheriff-checks-btn:hover:not(:disabled) {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

.lobby-manage__sheriff-checks-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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

.lobby-manage__host-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2rem;
  padding: 0.35rem 0.65rem;
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

.lobby-manage__host-toggle-label {
  font-weight: 500;
  white-space: nowrap;
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
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s ease;
  pointer-events: none;
}

.lobby-manage__host-switch--on .lobby-manage__host-switch-knob {
  transform: translateX(1.15rem);
}

.lobby-manage__btn-foot {
  padding: 0.4rem 0.65rem;
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
  gap: 0.45rem;
  align-items: center;
}

.lobby-manage__persistent-counter {
  margin: 0 0 0.35rem;
  font-size: 0.6875rem;
  color: #6b7280;
}

.lobby-manage__persistent-feedback {
  margin: 0.4rem 0 0;
  font-size: 0.75rem;
  color: #1d4ed8;
}

.lobby-manage__duration {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.lobby-manage__duration-input {
  width: 4rem;
  padding: 0.25rem 0.35rem;
  font: inherit;
  font-size: 0.75rem;
  color: #111827;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  text-decoration: none;
}

.lobby-manage__popup-feedback {
  margin: 0.4rem 0 0;
  font-size: 0.75rem;
  color: #1d4ed8;
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
  z-index: 80;
  background: rgba(17, 24, 39, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.lobby-manage__modal-card {
  width: min(640px, 100%);
  max-height: min(82vh, 900px);
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 0.95rem;
  box-sizing: border-box;
}

.lobby-manage__modal-card--sheriff-checks {
  width: min(520px, 100%);
}

.lobby-manage__modal-card--best-move {
  width: min(420px, 100%);
}

.lobby-manage__modal-card--confirm-delete {
  width: min(500px, 100%);
}

.lobby-manage__imported-participants-open {
  flex: 1 1 auto;
  min-width: min(100%, 14rem);
}

.lobby-manage__modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.lobby-manage__modal-title {
  margin: 0;
  font-size: 1rem;
  color: #111827;
}

.lobby-manage__modal-close {
  border: 1px solid #e5e7eb;
  background: transparent;
  color: #6b7280;
  border-radius: 8px;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  font: inherit;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.lobby-manage__modal-close:hover:not(:disabled) {
  color: #111827;
  background: #f3f4f6;
}

.lobby-manage__modal-status {
  margin: 0.85rem 0 0;
  font-size: 0.875rem;
  color: #4b5563;
}

.lobby-manage__modal-status--error {
  color: #b91c1c;
}

.lobby-manage__design-list {
  margin-top: 0.85rem;
  display: grid;
  gap: 0.55rem;
}

.lobby-manage__design-item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
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
  margin-top: 0.1rem;
}

.lobby-manage__design-text {
  display: grid;
  gap: 0.2rem;
}

.lobby-manage__design-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
}

.lobby-manage__design-meta {
  font-size: 0.8125rem;
  color: #6b7280;
}

.lobby-manage__modal-actions {
  margin-top: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.lobby-manage__sheriff-checks-form {
  margin-top: 0.85rem;
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

</style>
