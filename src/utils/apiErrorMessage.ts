export const AUTH_REQUIRED_MESSAGE = 'Вы не зарегистрированы или не авторизованы.'

/** Нормализуем «технические» auth-сообщения бэка в понятный текст для UI. */
export function normalizeApiErrorMessage(rawMessage: string): string {
  const message = rawMessage.trim()
  if (!message) return message

  if (
    message === 'Авторизуйтесь или зарегистрируйтесь.' ||
    message === 'Вы не авторизованы или не зарегистрированы.'
  ) {
    return AUTH_REQUIRED_MESSAGE
  }

  if (/Authorization:\s*Bearer\s*(<token>|&lt;token&gt;)/i.test(message)) {
    return AUTH_REQUIRED_MESSAGE
  }

  if (
    /cookie.*access\s*token|access\s*token.*cookie|нужна\s+авторизация.*cookie|cookie\s+с\s+access/i.test(
      message,
    )
  ) {
    return AUTH_REQUIRED_MESSAGE
  }

  if (/^not\s+authenticated$/i.test(message) || /^unauthorized$/i.test(message)) {
    return AUTH_REQUIRED_MESSAGE
  }

  return message
}

export type PageErrorKind = 'auth' | 'forbidden' | 'error'

export function isAuthRelatedError(message: string | null | undefined): boolean {
  const normalized = normalizeApiErrorMessage((message ?? '').trim())
  if (normalized === AUTH_REQUIRED_MESSAGE) return true
  return /не\s+авторизован|авториз|войдите|вход в аккаунт|регистриру/i.test(normalized)
}

export function isForbiddenError(message: string | null | undefined): boolean {
  const normalized = (message ?? '').trim().toLowerCase()
  if (!normalized) return false
  return (
    /доступ только|forbidden|403|нет прав|недостаточно прав|not enough permissions/.test(
      normalized,
    )
  )
}

export function getPageErrorKind(message: string | null | undefined): PageErrorKind {
  if (isForbiddenError(message)) return 'forbidden'
  if (isAuthRelatedError(message)) return 'auth'
  return 'error'
}

export function getPageErrorTitle(message: string | null | undefined, kind?: PageErrorKind): string {
  const resolvedKind = kind ?? getPageErrorKind(message)
  switch (resolvedKind) {
    case 'auth':
      return AUTH_REQUIRED_MESSAGE
    case 'forbidden':
      return 'Нет доступа'
    default:
      return 'Что-то пошло не так'
  }
}
