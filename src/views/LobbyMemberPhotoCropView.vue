<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PhotoCropper from '@/components/photos/PhotoCropper.vue'
import PhotoCropperControls from '@/components/photos/PhotoCropperControls.vue'
import { getLobby, type LobbyPlayer } from '@/api/lobbies'
import { getPlayerCard, patchPlayerCardPhotoLayout } from '@/api/playerCards'
import { normalizeOverlayDesignCode } from '@/utils/overlayPersistentMessage'
import { overlayPhotoSpecForDesign } from '@/utils/overlayPhotoSpec'
import { DEFAULT_PHOTO_CROP, findPhotoLayoutForUrl, normalizePhotoCrop, type PhotoCrop } from '@/utils/photoCrop'
import { readCachedPhotoLayouts, writeCachedPhotoLayouts } from '@/utils/overlayPhotoLayoutBridge'
import { notifyOverlayLobbyChanged } from '@/utils/overlayLobbySync'
import AppPageError from '@/components/common/AppPageError.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)
const crop = ref<PhotoCrop>({ ...DEFAULT_PHOTO_CROP })
const player = ref<LobbyPlayer | null>(null)
const photoLayouts = ref<Record<string, PhotoCrop>>({})

const lobbyId = computed(() => String(route.params.lobbyId ?? '').trim())
const membershipId = computed(() => String(route.params.membershipId ?? '').trim())

const photoUrl = computed(() => {
  const raw = route.query.photo
  const value = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  if (!value) return ''
  try {
    return decodeURIComponent(value.trim())
  } catch {
    return value.trim()
  }
})

const designCode = computed(() => {
  const raw = route.query.design
  const value = typeof raw === 'string' ? raw.trim() : ''
  return normalizeOverlayDesignCode(value || 'classic')
})

const cropSpec = computed(() => overlayPhotoSpecForDesign(designCode.value))

const designLabel = computed(() => {
  if (designCode.value === 'masters-yug25') return 'Masters'
  if (designCode.value === 'plus') return 'Plus'
  return 'Classic'
})

const seatIndex = computed(() => {
  const pl = player.value
  if (!pl) return 1
  const idx = route.query.seat
  if (typeof idx === 'string' && idx.trim()) {
    const n = Number(idx)
    if (Number.isFinite(n) && n >= 1 && n <= 10) return Math.floor(n)
  }
  return 1
})

function mergePhotoLayouts(
  ...sources: (Record<string, PhotoCrop> | null | undefined)[]
): Record<string, PhotoCrop> {
  const out: Record<string, PhotoCrop> = {}
  for (const src of sources) {
    if (!src) continue
    for (const [url, value] of Object.entries(src)) {
      const key = url.trim()
      if (!key) continue
      out[key] = normalizePhotoCrop(value)
    }
  }
  return out
}

function lobbyShownPhoto(pl: LobbyPlayer): string {
  const lobby = typeof pl.lobby_photo_url === 'string' ? pl.lobby_photo_url.trim() : ''
  if (lobby) return lobby
  const first = pl.photo_urls?.[0]
  return typeof first === 'string' ? first.trim() : ''
}

function resolveCropForUrl(url: string, pl: LobbyPlayer, layouts: Record<string, PhotoCrop>): PhotoCrop {
  const trimmed = url.trim()
  if (!trimmed) return { ...DEFAULT_PHOTO_CROP }

  const fromLayouts = findPhotoLayoutForUrl(layouts, trimmed)
  if (fromLayouts) return fromLayouts

  const shown = lobbyShownPhoto(pl)
  if (shown === trimmed && pl.display_photo_layout) {
    return normalizePhotoCrop(pl.display_photo_layout)
  }

  return { ...DEFAULT_PHOTO_CROP }
}

async function load() {
  loading.value = true
  error.value = null
  player.value = null

  const id = lobbyId.value
  const memberId = membershipId.value
  const url = photoUrl.value

  if (!id || !memberId) {
    error.value = 'Некорректная ссылка на кадрирование.'
    loading.value = false
    return
  }
  if (!url) {
    error.value = 'Не указано фото для кадрирования.'
    loading.value = false
    return
  }

  try {
    const lobby = await getLobby(id)
    const pl = lobby.players.find((p) => p.membership_id === memberId)
    if (!pl?.user_id || !pl.player_card_id) {
      throw new Error('Игрок не найден или недоступен для кадрирования.')
    }
    player.value = pl

    const cached = readCachedPhotoLayouts(pl.player_card_id)
    let layouts = mergePhotoLayouts(pl.photo_layouts, cached)
    try {
      const card = await getPlayerCard(pl.user_id, pl.player_card_id)
      layouts = mergePhotoLayouts(layouts, card.photo_layouts ?? {})
      if (Object.keys(layouts).length) {
        writeCachedPhotoLayouts(pl.player_card_id, layouts)
      }
    } catch {
      // используем layouts из лобби / кэша
    }

    photoLayouts.value = layouts
    crop.value = resolveCropForUrl(url, pl, layouts)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function goBackToLobby() {
  router.push({ name: 'lobby-manage', params: { lobbyId: lobbyId.value } })
}

function close() {
  if (saving.value) return
  if (window.history.length > 1) {
    router.back()
    return
  }
  goBackToLobby()
}

async function save() {
  const pl = player.value
  const url = photoUrl.value
  if (!pl?.user_id || !pl.player_card_id || !url || saving.value) return

  saving.value = true
  error.value = null
  try {
    const normalized = normalizePhotoCrop(crop.value)
    await patchPlayerCardPhotoLayout(pl.user_id, pl.player_card_id, url, normalized, photoLayouts.value)
    photoLayouts.value[url] = normalized
    writeCachedPhotoLayouts(pl.player_card_id, photoLayouts.value)
    notifyOverlayLobbyChanged(lobbyId.value)
    goBackToLobby()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="photo-crop-page" role="main" aria-labelledby="photo-crop-page-title">
    <header class="photo-crop-page__header">
      <h1 id="photo-crop-page-title" class="photo-crop-page__title">
        Кадрирование — {{ designLabel }}
      </h1>
      <button type="button" class="photo-crop-page__close" :disabled="saving" @click="close">
        Закрыть
      </button>
    </header>

    <main class="photo-crop-page__body">
      <p v-if="loading" class="photo-crop-page__status">Загрузка…</p>
      <AppPageError
        v-else-if="error && !photoUrl"
        compact
        :message="error"
        @retry="load"
      />
      <template v-else>
        <p v-if="error" class="photo-crop-page__error" role="alert">{{ error }}</p>
        <PhotoCropper
          v-model="crop"
          :image-src="photoUrl"
          :spec="cropSpec"
          :nickname="player?.nickname ?? ''"
          :seat-index="seatIndex"
          :disabled="saving || loading || !photoUrl"
          hide-controls
        />
      </template>
    </main>

    <footer class="photo-crop-page__footer">
      <PhotoCropperControls v-model="crop" :disabled="saving || loading || !photoUrl" />
      <button
        type="button"
        class="photo-crop-page__save"
        :disabled="saving || loading || !photoUrl"
        @click="save"
      >
        {{ saving ? 'Сохранение…' : 'Сохранить' }}
      </button>
    </footer>
  </div>
</template>

<style scoped>
.photo-crop-page {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100dvh;
  max-height: 100dvh;
  background: #f3f4f6;
  color: #111827;
}

.photo-crop-page__header,
.photo-crop-page__footer {
  display: flex;
  align-items: center;
  background: #ffffff;
}

.photo-crop-page__header {
  justify-content: space-between;
  gap: 1rem;
  min-height: 3.75rem;
  padding: 0 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.photo-crop-page__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.2;
  color: #111827;
}

.photo-crop-page__close {
  padding: 0.45rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #374151;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
}

.photo-crop-page__close:hover:not(:disabled),
.photo-crop-page__save:hover:not(:disabled) {
  filter: brightness(0.98);
}

.photo-crop-page__close:disabled,
.photo-crop-page__save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.photo-crop-page__body {
  position: relative;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1.5rem 1rem;
  overflow: auto;
  background:
    radial-gradient(circle at 50% 0%, rgba(47, 111, 235, 0.05), transparent 42%),
    #f3f4f6;
}

.photo-crop-page__status,
.photo-crop-page__error {
  margin: 0;
  text-align: center;
  font-size: 0.875rem;
}

.photo-crop-page__error {
  margin-bottom: 0.75rem;
  color: #b91c1c;
}

.photo-crop-page__footer {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  min-height: 4.25rem;
  padding: 0.85rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.photo-crop-page__footer > :first-child {
  grid-column: 2;
  justify-self: center;
}

.photo-crop-page__save {
  grid-column: 3;
  justify-self: end;
  padding: 0.55rem 1rem;
  border: 0;
  border-radius: 8px;
  background: #2f6feb;
  color: #ffffff;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
}

.photo-crop-page :deep(.photo-cropper) {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.photo-crop-page :deep(.photo-cropper__stage) {
  --pcd-preview-scale: 2.2;
  align-items: center;
  padding: 0;
}

.photo-crop-page :deep(.photo-cropper__preview) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-crop-page :deep(.photo-cropper__hint) {
  display: none;
}

@media (max-width: 768px) {
  .photo-crop-page__header {
    min-height: 3.4rem;
    padding: 0 0.9rem;
  }

  .photo-crop-page__body {
    padding: 0.6rem 0.75rem 0.5rem;
  }

  .photo-crop-page__footer {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.65rem;
    min-height: unset;
    padding: 0.65rem 0.75rem calc(0.65rem + env(safe-area-inset-bottom, 0px));
  }

  .photo-crop-page__footer > :first-child {
    grid-column: auto;
    justify-self: stretch;
  }

  .photo-crop-page__save {
    grid-column: auto;
    justify-self: stretch;
    width: 100%;
  }
}

@media (max-width: 420px) {
  .photo-crop-page :deep(.photo-cropper__stage) {
    --pcd-preview-scale: 1.85;
  }
}

@media (max-width: 360px) {
  .photo-crop-page :deep(.photo-cropper__stage) {
    --pcd-preview-scale: 1.65;
  }
}
</style>
