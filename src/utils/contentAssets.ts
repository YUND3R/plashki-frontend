import { DEFAULT_PHOTO_CROP, type PhotoCrop, type PhotoLayouts } from '@/utils/photoCrop'

/** Статические ассеты из public/content — без import, Vite не бандлит public. */
export const contentAssets = {
  contactSpeechBubble: '/content/buble.png',
  landingPhone: '/content/mockaup.png',
  neapol: '/content/neapol.png',
  vortex: '/content/vortex.png',
  luna: '/content/luna.png',
} as const

/** Кадры для демо-фото на лендинге — лицо целиком, без обрезки макушки. */
const landingPhotoCrops: Record<string, PhotoCrop> = {
  [contentAssets.neapol]: { x_pct: 50, y_pct: 44, zoom: 0.66 },
  [contentAssets.vortex]: { x_pct: 50, y_pct: 36, zoom: 0.52 },
  [contentAssets.luna]: { x_pct: 50, y_pct: 38, zoom: 0.96 },
}

const landingPhotoObjectPositions: Record<string, string> = {
  [contentAssets.neapol]: '50% 18%',
  [contentAssets.vortex]: '50% 20%',
  [contentAssets.luna]: '50% 20%',
}

export function landingPhotoLayoutsForUrl(photoUrl: string): PhotoLayouts | null {
  const url = photoUrl.trim()
  if (!url) return null
  return { [url]: { ...(landingPhotoCrops[url] ?? DEFAULT_PHOTO_CROP) } }
}

export function landingPhotoObjectPosition(photoUrl: string): string | undefined {
  const url = photoUrl.trim()
  if (!url) return undefined
  return landingPhotoObjectPositions[url]
}
