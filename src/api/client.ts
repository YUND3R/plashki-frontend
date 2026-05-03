const COOKIE_SESSION_MARKER = '__cookie_session__'
const CSRF_COOKIE_NAME = (import.meta.env.VITE_CSRF_COOKIE_NAME ?? 'plashki_csrf_token').trim()
const CSRF_HEADER_NAME = 'X-CSRF-Token'

let accessToken: string | null = null
let unauthorizedRedirectInProgress = false
let authBootstrapInProgress = true

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getAccessToken(): string | null {
  return accessToken
}

export function isCookieAuthMode(): boolean {
  return true
}

export function markCookieSessionAuthenticated(): void {
  accessToken = COOKIE_SESSION_MARKER
}

export function setAccessToken(token: string | null): void {
  accessToken = token?.trim() ? COOKIE_SESSION_MARKER : null
}

export function loadAccessTokenFromStorage(): void {
  accessToken = null
}

export function finishAuthBootstrap(): void {
  authBootstrapInProgress = false
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const cookieName = name.trim()
  if (!cookieName) return null
  const row = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${cookieName}=`))
  if (!row) return null
  const [, rawValue = ''] = row.split('=')
  try {
    return decodeURIComponent(rawValue)
  } catch {
    return rawValue
  }
}

function methodOf(init?: RequestInit): string {
  return (init?.method ?? 'GET').trim().toUpperCase()
}

function isMutatingMethod(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
}

function withAuthRequestInit(init?: RequestInit): RequestInit {
  return { ...(init ?? {}), credentials: init?.credentials ?? 'include' }
}

function shouldSkipUnauthorizedRedirect(apiPath: string): boolean {
  const p = apiPath.trim().toLowerCase()
  if (!p) return false
  return (
    p.startsWith('/auth/login') ||
    p.startsWith('/auth/register') ||
    p.startsWith('/auth/forgot-password') ||
    p.startsWith('/auth/verify-email') ||
    p.startsWith('/auth/reset-password') ||
    p.startsWith('/auth/logout')
  )
}

function handleUnauthorized(apiPath: string): void {
  const hadAuthenticatedSession = accessToken === COOKIE_SESSION_MARKER
  setAccessToken(null)
  if (typeof window === 'undefined') return
  if (!hadAuthenticatedSession) return
  const normalizedPath = apiPath.trim().toLowerCase()
  if (authBootstrapInProgress && normalizedPath.startsWith('/auth/me')) return
  if (shouldSkipUnauthorizedRedirect(apiPath)) return
  const current = window.location.pathname.toLowerCase()
  if (
    current.startsWith('/login') ||
    current.startsWith('/register') ||
    current.startsWith('/forgot-password') ||
    current.startsWith('/reset-password') ||
    current.startsWith('/verify-email')
  ) {
    return
  }
  if (unauthorizedRedirectInProgress) return
  unauthorizedRedirectInProgress = true
  window.location.assign('/login')
}

function joinBase(path: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

/** Нормализуем «технические» auth-сообщения бэка в понятный текст для UI. */
function normalizeApiErrorMessage(rawMessage: string): string {
  const message = rawMessage.trim()
  if (!message) return message
  if (/Authorization:\s*Bearer\s*(<token>|&lt;token&gt;)/i.test(message)) {
    return 'Авторизуйтесь или зарегистрируйтесь.'
  }
  return message
}

/** Текст ошибки из тела ответа (FastAPI: `{ "detail": "..." }` или список валидации). */
function messageFromErrorBody(body: string): string {
  const raw = body.trim()
  if (!raw.startsWith('{')) return raw

  try {
    const j = JSON.parse(raw) as Record<string, unknown>
    const detail = j.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      const parts = detail.map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: unknown }).msg)
        }
        return ''
      })
      const joined = parts.filter(Boolean).join('; ')
      if (joined) return joined
    }
  } catch {
    /* не JSON — вернём как есть */
  }
  return raw
}

async function parseSuccessBody<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T
  const ct = res.headers.get('content-type')?.toLowerCase() ?? ''
  if (ct.includes('application/json')) {
    const raw = await res.text()
    if (!raw.trim()) return undefined as T
    return JSON.parse(raw) as T
  }
  return (await res.text()) as T
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  const method = methodOf(init)
  if (isMutatingMethod(method) && !headers.has(CSRF_HEADER_NAME)) {
    const csrfToken = getCookie(CSRF_COOKIE_NAME)
    if (csrfToken) headers.set(CSRF_HEADER_NAME, csrfToken)
  }
  const requestInit = withAuthRequestInit(init)
  const res = await fetch(joinBase(path), { ...requestInit, headers })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized(path)
    const text = await res.text()
    const message = text ? normalizeApiErrorMessage(messageFromErrorBody(text)) : `${res.status} ${res.statusText}`
    throw new ApiError(res.status, message)
  }
  return parseSuccessBody<T>(res)
}

export async function apiFetchJson<T>(
  path: string,
  body: unknown,
  init?: Omit<RequestInit, 'body'>,
): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  return apiFetch<T>(path, {
    ...init,
    method: init?.method ?? 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

/** Multipart: не задавать Content-Type вручную (нужен boundary). */
export async function apiFetchFormData<T>(
  path: string,
  form: FormData,
  init?: Omit<RequestInit, 'body'>,
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  const method = methodOf(init)
  if (isMutatingMethod(method) && !headers.has(CSRF_HEADER_NAME)) {
    const csrfToken = getCookie(CSRF_COOKIE_NAME)
    if (csrfToken) headers.set(CSRF_HEADER_NAME, csrfToken)
  }
  const requestInit = withAuthRequestInit(init)
  const res = await fetch(joinBase(path), {
    ...requestInit,
    method: requestInit.method ?? 'POST',
    body: form,
    headers,
  })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized(path)
    const text = await res.text()
    const message = text ? normalizeApiErrorMessage(messageFromErrorBody(text)) : `${res.status} ${res.statusText}`
    throw new ApiError(res.status, message)
  }
  return parseSuccessBody<T>(res)
}
