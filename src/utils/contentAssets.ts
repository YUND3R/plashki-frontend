import { DEFAULT_PHOTO_CROP, type PhotoCrop, type PhotoLayouts } from '@/utils/photoCrop'

/** Статические ассеты из public/content — без import, Vite не бандлит public. */
export const contentAssets = {
  contactSpeechBubble: '/content/buble.png',
  landingPhone: '/content/mockaup.png',
  neapol: '/content/neapol.png',
  vortex: '/content/vortex.png',
  luna: '/content/luna.png',
  lunaCutout: '/content/luna-cutout.png',
} as const

/** Кадры для демо-фото на лендинге — лицо целиком, без обрезки макушки. */
const landingPhotoCrops: Record<string, PhotoCrop> = {
  [contentAssets.neapol]: { x_pct: 50, y_pct: 42, zoom: 0.7 },
  [contentAssets.vortex]: { x_pct: 50, y_pct: 34, zoom: 0.58 },
  [contentAssets.luna]: { x_pct: 50, y_pct: 34, zoom: 0.74 },
  [contentAssets.lunaCutout]: { x_pct: 50, y_pct: 36, zoom: 0.84 },
}

const demoPhotoCropsByDesign: Record<string, Record<string, PhotoCrop>> = {
  plus: {
    [contentAssets.neapol]: { x_pct: 50, y_pct: 42, zoom: 0.96 },
    [contentAssets.vortex]: { x_pct: 50, y_pct: 39, zoom: 0.9 },
    [contentAssets.lunaCutout]: { x_pct: 50, y_pct: 42, zoom: 0.96 },
  },
  classic: {
    [contentAssets.neapol]: { x_pct: 50, y_pct: 39, zoom: 0.68 },
    [contentAssets.vortex]: { x_pct: 50, y_pct: 36, zoom: 0.61 },
    [contentAssets.lunaCutout]: { x_pct: 50, y_pct: 40, zoom: 0.72 },
  },
  'masters-yug25': {
    [contentAssets.neapol]: { x_pct: 50, y_pct: 38, zoom: 0.42 },
    [contentAssets.vortex]: { x_pct: 50, y_pct: 35, zoom: 0.39 },
    [contentAssets.lunaCutout]: { x_pct: 50, y_pct: 38, zoom: 0.4 },
  },
}

const landingPhotoObjectPositions: Record<string, string> = {
  [contentAssets.neapol]: '50% 16%',
  [contentAssets.vortex]: '50% 18%',
  [contentAssets.luna]: '50% 17%',
  [contentAssets.lunaCutout]: '50% 17%',
}

export function landingPhotoLayoutsForUrl(photoUrl: string): PhotoLayouts | null {
  const url = photoUrl.trim()
  if (!url) return null
  return { [url]: { ...(landingPhotoCrops[url] ?? DEFAULT_PHOTO_CROP) } }
}

export function demoPhotoLayoutForDesign(photoUrl: string, designCode: string): PhotoCrop {
  const url = photoUrl.trim()
  const code = designCode.trim().toLowerCase()
  return {
    ...(demoPhotoCropsByDesign[code]?.[url] ??
      landingPhotoCrops[url] ??
      DEFAULT_PHOTO_CROP),
  }
}

export function landingPhotoObjectPosition(photoUrl: string): string | undefined {
  const url = photoUrl.trim()
  if (!url) return undefined
  return landingPhotoObjectPositions[url]
}
