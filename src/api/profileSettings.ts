import type { UserMe } from './auth'
import { apiFetchFormData, apiFetchJson } from './client'

export type PatchProfileEmailBody = {
  email: string
}

export type PatchMeProfileBody = {
  first_name: string
  last_name: string
}

/**
 * Смена email: PATCH JSON, ответ 200/204.
 */
export async function patchProfileEmail(body: PatchProfileEmailBody): Promise<void> {
  await apiFetchJson<void>('/auth/me/email', body, { method: 'PATCH' })
}

/**
 * Имя и фамилия аккаунта: PATCH `/auth/me`, JSON.
 * При необходимости замените путь под ваш бэкенд.
 */
export async function patchMeProfile(body: PatchMeProfileBody): Promise<UserMe | undefined> {
  return apiFetchJson<UserMe | undefined>('/auth/me', body, { method: 'PATCH' })
}

/**
 * Фото профиля: PATCH multipart, поле файла `avatar`.
 * При необходимости замените путь (например `/auth/me` с FormData).
 */
export async function patchMeAvatar(file: File): Promise<UserMe | undefined> {
  const form = new FormData()
  form.set('avatar', file)
  return apiFetchFormData<UserMe | undefined>('/auth/me/avatar', form, { method: 'PATCH' })
}
