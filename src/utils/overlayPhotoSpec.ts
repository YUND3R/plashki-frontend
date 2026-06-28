import { normalizeOverlayDesignCode } from '@/utils/overlayPersistentMessage'

/**
 * Видимая область фото на плашке в overlay (px).
 * Соотношение сторон = рамка кроппера; кадрирование x_pct / y_pct / zoom считается под этот кадр.
 */
export type OverlayPhotoSpec = {
  designCode: string
  frameWidth: number
  frameHeight: number
  /**
   * Доп. масштаб контейнера фото в CSS (Masters: scale на .photo-stage).
   * Не дублирует zoom из photo_layouts - это оформление дизайна.
   */
  stageScale: number
}

/** Размеры синхронизированы с CSS в Overlay*Design.vue */
export const OVERLAY_PHOTO_SPECS: Record<'classic' | 'masters-yug25' | 'plus', OverlayPhotoSpec> = {
  classic: {
    designCode: 'classic',
    frameWidth: 186,
    frameHeight: 126,
    stageScale: 1,
  },
  'masters-yug25': {
    designCode: 'masters-yug25',
    frameWidth: 185,
    frameHeight: 125,
    stageScale: 1.7,
  },
  plus: {
    designCode: 'plus',
    frameWidth: 186,
    frameHeight: 186,
    stageScale: 1,
  },
}

export function overlayPhotoSpecForDesign(rawDesignCode: string): OverlayPhotoSpec {
  const code = normalizeOverlayDesignCode(rawDesignCode)
  if (code === 'masters-yug25') return OVERLAY_PHOTO_SPECS['masters-yug25']
  if (code === 'plus') return OVERLAY_PHOTO_SPECS.plus
  return OVERLAY_PHOTO_SPECS.classic
}

export function overlayPhotoAspectRatio(spec: OverlayPhotoSpec): string {
  const { cw, ch } = overlayPhotoCropViewport(spec)
  return `${Math.max(1, cw)} / ${Math.max(1, ch)}`
}

/** Masters: маска фото выступает на 40px вверх (.photo-mask { top: -40px }). */
export const MASTERS_PHOTO_MASK_TOP_OFFSET = 40

/** Логический viewport кропа - одинаковый в кроппере и overlay. */
export function overlayPhotoCropViewport(spec: OverlayPhotoSpec): { cw: number; ch: number } {
  const cw = Math.max(1, spec.frameWidth)
  const ch =
    spec.designCode === 'masters-yug25'
      ? Math.max(1, spec.frameHeight + MASTERS_PHOTO_MASK_TOP_OFFSET)
      : Math.max(1, spec.frameHeight)
  return { cw, ch }
}
