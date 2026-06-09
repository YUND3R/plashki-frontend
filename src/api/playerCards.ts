import { apiFetch, apiFetchFormData, apiFetchJson } from './client'
import {
  normalizePhotoCrop,
  normalizePhotoLayouts,
  type PhotoCrop,
  type PhotoLayouts,
} from '@/utils/photoCrop'

export type { PhotoLayouts }

export type PlayerCard = {
  id: string
  owner_user_id: string
  first_name: string
  last_name: string
  nickname: string
  club: string | null
  gomafia_url: string | null
  photo_urls: string[]
  photo_layouts?: PhotoLayouts | null
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

export type PlayerCardPatch = Partial<PlayerCardWrite> & {
  photo_layouts?: PhotoLayouts
}

function normalizePhotoUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter(Boolean)
}

function normalizePlayerCard(raw: unknown): PlayerCard | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id.trim() : ''
  if (!id) return null
  return {
    id,
    owner_user_id: typeof row.owner_user_id === 'string' ? row.owner_user_id : '',
    first_name: typeof row.first_name === 'string' ? row.first_name : '',
    last_name: typeof row.last_name === 'string' ? row.last_name : '',
    nickname: typeof row.nickname === 'string' ? row.nickname : '',
    club: typeof row.club === 'string' ? row.club : null,
    gomafia_url: typeof row.gomafia_url === 'string' ? row.gomafia_url : null,
    photo_urls: normalizePhotoUrls(row.photo_urls),
    photo_layouts: normalizePhotoLayouts(row.photo_layouts),
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : '',
  }
}

function base(ownerUserId: string) {
  return `/users/${ownerUserId}/player-cards`
}

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

export function listPlayerCards(ownerUserId: string) {
  return apiFetch<unknown[]>(base(ownerUserId)).then((rows) =>
    rows.map((row) => normalizePlayerCard(row)).filter((row): row is PlayerCard => !!row),
  )
}

export function createPlayerCard(ownerUserId: string, body: PlayerCardWrite) {
  return apiFetchJson<unknown>(base(ownerUserId), body, { method: 'POST' }).then((data) => {
    const card = normalizePlayerCard(data)
    if (!card) throw new Error('Некорректный ответ при создании карточки')
    return card
  })
}

/** POST …/photo - multipart: file + x_pct, y_pct, zoom */
export async function uploadPlayerCardPhoto(
  ownerUserId: string,
  cardId: string,
  file: File,
  crop: PhotoCrop = normalizePhotoCrop(null),
): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('x_pct', String(crop.x_pct))
  fd.append('y_pct', String(crop.y_pct))
  fd.append('zoom', String(crop.zoom))
  const path = `${base(ownerUserId)}/${cardId}/photo`
  const data = await apiFetchFormData<unknown>(path, fd)
  return parseUploadPhotoResponse(data)
}

export async function uploadPlayerCardPhotos(
  ownerUserId: string,
  cardId: string,
  files: File[],
  crop: PhotoCrop = normalizePhotoCrop(null),
): Promise<string[]> {
  const urls: string[] = []
  for (const f of files) {
    urls.push(await uploadPlayerCardPhoto(ownerUserId, cardId, f, crop))
  }
  return urls
}

export function getPlayerCard(ownerUserId: string, cardId: string) {
  return apiFetch<unknown>(`${base(ownerUserId)}/${cardId}`).then((data) => {
    const card = normalizePlayerCard(data)
    if (!card) throw new Error('Некорректная карточка игрока')
    return card
  })
}

export function replacePlayerCard(ownerUserId: string, cardId: string, body: PlayerCardWrite) {
  return apiFetchJson<unknown>(`${base(ownerUserId)}/${cardId}`, body, { method: 'PUT' }).then((data) => {
    const card = normalizePlayerCard(data)
    if (!card) throw new Error('Некорректный ответ при обновлении карточки')
    return card
  })
}

export function patchPlayerCard(ownerUserId: string, cardId: string, body: PlayerCardPatch) {
  return apiFetchJson<unknown>(`${base(ownerUserId)}/${cardId}`, body, { method: 'PATCH' }).then((data) => {
    const card = normalizePlayerCard(data)
    if (!card) throw new Error('Некорректный ответ при обновлении карточки')
    return card
  })
}

export function deletePlayerCard(ownerUserId: string, cardId: string) {
  return apiFetch<void>(`${base(ownerUserId)}/${cardId}`, { method: 'DELETE' })
}

/** Сохранить кадрирование для уже загруженного URL. */
export async function patchPlayerCardPhotoLayout(
  ownerUserId: string,
  cardId: string,
  photoUrl: string,
  crop: PhotoCrop,
  existingLayouts?: PhotoLayouts | null,
): Promise<PlayerCard> {
  const url = photoUrl.trim()
  const layouts = { ...(existingLayouts ?? {}), [url]: normalizePhotoCrop(crop) }
  return patchPlayerCard(ownerUserId, cardId, { photo_layouts: layouts })
}
