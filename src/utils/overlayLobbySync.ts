import type { GameLobby } from '@/api/lobbies'

const CHANNEL_NAME = 'plashki:overlay:lobby-sync'
const STORAGE_KEY = 'plashki:overlay:lobby-sync'

export type OverlayLobbySyncEvent = {
  lobbyId: string
  at: number
}

/** Сигнатура данных, которые overlay должен обновлять (роли, статусы, фото, дизайн). */
export function overlayLobbyDataSignature(value: GameLobby): string {
  return JSON.stringify({
    design: value.overlay_design ?? '',
    sheriff: value.sheriff_check ?? null,
    best: value.best_move ?? null,
    players: value.players.map((p) => ({
      id: p.membership_id,
      nick: p.nickname,
      role: p.game_role,
      status: p.status,
      photo: p.lobby_photo_url ?? p.photo_urls?.[0] ?? '',
      card: p.player_card_id,
    })),
  })
}

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

/** Сообщить overlay (OBS), что лобби изменилось — после PATCH в редакторе. */
export function notifyOverlayLobbyChanged(lobbyId: string) {
  const id = lobbyId.trim()
  if (!id) return
  const event: OverlayLobbySyncEvent = { lobbyId: id, at: Date.now() }
  getChannel()?.postMessage(event)
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(event))
  } catch {
    // ignore quota / private mode
  }
}

export function subscribeOverlayLobbyChanged(
  handler: (event: OverlayLobbySyncEvent) => void,
): () => void {
  const onMessage = (ev: MessageEvent) => {
    const data = ev.data as OverlayLobbySyncEvent
    if (data?.lobbyId?.trim()) handler(data)
  }

  const ch = getChannel()
  ch?.addEventListener('message', onMessage)

  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return
    try {
      const data = JSON.parse(e.newValue) as OverlayLobbySyncEvent
      if (data?.lobbyId?.trim()) handler(data)
    } catch {
      // ignore
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage)
  }

  return () => {
    ch?.removeEventListener('message', onMessage)
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage)
    }
  }
}
