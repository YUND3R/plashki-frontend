import { apiFetch, apiFetchFormData, apiFetchJson } from './client'

export type PlayerCard = {
  id: string
  owner_user_id: string
  first_name: string
  last_name: string
  nickname: string
  club: string | null
  gomafia_url: string | null
  photo_urls: string[]
  created_at: string
  updated_at: string
}

export type PlayerCardWrite = {
  first_name: string
  last_name: string
  nickname: string
  club?: string | null
  gomafia_url?: string | null
  photo_urls?: string[]
}

export type PlayerCardPatch = Partial<PlayerCardWrite>

function base(ownerUserId: string) {
  return `/users/${ownerUserId}/player-cards`
}

export function listPlayerCards(ownerUserId: string) {
  return apiFetch<PlayerCard[]>(base(ownerUserId))
}

export function createPlayerCard(ownerUserId: string, body: PlayerCardWrite) {
  return apiFetchJson<PlayerCard>(base(ownerUserId), body, { method: 'POST' })
}

/** Ответ POST …/photo: JSON с url или обновлённая карточка с `photo_urls`. */
function parseUploadPhotoResponse(data: unknown): string {
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    for (const key of ['url', 'file_url', 'public_url', 'href'] as const) {
      const v = o[key]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    const pu = o.photo_urls
    if (Array.isArray(pu)) {
      for (let i = pu.length - 1; i >= 0; i--) {
        const u = pu[i]
        if (typeof u === 'string' && u.trim()) return u.trim()
      }
    }
  }
  throw new Error(
    'Сервер не вернул URL загруженного файла (ожидались поля url / file_url / … или массив photo_urls)',
  )
}

/** POST `/users/{owner}/player-cards/{cardId}/photo` — multipart, поле `file`. */
export async function uploadPlayerCardPhoto(
  ownerUserId: string,
  cardId: string,
  file: File,
): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const path = `${base(ownerUserId)}/${cardId}/photo`
  const data = await apiFetchFormData<unknown>(path, fd)
  return parseUploadPhotoResponse(data)
}

export async function uploadPlayerCardPhotos(
  ownerUserId: string,
  cardId: string,
  files: File[],
): Promise<string[]> {
  const urls: string[] = []
  for (const f of files) {
    urls.push(await uploadPlayerCardPhoto(ownerUserId, cardId, f))
  }
  return urls
}

export function getPlayerCard(ownerUserId: string, cardId: string) {
  return apiFetch<PlayerCard>(`${base(ownerUserId)}/${cardId}`)
}

export function replacePlayerCard(ownerUserId: string, cardId: string, body: PlayerCardWrite) {
  return apiFetchJson<PlayerCard>(`${base(ownerUserId)}/${cardId}`, body, { method: 'PUT' })
}

export function patchPlayerCard(ownerUserId: string, cardId: string, body: PlayerCardPatch) {
  return apiFetchJson<PlayerCard>(`${base(ownerUserId)}/${cardId}`, body, { method: 'PATCH' })
}

export function deletePlayerCard(ownerUserId: string, cardId: string) {
  return apiFetch<void>(`${base(ownerUserId)}/${cardId}`, { method: 'DELETE' })
}
