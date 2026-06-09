/** Параметры кадрирования одного фото (совпадает с photo_layouts на бэке). */
export type PhotoCrop = {
  x_pct: number
  y_pct: number
  zoom: number
}

export const DEFAULT_PHOTO_CROP: PhotoCrop = {
  x_pct: 50,
  y_pct: 50,
  zoom: 1,
}

export type PhotoLayouts = Record<string, PhotoCrop>

export function normalizePhotoCrop(raw: Partial<PhotoCrop> | null | undefined): PhotoCrop {
  const x = Number(raw?.x_pct)
  const y = Number(raw?.y_pct)
  const z = Number(raw?.zoom)
  return {
    x_pct: Number.isFinite(x) ? Math.min(142, Math.max(-42, x)) : DEFAULT_PHOTO_CROP.x_pct,
    y_pct: Number.isFinite(y) ? Math.min(142, Math.max(-42, y)) : DEFAULT_PHOTO_CROP.y_pct,
    zoom: Number.isFinite(z) ? Math.min(3, Math.max(1, z)) : DEFAULT_PHOTO_CROP.zoom,
  }
}

export function normalizePhotoLayouts(raw: unknown): PhotoLayouts | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: PhotoLayouts = {}
  for (const [url, value] of Object.entries(raw as Record<string, unknown>)) {
    const key = url.trim()
    if (!key || !value || typeof value !== 'object') continue
    const row = value as Record<string, unknown>
    out[key] = normalizePhotoCrop({
      x_pct: Number(row.x_pct),
      y_pct: Number(row.y_pct),
      zoom: Number(row.zoom),
    })
  }
  return Object.keys(out).length ? out : null
}

function photoUrlLookupVariants(url: string): string[] {
  const u = url.trim()
  if (!u) return []
  const variants = new Set<string>([u])
  try {
    variants.add(decodeURIComponent(u))
  } catch {
    // ignore
  }
  variants.add(u.replace(/\/$/, ''))
  const q = u.indexOf('?')
  if (q > 0) variants.add(u.slice(0, q))
  return [...variants]
}

function photoUrlPathname(url: string): string | null {
  try {
    return new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
      .pathname
  } catch {
    return null
  }
}

/** Найти кадр по URL с учётом расхождений в query/path между API и лобби. */
export function findPhotoLayoutForUrl(
  layouts: PhotoLayouts | null | undefined,
  url: string,
): PhotoCrop | null {
  if (!layouts || !url.trim()) return null
  for (const variant of photoUrlLookupVariants(url)) {
    const hit = layouts[variant]
    if (hit) return normalizePhotoCrop(hit)
  }
  const targetPath = photoUrlPathname(url)
  if (!targetPath) return null
  for (const [key, layout] of Object.entries(layouts)) {
    const keyPath = photoUrlPathname(key)
    if (keyPath && keyPath === targetPath) return normalizePhotoCrop(layout)
  }
  return null
}
