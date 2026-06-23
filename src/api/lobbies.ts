import { ApiError, apiFetch, apiFetchJson } from './client'
import { me } from './auth'
import type { PhotoLayouts } from './playerCards'
import { normalizePhotoCrop, normalizePhotoLayouts, type PhotoCrop } from '@/utils/photoCrop'

export type LobbyPlayer = {
  membership_id: string
  player_card_id: string
  user_id: string
  username: string
  nickname: string
  /** Выбранное фото только для лобби; если нет - смотри photo_urls карточки. */
  lobby_photo_url?: string | null
  photo_urls: string[]
  /** Кадрирование по URL (с карточки; бэкенд должен прокидывать в игрока лобби). */
  photo_layouts?: PhotoLayouts | null
  /** Кадр для lobby_photo_url, если отличается от photo_layouts. */
  display_photo_layout?: PhotoCrop | null
  game_role: string | null
  status?: string | null
  joined_at: string
}

export type GameLobby = {
  id: string
  max_players: number
  host_user_id: string | null
  created_at: string
  players: LobbyPlayer[]
  name?: string | null
  title?: string | null
  sheriff_check?: string[] | null
  best_move?: string[] | null
  imported_state?: LobbyImportedState | null
  /** Выбранный overlay-дизайн (Classic, masters-yug25, plus и т.д.). */
  overlay_design?: string | null
  /** Активный экран в OBS overlay (lobby, roles и т.д.). */
  active_overlay_screen?: string | null
}

export type LobbyImportedVariant = {
  key: string
  title: string
  tour_no: number | null
  table_label: string | null
  players_count: number | null
}

export type LobbyImportedState = {
  source_url: string | null
  current_key: string | null
  variants: LobbyImportedVariant[]
}

export type CreateLobbyBody = {
  max_players?: number
  /** Основное поле названия на текущем бэке. */
  title?: string
  /** Legacy-алиас для совместимости со старым вызовом фронта. */
  name?: string
}

export function createLobby(body: CreateLobbyBody = {}) {
  const title = (body.title ?? body.name ?? '').trim()
  return apiFetchJson<GameLobby>(
    '/lobbies',
    {
      max_players: body.max_players,
      ...(title ? { title } : {}),
    },
    { method: 'POST' },
  )
}

export type ImportGomafiaTournamentBody = {
  url: string
}

function extractImportedLobby(payload: unknown): GameLobby | null {
  const direct = toGameLobby(payload)
  if (direct) return direct
  if (!payload || typeof payload !== 'object') return null
  const row = payload as Record<string, unknown>
  const nestedCandidates = [row.lobby, row.data, row.result, row.item]
  for (const candidate of nestedCandidates) {
    const parsed = toGameLobby(candidate)
    if (parsed) return parsed
  }
  return null
}

function parseLobbyResponse(payload: unknown, errorMessage: string): GameLobby {
  const lobby = extractImportedLobby(payload)
  if (!lobby) throw new Error(errorMessage)
  return lobby
}

function extractImportedLobbyId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const row = payload as Record<string, unknown>
  const directCandidates = [row.id, row.lobby_id, row.lobbyId]
  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  const nestedObjects = [row.lobby, row.data, row.result, row.item]
  for (const candidate of nestedObjects) {
    if (!candidate || typeof candidate !== 'object') continue
    const nested = candidate as Record<string, unknown>
    const nestedIdCandidates = [nested.id, nested.lobby_id, nested.lobbyId]
    for (const nestedId of nestedIdCandidates) {
      if (typeof nestedId === 'string' && nestedId.trim()) return nestedId.trim()
    }
  }
  return null
}

function lobbyCreatedAtMs(lobby: GameLobby): number {
  const ts = Date.parse(lobby.created_at ?? '')
  return Number.isNaN(ts) ? 0 : ts
}

function toImportedVariant(item: unknown): LobbyImportedVariant | null {
  if (!item || typeof item !== 'object') return null
  const row = item as Record<string, unknown>
  const key = typeof row.key === 'string' ? row.key.trim() : ''
  if (!key) return null
  const title = typeof row.title === 'string' ? row.title.trim() : key
  const tourNo = typeof row.tour_no === 'number' ? row.tour_no : null
  const tableLabel = typeof row.table_label === 'string' ? row.table_label.trim() : null
  const playersCount = typeof row.players_count === 'number' ? row.players_count : null
  return {
    key,
    title: title || key,
    tour_no: tourNo,
    table_label: tableLabel,
    players_count: playersCount,
  }
}

function toImportedState(item: unknown): LobbyImportedState | null {
  if (!item || typeof item !== 'object') return null
  const row = item as Record<string, unknown>
  const sourceUrl = typeof row.source_url === 'string' ? row.source_url.trim() : null
  const currentKey = typeof row.current_key === 'string' ? row.current_key.trim() : null
  const rawVariants = Array.isArray(row.variants) ? row.variants : []
  const variants = rawVariants.map(toImportedVariant).filter((x): x is LobbyImportedVariant => x !== null)
  if (!variants.length) {
    const fromGomafia =
      (sourceUrl && /gomafia/i.test(sourceUrl)) || (typeof row.source === 'string' && /gomafia/i.test(row.source))
    if (!fromGomafia) return null
  }
  return {
    source_url: sourceUrl,
    current_key: currentKey,
    variants,
  }
}

/** Импортировать турнир из GoMafia в новое лобби. */
export async function importGomafiaTournament(body: ImportGomafiaTournamentBody) {
  const payload = await apiFetchJson<unknown>('/lobbies/import/gomafia', body, { method: 'POST' })

  const parsedLobby = extractImportedLobby(payload)
  if (parsedLobby) return parsedLobby

  const lobbyId = extractImportedLobbyId(payload)
  if (lobbyId) {
    try {
      return await getLobby(lobbyId)
    } catch {
      // fallback ниже: возьмем самое новое лобби пользователя
    }
  }

  try {
    const mine = await listMyLobbies()
    const latest = mine.slice().sort((a, b) => lobbyCreatedAtMs(b) - lobbyCreatedAtMs(a))[0]
    if (latest) return latest
  } catch {
    // если даже fallback не сработал - вернем исходную ошибку
  }

  throw new Error('Некорректный ответ при импорте турнира из GoMafia')
}

function normalizePhotoUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter(Boolean)
}

function normalizeLobbyPlayer(raw: unknown): LobbyPlayer | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const membershipId =
    typeof row.membership_id === 'string'
      ? row.membership_id.trim()
      : typeof row.id === 'string'
        ? row.id.trim()
        : ''
  if (!membershipId) return null

  const nestedCard = row.player_card ?? row.playerCard
  const cardRow =
    nestedCard && typeof nestedCard === 'object' ? (nestedCard as Record<string, unknown>) : null

  let photoLayouts = normalizePhotoLayouts(row.photo_layouts)
  let photoUrls = normalizePhotoUrls(row.photo_urls)
  let displayPhotoLayout: PhotoCrop | null = null

  const rawDisplayLayout = row.display_photo_layout ?? row.displayPhotoLayout
  if (rawDisplayLayout && typeof rawDisplayLayout === 'object') {
    displayPhotoLayout = normalizePhotoCrop(rawDisplayLayout as Partial<PhotoCrop>)
  }

  if (cardRow) {
    photoLayouts = photoLayouts ?? normalizePhotoLayouts(cardRow.photo_layouts)
    if (!photoUrls.length) photoUrls = normalizePhotoUrls(cardRow.photo_urls)
  }

  const lobbyPhotoRaw = row.lobby_photo_url ?? row.lobbyPhotoUrl
  const lobbyPhotoUrl =
    typeof lobbyPhotoRaw === 'string' && lobbyPhotoRaw.trim() ? lobbyPhotoRaw.trim() : null

  return {
    membership_id: membershipId,
    player_card_id:
      typeof row.player_card_id === 'string'
        ? row.player_card_id.trim()
        : typeof cardRow?.id === 'string'
          ? cardRow.id.trim()
          : '',
    user_id: typeof row.user_id === 'string' ? row.user_id.trim() : '',
    username: typeof row.username === 'string' ? row.username : '',
    nickname: typeof row.nickname === 'string' ? row.nickname : '',
    lobby_photo_url: lobbyPhotoUrl,
    photo_urls: photoUrls,
    photo_layouts: photoLayouts,
    display_photo_layout: displayPhotoLayout,
    game_role:
      typeof row.game_role === 'string' || row.game_role === null ? (row.game_role as string | null) : null,
    status: typeof row.status === 'string' || row.status === null ? (row.status as string | null) : null,
    joined_at: typeof row.joined_at === 'string' ? row.joined_at : '',
  }
}

function toGameLobby(item: unknown): GameLobby | null {
  if (!item || typeof item !== 'object') return null
  const row = item as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id : ''
  if (!id) return null
  const createdAt = typeof row.created_at === 'string' ? row.created_at : ''
  const maxPlayers = typeof row.max_players === 'number' ? row.max_players : 10
  const hostUserId = typeof row.host_user_id === 'string' || row.host_user_id === null ? row.host_user_id : null
  const players = Array.isArray(row.players)
    ? row.players.map(normalizeLobbyPlayer).filter((x): x is LobbyPlayer => x !== null)
    : []
  const sheriffCheck = Array.isArray(row.sheriff_check) ? (row.sheriff_check as string[]) : null
  const bestMove = Array.isArray(row.best_move) ? (row.best_move as string[]) : null
  const importedState = toImportedState(row.imported_state)
  const nameRaw = [row.name, row.lobby_name, row.title, row.lobby_title].find(
    (value) => typeof value === 'string' && value.trim(),
  )
  const name = typeof nameRaw === 'string' ? nameRaw.trim() : null
  const overlayDesignRaw = [row.overlay_design, row.selected_overlay_design].find(
    (value) => typeof value === 'string' && value.trim(),
  )
  const overlayDesign = typeof overlayDesignRaw === 'string' ? overlayDesignRaw.trim() : null
  const activeOverlayScreenRaw = row.active_overlay_screen
  const activeOverlayScreen =
    typeof activeOverlayScreenRaw === 'string' && activeOverlayScreenRaw.trim()
      ? activeOverlayScreenRaw.trim()
      : null
  return {
    id,
    max_players: maxPlayers,
    host_user_id: hostUserId,
    created_at: createdAt,
    players,
    name,
    title: name,
    sheriff_check: sheriffCheck,
    best_move: bestMove,
    imported_state: importedState,
    overlay_design: overlayDesign,
    active_overlay_screen: activeOverlayScreen,
  }
}

function extractLobbyArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  const root = payload as Record<string, unknown>
  const candidates = [root.items, root.lobbies, root.results, root.data]
  for (const c of candidates) {
    if (Array.isArray(c)) return c
  }
  return []
}

function hasLobbyName(lobby: GameLobby): boolean {
  return typeof lobby.name === 'string' && lobby.name.trim().length > 0
}

/** Список лобби текущего пользователя из бэка (без localStorage). */
export async function listMyLobbies(): Promise<GameLobby[]> {
  const currentUser = await me()
  const endpoints = ['/lobbies/my', `/users/${currentUser.id}/lobbies`, '/lobbies']
  let lastError: unknown = null

  for (const endpoint of endpoints) {
    try {
      const payload = await apiFetch<unknown>(endpoint, { method: 'GET' })
      const parsed = extractLobbyArray(payload).map(toGameLobby).filter((x): x is GameLobby => x !== null)
      if (!parsed.length) return parsed
      // Иногда список лобби приходит без name, хотя detail по id имя возвращает.
      const enriched = await Promise.all(
        parsed.map(async (lobby) => {
          if (hasLobbyName(lobby)) return lobby
          try {
            const detailed = await getLobby(lobby.id)
            return hasLobbyName(detailed) ? detailed : lobby
          } catch {
            return lobby
          }
        }),
      )
      return enriched
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 405 || error.status === 422)) {
        lastError = error
        continue
      }
      throw error
    }
  }

  if (
    lastError instanceof ApiError &&
    (lastError.status === 404 || lastError.status === 405 || lastError.status === 422)
  ) {
    throw new Error('На бэкенде нет endpoint для списка лобби пользователя')
  }
  if (lastError instanceof Error) throw lastError
  throw new Error('Бэкенд не поддерживает endpoint со списком лобби пользователя')
}

export function getLobby(lobbyId: string) {
  return apiFetch<unknown>(`/lobbies/${lobbyId}`).then((payload) =>
    parseLobbyResponse(payload, 'Некорректный ответ при загрузке лобби'),
  )
}

/** Удалить лобби (только хост). */
export function deleteLobby(lobbyId: string): Promise<void> {
  return apiFetch<unknown>(`/lobbies/${lobbyId}`, { method: 'DELETE' }).then(() => undefined)
}

/** Для стрим-overlay: запрашивать лобби без кеша браузера. */
export function getLobbyFresh(lobbyId: string) {
  return apiFetch<unknown>(`/lobbies/${lobbyId}?_=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  }).then((payload) => parseLobbyResponse(payload, 'Некорректный ответ при загрузке лобби'))
}

export function addCardToLobby(lobbyId: string, playerCardId: string) {
  return apiFetch<unknown>(
    `/lobbies/${lobbyId}/player-cards/${playerCardId}`,
    { method: 'POST' },
  ).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при добавлении карточки в лобби')
    return lobby
  })
}

export type SetGameRoleBody = { game_role: string }

/** Роль на конкретном месте (membership_id из GET лобби) - нужно при дублях одной карточки. */
export function setLobbyMemberRole(lobbyId: string, membershipId: string, body: SetGameRoleBody) {
  const mid = encodeURIComponent(membershipId)
  return apiFetchJson<unknown>(`/lobbies/${lobbyId}/members/${mid}/game-role`, body, {
    method: 'PATCH',
  }).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при назначении роли')
    return lobby
  })
}

export function clearLobbyMemberRole(lobbyId: string, membershipId: string) {
  const mid = encodeURIComponent(membershipId)
  return apiFetch<unknown>(`/lobbies/${lobbyId}/members/${mid}/game-role`, {
    method: 'DELETE',
  }).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при очистке роли')
    return lobby
  })
}

export type SetLobbyMemberStatusBody = { status: string }

export function setLobbyMemberStatus(
  lobbyId: string,
  membershipId: string,
  body: SetLobbyMemberStatusBody,
) {
  const mid = encodeURIComponent(membershipId)
  return apiFetchJson<unknown>(`/lobbies/${lobbyId}/members/${mid}/status`, body, {
    method: 'PATCH',
  }).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при назначении статуса')
    return lobby
  })
}

export function clearLobbyMemberStatus(lobbyId: string, membershipId: string) {
  const mid = encodeURIComponent(membershipId)
  return apiFetch<unknown>(`/lobbies/${lobbyId}/members/${mid}/status`, {
    method: 'DELETE',
  }).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при очистке статуса')
    return lobby
  })
}

/** @deprecated при дублях карточки - используйте setLobbyMemberRole */
export function setLobbyCardRole(lobbyId: string, playerCardId: string, body: SetGameRoleBody) {
  return apiFetchJson<unknown>(
    `/lobbies/${lobbyId}/player-cards/${playerCardId}/game-role`,
    body,
    { method: 'PATCH' },
  ).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при назначении роли карточке')
    return lobby
  })
}

/** @deprecated при дублях карточки - используйте clearLobbyMemberRole */
export function clearLobbyCardRole(lobbyId: string, playerCardId: string) {
  return apiFetch<unknown>(
    `/lobbies/${lobbyId}/player-cards/${playerCardId}/game-role`,
    { method: 'DELETE' },
  ).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при очистке роли карточки')
    return lobby
  })
}

export type SwapLobbySeatsBody = {
  membership_id_a: string
  membership_id_b: string
}

export function swapLobbySeats(lobbyId: string, body: SwapLobbySeatsBody) {
  return apiFetchJson<unknown>(`/lobbies/${lobbyId}/members/swap`, body, {
    method: 'POST',
  }).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при обмене мест')
    return lobby
  })
}

/** Сбросить игровые роли у всех мест в лобби (только хост). DELETE …/game-roles */
export function resetLobbyGameRoles(lobbyId: string) {
  return apiFetch<unknown>(`/lobbies/${lobbyId}/game-roles`, { method: 'DELETE' }).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при сбросе ролей')
    return lobby
  })
}

/** Сбросить статусы у всех мест в лобби (только хост). DELETE …/statuses */
export function resetLobbyStatuses(lobbyId: string) {
  return apiFetch<unknown>(`/lobbies/${lobbyId}/statuses`, { method: 'DELETE' }).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при сбросе статусов')
    return lobby
  })
}

export type SetLobbySheriffCheckBody = {
  sheriff_check: string[]
}

/** Обновить sheriff_check (5 значений) для лобби (только хост). */
export function setLobbySheriffCheck(lobbyId: string, body: SetLobbySheriffCheckBody) {
  return apiFetchJson<unknown>(`/lobbies/${lobbyId}/sheriff-check`, body, {
    method: 'PATCH',
  }).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при сохранении проверок шерифа')
    return lobby
  })
}

/** Сбросить sheriff_check для лобби (только хост). */
export function clearLobbySheriffCheck(lobbyId: string) {
  return apiFetch<unknown>(`/lobbies/${lobbyId}/sheriff-check`, { method: 'DELETE' }).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при сбросе проверок шерифа')
    return lobby
  })
}

export type SetLobbyBestMoveBody = {
  best_move: string[]
}

/** Обновить best_move (3 значения) для лобби (только хост). */
export function setLobbyBestMove(lobbyId: string, body: SetLobbyBestMoveBody) {
  return apiFetchJson<unknown>(`/lobbies/${lobbyId}/best-move`, body, {
    method: 'PATCH',
  }).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при сохранении best move')
    return lobby
  })
}

/** Сбросить best_move для лобби (только хост). */
export function clearLobbyBestMove(lobbyId: string) {
  return apiFetch<unknown>(`/lobbies/${lobbyId}/best-move`, { method: 'DELETE' }).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при сбросе best move')
    return lobby
  })
}

/** Какое фото показывать у участника в лобби (URL из карточки игрока). Бэкенд: PATCH …/display-photo */
export type SetLobbyMemberDisplayPhotoBody = { photo_url: string }

export function setLobbyMemberDisplayPhoto(
  lobbyId: string,
  membershipId: string,
  body: SetLobbyMemberDisplayPhotoBody,
) {
  const mid = encodeURIComponent(membershipId)
  return apiFetchJson<unknown>(`/lobbies/${lobbyId}/members/${mid}/display-photo`, body, {
    method: 'PATCH',
  }).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при выборе фото')
    return lobby
  })
}

/** Заменить игрока на месте другой карточкой из «Мои составы». Бэкенд: PATCH …/members/{membership_id} */
export type ReplaceLobbyMemberCardBody = { player_card_id: string }

export function replaceLobbyMemberCard(
  lobbyId: string,
  membershipId: string,
  body: ReplaceLobbyMemberCardBody,
) {
  const mid = encodeURIComponent(membershipId)
  return apiFetchJson<unknown>(`/lobbies/${lobbyId}/members/${mid}`, body, {
    method: 'PATCH',
  }).then((payload) => {
    const lobby = toGameLobby(payload)
    if (!lobby) throw new Error('Некорректный ответ при замене игрока')
    return lobby
  })
}

export type LobbyOverlayDesignOption = {
  code: string
  title: string
  required_subscription: string
  animation_supported: boolean
  selectable: boolean
}

export type LobbyOverlayDesignsResponse = {
  lobby_id: string
  selected_overlay_design: string
  options: LobbyOverlayDesignOption[]
}

export type SetLobbyOverlayDesignBody = {
  overlay_design: string
}

export type SetLobbyOverlayScreenBody = {
  screen_key: string
}

export type LobbyOverlayStateResponse = {
  lobby_id: string
  selected_overlay_design?: string | null
  active_overlay_screen?: string | null
}

export type OverlayGlobalStateResponse = {
  active_lobby_id: string | null
  active_overlay_screen: string | null
  selected_overlay_design: string | null
}

export type SetOverlayActiveLobbyBody = {
  lobby_id: string
}

export type SetOverlayActiveLobbyResponse = {
  active_lobby_id: string
  updated_at: string
}

/** Получить список доступных overlay-дизайнов для лобби. */
export function getLobbyOverlayDesigns(lobbyId: string) {
  return apiFetch<LobbyOverlayDesignsResponse>(`/lobbies/${lobbyId}/overlay-designs`)
}

/** Выбрать overlay-дизайн карточек для лобби (только хост). */
export function setLobbyOverlayDesign(lobbyId: string, body: SetLobbyOverlayDesignBody) {
  return apiFetchJson<GameLobby>(`/lobbies/${lobbyId}/overlay-design`, body, {
    method: 'PATCH',
  })
}

/** Переключить активный экран OBS overlay (только хост). */
export function setLobbyOverlayScreen(lobbyId: string, body: SetLobbyOverlayScreenBody) {
  const screenKey = (body.screen_key ?? '').trim()
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(screenKey)) {
    return Promise.reject(new Error('Некорректный screen_key'))
  }
  return apiFetchJson<unknown>(`/lobbies/${lobbyId}/overlay-screen`, body, {
    method: 'PATCH',
  }).then((payload) => parseLobbyResponse(payload, 'Некорректный ответ при переключении экрана overlay'))
}

/** Получить состояние overlay для OBS (дизайн + активный экран). */
export function getLobbyOverlayState(lobbyId: string) {
  return apiFetch<unknown>(`/lobbies/${lobbyId}/overlay-state`).then((payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Некорректный ответ overlay-state')
    }
    const row = payload as Record<string, unknown>
    const lobbyIdValue = typeof row.lobby_id === 'string' ? row.lobby_id.trim() : lobbyId
    const selectedOverlayDesign =
      typeof row.selected_overlay_design === 'string' && row.selected_overlay_design.trim()
        ? row.selected_overlay_design.trim()
        : null
    const activeOverlayScreen =
      typeof row.active_overlay_screen === 'string' && row.active_overlay_screen.trim()
        ? row.active_overlay_screen.trim()
        : null
    return {
      lobby_id: lobbyIdValue,
      selected_overlay_design: selectedOverlayDesign,
      active_overlay_screen: activeOverlayScreen,
    } satisfies LobbyOverlayStateResponse
  })
}

/** Текущее глобальное overlay-состояние (активное лобби/экран/дизайн). */
export function getOverlayState() {
  return apiFetch<unknown>('/overlay/state').then((payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Некорректный ответ /overlay/state')
    }
    const row = payload as Record<string, unknown>
    const activeLobbyId =
      typeof row.active_lobby_id === 'string' && row.active_lobby_id.trim() ? row.active_lobby_id.trim() : null
    const activeOverlayScreen =
      typeof row.active_overlay_screen === 'string' && row.active_overlay_screen.trim()
        ? row.active_overlay_screen.trim()
        : null
    const selectedOverlayDesign =
      typeof row.selected_overlay_design === 'string' && row.selected_overlay_design.trim()
        ? row.selected_overlay_design.trim()
        : null
    return {
      active_lobby_id: activeLobbyId,
      active_overlay_screen: activeOverlayScreen,
      selected_overlay_design: selectedOverlayDesign,
    } satisfies OverlayGlobalStateResponse
  })
}

/** Live endpoint для OBS (стабильная точка с тем же форматом, что /overlay/state). */
export function getOverlayLive() {
  return apiFetch<unknown>('/overlay/live').then((payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Некорректный ответ /overlay/live')
    }
    const row = payload as Record<string, unknown>
    const activeLobbyId =
      typeof row.active_lobby_id === 'string' && row.active_lobby_id.trim() ? row.active_lobby_id.trim() : null
    const activeOverlayScreen =
      typeof row.active_overlay_screen === 'string' && row.active_overlay_screen.trim()
        ? row.active_overlay_screen.trim()
        : null
    const selectedOverlayDesign =
      typeof row.selected_overlay_design === 'string' && row.selected_overlay_design.trim()
        ? row.selected_overlay_design.trim()
        : null
    return {
      active_lobby_id: activeLobbyId,
      active_overlay_screen: activeOverlayScreen,
      selected_overlay_design: selectedOverlayDesign,
    } satisfies OverlayGlobalStateResponse
  })
}

/** Сделать текущее лобби активным для OBS live-ссылки. */
export function setOverlayActiveLobby(body: SetOverlayActiveLobbyBody) {
  return apiFetchJson<SetOverlayActiveLobbyResponse>('/overlay/active-lobby', body, {
    method: 'PATCH',
  })
}

export type SetLobbyImportedSelectionBody = {
  key: string
}

function extractImportedParticipantsArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    const r = payload as Record<string, unknown>
    const nested = r.items ?? r.participants ?? r.data ?? r.results
    if (Array.isArray(nested)) return nested
  }
  return []
}

function importedParticipantDisplayLine(item: unknown): string {
  if (typeof item === 'string' || typeof item === 'number') {
    const s = String(item).trim()
    return s || '-'
  }
  if (!item || typeof item !== 'object') return '-'
  const o = item as Record<string, unknown>
  const nick = typeof o.nickname === 'string' ? o.nickname.trim() : ''
  const full = typeof o.full_name === 'string' ? o.full_name.trim() : ''
  if (nick && full && nick !== full) return `${nick} (${full})`
  if (nick) return nick
  if (full) return full
  for (const k of ['name', 'display_name', 'player_name', 'title', 'username'] as const) {
    const v = o[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return '-'
}

/** Участники турнира из импорта GoMafia (только хост). GET /lobbies/{id}/imported-participants */
export function getLobbyImportedParticipants(lobbyId: string): Promise<string[]> {
  const id = encodeURIComponent(lobbyId)
  return apiFetch<unknown>(`/lobbies/${id}/imported-participants`).then((payload) =>
    extractImportedParticipantsArray(payload).map(importedParticipantDisplayLine),
  )
}

/** Переключить импортированный вариант (тур/стол) для Gomafia-лобби. */
export function setLobbyImportedSelection(lobbyId: string, body: SetLobbyImportedSelectionBody) {
  return apiFetchJson<unknown>(`/lobbies/${lobbyId}/imported-selection`, body, {
    method: 'PATCH',
  }).then((payload) => parseLobbyResponse(payload, 'Некорректный ответ при переключении тура/стола'))
}
