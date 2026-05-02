const STORAGE_KEY = 'plashki_access_token'

let accessToken: string | null = null

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

export function setAccessToken(token: string | null): void {
  const trimmed = token?.trim() || null
  accessToken = trimmed
  if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed)
  else localStorage.removeItem(STORAGE_KEY)
}

/** Вызвать при старте приложения (main.ts). */
export function loadAccessTokenFromStorage(): void {
  const raw = localStorage.getItem(STORAGE_KEY)
  accessToken = raw?.trim() || null
  if (!accessToken) localStorage.removeItem(STORAGE_KEY)
}

/** Токен для запроса: память + localStorage, синхронизация и trim. */
function tokenForRequest(): string | null {
  const fromLs = localStorage.getItem(STORAGE_KEY)?.trim() || null
  const fromMem = accessToken?.trim() || null
  const t = fromMem || fromLs
  if (t && !fromMem && fromLs) accessToken = fromLs
  return t
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
  const t = tokenForRequest()
  if (t && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${t}`)
  }
  const res = await fetch(joinBase(path), { ...init, headers })
  if (!res.ok) {
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
  const t = tokenForRequest()
  if (t && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${t}`)
  }
  const res = await fetch(joinBase(path), {
    ...init,
    method: init?.method ?? 'POST',
    body: form,
    headers,
  })
  if (!res.ok) {
    const text = await res.text()
    const message = text ? normalizeApiErrorMessage(messageFromErrorBody(text)) : `${res.status} ${res.statusText}`
    throw new ApiError(res.status, message)
  }
  return parseSuccessBody<T>(res)
}
