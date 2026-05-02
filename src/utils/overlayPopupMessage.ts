import {
  normalizeOverlayDesignCode,
  type OverlayTextTone,
} from '@/utils/overlayPersistentMessage'

const STORAGE_KEY_PREFIX = 'overlay:popup-message'

export type OverlayPopupMessage = {
  id: string
  h1: string
  h2: string
  h1_color: OverlayTextTone
  h2_color: OverlayTextTone
  duration_ms: number
  created_at_ms: number
}

function safeTrim(value: string): string {
  return value.trim()
}

function normalizeDurationMs(value: number): number {
  if (!Number.isFinite(value)) return 7000
  const rounded = Math.round(value)
  if (rounded < 1000) return 1000
  if (rounded > 120000) return 120000
  return rounded
}

function normalizeOverlayTextTone(raw: unknown): OverlayTextTone {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (value === 'white') return 'white'
  if (value === 'yellow') return 'yellow'
  if (value === 'red') return 'red'
  return 'green'
}

export function overlayPopupMessageStorageKey(lobbyId: string, rawDesignCode: string): string {
  const id = safeTrim(lobbyId)
  const designCode = normalizeOverlayDesignCode(rawDesignCode)
  return `${STORAGE_KEY_PREFIX}:${id}:${designCode}`
}

export function createOverlayPopupMessageDraft(input: {
  h1: string
  h2: string
  h1_color: OverlayTextTone
  h2_color: OverlayTextTone
  duration_ms: number
}): OverlayPopupMessage {
  const now = Date.now()
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 10)}`,
    h1: input.h1.trim(),
    h2: input.h2.trim(),
    h1_color: normalizeOverlayTextTone(input.h1_color),
    h2_color: normalizeOverlayTextTone(input.h2_color),
    duration_ms: normalizeDurationMs(input.duration_ms),
    created_at_ms: now,
  }
}

export function readOverlayPopupMessage(
  lobbyId: string,
  rawDesignCode: string,
): OverlayPopupMessage | null {
  const id = safeTrim(lobbyId)
  if (!id) return null
  try {
    const raw = localStorage.getItem(overlayPopupMessageStorageKey(id, rawDesignCode))
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<OverlayPopupMessage>
    const h1 = typeof data.h1 === 'string' ? data.h1.trim() : ''
    const h2 = typeof data.h2 === 'string' ? data.h2.trim() : ''
    const messageId = typeof data.id === 'string' ? data.id.trim() : ''
    if (!messageId || (!h1 && !h2)) return null
    return {
      id: messageId,
      h1,
      h2,
      h1_color: normalizeOverlayTextTone(data.h1_color),
      h2_color: normalizeOverlayTextTone(data.h2_color),
      duration_ms: normalizeDurationMs(Number(data.duration_ms)),
      created_at_ms: Number.isFinite(Number(data.created_at_ms)) ? Number(data.created_at_ms) : Date.now(),
    }
  } catch {
    return null
  }
}

export function writeOverlayPopupMessage(
  lobbyId: string,
  rawDesignCode: string,
  message: OverlayPopupMessage,
): void {
  const id = safeTrim(lobbyId)
  if (!id) return
  try {
    localStorage.setItem(overlayPopupMessageStorageKey(id, rawDesignCode), JSON.stringify(message))
  } catch {
    // Ignore storage errors (private mode / quota / blocked storage).
  }
}
