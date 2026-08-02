import { apiFetch, apiFetchJson } from './client'
import { buildQuery } from './listQuery'

export type RatingListItem = {
  id: string
  name: string
  event_date: string
  participant_count: number
  created_at: string
  updated_at: string
}

export type RatingParticipant = {
  id: string
  player_card_id: string
  sort_order: number
  nickname: string
  first_name: string
  last_name: string
  club: string | null
}

export type Rating = {
  id: string
  owner_user_id: string
  name: string
  event_date: string
  participants: RatingParticipant[]
  created_at: string
  updated_at: string
}

export type RatingWrite = {
  name: string
  event_date: string
  player_card_ids: string[]
}

export type RatingPatch = {
  name?: string
  event_date?: string
  player_card_ids?: string[]
}

export type RatingAddParticipantsBody = {
  player_card_ids: string[]
}

export type RatingWinnerSide = 'red' | 'black'
export type RatingGameRole = 'peaceful' | 'mafia' | 'don' | 'sheriff'
export type RatingGameSource = 'manual' | 'lobby_sync'
export type RatingGamesSort = '-played_at' | 'played_at' | '-created_at' | 'created_at'

export type RatingGameResultWrite = {
  player_card_id: string
  role: RatingGameRole
  bonus_points: number
  total_points: number
}

export type RatingGameWrite = {
  title: string
  played_at: string
  winner_side: RatingWinnerSide
  results: RatingGameResultWrite[]
}

export type RatingSyncLobbyTotalPointEntry = {
  player_card_id: string
  total_points: number
}

export type RatingSyncLobbyBody = {
  lobby_id: string
  played_at: string
  winner_side: RatingWinnerSide
  title?: string
  total_points?: RatingSyncLobbyTotalPointEntry[]
}

export type RatingGameResult = {
  player_card_id: string
  nickname: string
  first_name?: string | null
  last_name?: string | null
  photo_url?: string | null
  role: RatingGameRole
  bonus_points: number
  total_points: number
  best_move?: string[]
}

export type RatingGame = {
  id: string
  rating_id?: string
  title: string
  played_at: string
  winner_side: RatingWinnerSide
  source?: RatingGameSource
  lobby_id?: string | null
  created_at?: string
  results: RatingGameResult[]
}

export type RatingGameListItem = {
  id: string
  title: string
  played_at: string
  winner_side: RatingWinnerSide
  players_count: number
  source: RatingGameSource
  lobby_id: string | null
  created_at: string
}

export type RatingGameListResponse = {
  rating_id: string
  total: number
  items: RatingGameListItem[]
}

export type RatingGamesListParams = {
  limit?: number
  offset?: number
  sort?: RatingGamesSort
  q?: string
}

export type RatingTableRow = {
  player_card_id: string
  nickname: string
  first_name: string
  last_name: string
  club: string | null
  photo_url: string | null
  games_total: number
  games_black: number
  games_red: number
  games_mafia: number
  games_peaceful: number
  games_sheriff: number
  games_don: number
  wins_total: number
  bonus_points_plus_sum: number
  bonus_points_minus_sum: number
  bonus_points_sum: number
  bonus_peaceful_plus_sum: number
  bonus_peaceful_minus_sum: number
  bonus_mafia_plus_sum: number
  bonus_mafia_minus_sum: number
  bonus_don_plus_sum: number
  bonus_don_minus_sum: number
  bonus_sheriff_plus_sum: number
  bonus_sheriff_minus_sum: number
  best_move_sum: number
  best_move_count_0: number
  best_move_count_1: number
  best_move_count_2: number
  best_move_count_3: number
  total_points_sum: number
  total_points_mafia_sum: number
  total_points_peaceful_sum: number
  total_points_sheriff_sum: number
  total_points_don_sum: number
  avg_points_mafia: number
  avg_points_peaceful: number
  avg_points_sheriff: number
  avg_points_don: number
  is_best_mafia: boolean
  is_best_peaceful: boolean
  is_best_sheriff: boolean
  is_best_don: boolean
}

export type RatingTableResponse = {
  rating_id: string
  rows: RatingTableRow[]
}

function normalizeRatingListItem(raw: unknown): RatingListItem | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id.trim() : ''
  if (!id) return null
  return {
    id,
    name: typeof row.name === 'string' ? row.name : '',
    event_date: typeof row.event_date === 'string' ? row.event_date : '',
    participant_count: Number.isFinite(row.participant_count) ? Number(row.participant_count) : 0,
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : '',
  }
}

function normalizeRatingParticipant(raw: unknown): RatingParticipant | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id.trim() : ''
  if (!id) return null
  return {
    id,
    player_card_id: typeof row.player_card_id === 'string' ? row.player_card_id : '',
    sort_order: Number.isFinite(row.sort_order) ? Number(row.sort_order) : 0,
    nickname: typeof row.nickname === 'string' ? row.nickname : '',
    first_name: typeof row.first_name === 'string' ? row.first_name : '',
    last_name: typeof row.last_name === 'string' ? row.last_name : '',
    club: typeof row.club === 'string' ? row.club : null,
  }
}

function normalizeRating(raw: unknown): Rating | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id.trim() : ''
  if (!id) return null
  const participants = Array.isArray(row.participants)
    ? row.participants
        .map((item) => normalizeRatingParticipant(item))
        .filter((item): item is RatingParticipant => !!item)
    : []
  return {
    id,
    owner_user_id: typeof row.owner_user_id === 'string' ? row.owner_user_id : '',
    name: typeof row.name === 'string' ? row.name : '',
    event_date: typeof row.event_date === 'string' ? row.event_date : '',
    participants,
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : '',
  }
}

function normalizeRatingGameResult(raw: unknown): RatingGameResult | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const playerCardId = typeof row.player_card_id === 'string' ? row.player_card_id : ''
  const nickname = typeof row.nickname === 'string' ? row.nickname : ''
  const role = typeof row.role === 'string' ? row.role : ''
  if (!playerCardId || !nickname || !role) return null
  const bestMove = Array.isArray(row.best_move)
    ? row.best_move.filter((item): item is string => typeof item === 'string')
    : undefined
  return {
    player_card_id: playerCardId,
    nickname,
    first_name: typeof row.first_name === 'string' ? row.first_name : null,
    last_name: typeof row.last_name === 'string' ? row.last_name : null,
    photo_url:
      typeof row.photo_url === 'string' && row.photo_url.trim() ? row.photo_url.trim() : null,
    role: role as RatingGameRole,
    bonus_points: Number.isFinite(row.bonus_points) ? Number(row.bonus_points) : 0,
    total_points: Number.isFinite(row.total_points) ? Number(row.total_points) : 0,
    best_move: bestMove,
  }
}

function normalizeRatingGameListItem(raw: unknown): RatingGameListItem | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id : ''
  if (!id) return null
  const source =
    row.source === 'manual' || row.source === 'lobby_sync'
      ? row.source
      : ('manual' as RatingGameSource)
  return {
    id,
    title: typeof row.title === 'string' ? row.title : '',
    played_at: typeof row.played_at === 'string' ? row.played_at : '',
    winner_side:
      row.winner_side === 'black' || row.winner_side === 'red'
        ? row.winner_side
        : ('red' as RatingWinnerSide),
    players_count: Number.isFinite(row.players_count) ? Number(row.players_count) : 0,
    source,
    lobby_id: typeof row.lobby_id === 'string' ? row.lobby_id : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
  }
}

function normalizeRatingGame(raw: unknown): RatingGame | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id : ''
  if (!id) return null
  const results = Array.isArray(row.results)
    ? row.results
        .map((item) => normalizeRatingGameResult(item))
        .filter((item): item is RatingGameResult => !!item)
    : []
  const source =
    row.source === 'manual' || row.source === 'lobby_sync' ? row.source : undefined
  return {
    id,
    rating_id: typeof row.rating_id === 'string' ? row.rating_id : undefined,
    title: typeof row.title === 'string' ? row.title : '',
    played_at: typeof row.played_at === 'string' ? row.played_at : '',
    winner_side:
      row.winner_side === 'black' || row.winner_side === 'red'
        ? row.winner_side
        : ('red' as RatingWinnerSide),
    source,
    lobby_id: typeof row.lobby_id === 'string' ? row.lobby_id : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
    results,
  }
}

function normalizeRatingGameListResponse(raw: unknown): RatingGameListResponse | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const ratingId = typeof row.rating_id === 'string' ? row.rating_id : ''
  if (!ratingId) return null
  const items = Array.isArray(row.items)
    ? row.items
        .map((item) => normalizeRatingGameListItem(item))
        .filter((item): item is RatingGameListItem => !!item)
    : []
  return {
    rating_id: ratingId,
    total: Number.isFinite(row.total) ? Number(row.total) : items.length,
    items,
  }
}

function readNum(raw: Record<string, unknown>, key: string): number {
  return Number.isFinite(raw[key]) ? Number(raw[key]) : 0
}

function readBool(raw: Record<string, unknown>, key: string): boolean {
  return raw[key] === true
}

function readBonusSum(raw: Record<string, unknown>, sumKey: string, totalKey: string): number {
  if (Number.isFinite(raw[sumKey])) return Number(raw[sumKey])
  if (Number.isFinite(raw[totalKey])) return Number(raw[totalKey])
  return 0
}

function normalizeRatingTableRow(raw: unknown): RatingTableRow | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const playerCardId = typeof row.player_card_id === 'string' ? row.player_card_id : ''
  if (!playerCardId) return null
  return {
    player_card_id: playerCardId,
    nickname: typeof row.nickname === 'string' ? row.nickname : '',
    first_name: typeof row.first_name === 'string' ? row.first_name : '',
    last_name: typeof row.last_name === 'string' ? row.last_name : '',
    club: typeof row.club === 'string' ? row.club : null,
    photo_url:
      typeof row.photo_url === 'string' && row.photo_url.trim() ? row.photo_url.trim() : null,
    games_total: Number.isFinite(row.games_total)
      ? Number(row.games_total)
      : Number.isFinite(row.games_count)
        ? Number(row.games_count)
        : 0,
    games_black: Number.isFinite(row.games_black)
      ? Number(row.games_black)
      : Number.isFinite(row.black_games_count)
        ? Number(row.black_games_count)
        : 0,
    games_red: Number.isFinite(row.games_red)
      ? Number(row.games_red)
      : Number.isFinite(row.red_games_count)
        ? Number(row.red_games_count)
        : 0,
    games_mafia: Number.isFinite(row.games_mafia)
      ? Number(row.games_mafia)
      : Number.isFinite(row.mafia_games_count)
        ? Number(row.mafia_games_count)
        : 0,
    games_peaceful: Number.isFinite(row.games_peaceful)
      ? Number(row.games_peaceful)
      : Number.isFinite(row.peaceful_games_count)
        ? Number(row.peaceful_games_count)
        : 0,
    games_sheriff: Number.isFinite(row.games_sheriff)
      ? Number(row.games_sheriff)
      : Number.isFinite(row.sheriff_games_count)
        ? Number(row.sheriff_games_count)
        : 0,
    games_don: Number.isFinite(row.games_don)
      ? Number(row.games_don)
      : Number.isFinite(row.don_games_count)
        ? Number(row.don_games_count)
        : 0,
    wins_total: Number.isFinite(row.wins_total) ? Number(row.wins_total) : 0,
    bonus_points_plus_sum: Number.isFinite(row.bonus_points_plus_sum)
      ? Number(row.bonus_points_plus_sum)
      : Number.isFinite(row.bonus_points_plus_total)
        ? Number(row.bonus_points_plus_total)
        : 0,
    bonus_points_minus_sum: (() => {
      const rawMinus = Number.isFinite(row.bonus_points_minus_sum)
        ? Number(row.bonus_points_minus_sum)
        : Number.isFinite(row.bonus_points_minus_total)
          ? Number(row.bonus_points_minus_total)
          : 0
      const plus = Number.isFinite(row.bonus_points_plus_sum)
        ? Number(row.bonus_points_plus_sum)
        : Number.isFinite(row.bonus_points_plus_total)
          ? Number(row.bonus_points_plus_total)
          : 0
      const sum = Number.isFinite(row.bonus_points_sum)
        ? Number(row.bonus_points_sum)
        : Number.isFinite(row.bonus_points_total)
          ? Number(row.bonus_points_total)
          : 0
      const direct = Math.abs(rawMinus)
      if (direct > 0) return direct
      const derived = plus - sum
      return derived > 0 ? Math.round(derived * 10) / 10 : 0
    })(),
    bonus_points_sum: Number.isFinite(row.bonus_points_sum)
      ? Number(row.bonus_points_sum)
      : Number.isFinite(row.bonus_points_total)
        ? Number(row.bonus_points_total)
        : 0,
    bonus_peaceful_plus_sum: readBonusSum(row, 'bonus_peaceful_plus_sum', 'bonus_peaceful_plus_total'),
    bonus_peaceful_minus_sum: Math.abs(
      readBonusSum(row, 'bonus_peaceful_minus_sum', 'bonus_peaceful_minus_total'),
    ),
    bonus_mafia_plus_sum: readBonusSum(row, 'bonus_mafia_plus_sum', 'bonus_mafia_plus_total'),
    bonus_mafia_minus_sum: Math.abs(readBonusSum(row, 'bonus_mafia_minus_sum', 'bonus_mafia_minus_total')),
    bonus_don_plus_sum: readBonusSum(row, 'bonus_don_plus_sum', 'bonus_don_plus_total'),
    bonus_don_minus_sum: Math.abs(readBonusSum(row, 'bonus_don_minus_sum', 'bonus_don_minus_total')),
    bonus_sheriff_plus_sum: readBonusSum(row, 'bonus_sheriff_plus_sum', 'bonus_sheriff_plus_total'),
    bonus_sheriff_minus_sum: Math.abs(
      readBonusSum(row, 'bonus_sheriff_minus_sum', 'bonus_sheriff_minus_total'),
    ),
    best_move_sum: Number.isFinite(row.best_move_sum)
      ? Number(row.best_move_sum)
      : Number.isFinite(row.best_moves_total)
        ? Number(row.best_moves_total)
        : 0,
    best_move_count_0: Number.isFinite(row.best_move_count_0) ? Number(row.best_move_count_0) : 0,
    best_move_count_1: Number.isFinite(row.best_move_count_1) ? Number(row.best_move_count_1) : 0,
    best_move_count_2: Number.isFinite(row.best_move_count_2) ? Number(row.best_move_count_2) : 0,
    best_move_count_3: Number.isFinite(row.best_move_count_3) ? Number(row.best_move_count_3) : 0,
    total_points_sum: Number.isFinite(row.total_points_sum)
      ? Number(row.total_points_sum)
      : Number.isFinite(row.total_points_total)
        ? Number(row.total_points_total)
        : 0,
    total_points_mafia_sum: readNum(row, 'total_points_mafia_sum'),
    total_points_peaceful_sum: readNum(row, 'total_points_peaceful_sum'),
    total_points_sheriff_sum: readNum(row, 'total_points_sheriff_sum'),
    total_points_don_sum: readNum(row, 'total_points_don_sum'),
    avg_points_mafia: readNum(row, 'avg_points_mafia'),
    avg_points_peaceful: readNum(row, 'avg_points_peaceful'),
    avg_points_sheriff: readNum(row, 'avg_points_sheriff'),
    avg_points_don: readNum(row, 'avg_points_don'),
    is_best_mafia: readBool(row, 'is_best_mafia'),
    is_best_peaceful: readBool(row, 'is_best_peaceful'),
    is_best_sheriff: readBool(row, 'is_best_sheriff'),
    is_best_don: readBool(row, 'is_best_don'),
  }
}

function normalizeRatingTableResponse(raw: unknown): RatingTableResponse | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const ratingId = typeof row.rating_id === 'string' ? row.rating_id : ''
  if (!ratingId) return null
  const rows = Array.isArray(row.rows)
    ? row.rows
        .map((item) => normalizeRatingTableRow(item))
        .filter((item): item is RatingTableRow => !!item)
    : []
  return { rating_id: ratingId, rows }
}

export async function listRatings(): Promise<RatingListItem[]> {
  const rows = await apiFetch<unknown[]>('/ratings')
  return rows.map((row) => normalizeRatingListItem(row)).filter((row): row is RatingListItem => !!row)
}

export async function createRating(body: RatingWrite): Promise<Rating> {
  const data = await apiFetchJson<unknown>('/ratings', body, { method: 'POST' })
  const rating = normalizeRating(data)
  if (!rating) throw new Error('Некорректный ответ при создании рейтинга')
  return rating
}

export async function getRating(ratingId: string): Promise<Rating> {
  const data = await apiFetch<unknown>(`/ratings/${ratingId}`)
  const rating = normalizeRating(data)
  if (!rating) throw new Error('Некорректный ответ при получении рейтинга')
  return rating
}

export async function patchRating(ratingId: string, body: RatingPatch): Promise<Rating> {
  const data = await apiFetchJson<unknown>(`/ratings/${ratingId}`, body, { method: 'PATCH' })
  const rating = normalizeRating(data)
  if (!rating) throw new Error('Некорректный ответ при обновлении рейтинга')
  return rating
}

export async function deleteRating(ratingId: string): Promise<void> {
  await apiFetch<void>(`/ratings/${ratingId}`, { method: 'DELETE' })
}

export async function addRatingParticipants(ratingId: string, body: RatingAddParticipantsBody): Promise<Rating> {
  const data = await apiFetchJson<unknown>(`/ratings/${ratingId}/participants`, body, { method: 'POST' })
  const rating = normalizeRating(data)
  if (!rating) throw new Error('Некорректный ответ при добавлении участников')
  return rating
}

export async function createRatingGame(ratingId: string, body: RatingGameWrite): Promise<RatingGame> {
  const data = await apiFetchJson<unknown>(`/ratings/${ratingId}/games`, body, { method: 'POST' })
  const game = normalizeRatingGame(data)
  if (!game) throw new Error('Некорректный ответ при добавлении игры')
  return game
}

export async function listRatingGames(
  ratingId: string,
  params: RatingGamesListParams = {},
): Promise<RatingGameListResponse> {
  const qs = buildQuery({
    limit: params.limit,
    offset: params.offset,
    sort: params.sort,
    q: params.q?.trim(),
  })
  const data = await apiFetch<unknown>(`/ratings/${ratingId}/games${qs}`)
  const payload = normalizeRatingGameListResponse(data)
  if (!payload) throw new Error('Некорректный ответ списка игр рейтинга')
  return payload
}

export async function getRatingGame(ratingId: string, gameId: string): Promise<RatingGame> {
  const data = await apiFetch<unknown>(`/ratings/${ratingId}/games/${gameId}`)
  const game = normalizeRatingGame(data)
  if (!game) throw new Error('Некорректный ответ при получении игры')
  return game
}

export async function getRatingTable(ratingId: string): Promise<RatingTableResponse> {
  const data = await apiFetch<unknown>(`/ratings/${ratingId}/table`)
  const table = normalizeRatingTableResponse(data)
  if (!table) throw new Error('Некорректный ответ таблицы рейтинга')
  return table
}

export async function syncRatingFromLobby(
  ratingId: string,
  body: RatingSyncLobbyBody,
): Promise<RatingGame> {
  const data = await apiFetchJson<unknown>(`/ratings/${ratingId}/sync-lobby`, body, { method: 'POST' })
  const game = normalizeRatingGame(data)
  if (!game) throw new Error('Некорректный ответ при синхронизации игры из лобби')
  return game
}
