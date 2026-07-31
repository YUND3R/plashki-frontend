<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useRatingsUiStore } from '@/stores/ratingsUi'
import { listPlayerCards, type PlayerCard } from '@/api/playerCards'
import {
  addRatingParticipants,
  createRatingGame,
  deleteRating,
  getRating,
  getRatingGame,
  getRatingTable,
  listRatingGames,
  patchRating,
  type Rating,
  type RatingGame,
  type RatingGameListItem,
  type RatingGameResult,
  type RatingGameResultWrite,
  type RatingGameRole,
  type RatingGameSource,
  type RatingTableRow,
  type RatingWinnerSide,
} from '@/api/ratings'
import AddGamePlayerSelect, { type AddGamePlayerSelectOption } from '@/components/ratings/AddGamePlayerSelect.vue'
import AddGameRoleStepper, { type AddGameRoleOption } from '@/components/ratings/AddGameRoleStepper.vue'
import civilianRoleIcon from '@/assets/icons/civilian.svg?url'
import mafiaRoleIcon from '@/assets/icons/mafia.svg?url'
import donRoleIcon from '@/assets/icons/don.svg?url'
import sheriffRoleIcon from '@/assets/icons/sheriff.svg?url'
import AppPageError from '@/components/common/AppPageError.vue'

const route = useRoute()
const router = useRouter()
const ratingsUi = useRatingsUiStore()
const { tableSearchQuery, gamesSearchQuery, detailTab, addGameOpen } = storeToRefs(ratingsUi)

const ratingId = computed(() => String(route.params.ratingId ?? ''))

const ratingDetail = ref<Rating | null>(null)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)

const tableRows = ref<RatingTableRow[]>([])
const tableLoading = ref(false)
const tableError = ref<string | null>(null)

const editOpen = ref(false)
const editSubmitting = ref(false)
const editError = ref<string | null>(null)
const editName = ref('')
const editDate = ref('')

const addPlayersOpen = ref(false)
const addPlayersLoading = ref(false)
const addPlayersSubmitting = ref(false)
const addPlayersError = ref<string | null>(null)
const addPlayersSearch = ref('')
const availableCards = ref<PlayerCard[]>([])
const selectedCardIds = ref<string[]>([])
const PLAYERS_PAGE_LIMIT = 100

const addGameSubmitting = ref(false)
const addGameError = ref<string | null>(null)
const addGameTitle = ref('')
const addGameDate = ref('')
const addGameWinner = ref<RatingWinnerSide>('red')
const ADD_GAME_SEATS = 10
const ADD_GAME_REQUIRED_ROLE_COUNTS: Record<RatingGameRole, number> = {
  peaceful: 6,
  mafia: 2,
  don: 1,
  sheriff: 1,
}

type AddGameSeatRow = {
  seat: number
  player_card_id: string
  role: RatingGameRole
  bonus_points: string
  total_points: string
}

const addGameRows = ref<AddGameSeatRow[]>([])

const deleting = ref(false)

const gamesItems = ref<RatingGameListItem[]>([])
const gamesTotal = ref(0)
const gamesLoading = ref(false)
const gamesError = ref<string | null>(null)
const gamesPage = ref(0)
const GAMES_PAGE_SIZE = 20

const gameDetailOpen = ref(false)
const gameDetailLoading = ref(false)
const gameDetailError = ref<string | null>(null)
const gameDetail = ref<RatingGame | null>(null)

const addGameRoleOptions: AddGameRoleOption[] = [
  { value: 'peaceful', label: 'Мирный', icon: civilianRoleIcon, toneClass: 'add-game-role-stepper__icon--peaceful' },
  { value: 'mafia', label: 'Мафия', icon: mafiaRoleIcon, toneClass: 'add-game-role-stepper__icon--mafia' },
  { value: 'don', label: 'Дон', icon: donRoleIcon, toneClass: 'add-game-role-stepper__icon--don' },
  { value: 'sheriff', label: 'Шериф', icon: sheriffRoleIcon, toneClass: 'add-game-role-stepper__icon--sheriff' },
]

const winnerSideOptions: { value: RatingWinnerSide; label: string }[] = [
  { value: 'red', label: 'Мирные' },
  { value: 'black', label: 'Мафия' },
]

function formatDate(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function winnerLabel(side: RatingWinnerSide): string {
  return side === 'red' ? 'Мирные' : 'Мафия'
}

function gameSourceLabel(source: RatingGameSource): string {
  return source === 'lobby_sync' ? 'Из лобби' : 'Вручную'
}

function roleLabel(role: RatingGameRole): string {
  return addGameRoleOptions.find((opt) => opt.value === role)?.label ?? role
}

function roleBadgeClass(role: RatingGameRole): string {
  return `ratings-modal__game-role-badge ratings-modal__game-role-badge--${role}`
}

function gameDisplayTitle(item: { title: string; played_at: string }): string {
  const title = item.title.trim()
  if (title) return title
  return `Игра ${formatDate(item.played_at)}`
}

function formatBestMove(values: string[] | undefined): string {
  if (!values?.length) return '—'
  const filled = values.map((value) => value.trim()).filter(Boolean)
  return filled.length ? filled.join(' · ') : '—'
}

function gameResultFullName(result: RatingGameResult): string {
  return [result.first_name, result.last_name].filter(Boolean).join(' ')
}

function toDateInputValue(value: string): string {
  return value ? value.slice(0, 10) : ''
}

function num(v: number): string {
  return Number(v).toFixed(1).replace(/\.0$/, '')
}

function numBonusPlus(v: number): string {
  return v > 0 ? num(v) : '0'
}

function bonusMinusMagnitude(row: Pick<RatingTableRow, 'bonus_points_plus_sum' | 'bonus_points_minus_sum' | 'bonus_points_sum'>): number {
  const direct = Math.abs(row.bonus_points_minus_sum)
  if (direct > 0) return direct
  const derived = row.bonus_points_plus_sum - row.bonus_points_sum
  return derived > 0 ? Math.round(derived * 10) / 10 : 0
}

function numBonusMinus(row: Pick<RatingTableRow, 'bonus_points_plus_sum' | 'bonus_points_minus_sum' | 'bonus_points_sum'>): string {
  const magnitude = bonusMinusMagnitude(row)
  return magnitude > 0 ? num(magnitude) : '0'
}

type RoleBonusKey = 'peaceful' | 'mafia' | 'don' | 'sheriff'

function roleGames(row: RatingTableRow, role: RoleBonusKey): number {
  if (role === 'peaceful') return row.games_peaceful
  if (role === 'mafia') return row.games_mafia
  if (role === 'don') return row.games_don
  return row.games_sheriff
}

function roleBonusPlus(row: RatingTableRow, role: RoleBonusKey): number {
  if (role === 'peaceful') return row.bonus_peaceful_plus_sum
  if (role === 'mafia') return row.bonus_mafia_plus_sum
  if (role === 'don') return row.bonus_don_plus_sum
  return row.bonus_sheriff_plus_sum
}

function roleBonusMinus(row: RatingTableRow, role: RoleBonusKey): number {
  if (role === 'peaceful') return row.bonus_peaceful_minus_sum
  if (role === 'mafia') return row.bonus_mafia_minus_sum
  if (role === 'don') return row.bonus_don_minus_sum
  return row.bonus_sheriff_minus_sum
}

const roleBestLabels: Record<RoleBonusKey, string> = {
  peaceful: 'Лучший мирный',
  mafia: 'Лучший мафия',
  don: 'Лучший дон',
  sheriff: 'Лучший шериф',
}

const roleBestDisplayOrder: RoleBonusKey[] = ['peaceful', 'don', 'sheriff', 'mafia']

function roleIsBest(row: RatingTableRow, role: RoleBonusKey): boolean {
  if (role === 'peaceful') return row.is_best_peaceful
  if (role === 'mafia') return row.is_best_mafia
  if (role === 'don') return row.is_best_don
  return row.is_best_sheriff
}

const ratingBestByRole = computed(() =>
  roleBestDisplayOrder.map((role) => ({
    role,
    row: tableRows.value.find((entry) => roleIsBest(entry, role)) ?? null,
  })),
)

function roleAvgPoints(row: RatingTableRow, role: RoleBonusKey): number {
  if (role === 'peaceful') return row.avg_points_peaceful
  if (role === 'mafia') return row.avg_points_mafia
  if (role === 'don') return row.avg_points_don
  return row.avg_points_sheriff
}

const bestMoveHitSlots: { hits: 0 | 1 | 2 | 3; label: string }[] = [
  { hits: 0, label: '0/3' },
  { hits: 1, label: '1/3' },
  { hits: 2, label: '2/3' },
  { hits: 3, label: '3/3' },
]

function bestMoveHitCount(row: RatingTableRow, hits: 0 | 1 | 2 | 3): number {
  if (hits === 0) return row.best_move_count_0
  if (hits === 1) return row.best_move_count_1
  if (hits === 2) return row.best_move_count_2
  return row.best_move_count_3
}

function numBestMoveSum(v: number): string {
  return v > 0 ? num(v) : '0'
}

function rowPhoto(row: RatingTableRow): string {
  return row.photo_url?.trim() ?? ''
}

function rowInitials(row: RatingTableRow): string {
  const fromName = `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`.trim()
  if (fromName) return fromName.toUpperCase()
  return (row.nickname?.[0] || '?').toUpperCase()
}

function cardPhoto(card: PlayerCard): string {
  const u = card.photo_urls?.[0]
  return typeof u === 'string' && u.trim() ? u.trim() : ''
}

function cardFullName(card: PlayerCard): string {
  return [card.first_name, card.last_name].filter(Boolean).join(' ')
}

function cardInitials(card: PlayerCard): string {
  const fromName = `${card.first_name?.[0] || ''}${card.last_name?.[0] || ''}`.trim()
  if (fromName) return fromName.toUpperCase()
  return (card.nickname?.[0] || '?').toUpperCase()
}

const filteredTableRows = computed(() => {
  const q = tableSearchQuery.value.trim().toLowerCase()
  if (!q) return tableRows.value
  return tableRows.value.filter((row) =>
    [row.nickname, row.first_name, row.last_name, row.club ?? '']
      .join(' ')
      .toLowerCase()
      .includes(q),
  )
})

const tableDisplaySlots = computed(() =>
  filteredTableRows.value.map((row, index) => ({
    row,
    rank: index + 1,
  })),
)

const gamesPageCount = computed(() => Math.max(1, Math.ceil(gamesTotal.value / GAMES_PAGE_SIZE)))

const gamesPageFrom = computed(() => (gamesTotal.value ? gamesPage.value * GAMES_PAGE_SIZE + 1 : 0))

const gamesPageTo = computed(() => Math.min(gamesTotal.value, (gamesPage.value + 1) * GAMES_PAGE_SIZE))

const filteredAvailableCards = computed(() => {
  const q = addPlayersSearch.value.trim().toLowerCase()
  const currentIds = new Set((ratingDetail.value?.participants ?? []).map((p) => p.player_card_id))
  const base = availableCards.value.filter((card) => !currentIds.has(card.id))
  if (!q) return base
  return base.filter((card) =>
    [card.nickname, card.first_name, card.last_name, card.club ?? '']
      .join(' ')
      .toLowerCase()
      .includes(q),
  )
})

const addPlayersEmptyMessage = computed(() => {
  if (addPlayersLoading.value || addPlayersError.value) return ''
  const currentIds = new Set((ratingDetail.value?.participants ?? []).map((p) => p.player_card_id))
  if (!availableCards.value.length) return 'У вас пока нет карточек в разделе «Мои игроки».'
  const notAddedCount = availableCards.value.filter((card) => !currentIds.has(card.id)).length
  if (!notAddedCount) return 'Все ваши карточки уже добавлены в этот рейтинг.'
  if (!filteredAvailableCards.value.length) return 'По этому запросу игроки не найдены.'
  return ''
})

async function loadAllOwnerCards(ownerUserId: string): Promise<PlayerCard[]> {
  const all: PlayerCard[] = []
  let offset = 0
  while (true) {
    const chunk = await listPlayerCards(ownerUserId, {
      sort_by: 'nickname',
      sort_order: 'asc',
      limit: PLAYERS_PAGE_LIMIT,
      offset,
    })
    all.push(...chunk)
    if (chunk.length < PLAYERS_PAGE_LIMIT) break
    offset += PLAYERS_PAGE_LIMIT
    if (offset > 5000) break
  }
  return all
}

async function mergeRowPhotos(ownerUserId: string, rows: RatingTableRow[]): Promise<RatingTableRow[]> {
  if (!rows.length || !ownerUserId) return rows
  try {
    const cards = await loadAllOwnerCards(ownerUserId)
    const photoByCardId = new Map(
      cards.map((card) => [card.id, card.photo_urls?.[0]?.trim() || null] as const),
    )
    return rows.map((row) => ({
      ...row,
      photo_url: photoByCardId.get(row.player_card_id) ?? row.photo_url,
    }))
  } catch {
    return rows
  }
}

async function refreshRowPhotos() {
  const detail = ratingDetail.value
  if (!detail?.owner_user_id || !tableRows.value.length) return
  tableRows.value = await mergeRowPhotos(detail.owner_user_id, tableRows.value)
}

async function loadGames() {
  const id = ratingId.value
  if (!id) return

  gamesLoading.value = true
  gamesError.value = null
  try {
    const payload = await listRatingGames(id, {
      limit: GAMES_PAGE_SIZE,
      offset: gamesPage.value * GAMES_PAGE_SIZE,
      sort: '-played_at',
      q: gamesSearchQuery.value.trim(),
    })
    gamesItems.value = payload.items
    gamesTotal.value = payload.total
  } catch (e) {
    gamesError.value = e instanceof Error ? e.message : 'Не удалось загрузить список игр'
    gamesItems.value = []
    gamesTotal.value = 0
  } finally {
    gamesLoading.value = false
  }
}

async function openGameDetail(gameId: string) {
  if (!ratingId.value || gameDetailLoading.value) return
  gameDetailOpen.value = true
  gameDetailLoading.value = true
  gameDetailError.value = null
  gameDetail.value = null
  try {
    gameDetail.value = await getRatingGame(ratingId.value, gameId)
  } catch (e) {
    gameDetailError.value = e instanceof Error ? e.message : 'Не удалось загрузить игру'
  } finally {
    gameDetailLoading.value = false
  }
}

function closeGameDetail() {
  if (gameDetailLoading.value) return
  gameDetailOpen.value = false
  gameDetail.value = null
  gameDetailError.value = null
}

async function loadRating() {
  const id = ratingId.value
  if (!id) return

  detailLoading.value = true
  tableLoading.value = true
  detailError.value = null
  tableError.value = null

  try {
    const [detail, table] = await Promise.all([getRating(id), getRatingTable(id)])
    ratingDetail.value = detail
    tableRows.value = await mergeRowPhotos(detail.owner_user_id, table.rows)
    ratingsUi.setDetailTitle(detail.name)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Не удалось открыть рейтинг'
    detailError.value = message
    tableError.value = message
    ratingDetail.value = null
    tableRows.value = []
    ratingsUi.setDetailTitle('')
  } finally {
    detailLoading.value = false
    tableLoading.value = false
  }
}

function openEdit() {
  if (!ratingDetail.value) return
  editName.value = ratingDetail.value.name
  editDate.value = toDateInputValue(ratingDetail.value.event_date)
  editError.value = null
  editOpen.value = true
}

function closeEdit() {
  if (editSubmitting.value) return
  editOpen.value = false
}

async function submitEdit() {
  if (editSubmitting.value || !ratingId.value) return
  const name = editName.value.trim()
  const eventDate = editDate.value.trim()
  if (!name) return (editError.value = 'Введите название рейтинга')
  if (!eventDate) return (editError.value = 'Выберите дату')

  editSubmitting.value = true
  editError.value = null
  try {
    await patchRating(ratingId.value, { name, event_date: eventDate })
    editOpen.value = false
    await loadRating()
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Не удалось обновить рейтинг'
  } finally {
    editSubmitting.value = false
  }
}

async function removeRating() {
  if (deleting.value || !ratingDetail.value) return
  if (!window.confirm(`Удалить рейтинг «${ratingDetail.value.name}»?`)) return
  deleting.value = true
  try {
    await deleteRating(ratingId.value)
    await router.push({ name: 'ratings' })
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Не удалось удалить рейтинг')
  } finally {
    deleting.value = false
  }
}

async function openAddParticipants() {
  if (!ratingDetail.value) return
  addPlayersOpen.value = true
  addPlayersError.value = null
  addPlayersSearch.value = ''
  selectedCardIds.value = []
  addPlayersLoading.value = true
  try {
    availableCards.value = await loadAllOwnerCards(ratingDetail.value.owner_user_id)
  } catch (e) {
    addPlayersError.value = e instanceof Error ? e.message : 'Не удалось загрузить список игроков'
    availableCards.value = []
  } finally {
    addPlayersLoading.value = false
  }
}

function closeAddParticipants() {
  if (addPlayersSubmitting.value) return
  addPlayersOpen.value = false
}

function toggleCardSelection(cardId: string) {
  if (selectedCardIds.value.includes(cardId)) {
    selectedCardIds.value = selectedCardIds.value.filter((id) => id !== cardId)
    return
  }
  selectedCardIds.value = [...selectedCardIds.value, cardId]
}

async function submitAddParticipants() {
  if (!ratingId.value || addPlayersSubmitting.value) return
  if (!selectedCardIds.value.length) {
    addPlayersError.value = 'Выберите хотя бы одного игрока'
    return
  }
  addPlayersSubmitting.value = true
  addPlayersError.value = null
  try {
    await addRatingParticipants(ratingId.value, { player_card_ids: selectedCardIds.value })
    addPlayersOpen.value = false
    await loadRating()
  } catch (e) {
    addPlayersError.value = e instanceof Error ? e.message : 'Не удалось добавить игроков'
  } finally {
    addPlayersSubmitting.value = false
  }
}

function addGamePlayerOptionsForSeat(seatIndex: number): AddGamePlayerSelectOption[] {
  const currentId = addGameRows.value[seatIndex]?.player_card_id ?? ''
  const taken = new Set(
    addGameRows.value
      .map((row, index) => (index === seatIndex ? '' : row.player_card_id.trim()))
      .filter(Boolean),
  )
  const participants = ratingDetail.value?.participants ?? []
  const options: AddGamePlayerSelectOption[] = []
  for (const participant of participants) {
    const id = participant.player_card_id
    if (taken.has(id) && id !== currentId) continue
    options.push({
      value: id,
      label: participant.nickname,
      photoUrl: participantPhoto(id),
      initials: participantInitials(participant),
    })
  }
  return options
}

function participantPhoto(playerCardId: string): string {
  const tableRow = tableRows.value.find((row) => row.player_card_id === playerCardId)
  return tableRow?.photo_url?.trim() ?? ''
}

function participantInitials(participant: { nickname: string; first_name?: string; last_name?: string }): string {
  const fromName = `${participant.first_name?.[0] || ''}${participant.last_name?.[0] || ''}`.trim()
  if (fromName) return fromName.toUpperCase()
  return (participant.nickname?.[0] || '?').toUpperCase()
}

function scoreTeamPointByWinner(role: RatingGameRole, winnerSide: RatingWinnerSide): number {
  if (winnerSide === 'black') return role === 'mafia' || role === 'don' ? 1 : 0
  return role === 'peaceful' || role === 'sheriff' ? 1 : 0
}

function formatAddGameTotalValue(role: RatingGameRole, bonusRaw: string): string {
  const bonus = parsePoints(bonusRaw) ?? 0
  const team = scoreTeamPointByWinner(role, addGameWinner.value)
  return String(Math.round((team + bonus) * 10) / 10)
}

function syncAddGameRowTotal(row: AddGameSeatRow) {
  row.total_points = formatAddGameTotalValue(row.role, row.bonus_points)
}

function syncAllAddGameTotals() {
  for (const row of addGameRows.value) {
    if (!row.player_card_id.trim()) continue
    syncAddGameRowTotal(row)
  }
}

function onAddGameBonusInput(row: AddGameSeatRow) {
  syncAddGameRowTotal(row)
}

function onAddGameRoleChange(row: AddGameSeatRow) {
  syncAddGameRowTotal(row)
}

function onAddGamePlayerChange(row: AddGameSeatRow) {
  if (!row.player_card_id.trim()) {
    row.bonus_points = '0'
    row.total_points = '0'
    return
  }
  syncAddGameRowTotal(row)
}

function participantNickname(playerCardId: string): string {
  const participant = ratingDetail.value?.participants.find((p) => p.player_card_id === playerCardId)
  return participant?.nickname ?? 'игрока'
}

function validateAddGameSeats(): string | null {
  const participants = ratingDetail.value?.participants ?? []
  if (participants.length < ADD_GAME_SEATS) {
    return `В рейтинге должно быть минимум ${ADD_GAME_SEATS} игроков. Сейчас: ${participants.length}.`
  }

  const filled = addGameRows.value.filter((row) => row.player_card_id.trim())
  if (filled.length !== ADD_GAME_SEATS) {
    return `Заполните все ${ADD_GAME_SEATS} мест — выберите игрока в каждой строке.`
  }

  const ids = filled.map((row) => row.player_card_id)
  if (new Set(ids).size !== ids.length) {
    return 'Один игрок не может занимать два места за столом.'
  }

  const roleCounts: Record<RatingGameRole, number> = {
    peaceful: 0,
    mafia: 0,
    don: 0,
    sheriff: 0,
  }
  for (const row of filled) {
    roleCounts[row.role] += 1
  }

  const mismatches: string[] = []
  if (roleCounts.peaceful !== ADD_GAME_REQUIRED_ROLE_COUNTS.peaceful) {
    mismatches.push(`мирных ${roleCounts.peaceful}/${ADD_GAME_REQUIRED_ROLE_COUNTS.peaceful}`)
  }
  if (roleCounts.mafia !== ADD_GAME_REQUIRED_ROLE_COUNTS.mafia) {
    mismatches.push(`мафии ${roleCounts.mafia}/${ADD_GAME_REQUIRED_ROLE_COUNTS.mafia}`)
  }
  if (roleCounts.don !== ADD_GAME_REQUIRED_ROLE_COUNTS.don) {
    mismatches.push(`дона ${roleCounts.don}/${ADD_GAME_REQUIRED_ROLE_COUNTS.don}`)
  }
  if (roleCounts.sheriff !== ADD_GAME_REQUIRED_ROLE_COUNTS.sheriff) {
    mismatches.push(`шерифа ${roleCounts.sheriff}/${ADD_GAME_REQUIRED_ROLE_COUNTS.sheriff}`)
  }
  if (mismatches.length) {
    return `Неверный состав ролей: ${mismatches.join(', ')}.`
  }

  return null
}

const addGameValidationMessage = computed(() => validateAddGameSeats())

const addGameCanSubmit = computed(() => !addGameValidationMessage.value && !addGameSubmitting.value)

function openAddGame() {
  if (!ratingId.value) return
  void router.push({ name: 'rating-add-game', params: { ratingId: ratingId.value } })
}

function closeAddGame() {
  if (addGameSubmitting.value) return
  ratingsUi.setAddGameOpen(false)
}

function parsePoints(value: string): number | null {
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return null
  const n = Number(normalized)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 10) / 10
}

async function submitAddGame() {
  if (!ratingId.value || addGameSubmitting.value) return

  const validationError = validateAddGameSeats()
  if (validationError) {
    addGameError.value = validationError
    return
  }
  if (!addGameDate.value.trim()) {
    addGameError.value = 'Выберите дату игры'
    return
  }

  const results: RatingGameResultWrite[] = []
  for (const row of addGameRows.value) {
    const playerCardId = row.player_card_id.trim()
    if (!playerCardId) continue
    const bonus = parsePoints(row.bonus_points)
    const total = parsePoints(row.total_points)
    if (bonus === null || total === null) {
      addGameError.value = `Проверьте баллы у ${participantNickname(playerCardId)} (место ${row.seat})`
      return
    }
    results.push({
      player_card_id: playerCardId,
      role: row.role,
      bonus_points: bonus,
      total_points: total,
    })
  }

  if (results.length !== ADD_GAME_SEATS) {
    addGameError.value = `В игре должно быть ровно ${ADD_GAME_SEATS} игроков.`
    return
  }

  addGameSubmitting.value = true
  addGameError.value = null
  try {
    await createRatingGame(ratingId.value, {
      title: addGameTitle.value.trim(),
      played_at: addGameDate.value.trim(),
      winner_side: addGameWinner.value,
      results,
    })
    ratingsUi.setAddGameOpen(false)
    await loadRating()
    if (detailTab.value === 'games') {
      await loadGames()
    }
  } catch (e) {
    addGameError.value = e instanceof Error ? e.message : 'Не удалось добавить игру'
  } finally {
    addGameSubmitting.value = false
  }
}

watch(ratingId, () => {
  gamesPage.value = 0
  tableSearchQuery.value = ''
  gamesSearchQuery.value = ''
  ratingsUi.setDetailTab('table')
  void loadRating()
})

watch(detailTab, (tab) => {
  if (tab === 'games') {
    void loadGames()
  }
})

let gamesSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(gamesSearchQuery, () => {
  gamesPage.value = 0
  if (detailTab.value !== 'games') return
  if (gamesSearchTimer) clearTimeout(gamesSearchTimer)
  gamesSearchTimer = setTimeout(() => {
    void loadGames()
  }, 300)
})

watch(gamesPage, () => {
  if (detailTab.value === 'games') void loadGames()
})

watch(gamesPageCount, () => {
  if (gamesPage.value >= gamesPageCount.value) {
    gamesPage.value = Math.max(0, gamesPageCount.value - 1)
  }
})

watch(
  () => ratingDetail.value?.participants.length ?? 0,
  (count) => {
    ratingsUi.setCanAddGame(count >= ADD_GAME_SEATS)
  },
  { immediate: true },
)

watch(addGameWinner, () => {
  syncAllAddGameTotals()
})

watch(deleting, (value) => {
  ratingsUi.setDetailDeleting(value)
})

onMounted(() => {
  ratingsUi.setDetailActionHandlers({
    onAddPlayers: openAddParticipants,
    onAddGame: openAddGame,
    onEdit: openEdit,
    onDelete: removeRating,
  })
  document.addEventListener('visibilitychange', onPageVisible)
  void loadRating()
})

onUnmounted(() => {
  if (gamesSearchTimer) clearTimeout(gamesSearchTimer)
  document.removeEventListener('visibilitychange', onPageVisible)
  ratingsUi.resetDetailUi()
})

function onPageVisible() {
  if (document.visibilityState !== 'visible') return
  void refreshRowPhotos()
}
</script>

<template>
  <section
    class="dashboard dashboard--full ratings-detail"
    :class="{ 'ratings-detail--add-game': addGameOpen }"
  >
    <div v-if="addGameOpen" class="ratings-detail__add-game">
      <div class="ratings-add-game-panel">
        <div class="ratings-add-game-panel__split">
          <section class="ratings-add-game-panel__col ratings-add-game-panel__col--form">
            <div class="ratings-add-game-panel__col-body">
              <div class="ratings-add-game-panel__form-fields">
                <label class="ratings-add-game-panel__field ratings-add-game-panel__field--title">
                  <input
                    v-model="addGameTitle"
                    class="ratings-modal__add-game-input"
                    type="text"
                    maxlength="255"
                    placeholder="Название игры"
                    aria-label="Название игры"
                    :disabled="addGameSubmitting"
                  />
                </label>
                <label class="ratings-add-game-panel__field">
                  <input
                    v-model="addGameDate"
                    class="ratings-modal__add-game-input"
                    type="date"
                    aria-label="Дата игры"
                    :disabled="addGameSubmitting"
                  />
                </label>
              </div>

              <p
                v-if="addGameValidationMessage && !addGameError"
                class="ratings-modal__add-game-hint"
                :class="{ 'ratings-modal__add-game-hint--warn': !addGameCanSubmit }"
                role="status"
              >
                {{ addGameValidationMessage }}
              </p>
              <p v-if="addGameError" class="app-modal__banner" role="alert">{{ addGameError }}</p>
            </div>
          </section>

          <section class="ratings-add-game-panel__col ratings-add-game-panel__col--players">
            <div class="ratings-add-game-panel__table">
              <div class="ratings-modal__add-game-rows ratings-modal__add-game-rows--page">
                <div
                  v-for="(row, seatIndex) in addGameRows"
                  :key="row.seat"
                  class="ratings-modal__add-game-player"
                >
                  <span class="ratings-modal__add-game-seat">{{ row.seat }}</span>
                  <div class="ratings-modal__add-game-stat ratings-modal__add-game-stat--player">
                    <AddGamePlayerSelect
                      v-model="row.player_card_id"
                      :options="addGamePlayerOptionsForSeat(seatIndex)"
                      :aria-label="`Игрок на месте ${row.seat}`"
                      :disabled="addGameSubmitting"
                      @update:model-value="onAddGamePlayerChange(row)"
                    />
                  </div>
                  <div class="ratings-modal__add-game-stat ratings-modal__add-game-stat--role">
                    <AddGameRoleStepper
                      v-model="row.role"
                      :options="addGameRoleOptions"
                      :aria-label="`Роль на месте ${row.seat}`"
                      :disabled="addGameSubmitting || !row.player_card_id"
                      @update:model-value="onAddGameRoleChange(row)"
                    />
                  </div>
                  <div class="ratings-modal__add-game-stat ratings-modal__add-game-stat--bonus">
                    <input
                      v-model="row.bonus_points"
                      class="ratings-modal__add-game-stat-input"
                      type="text"
                      inputmode="decimal"
                      placeholder="0"
                      :aria-label="`Бонус, место ${row.seat}`"
                      :disabled="addGameSubmitting || !row.player_card_id"
                      @input="onAddGameBonusInput(row)"
                    />
                  </div>
                  <div class="ratings-modal__add-game-stat ratings-modal__add-game-stat--total">
                    <input
                      :value="row.total_points"
                      class="ratings-modal__add-game-stat-input ratings-modal__add-game-stat-input--readonly"
                      type="text"
                      readonly
                      tabindex="-1"
                      :aria-label="`Итог, место ${row.seat}`"
                    />
                  </div>
                </div>
              </div>

              <div class="ratings-modal__add-game-bottom">
                <p class="ratings-modal__add-game-note" role="note">
                  <span class="ratings-modal__add-game-note-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75" />
                      <path d="M12 8v5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                      <circle cx="12" cy="16.25" r="1" fill="currentColor" />
                    </svg>
                  </span>
                  За столом 10 мест: 6 мирных, 2 мафии, 1 дон, 1 шериф. Выберите игрока в каждой строке.
                </p>
                <div class="ratings-modal__add-game-winner">
                  <span class="ratings-modal__add-game-winner-label">Победитель</span>
                  <div
                    class="segmented-filter segmented-filter--inline segmented-filter--compact ratings-modal__add-game-winner-toggle"
                    role="group"
                    aria-label="Победитель"
                  >
                    <button
                      v-for="opt in winnerSideOptions"
                      :key="opt.value"
                      type="button"
                      class="segmented-filter__btn"
                      :class="{ 'segmented-filter__btn--active': addGameWinner === opt.value }"
                      :aria-pressed="addGameWinner === opt.value"
                      :disabled="addGameSubmitting"
                      @click="addGameWinner = opt.value"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="ratings-add-game-panel__footer">
          <div class="ratings-add-game-panel__footer-actions">
            <button type="button" class="app-modal__btn-secondary" :disabled="addGameSubmitting" @click="closeAddGame">
              Закрыть
            </button>
            <button type="button" class="app-modal__btn-primary" :disabled="!addGameCanSubmit" @click="submitAddGame">
              {{ addGameSubmitting ? 'Сохранение…' : 'Сохранить игру' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="ratings-page">
      <div v-if="detailLoading || tableLoading" class="ratings-page__status">
        <p class="dashboard__text">Загружаем таблицу…</p>
      </div>
      <div v-else-if="detailError || tableError" class="ratings-page__status ratings-page__page-error">
        <AppPageError
          compact
          :message="detailError || tableError || ''"
          @retry="loadRating"
        />
      </div>
      <template v-else>
        <div v-if="detailTab === 'table' && tableRows.length" class="ratings-page__table-section">
        <div
          v-if="filteredTableRows.length"
          class="ratings-table-wrap ratings-table-wrap--scroll"
        >
          <table class="ratings-table ratings-table--scroll">
            <colgroup>
              <col class="ratings-table__col-rank" />
              <col class="ratings-table__col-player" />
              <col class="ratings-table__col-total" />
              <col class="ratings-table__col-bonus" />
              <col class="ratings-table__col-bonus" />
              <col class="ratings-table__col-num" />
              <col class="ratings-table__col-num" />
              <col class="ratings-table__col-lh" />
              <col class="ratings-table__col-role" />
              <col class="ratings-table__col-role" />
              <col class="ratings-table__col-role" />
              <col class="ratings-table__col-role" />
            </colgroup>
            <thead>
              <tr>
                <th class="ratings-table__rank">#</th>
                <th class="ratings-table__player-head">
                  <span class="ratings-table__player-head-full">Игрок</span>
                  <span class="ratings-table__player-head-short">Ник</span>
                </th>
                <th class="ratings-table__total-head">Итог</th>
                <th class="ratings-table__bonus-head" title="Сумма положительных доп. баллов">Сумма +</th>
                <th class="ratings-table__bonus-head" title="Сумма отрицательных доп. баллов">Сумма −</th>
                <th class="ratings-table__num">Побед</th>
                <th class="ratings-table__num">Игр</th>
                <th class="ratings-table__lh-head" title="Лучший ход">ЛХ</th>
                <th class="ratings-table__role-head" title="Мирный">Мир</th>
                <th class="ratings-table__role-head" title="Мафия">Маф</th>
                <th class="ratings-table__role-head" title="Дон">Дон</th>
                <th class="ratings-table__role-head" title="Шериф">Шер</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="slot in tableDisplaySlots"
                :key="slot.row.player_card_id"
              >
                  <td class="ratings-table__rank">{{ slot.rank }}</td>
                  <td class="ratings-table__player-col">
                    <div class="ratings-table__player">
                      <span class="ratings-table__avatar" aria-hidden="true">
                        <img
                          v-if="rowPhoto(slot.row)"
                          :src="rowPhoto(slot.row)"
                          alt=""
                          class="ratings-table__avatar-img"
                        />
                        <span v-else class="ratings-table__avatar-ph">{{ rowInitials(slot.row) }}</span>
                      </span>
                      <span class="ratings-table__nick">{{ slot.row.nickname }}</span>
                    </div>
                  </td>
                  <td class="ratings-table__total">{{ num(slot.row.total_points_sum) }}</td>
                  <td class="ratings-table__bonus-plus">
                    <span v-if="slot.row.bonus_points_plus_sum > 0" class="ratings-table__bonus-sign">+</span>{{ numBonusPlus(slot.row.bonus_points_plus_sum) }}
                  </td>
                  <td class="ratings-table__bonus-minus">
                    <span v-if="bonusMinusMagnitude(slot.row) > 0" class="ratings-table__bonus-sign">−</span>{{ numBonusMinus(slot.row) }}
                  </td>
                  <td class="ratings-table__num">{{ slot.row.wins_total }}</td>
                  <td class="ratings-table__num">{{ slot.row.games_total }}</td>
                  <td class="ratings-table__lh-cell">
                    <div class="ratings-table__lh-stat">
                      <div class="ratings-table__lh-sum" title="Кол-во ЛХ">
                        <span class="ratings-table__lh-hit-label">ПУ</span>
                        <span class="ratings-table__lh-hit-value">
                          {{ numBestMoveSum(slot.row.best_move_sum) }}
                        </span>
                      </div>
                      <div
                        v-for="slotHit in bestMoveHitSlots"
                        :key="slotHit.hits"
                        class="ratings-table__lh-hit"
                        :title="`${slotHit.label} — количество`"
                      >
                        <span class="ratings-table__lh-hit-label">{{ slotHit.label }}</span>
                        <span class="ratings-table__lh-hit-value">
                          {{ bestMoveHitCount(slot.row, slotHit.hits) }}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td v-for="role in (['peaceful', 'mafia', 'don', 'sheriff'] as RoleBonusKey[])" :key="role" class="ratings-table__role-cell">
                    <div class="ratings-table__role-stat">
                      <div class="ratings-table__role-games">
                        <span class="ratings-table__role-games-count">{{ roleGames(slot.row, role) }}</span>
                        <span
                          v-if="roleGames(slot.row, role) > 0"
                          class="ratings-table__role-avg"
                          :title="`Средний балл за роль (${roleBestLabels[role].replace('Лучший ', '')})`"
                        >
                          ø {{ num(roleAvgPoints(slot.row, role)) }}
                        </span>
                      </div>
                      <div class="ratings-table__role-bonus-plus">
                        <span class="ratings-table__role-sign">+</span><span class="ratings-table__role-value ratings-table__role-value--plus">{{ numBonusPlus(roleBonusPlus(slot.row, role)) }}</span>
                      </div>
                      <div class="ratings-table__role-bonus-minus">
                        <span class="ratings-table__role-sign">-</span><span class="ratings-table__role-value ratings-table__role-value--minus">{{ numBonusPlus(roleBonusMinus(slot.row, role)) }}</span>
                      </div>
                    </div>
                  </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="ratings-page__empty">По этому запросу игроки не найдены.</p>

        <section class="ratings-best-awards" aria-label="Лучшие по ролям">
          <div class="ratings-best-awards__list">
            <article
              v-for="item in ratingBestByRole"
              :key="item.role"
              class="ratings-best-awards__card"
              :class="[
                `ratings-best-awards__card--${item.role}`,
                { 'ratings-best-awards__card--empty': !item.row },
              ]"
            >
              <span class="ratings-best-awards__role">{{ roleBestLabels[item.role] }}</span>
              <div v-if="item.row" class="ratings-best-awards__player">
                <span class="ratings-best-awards__avatar" aria-hidden="true">
                  <img
                    v-if="rowPhoto(item.row)"
                    :src="rowPhoto(item.row)"
                    alt=""
                    class="ratings-best-awards__avatar-img"
                  />
                  <span v-else class="ratings-best-awards__avatar-ph">{{ rowInitials(item.row) }}</span>
                </span>
                <span class="ratings-best-awards__nick">{{ item.row.nickname }}</span>
              </div>
              <p v-else class="ratings-best-awards__empty">Пока не определён</p>
            </article>
          </div>
        </section>
      </div>
        <p v-else-if="detailTab === 'table'" class="ratings-page__empty">Пока нет игр — таблица появится после добавления игр.</p>

        <div v-else-if="detailTab === 'games'" class="ratings-page__games-section">
          <div v-if="gamesLoading" class="ratings-page__status">
            <p class="dashboard__text">Загружаем игры…</p>
          </div>
          <div v-else-if="gamesError" class="ratings-page__status ratings-page__page-error">
            <AppPageError compact inline :message="gamesError" @retry="loadGames" />
          </div>
          <ul v-else-if="gamesItems.length" class="ratings-games-list">
            <li v-for="game in gamesItems" :key="game.id" class="ratings-games-list__item">
              <button
                type="button"
                class="ratings-games-list__btn"
                @click="openGameDetail(game.id)"
              >
                <span class="ratings-games-list__main">
                  <span class="ratings-games-list__title">{{ gameDisplayTitle(game) }}</span>
                  <span class="ratings-games-list__meta">
                    <span>{{ formatDate(game.played_at) }}</span>
                    <span class="ratings-games-list__dot" aria-hidden="true">·</span>
                    <span>{{ game.players_count }} игроков</span>
                    <span class="ratings-games-list__dot" aria-hidden="true">·</span>
                    <span>{{ gameSourceLabel(game.source) }}</span>
                  </span>
                </span>
                <span
                  class="ratings-games-list__winner"
                  :class="{
                    'ratings-games-list__winner--red': game.winner_side === 'red',
                    'ratings-games-list__winner--black': game.winner_side === 'black',
                  }"
                >
                  {{ winnerLabel(game.winner_side) }}
                </span>
                <span class="ratings-games-list__chevron" aria-hidden="true">›</span>
              </button>
            </li>
          </ul>
          <p v-else class="ratings-page__empty">
            {{ gamesSearchQuery.trim() ? 'По этому запросу игры не найдены.' : 'Пока нет игр. Добавьте первую через «Добавить игру».' }}
          </p>
        </div>
      </template>

      <footer
        v-if="!detailLoading && !tableLoading && !detailError && !tableError && detailTab === 'games' && gamesTotal > GAMES_PAGE_SIZE"
        class="ratings-page__foot"
      >
        <div class="ratings-page__foot-left">
          <p class="ratings-page__page-info">
            {{ gamesPageFrom }}–{{ gamesPageTo }} из {{ gamesTotal }} · Страница {{ gamesPage + 1 }} из
            {{ gamesPageCount }}
          </p>
        </div>
        <nav class="ratings-page__foot-nav" aria-label="Страницы списка игр">
          <button
            type="button"
            class="ratings-page__page-btn"
            :disabled="gamesPage === 0 || gamesLoading"
            @click="gamesPage -= 1"
          >
            Назад
          </button>
          <button
            type="button"
            class="ratings-page__page-btn"
            :disabled="gamesPage + 1 >= gamesPageCount || gamesLoading"
            @click="gamesPage += 1"
          >
            Вперёд
          </button>
        </nav>
      </footer>
    </div>

    <Teleport to="body">
      <Transition name="app-modal">
        <div v-if="editOpen" class="app-modal" role="presentation">
          <div class="app-modal__backdrop" aria-hidden="true" @click.self="closeEdit" />
          <div class="app-modal__wrap" role="dialog" aria-modal="true" aria-labelledby="rating-edit-title">
            <div class="app-modal__panel">
              <div class="app-modal__head">
                <h3 id="rating-edit-title" class="app-modal__title">Редактировать рейтинг</h3>
                <button type="button" class="app-modal__close" :disabled="editSubmitting" @click="closeEdit">×</button>
              </div>
              <form class="app-modal__body app-modal__body--tight" @submit.prevent="submitEdit">
                <div class="app-modal__form">
                  <label class="app-modal__field">
                    <span class="app-modal__label">Название</span>
                    <input v-model="editName" class="app-modal__input" type="text" maxlength="200" />
                  </label>
                  <label class="app-modal__field">
                    <span class="app-modal__label">Дата</span>
                    <input v-model="editDate" class="app-modal__input" type="date" />
                  </label>
                  <p v-if="editError" class="app-modal__banner" role="alert">{{ editError }}</p>
                </div>
                <div class="app-modal__actions app-modal__actions--end">
                  <button type="button" class="app-modal__btn-secondary" :disabled="editSubmitting" @click="closeEdit">Отмена</button>
                  <button type="submit" class="app-modal__btn-primary" :disabled="editSubmitting">
                    {{ editSubmitting ? 'Сохранение…' : 'Сохранить' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="app-modal">
        <div v-if="addPlayersOpen" class="app-modal" role="presentation">
          <div class="app-modal__backdrop" aria-hidden="true" @click.self="closeAddParticipants" />
          <div class="app-modal__wrap ratings-modal__wrap--players" role="dialog" aria-modal="true" aria-labelledby="rating-add-players-title">
            <div class="app-modal__panel ratings-modal__panel--players">
              <div class="app-modal__head">
                <h3 id="rating-add-players-title" class="app-modal__title">Добавить игроков</h3>
                <button type="button" class="app-modal__close" :disabled="addPlayersSubmitting" @click="closeAddParticipants">×</button>
              </div>
              <div class="app-modal__body app-modal__body--tight ratings-modal__players-body">
                <div class="ratings-modal__players-picker">
                  <input
                    v-model="addPlayersSearch"
                    class="app-modal__input ratings-modal__players-search"
                    type="search"
                    placeholder="Поиск: ник, имя, клуб"
                    autocomplete="off"
                    aria-label="Поиск игрока"
                    :disabled="addPlayersSubmitting"
                  />
                  <p v-if="addPlayersLoading" class="app-modal__status">Загружаем игроков…</p>
                  <div
                    v-else-if="filteredAvailableCards.length"
                    class="ratings-modal__players-list"
                    role="listbox"
                    aria-multiselectable="true"
                    aria-label="Игроки для добавления"
                  >
                    <button
                      v-for="card in filteredAvailableCards"
                      :key="card.id"
                      type="button"
                      role="option"
                      class="ratings-modal__player-item"
                      :class="{ 'ratings-modal__player-item--selected': selectedCardIds.includes(card.id) }"
                      :aria-selected="selectedCardIds.includes(card.id)"
                      :disabled="addPlayersSubmitting"
                      @click="toggleCardSelection(card.id)"
                    >
                      <img
                        v-if="cardPhoto(card)"
                        :src="cardPhoto(card)"
                        alt=""
                        class="ratings-modal__player-photo"
                        loading="lazy"
                        decoding="async"
                      />
                      <span v-else class="ratings-modal__player-initials" aria-hidden="true">{{ cardInitials(card) }}</span>
                      <span class="ratings-modal__player-text">
                        <span class="ratings-modal__player-nick">{{ card.nickname }}</span>
                        <span v-if="cardFullName(card)" class="ratings-modal__player-name">{{ cardFullName(card) }}</span>
                      </span>
                    </button>
                  </div>
                  <p v-else-if="addPlayersEmptyMessage" class="app-modal__status">{{ addPlayersEmptyMessage }}</p>
                </div>
                <p v-if="addPlayersError" class="app-modal__banner" role="alert">{{ addPlayersError }}</p>
              </div>
              <div class="app-modal__footer ratings-modal__players-footer">
                <p v-if="selectedCardIds.length" class="ratings-modal__players-selected-count">
                  Выбрано: {{ selectedCardIds.length }}
                </p>
                <div class="app-modal__actions app-modal__actions--end">
                  <button type="button" class="app-modal__btn-secondary" :disabled="addPlayersSubmitting" @click="closeAddParticipants">Отмена</button>
                  <button type="button" class="app-modal__btn-primary" :disabled="addPlayersSubmitting" @click="submitAddParticipants">
                    {{ addPlayersSubmitting ? 'Добавление…' : 'Добавить' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="app-modal">
        <div v-if="gameDetailOpen" class="app-modal app-modal--game-detail" role="presentation">
          <div class="app-modal__backdrop" aria-hidden="true" @click.self="closeGameDetail" />
          <div
            class="app-modal__wrap ratings-modal__wrap--game-detail"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rating-game-detail-title"
          >
            <div class="app-modal__panel ratings-modal__panel--game-detail">
              <div class="app-modal__head ratings-modal__game-detail-head">
                <div class="ratings-modal__game-detail-head-main">
                  <h3 id="rating-game-detail-title" class="app-modal__title">
                    {{ gameDetail ? gameDisplayTitle(gameDetail) : 'Игра' }}
                  </h3>
                  <p v-if="gameDetail && !gameDetailLoading && !gameDetailError" class="ratings-modal__game-detail-meta">
                    <span>{{ formatDate(gameDetail.played_at) }}</span>
                    <span class="ratings-games-list__dot" aria-hidden="true">·</span>
                    <span>{{ gameDetail.results.length }} игроков</span>
                    <span class="ratings-games-list__dot" aria-hidden="true">·</span>
                    <span>{{ gameSourceLabel(gameDetail.source ?? 'manual') }}</span>
                  </p>
                </div>
                <button type="button" class="app-modal__close" :disabled="gameDetailLoading" @click="closeGameDetail">×</button>
              </div>
              <div class="app-modal__body ratings-modal__game-detail-body">
                <div v-if="gameDetailLoading" class="ratings-modal__game-detail-status">
                  <p class="dashboard__text">Загружаем игру…</p>
                </div>
                <div v-else-if="gameDetailError" class="ratings-modal__game-detail-status">
                  <p class="app-modal__banner" role="alert">{{ gameDetailError }}</p>
                </div>
                <template v-else-if="gameDetail">
                  <div class="ratings-modal__game-detail-top">
                    <span
                      class="ratings-games-list__winner ratings-games-list__winner--large"
                      :class="{
                        'ratings-games-list__winner--red': gameDetail.winner_side === 'red',
                        'ratings-games-list__winner--black': gameDetail.winner_side === 'black',
                      }"
                    >
                      Победа: {{ winnerLabel(gameDetail.winner_side) }}
                    </span>
                  </div>
                  <div class="ratings-modal__game-rows ratings-modal__game-rows--detail">
                    <div class="ratings-modal__game-row ratings-modal__game-row--head">
                      <span>Игрок</span>
                      <span>Роль</span>
                      <span>Доп.</span>
                      <span>Итог</span>
                      <span>ЛХ</span>
                    </div>
                    <div
                      v-for="row in gameDetail.results"
                      :key="row.player_card_id"
                      class="ratings-modal__game-row ratings-modal__game-row--detail"
                    >
                      <span class="ratings-modal__game-player">
                        <span class="ratings-modal__game-player-nick">{{ row.nickname }}</span>
                        <span v-if="gameResultFullName(row)" class="ratings-modal__game-player-name">
                          {{ gameResultFullName(row) }}
                        </span>
                      </span>
                      <span :class="roleBadgeClass(row.role)">{{ roleLabel(row.role) }}</span>
                      <span class="ratings-modal__game-points">{{ num(row.bonus_points) }}</span>
                      <span class="ratings-modal__game-points ratings-modal__game-points--total">{{ num(row.total_points) }}</span>
                      <span class="ratings-modal__game-best-move">{{ formatBestMove(row.best_move) }}</span>
                    </div>
                  </div>
                </template>
              </div>
              <div class="app-modal__actions app-modal__actions--end ratings-modal__game-detail-actions">
                <button type="button" class="app-modal__btn-secondary" :disabled="gameDetailLoading" @click="closeGameDetail">
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped src="@/styles/dashboard-lobby-card.css"></style>
<style scoped src="@/styles/ratings-page.css"></style>
