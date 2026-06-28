import { getPlayerCard } from '@/api/playerCards'
import type { GameLobby, LobbyPlayer } from '@/api/lobbies'
import {
  findPhotoLayoutForUrl,
  normalizePhotoLayouts,
  type PhotoLayouts,
} from '@/utils/photoCrop'
import { rowPhoto } from '@/utils/playerCardPhotoFrame'

const STORAGE_KEY = 'plashki:overlay:photo-layouts'
const API_CACHE_MS = 5000

type CacheRow = {
  layouts: PhotoLayouts
  at: number
}

const apiCache = new Map<string, { at: number; layouts: PhotoLayouts | null }>()

function mergePhotoLayouts(...sources: (PhotoLayouts | null | undefined)[]): PhotoLayouts | null {
  const out: PhotoLayouts = {}
  for (const src of sources) {
    if (!src) continue
    Object.assign(out, src)
  }
  return Object.keys(out).length ? out : null
}

function readStorage(): Record<string, CacheRow> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CacheRow>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStorage(all: Record<string, CacheRow>) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // ignore quota / private mode
  }
}

/** Сохранить кадрирование после правки в лобби - overlay в OBS читает из того же origin. */
export function writeCachedPhotoLayouts(playerCardId: string, layouts: PhotoLayouts) {
  const id = playerCardId.trim()
  if (!id) return
  const normalized = normalizePhotoLayouts(layouts)
  if (!normalized) return
  const all = readStorage()
  all[id] = { layouts: normalized, at: Date.now() }
  writeStorage(all)
}

export function readCachedPhotoLayouts(playerCardId: string): PhotoLayouts | null {
  const id = playerCardId.trim()
  if (!id) return null
  const row = readStorage()[id]
  return row?.layouts ? normalizePhotoLayouts(row.layouts) : null
}

/** Сохранить photo_layouts между poll-тиками overlay (localStorage + предыдущий кадр). */
export function mergePlayerPhotoLayouts(prev: LobbyPlayer | undefined, next: LobbyPlayer): LobbyPlayer {
  const cardId = next.player_card_id?.trim()
  const cached = cardId ? readCachedPhotoLayouts(cardId) : null
  const layouts = mergePhotoLayouts(prev?.photo_layouts, next.photo_layouts, cached)
  const displayPhotoLayout = next.display_photo_layout ?? prev?.display_photo_layout ?? null

  if (!layouts && !displayPhotoLayout) return next

  return {
    ...next,
    photo_layouts: layouts ?? next.photo_layouts,
    display_photo_layout: displayPhotoLayout,
  }
}

export function applyStablePhotoLayouts(prev: GameLobby | null, next: GameLobby): GameLobby {
  const prevByMember = prev ? new Map(prev.players.map((p) => [p.membership_id, p])) : null
  return {
    ...next,
    players: next.players.map((p) => mergePlayerPhotoLayouts(prevByMember?.get(p.membership_id), p)),
  }
}

async function enrichPlayer(p: LobbyPlayer): Promise<LobbyPlayer> {
  const cardId = p.player_card_id?.trim()
  if (!cardId) return p

  let layouts = mergePhotoLayouts(p.photo_layouts, readCachedPhotoLayouts(cardId))
  const shown = rowPhoto(p)
  if (shown && findPhotoLayoutForUrl(layouts, shown)) {
    return layouts ? { ...p, photo_layouts: layouts } : p
  }

  if (!p.user_id?.trim()) {
    return layouts ? { ...p, photo_layouts: layouts } : p
  }

  const cacheKey = `${p.user_id}:${cardId}`
  const cached = apiCache.get(cacheKey)
  if (cached && Date.now() - cached.at < API_CACHE_MS) {
    layouts = mergePhotoLayouts(layouts, cached.layouts)
    return layouts ? { ...p, photo_layouts: layouts } : p
  }

  try {
    const card = await getPlayerCard(p.user_id, cardId)
    const fromApi = card.photo_layouts ?? null
    apiCache.set(cacheKey, { at: Date.now(), layouts: fromApi })
    if (fromApi) writeCachedPhotoLayouts(cardId, fromApi)
    layouts = mergePhotoLayouts(layouts, fromApi)
    return layouts ? { ...p, photo_layouts: layouts } : p
  } catch {
    apiCache.set(cacheKey, { at: Date.now(), layouts: null })
    return layouts ? { ...p, photo_layouts: layouts } : p
  }
}

/** Дополнить игроков лобби кадрированием (localStorage + карточка), если GET /lobbies без layout. */
export async function enrichLobbyPhotoLayouts(lobby: GameLobby): Promise<GameLobby> {
  const players = await Promise.all(lobby.players.map(enrichPlayer))
  return { ...lobby, players }
}
