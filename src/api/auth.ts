import { apiFetch, apiFetchFormData, apiFetchJson, setAccessToken } from './client'

export type TokenResponse = {
  access_token: string
  token_type: string
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
  access_token?: string
  token_type?: string
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

export async function login(loginValue: string, password: string): Promise<TokenResponse> {
  const data = await apiFetchJson<TokenResponse>('/auth/login', { login: loginValue, password })
  setAccessToken(data.access_token)
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

  const data = await apiFetchFormData<RegisterResponse>('/auth/register', form)
  if (data.access_token) {
    setAccessToken(data.access_token)
  }
  return data
}

export async function me(): Promise<UserMe> {
  return apiFetch<UserMe>('/auth/me')
}

export async function forgotPassword(email: string): Promise<MessageResponse> {
  return apiFetchJson<MessageResponse>('/auth/forgot-password', { email })
}

export async function resendVerification(email: string): Promise<MessageResponse> {
  return apiFetchJson<MessageResponse>('/auth/resend-verification', { email })
}

export async function verifyEmail(payload: SignedTokenPayload | LegacyVerifyEmailPayload): Promise<MessageResponse> {
  return apiFetchJson<MessageResponse>('/auth/verify-email', payload)
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

export function logout(): void {
  setAccessToken(null)
}
