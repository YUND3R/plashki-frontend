export function formatDesignPriceRub(priceRub: number): string {
  const value = Number.isFinite(priceRub) ? Math.max(0, Math.round(priceRub)) : 0
  return `${value} ₽`
}

export function formatRentalHours(hours: number): string {
  const value = Number.isFinite(hours) ? Math.max(0, Math.round(hours)) : 0
  if (value <= 0) return '—'
  return `${value} ч`
}

export function formatDesignRentalLabel(rentalHours: number): string {
  return `Аренда: ${formatRentalHours(rentalHours)}`
}

export function formatDesignAccessExpires(iso: string | null | undefined): string | null {
  const raw = (iso ?? '').trim()
  if (!raw) return null
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDesignAccessLabel(iso: string | null | undefined): string | null {
  const formatted = formatDesignAccessExpires(iso)
  return formatted ? `Доступ до: ${formatted}` : null
}
