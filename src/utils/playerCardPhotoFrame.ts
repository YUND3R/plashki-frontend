import type { LobbyPlayer } from '@/api/lobbies'
import type { PlayerCard } from '@/api/playerCards'

/** Совпадает с полезной нагрузкой API для одного фото в кадре. */
export type PlayerCardPhotoFrame = {
  x_pct: number
  y_pct: number
  /** От 1 до 3 — «зум» поверх cover. */
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

/** Как в CSS `object-position`: чуть шире 0–100 помогает в превью. */
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

/** Размеры контейнера и натуральное разрешение — для точного translate+scale при наличии meta. */
export type PhotoFrameImgStyleMeta = {
  cw: number
  ch: number
  nw: number
  nh: number
}

function photoFramePanTranslatePx(f: PlayerCardPhotoFrame, meta: PhotoFrameImgStyleMeta): { tx: number; ty: number } {
  const z = Math.min(3, Math.max(1, f.zoom))
  const W = Math.max(1, meta.cw)
  const H = Math.max(1, meta.ch)
  const nw = Math.max(1, meta.nw)
  const nh = Math.max(1, meta.nh)
  const sCover = Math.max(W / nw, H / nh)
  const Dw = nw * sCover
  const Dh = nh * sCover
  const slackX = Math.max(0, Dw - W)
  const slackY = Math.max(0, Dh - H)
  const zoomPadX = W * Math.max(z - 1, 0)
  const zoomPadY = H * Math.max(z - 1, 0)
  const panHalfX = (slackX + zoomPadX) / 2
  const panHalfY = (slackY + zoomPadY) / 2
  const tx = -((f.x_pct - 50) / 50) * panHalfX
  const ty = -((f.y_pct - 50) / 50) * panHalfY
  return { tx, ty }
}

/** Стили `<img>` в кропе (`overflow: hidden`). Без meta — браузерный object-position + scale. */
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
  const fromMap = (c.photo_layouts as Record<string, PlayerCardPhotoFrame> | undefined)?.[url]
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
    return normalizePlayerCardPhotoFrame(
      pl.display_photo_layout ?? pl.photo_layouts?.[shown] ?? DEFAULT_PLAYER_CARD_PHOTO_FRAME,
    )
  }
  const fromLayouts = pl.photo_layouts?.[shown]
  if (fromLayouts) return normalizePlayerCardPhotoFrame(fromLayouts)
  return DEFAULT_PLAYER_CARD_PHOTO_FRAME
}
