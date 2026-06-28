import type { LobbyPlayer } from '@/api/lobbies'
import type { PlayerCard } from '@/api/playerCards'
import { findPhotoLayoutForUrl } from '@/utils/photoCrop'

/** Совпадает с полезной нагрузкой API для одного фото в кадре. */
export type PlayerCardPhotoFrame = {
  x_pct: number
  y_pct: number
  /** От 1 до 3 - «зум» поверх cover. */
  zoom: number
}

type LobbyPlayerWithLayouts = LobbyPlayer & {
  photo_layouts?: Record<string, PlayerCardPhotoFrame> | null
  display_photo_layout?: PlayerCardPhotoFrame | null
}

export const DEFAULT_PLAYER_CARD_PHOTO_FRAME: PlayerCardPhotoFrame = {
  x_pct: 50,
  y_pct: 50,
  zoom: 1,
}
const MIN_PLAYER_CARD_ZOOM = 0.35
const MAX_PLAYER_CARD_ZOOM = 3

/** Точка исходного фото, которая должна попасть в центр рамки. */
export const PLAYER_CARD_OBJECT_POS_PCT_MIN = 0
export const PLAYER_CARD_OBJECT_POS_PCT_MAX = 100

export function normalizePlayerCardPhotoFrame(
  raw: Partial<PlayerCardPhotoFrame> | null | undefined,
): PlayerCardPhotoFrame {
  const x = Number(raw?.x_pct)
  const y = Number(raw?.y_pct)
  const z = Number(raw?.zoom)
  return {
    x_pct: Number.isFinite(x)
      ? Math.min(PLAYER_CARD_OBJECT_POS_PCT_MAX, Math.max(PLAYER_CARD_OBJECT_POS_PCT_MIN, x))
      : DEFAULT_PLAYER_CARD_PHOTO_FRAME.x_pct,
    y_pct: Number.isFinite(y)
      ? Math.min(PLAYER_CARD_OBJECT_POS_PCT_MAX, Math.max(PLAYER_CARD_OBJECT_POS_PCT_MIN, y))
      : DEFAULT_PLAYER_CARD_PHOTO_FRAME.y_pct,
    zoom: Number.isFinite(z)
      ? Math.min(MAX_PLAYER_CARD_ZOOM, Math.max(MIN_PLAYER_CARD_ZOOM, z))
      : DEFAULT_PLAYER_CARD_PHOTO_FRAME.zoom,
  }
}

/** Размеры контейнера и натуральное разрешение - для точного абсолютного рендера фото. */
export type PhotoFrameImgStyleMeta = {
  cw: number
  ch: number
  nw: number
  nh: number
}

export function photoFrameRenderedSize(
  frame: PlayerCardPhotoFrame | null | undefined,
  meta: PhotoFrameImgStyleMeta,
): { width: number; height: number } {
  const f = normalizePlayerCardPhotoFrame(frame)
  const W = Math.max(1, meta.cw)
  const H = Math.max(1, meta.ch)
  const nw = Math.max(1, meta.nw)
  const nh = Math.max(1, meta.nh)
  const coverScale = Math.max(W / nw, H / nh)
  return {
    width: nw * coverScale * f.zoom,
    height: nh * coverScale * f.zoom,
  }
}

/**
 * Единая модель кадра:
 * x_pct/y_pct - точка исходного фото, которая попадает в центр рамки.
 * zoom - масштаб относительно заполнения рамки. В модалке и overlay используется один CSS.
 */
export function photoFrameImgStyle(
  frame: PlayerCardPhotoFrame | null | undefined,
  meta?: PhotoFrameImgStyleMeta | null,
): Record<string, string> {
  const f = normalizePlayerCardPhotoFrame(frame)

  const hasMeta =
    !!meta &&
    meta.nw >= 1 &&
    meta.nh >= 1 &&
    meta.cw >= 8 &&
    meta.ch >= 8 &&
    Number.isFinite(meta.nw + meta.nh + meta.cw + meta.ch)

  if (!hasMeta) {
    return {
      objectFit: 'cover',
      objectPosition: `${f.x_pct}% ${f.y_pct}%`,
      transform: `scale(${f.zoom})`,
      transformOrigin: 'center center',
    }
  }

  const { width, height } = photoFrameRenderedSize(f, meta!)
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: `${+width.toFixed(3)}px`,
    height: `${+height.toFixed(3)}px`,
    maxWidth: 'none',
    maxHeight: 'none',
    objectFit: 'fill',
    objectPosition: '50% 50%',
    transform: `translate(-${+f.x_pct.toFixed(3)}%, -${+f.y_pct.toFixed(3)}%)`,
    transformOrigin: '0 0',
  }
}

/** Кадр для основного фото карточки (первый URL). */
export function resolvePlayerCardMainPhotoFrame(
  c:
    | (PlayerCard & { photo_layouts?: Record<string, PlayerCardPhotoFrame> | null })
    | null
    | undefined,
): PlayerCardPhotoFrame {
  if (!c?.photo_urls?.length) return DEFAULT_PLAYER_CARD_PHOTO_FRAME
  const url = (c.photo_urls[0] ?? '').trim()
  if (!url) return DEFAULT_PLAYER_CARD_PHOTO_FRAME
  const fromMap = findPhotoLayoutForUrl(c.photo_layouts ?? null, url)
  return normalizePlayerCardPhotoFrame(fromMap ?? DEFAULT_PLAYER_CARD_PHOTO_FRAME)
}

/** Кадр для того URL, который реально показывается в строке игрока. */
export function resolveLobbyPlayerPhotoFrame(
  p: LobbyPlayer | null | undefined,
  shownPhotoUrl: string,
): PlayerCardPhotoFrame {
  if (!p) return DEFAULT_PLAYER_CARD_PHOTO_FRAME
  const shown = shownPhotoUrl.trim()
  if (!shown) return DEFAULT_PLAYER_CARD_PHOTO_FRAME
  const pl = p as LobbyPlayerWithLayouts
  const lobby = (pl.lobby_photo_url ?? '').trim()
  if (lobby && shown === lobby) {
    const fromDisplay =
      pl.display_photo_layout ?? findPhotoLayoutForUrl(pl.photo_layouts ?? null, shown)
    return normalizePlayerCardPhotoFrame(fromDisplay ?? DEFAULT_PLAYER_CARD_PHOTO_FRAME)
  }
  const fromLayouts = findPhotoLayoutForUrl(pl.photo_layouts ?? null, shown)
  if (fromLayouts) return normalizePlayerCardPhotoFrame(fromLayouts)
  return DEFAULT_PLAYER_CARD_PHOTO_FRAME
}

/** Какой URL фото показывать в overlay / лобби. */
export function rowPhoto(p: LobbyPlayer | null | undefined): string {
  if (!p) return ''
  const lobby = typeof p.lobby_photo_url === 'string' ? p.lobby_photo_url.trim() : ''
  if (lobby) return lobby
  const first = p.photo_urls?.[0]
  return typeof first === 'string' ? first.trim() : ''
}

/** Стили кадрирования под конкретный overlay-дизайн (рамка из overlayPhotoSpec). */
export function rowPhotoImgStyleForDesign(
  p: LobbyPlayer | null | undefined,
  _designCode: string,
): Record<string, string> {
  const url = rowPhoto(p)
  if (!url || !p) return {}
  const frame = resolveLobbyPlayerPhotoFrame(p, url)
  return photoFrameImgStyle(frame)
}
