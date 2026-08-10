import type { UserMe } from './auth'
import { apiFetchFormData, apiFetchJson } from './client'

export type ChangeEmailRequestBody = {
  new_email: string
  current_password: string
}

export type ChangeEmailConfirmBody = {
  token_id: string
  signature: string
}

export type MessageResponse = {
  message?: string
}

export type PatchMeProfileBody = {
  first_name: string
  last_name: string
}

/** Запрос на смену email: сервер отправляет письмо подтверждения на новую почту. */
export async function requestEmailChange(body: ChangeEmailRequestBody): Promise<MessageResponse> {
  return apiFetchJson<MessageResponse>('/auth/change-email/request', body, { method: 'POST' })
}

/** Подтверждение смены email по токену из ссылки. */
export async function confirmEmailChange(body: ChangeEmailConfirmBody): Promise<MessageResponse> {
  return apiFetchJson<MessageResponse>('/auth/change-email/confirm', body, { method: 'POST' })
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
