const STORAGE_KEY_PREFIX = 'overlay:persistent-message'
export type OverlayTextTone = 'green' | 'yellow' | 'red' | 'white'

export type OverlayPersistentMessage = {
  text: string
  color: OverlayTextTone
}

function safeTrim(value: string): string {
  return value.trim()
}

export function normalizeOverlayDesignCode(rawDesignCode: string): string {
  const code = safeTrim(rawDesignCode).toLowerCase()
  if (code === 'masters') return 'masters-yug25'
  if (code === 'masters-yug25') return code
  if (code === 'plus') return code
  return 'classic'
}

export function overlayPersistentMessageStorageKey(lobbyId: string, rawDesignCode: string): string {
  const id = safeTrim(lobbyId)
  const designCode = normalizeOverlayDesignCode(rawDesignCode)
  return `${STORAGE_KEY_PREFIX}:${id}:${designCode}`
}

function normalizeOverlayTextTone(raw: unknown): OverlayTextTone {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (value === 'white') return 'white'
  if (value === 'yellow') return 'yellow'
  if (value === 'red') return 'red'
  return 'green'
}

export function readOverlayPersistentMessage(
  lobbyId: string,
  rawDesignCode: string,
): OverlayPersistentMessage {
  const id = safeTrim(lobbyId)
  if (!id) return { text: '', color: 'green' }
  try {
    const raw = localStorage.getItem(overlayPersistentMessageStorageKey(id, rawDesignCode))
    if (!raw) return { text: '', color: 'green' }
    try {
      const data = JSON.parse(raw) as Partial<OverlayPersistentMessage>
      const text = typeof data.text === 'string' ? data.text.trim() : ''
      return {
        text,
        color: normalizeOverlayTextTone(data.color),
      }
    } catch {
      return {
        text: raw.trim(),
        color: 'green',
      }
    }
  } catch {
    return { text: '', color: 'green' }
  }
}

export function writeOverlayPersistentMessage(
  lobbyId: string,
  rawDesignCode: string,
  message: OverlayPersistentMessage,
): void {
  const id = safeTrim(lobbyId)
  if (!id) return
  const key = overlayPersistentMessageStorageKey(id, rawDesignCode)
  const value = message.text.trim()
  try {
    if (value) {
      localStorage.setItem(
        key,
        JSON.stringify({
          text: value,
          color: normalizeOverlayTextTone(message.color),
        } satisfies OverlayPersistentMessage),
      )
      return
    }
    localStorage.removeItem(key)
  } catch {
    // Ignore storage errors (private mode / quota / blocked storage).
  }
}
