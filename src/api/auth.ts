import { apiFetch, apiFetchFormData, apiFetchJson, markCookieSessionAuthenticated, setAccessToken } from './client'

export type TokenResponse = {
  message?: string
}

export type MessageResponse = {
  message: string
}

export type LegacyVerifyEmailPayload = {
  token?: string
  code?: string
}

export type SignedTokenPayload = {
  token_id: string
  signature: string
}

export type RegisterResponse = {
  message?: string
}

export type SubscriptionTier = 'basic' | 'standard' | 'premium'

export type UserMe = {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  avatar_url?: string | null
  nickname: string
  role: string
  /** Если бэкенд не шлёт — на фронте считаем «Базовый». */
  subscription_tier?: SubscriptionTier
}

export type AdminUser = {
  id: string
  username: string
  email: string
  first_name?: string | null
  last_name?: string | null
  role?: string | null
  subscription_tier?: SubscriptionTier | string | null
  created_at?: string | null
}

export async function login(loginValue: string, password: string): Promise<TokenResponse> {
  const data = await apiFetchJson<TokenResponse>('/auth/login', { login: loginValue, password })
  markCookieSessionAuthenticated()
  return data
}

export async function register(
  username: string,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  avatarFile: File | null,
): Promise<RegisterResponse> {
  const form = new FormData()
  form.set('username', username)
  form.set('email', email)
  form.set('password', password)
  form.set('first_name', firstName)
  form.set('last_name', lastName)
  if (avatarFile) form.set('avatar', avatarFile)

  return apiFetchFormData<RegisterResponse>('/auth/register', form)
}

export async function me(): Promise<UserMe> {
  return apiFetch<UserMe>('/auth/me')
}

/** ADMIN-only: список всех зарегистрированных пользователей. */
export async function listAdminUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/admin/users')
}

export async function forgotPassword(email: string): Promise<MessageResponse> {
  return apiFetchJson<MessageResponse>('/auth/forgot-password', { email })
}

export async function resendVerification(email: string): Promise<MessageResponse> {
  return apiFetchJson<MessageResponse>('/auth/resend-verification', { email })
}

export async function verifyEmail(payload: SignedTokenPayload | LegacyVerifyEmailPayload): Promise<MessageResponse> {
  const data = await apiFetchJson<MessageResponse>('/auth/verify-email', payload)
  markCookieSessionAuthenticated()
  return data
}

export async function resetPassword(
  payload: { newPassword: string } & (SignedTokenPayload | { token: string }),
): Promise<MessageResponse> {
  const body =
    'token' in payload
      ? { token: payload.token, new_password: payload.newPassword }
      : {
          token_id: payload.token_id,
          signature: payload.signature,
          new_password: payload.newPassword,
        }
  return apiFetchJson<MessageResponse>('/auth/reset-password', body)
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<unknown>('/auth/logout', { method: 'POST' })
  } finally {
    setAccessToken(null)
  }
}
