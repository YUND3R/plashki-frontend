export const AUTH_REQUIRED_MESSAGE = 'Вы не зарегистрированы или не авторизованы.'
export const NETWORK_LOST_MESSAGE = 'Соединение потеряно'
export const DEFAULT_UI_ERROR_MESSAGE = 'Не удалось выполнить действие. Попробуйте еще раз.'

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** Нормализуем «технические» auth-сообщения бэка в понятный текст для UI. */
export function normalizeApiErrorMessage(rawMessage: string): string {
  const message = normalizeSpaces(rawMessage)
  if (!message) return message

  if (/failed\s+to\s+fetch|networkerror|load failed|network request failed/i.test(message)) {
    return NETWORK_LOST_MESSAGE
  }

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

  if (/^duplicate_player_in_game$/i.test(message)) {
    return 'Один игрок не может занимать два места за столом.'
  }

  if (/^player_not_in_rating$/i.test(message)) {
    return 'Выбран игрок, которого нет в этом рейтинге.'
  }

  if (/^player_not_in_game$/i.test(message)) {
    return 'Игрок не найден в выбранной игре.'
  }

  if (/^rating_not_found$|^game_not_found$|^not_found$/i.test(message) || /not found/i.test(message)) {
    return 'Ничего не найдено. Обновите страницу и попробуйте снова.'
  }

  if (/forbidden|403|недостаточно\s+прав|нет\s+прав/i.test(message)) {
    return 'Недостаточно прав для этого действия.'
  }

  if (/bad request|400\b/i.test(message)) {
    return 'Проверьте введенные данные и попробуйте снова.'
  }

  if (/unprocessable entity|422\b|validation error|field required|value error/i.test(message)) {
    return 'Проверьте заполнение полей и повторите отправку.'
  }

  if (/too many requests|429\b/i.test(message)) {
    return 'Слишком много запросов. Подождите немного и попробуйте снова.'
  }

  if (/timeout|timed out|gateway timeout|504\b/i.test(message)) {
    return 'Сервер отвечает слишком долго. Попробуйте еще раз.'
  }

  if (/internal server error|500\b|502\b|503\b|service unavailable|database|integrityerror/i.test(message)) {
    return 'Сервис временно недоступен. Попробуйте чуть позже.'
  }

  if (/csrf|token|invalid token|signature|session/i.test(message)) {
    return 'Сессия устарела. Обновите страницу и войдите снова.'
  }

  if (/^http error/i.test(message)) {
    return DEFAULT_UI_ERROR_MESSAGE
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
  const normalized = normalizeApiErrorMessage((message ?? '').trim())
  if (normalized === NETWORK_LOST_MESSAGE) return NETWORK_LOST_MESSAGE
  if (normalized === DEFAULT_UI_ERROR_MESSAGE) return 'Ошибка запроса'
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
