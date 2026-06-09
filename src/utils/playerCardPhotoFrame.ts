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

/** Как в CSS `object-position`: чуть шире 0-100 помогает в превью. */
export const PLAYER_CARD_OBJECT_POS_PCT_MIN = -42
export const PLAYER_CARD_OBJECT_POS_PCT_MAX = 142

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
      ? Math.min(3, Math.max(1, z))
      : DEFAULT_PLAYER_CARD_PHOTO_FRAME.zoom,
  }
}

/** Размеры контейнера и натуральное разрешение - для точного translate+scale при наличии meta. */
export type PhotoFrameImgStyleMeta = {
  cw: number
  ch: number
  nw: number
  nh: number
}

/**
 * Полный диапазон pan по оси (px) - cover-запас + zoom + минимум на zoom 1.0,
 * чтобы фото можно было двигать без предварительного увеличения.
 */
const PHOTO_FRAME_MIN_PAN_SLACK_FRAC = 0.5

/** Замедление drag в кроппере: на zoom 1.0 мышь слишком чувствительна при мин. slack. */
export function photoFramePanDragDamping(zoom: number): number {
  const z = Math.min(3, Math.max(1, zoom))
  if (z <= 1.01) return 3.25
  if (z >= 2) return 1.1
  const t = z - 1
  return 3.25 + t * (1.1 - 3.25)
}

export function photoFramePanSlackPx(
  f: PlayerCardPhotoFrame,
  meta: PhotoFrameImgStyleMeta,
): { slackX: number; slackY: number } {
  const z = Math.min(3, Math.max(1, f.zoom))
  const W = Math.max(1, meta.cw)
  const H = Math.max(1, meta.ch)
  const nw = Math.max(1, meta.nw)
  const nh = Math.max(1, meta.nh)
  const sCover = Math.max(W / nw, H / nh)
  const Dw = nw * sCover
  const Dh = nh * sCover
  const coverSlackX = Math.max(0, Dw - W)
  const coverSlackY = Math.max(0, Dh - H)
  const zoomPadX = W * Math.max(z - 1, 0)
  const zoomPadY = H * Math.max(z - 1, 0)
  const minSlackX = W * PHOTO_FRAME_MIN_PAN_SLACK_FRAC
  const minSlackY = H * PHOTO_FRAME_MIN_PAN_SLACK_FRAC
  return {
    slackX: Math.max(coverSlackX + zoomPadX, minSlackX),
    slackY: Math.max(coverSlackY + zoomPadY, minSlackY),
  }
}

function photoFramePanTranslatePx(f: PlayerCardPhotoFrame, meta: PhotoFrameImgStyleMeta): { tx: number; ty: number } {
  const { slackX, slackY } = photoFramePanSlackPx(f, meta)
  const panHalfX = slackX / 2
  const panHalfY = slackY / 2
  const tx = -((f.x_pct - 50) / 50) * panHalfX
  const ty = -((f.y_pct - 50) / 50) * panHalfY
  return { tx, ty }
}

/** Стили `<img>` в кропе (`overflow: hidden`). Без meta - браузерный object-position + scale. */
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

  const transform = hasMeta
    ? (() => {
        const { tx, ty } = photoFramePanTranslatePx(f, meta!)
        return `translate(${+tx.toFixed(3)}px, ${+ty.toFixed(3)}px) scale(${f.zoom})`
      })()
    : `scale(${f.zoom})`

  return {
    objectFit: 'cover',
    objectPosition: hasMeta ? '50% 50%' : `${f.x_pct}% ${f.y_pct}%`,
    transform,
    transformOrigin: 'center center',
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
