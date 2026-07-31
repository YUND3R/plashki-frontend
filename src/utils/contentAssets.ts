import { DEFAULT_PHOTO_CROP, type PhotoLayouts } from '@/utils/photoCrop'

/** Статические ассеты из public/content — без import, Vite не бандлит public. */
export const contentAssets = {
  contactSpeechBubble: '/content/buble.png',
  landingPhone: '/content/mockaup.png',
  neapol: '/content/neapol.png',
  vortex: '/content/vortex.png',
  luna: '/content/luna.png',
} as const

const landingPhotoObjectPositions: Record<string, string> = {
  [contentAssets.neapol]: '50% 18%',
  [contentAssets.vortex]: '50% 22%',
  [contentAssets.luna]: '50% 20%',
}

export function landingPhotoLayoutsForUrl(photoUrl: string): PhotoLayouts | null {
  const url = photoUrl.trim()
  if (!url) return null
  return { [url]: { ...DEFAULT_PHOTO_CROP } }
}

export function landingPhotoObjectPosition(photoUrl: string): string | undefined {
  const url = photoUrl.trim()
  if (!url) return undefined
  return landingPhotoObjectPositions[url]
}
