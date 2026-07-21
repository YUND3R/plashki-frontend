<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PhotoCropModal from '@/components/photos/PhotoCropModal.vue'
import {
  getPlayerCard,
  patchPlayerCard,
  patchPlayerCardPhotoLayout,
  uploadPlayerCardPhoto,
} from '@/api/playerCards'
import { setLobbyMemberDisplayPhoto, type GameLobby, type LobbyPlayer } from '@/api/lobbies'
import { normalizeOverlayDesignCode } from '@/utils/overlayPersistentMessage'
import { overlayPhotoSpecForDesign } from '@/utils/overlayPhotoSpec'
import { DEFAULT_PHOTO_CROP, MIN_PHOTO_CROP_ZOOM, type PhotoCrop } from '@/utils/photoCrop'
import { writeCachedPhotoLayouts } from '@/utils/overlayPhotoLayoutBridge'
import cropIcon from '@/assets/icons/cadr.svg?url'
import deleteIcon from '@/assets/icons/delete.svg?url'

const open = defineModel<boolean>({ default: false })

const props = defineProps<{
  lobbyId: string
  lobby: GameLobby | null
  player: LobbyPlayer | null
  overlayDesign: string
}>()

const emit = defineEmits<{
  applied: [lobby: GameLobby]
}>()

const photoUrls = ref<string[]>([])
const photoLayouts = ref<Record<string, PhotoCrop>>({})
const loading = ref(false)
const loadError = ref<string | null>(null)
const selectedUrl = ref<string | null>(null)
const saving = ref(false)
const saveError = ref<string | null>(null)
const deletingUrl = ref<string | null>(null)

const cropModalOpen = ref(false)
const cropImageSrc = ref('')
const cropInitial = ref<PhotoCrop | null>(null)
const pendingFile = ref<File | null>(null)
const cropTargetUrl = ref<string | null>(null)

const cropSpec = computed(() => overlayPhotoSpecForDesign(props.overlayDesign))

const designLabel = computed(() => {
  const code = normalizeOverlayDesignCode(props.overlayDesign)
  if (code === 'masters-yug25') return 'Masters'
  if (code === 'plus') return 'Plus'
  return 'Classic'
})

const modalTitle = computed(() => {
  const nick = props.player?.nickname?.trim()
  return nick ? `Фото игрока ${nick}` : 'Фото игрока'
})

function close() {
  if (saving.value) return
  open.value = false
}

function lobbyShownPhoto(pl: LobbyPlayer): string {
  const lobby = typeof pl.lobby_photo_url === 'string' ? pl.lobby_photo_url.trim() : ''
  if (lobby) return lobby
  const x = pl.photo_urls?.[0]
  return typeof x === 'string' ? x.trim() : ''
}

function buildLobbyAfterCrop(
  base: GameLobby,
  pl: LobbyPlayer,
  url: string,
  crop: PhotoCrop,
  layouts: Record<string, PhotoCrop>,
): GameLobby {
  return {
    ...base,
    players: base.players.map((p) => {
      if (p.membership_id !== pl.membership_id) return p
      const photo_layouts = { ...(p.photo_layouts ?? {}), ...layouts }
      const shown = lobbyShownPhoto({ ...p, photo_layouts })
      return {
        ...p,
        photo_layouts,
        display_photo_layout: shown === url ? crop : p.display_photo_layout,
      }
    }),
  }
}

async function loadPhotos(pl: LobbyPlayer) {
  loading.value = true
  loadError.value = null
  photoUrls.value = []
  selectedUrl.value = null
  try {
    const c = await getPlayerCard(pl.user_id, pl.player_card_id)
    photoUrls.value = (c.photo_urls ?? []).filter(Boolean)
    photoLayouts.value = { ...(c.photo_layouts ?? {}) }
    if (pl.player_card_id && Object.keys(photoLayouts.value).length) {
      writeCachedPhotoLayouts(pl.player_card_id, photoLayouts.value)
    }
  } catch (e) {
    photoUrls.value = (pl.photo_urls ?? []).map((u) => u.trim()).filter(Boolean)
    photoLayouts.value = {}
    if (photoUrls.value.length) {
      loadError.value =
        'Не удалось загрузить карточку - показаны фото из лобби. Кадрирование может быть недоступно.'
    } else {
      loadError.value = e instanceof Error ? e.message : String(e)
    }
  } finally {
    loading.value = false
  }

  const shown = lobbyShownPhoto(pl)
  if (shown && photoUrls.value.includes(shown)) {
    selectedUrl.value = shown
  } else if (photoUrls.value.length) {
    selectedUrl.value = photoUrls.value[0] ?? null
  }
}

watch(
  () => [open.value, props.player] as const,
  async ([isOpen, pl]) => {
    if (!isOpen) {
      photoUrls.value = []
      selectedUrl.value = null
      loadError.value = null
      saveError.value = null
      cropModalOpen.value = false
      pendingFile.value = null
      return
    }
    if (!pl?.membership_id || !props.lobbyId) return
    await loadPhotos(pl)
  },
)

watch(open, (isOpen, _, onCleanup) => {
  if (isOpen) {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving.value) close()
    }
    document.addEventListener('keydown', onEsc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    onCleanup(() => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prev
    })
  }
})

function pickUrl(url: string) {
  selectedUrl.value = url.trim() || null
  saveError.value = null
}

function openCropForNew(file: File) {
  pendingFile.value = file
  cropTargetUrl.value = null
  cropImageSrc.value = URL.createObjectURL(file)
  cropInitial.value = { ...DEFAULT_PHOTO_CROP, zoom: MIN_PHOTO_CROP_ZOOM }
  cropModalOpen.value = true
}

function openCropForExisting(url: string) {
  pendingFile.value = null
  cropTargetUrl.value = url
  cropImageSrc.value = url
  cropInitial.value = { ...DEFAULT_PHOTO_CROP, zoom: MIN_PHOTO_CROP_ZOOM }
  cropModalOpen.value = true
}

function onAddPhoto(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  openCropForNew(file)
}

function onCropDismiss() {
  if (cropImageSrc.value.startsWith('blob:')) {
    URL.revokeObjectURL(cropImageSrc.value)
  }
  cropImageSrc.value = ''
  pendingFile.value = null
  cropTargetUrl.value = null
  cropModalOpen.value = false
  open.value = false
}

async function onCropSave(crop: PhotoCrop) {
  const pl = props.player
  if (!pl?.user_id || !pl.player_card_id) return
  saving.value = true
  saveError.value = null
  try {
    let uploadedAndSelectedUrl: string | null = null
    if (pendingFile.value) {
      const uploadedUrl = await uploadPlayerCardPhoto(pl.user_id, pl.player_card_id, pendingFile.value)
      await patchPlayerCardPhotoLayout(
        pl.user_id,
        pl.player_card_id,
        uploadedUrl,
        crop,
        photoLayouts.value,
      )
      photoLayouts.value[uploadedUrl] = crop
      if (pl.player_card_id) writeCachedPhotoLayouts(pl.player_card_id, photoLayouts.value)
      pendingFile.value = null
      await loadPhotos(pl)
      selectedUrl.value = photoUrls.value.includes(uploadedUrl)
        ? uploadedUrl
        : photoUrls.value[photoUrls.value.length - 1] ?? selectedUrl.value
      uploadedAndSelectedUrl = selectedUrl.value
    } else if (cropTargetUrl.value) {
      const url = cropTargetUrl.value
      await patchPlayerCardPhotoLayout(
        pl.user_id,
        pl.player_card_id,
        url,
        crop,
        photoLayouts.value,
      )
      photoLayouts.value[url] = crop
      if (pl.player_card_id) writeCachedPhotoLayouts(pl.player_card_id, photoLayouts.value)
      if (props.lobby && lobbyShownPhoto(pl) === url) {
        emit('applied', buildLobbyAfterCrop(props.lobby, pl, url, crop, photoLayouts.value))
      }
    }
    cropModalOpen.value = false
    // После загрузки нового фото сразу применяем его в лобби,
    // чтобы карточка игрока обновилась без перезагрузки страницы.
    if (uploadedAndSelectedUrl && pl.membership_id && props.lobbyId) {
      const updated = await setLobbyMemberDisplayPhoto(props.lobbyId, pl.membership_id, {
        photo_url: uploadedAndSelectedUrl,
      })
      emit('applied', updated)
      open.value = false
    }
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

async function apply() {
  const pl = props.player
  const chosen = selectedUrl.value?.trim()
  if (!pl?.membership_id || !props.lobbyId || !chosen) return
  if (!photoUrls.value.includes(chosen)) return

  saving.value = true
  saveError.value = null
  try {
    const updated = await setLobbyMemberDisplayPhoto(props.lobbyId, pl.membership_id, {
      photo_url: chosen,
    })
    emit('applied', updated)
    open.value = false
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

async function deletePhoto(url: string) {
  const u = url.trim()
  if (!u || saving.value || deletingUrl.value) return
  const pl = props.player
  if (!pl?.user_id || !pl.player_card_id) return

  const idx = photoUrls.value.indexOf(u)
  if (idx < 0) return

  const next = photoUrls.value.slice()
  next.splice(idx, 1)
  if (next.length < 1) {
    saveError.value = 'Нельзя удалить последнее фото карточки.'
    return
  }

  deletingUrl.value = u
  saveError.value = null
  try {
    await patchPlayerCard(pl.user_id, pl.player_card_id, { photo_urls: next })
    photoUrls.value = next
    if (selectedUrl.value === u) selectedUrl.value = next[0] ?? null
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : String(e)
  } finally {
    deletingUrl.value = null
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="app-modal">
      <div v-if="open && !cropModalOpen" class="app-modal" role="presentation">
        <div class="app-modal__backdrop" aria-hidden="true" @click.self="!saving && close()" />
        <div class="app-modal__wrap lmp-modal__wrap" role="dialog" aria-modal="true" aria-labelledby="lmp-title">
          <div class="app-modal__panel">
            <div class="app-modal__head">
              <h2 id="lmp-title" class="app-modal__title">{{ modalTitle }}</h2>
              <button type="button" class="app-modal__close" aria-label="Закрыть" :disabled="saving" @click="close">
                ×
              </button>
            </div>

            <div class="app-modal__body app-modal__body--tight lmp__body">
              <p v-if="loading" class="lmp__status">Загрузка…</p>
              <template v-else>
                <p v-if="loadError && !photoUrls.length" class="lmp__banner" role="alert">{{ loadError }}</p>
                <p v-else-if="loadError" class="lmp__banner lmp__banner--soft" role="status">{{ loadError }}</p>

                <div v-if="photoUrls.length" class="lmp__grid">
                  <div
                    v-for="(url, idx) in photoUrls"
                    :key="`${url}-${idx}`"
                    class="lmp__cell"
                    :class="{ 'lmp__cell--selected': selectedUrl === url }"
                  >
                    <div class="lmp__cell-photo">
                      <button
                        type="button"
                        class="lmp__cell-select"
                        :aria-pressed="selectedUrl === url"
                        :disabled="saving"
                        @click="pickUrl(url)"
                      >
                        <img :src="url" alt="" class="lmp__img" />
                      </button>
                    </div>
                    <div class="lmp__cell-actions">
                      <button
                        type="button"
                        class="lmp__cell-action lmp__cell-action--crop"
                        :disabled="saving"
                        aria-label="Кадрирование"
                        title="Кадрирование"
                        @click.stop="openCropForExisting(url)"
                      >
                        <img
                          :src="cropIcon"
                          alt=""
                          class="lmp__cell-action-icon lmp__cell-action-icon--crop"
                          width="13"
                          height="13"
                        />
                      </button>
                      <button
                        type="button"
                        class="lmp__cell-action lmp__cell-action--delete"
                        :disabled="saving || !!deletingUrl"
                        aria-label="Удалить"
                        title="Удалить"
                        @click.stop="deletePhoto(url)"
                      >
                        <img
                          :src="deleteIcon"
                          alt=""
                          class="lmp__cell-action-icon lmp__cell-action-icon--delete"
                          width="13"
                          height="16"
                        />
                      </button>
                    </div>
                  </div>
                </div>
                <p v-else-if="!loadError" class="lmp__empty">У игрока пока нет фотографий.</p>

                <div v-if="player" class="lmp__add-row">
                  <label class="lmp__add-btn" :class="{ 'lmp__add-btn--disabled': saving }">
                    Добавить фото
                    <input
                      class="lmp__file-input"
                      type="file"
                      accept="image/*"
                      :disabled="saving"
                      @change="onAddPhoto"
                    />
                  </label>
                </div>

                <p v-if="saveError" class="lmp__banner" role="alert">{{ saveError }}</p>
                <div class="app-modal__actions">
                  <button
                    type="button"
                    class="app-modal__btn-primary"
                    :disabled="saving || !selectedUrl"
                    @click="apply"
                  >
                    {{ saving ? 'Сохранение…' : 'Сохранить для лобби' }}
                  </button>
                  <button type="button" class="app-modal__btn-secondary" :disabled="saving" @click="close">
                    Отмена
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <PhotoCropModal
    v-model="cropModalOpen"
    :image-src="cropImageSrc"
    :spec="cropSpec"
    :initial-crop="cropInitial"
    :nickname="player?.nickname"
    :saving="saving"
    :title="`Кадрирование - ${designLabel}`"
    @save="onCropSave"
    @close="onCropDismiss"
  />
</template>

<style scoped>
.lmp-modal__wrap {
  max-width: min(28rem, calc(100vw - 2rem));
}

.lmp-modal__wrap .app-modal__head {
  margin-bottom: 0.75rem;
}

.lmp__body {
  padding-top: 0;
  gap: 0.35rem;
}

.lmp__empty,
.lmp__status {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #6b7280;
}

.lmp__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
  gap: 0.65rem;
  margin-bottom: 0;
}

.lmp__cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.5rem 0.55rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
}

.lmp__cell--selected {
  border-color: #2f6feb;
}

.lmp__cell-photo {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
}

.lmp__cell-select {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.lmp__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.lmp__cell-actions {
  display: flex;
  align-items: stretch;
  width: 100%;
  border-radius: 8px;
  background: #f3f4f6;
  overflow: hidden;
}

.lmp__cell-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 0;
  color: #6b7280;
  background: transparent;
  cursor: pointer;
}

.lmp__cell-action:hover:not(:disabled) {
  background: #e9edf3;
}

.lmp__cell-action--crop:hover:not(:disabled) {
  color: #374151;
}

.lmp__cell-action--delete:hover:not(:disabled) {
  color: #b91c1c;
  background: #feecec;
}

.lmp__cell-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lmp__cell-action-icon {
  width: 1.25rem;
  height: 1.25rem;
  display: block;
}

.lmp__cell-action-icon--crop {
  width: 13px;
  height: 13px;
  object-fit: contain;
}

.lmp__cell-action-icon--delete {
  width: 13px;
  height: 16px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(50%) sepia(8%) saturate(120%) hue-rotate(177deg)
    brightness(94%) contrast(91%);
}

.lmp__cell-action--delete:hover:not(:disabled) .lmp__cell-action-icon--delete {
  filter: brightness(0) saturate(100%) invert(24%) sepia(86%) saturate(2476%) hue-rotate(346deg)
    brightness(92%) contrast(93%);
}

.lmp__add-row {
  margin-bottom: 0.35rem;
}

.lmp__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.lmp__add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
  padding: 0.55rem 0.95rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e40af;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  cursor: pointer;
}

.lmp__add-btn:hover:not(.lmp__add-btn--disabled) {
  background: #dbeafe;
  border-color: #93c5fd;
}

.lmp__add-btn--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.lmp__banner {
  margin: 0.75rem 0 0;
  padding: 0.65rem 0.75rem;
  font-size: 0.8125rem;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.lmp__banner--soft {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}
</style>
