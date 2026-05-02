<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { getPlayerCard, patchPlayerCard, uploadPlayerCardPhoto } from '@/api/playerCards'
import { setLobbyMemberDisplayPhoto, type GameLobby, type LobbyPlayer } from '@/api/lobbies'

const fileInputId = useId()

const open = defineModel<boolean>({ default: false })

const props = defineProps<{
  lobbyId: string
  player: LobbyPlayer | null
}>()

const emit = defineEmits<{
  applied: [lobby: GameLobby]
}>()

/** Список URL с сервера (карточка / лобби). */
const photoUrls = ref<string[]>([])
/** Файлы, выбранные пользователем — на сервер уходят только по «Сохранить для лобби». */
const pendingFiles = ref<File[]>([])
/** Превью для pending (blob:); параллельно pendingFiles. */
const pendingBlobUrls = ref<string[]>([])

const loading = ref(false)
const loadError = ref<string | null>(null)
const loadWarning = ref<string | null>(null)
const selectedUrl = ref<string | null>(null)
const saving = ref(false)
const deletingUrl = ref<string | null>(null)
const saveError = ref<string | null>(null)
const deleteError = ref<string | null>(null)
const uploadError = ref<string | null>(null)

const gridUrls = computed(() => [...photoUrls.value, ...pendingBlobUrls.value])

const canUpload = computed(() => {
  const pl = props.player
  return !!(pl?.user_id && pl?.player_card_id)
})

function revokePending() {
  for (const u of pendingBlobUrls.value) {
    URL.revokeObjectURL(u)
  }
  pendingFiles.value = []
  pendingBlobUrls.value = []
}

function close() {
  if (saving.value) return
  revokePending()
  open.value = false
}

function pickUrl(url: string) {
  const u = url.trim()
  if (!u) return
  selectedUrl.value = u
  deleteError.value = null
}

function lobbyShownPhoto(pl: LobbyPlayer): string {
  const lobby = typeof pl.lobby_photo_url === 'string' ? pl.lobby_photo_url.trim() : ''
  if (lobby) return lobby
  const x = pl.photo_urls?.[0]
  return typeof x === 'string' ? x.trim() : ''
}

async function loadPhotos(pl: LobbyPlayer) {
  loading.value = true
  loadError.value = null
  loadWarning.value = null
  photoUrls.value = []
  selectedUrl.value = null
  try {
    const c = await getPlayerCard(pl.user_id, pl.player_card_id)
    photoUrls.value = (c.photo_urls ?? []).map((u) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean)
    loadWarning.value = null
  } catch (e) {
    const fromLobby = (pl.photo_urls ?? [])
      .map((u) => (typeof u === 'string' ? u.trim() : ''))
      .filter(Boolean)
    photoUrls.value = fromLobby
    if (fromLobby.length) {
      loadWarning.value =
        'Не удалось загрузить карточку — показаны только фото из лобби. Для полного списка проверьте права доступа.'
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
      revokePending()
      photoUrls.value = []
      selectedUrl.value = null
      loadError.value = null
      loadWarning.value = null
      saveError.value = null
      deleteError.value = null
      uploadError.value = null
      return
    }
    if (!pl?.membership_id || !props.lobbyId) return
    revokePending()
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

async function apply() {
  const pl = props.player
  if (!pl?.membership_id || !props.lobbyId) return
  const chosen = selectedUrl.value?.trim()
  if (!chosen) return
  if (!gridUrls.value.includes(chosen)) return

  const blobIdx = pendingBlobUrls.value.indexOf(chosen)

  saving.value = true
  deletingUrl.value = null
  saveError.value = null
  uploadError.value = null
  deleteError.value = null
  try {
    const uploaded: string[] = []
    for (const f of pendingFiles.value) {
      uploaded.push((await uploadPlayerCardPhoto(pl.user_id, pl.player_card_id, f)).trim())
    }

    let displayUrl = chosen
    if (blobIdx >= 0) {
      displayUrl = uploaded[blobIdx] ?? uploaded[uploaded.length - 1] ?? ''
    }

    revokePending()

    if (uploaded.length) {
      await loadPhotos(pl)
    }

    if (!photoUrls.value.includes(displayUrl)) {
      const fallback = uploaded.find((u) => photoUrls.value.includes(u)) ?? photoUrls.value[0] ?? ''
      displayUrl = fallback
    }
    if (!displayUrl) {
      throw new Error('Не удалось определить URL фото для лобби')
    }

    const updated = await setLobbyMemberDisplayPhoto(props.lobbyId, pl.membership_id, { photo_url: displayUrl })
    emit('applied', updated)
    open.value = false
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

function removePendingAt(index: number) {
  const nextFiles = pendingFiles.value.slice()
  const nextBlobUrls = pendingBlobUrls.value.slice()
  const removedUrl = nextBlobUrls[index] ?? ''
  nextFiles.splice(index, 1)
  nextBlobUrls.splice(index, 1)
  pendingFiles.value = nextFiles
  pendingBlobUrls.value = nextBlobUrls
  if (removedUrl) URL.revokeObjectURL(removedUrl)
  if (selectedUrl.value === removedUrl) {
    selectedUrl.value = nextBlobUrls[nextBlobUrls.length - 1] ?? photoUrls.value[0] ?? null
  }
}

async function deletePhoto(url: string) {
  const u = url.trim()
  if (!u || saving.value || deletingUrl.value) return
  deleteError.value = null
  saveError.value = null
  uploadError.value = null

  const pendingIdx = pendingBlobUrls.value.indexOf(u)
  if (pendingIdx >= 0) {
    removePendingAt(pendingIdx)
    return
  }

  const pl = props.player
  if (!pl?.user_id || !pl.player_card_id) return

  const idx = photoUrls.value.indexOf(u)
  if (idx < 0) return

  const nextPhotoUrls = photoUrls.value.slice()
  nextPhotoUrls.splice(idx, 1)
  if (nextPhotoUrls.length < 1) {
    deleteError.value = 'Нельзя удалить последнее фото карточки.'
    return
  }

  deletingUrl.value = u
  try {
    await patchPlayerCard(pl.user_id, pl.player_card_id, { photo_urls: nextPhotoUrls })
    photoUrls.value = nextPhotoUrls
    if (selectedUrl.value === u) {
      selectedUrl.value = pendingBlobUrls.value[pendingBlobUrls.value.length - 1] ?? nextPhotoUrls[0] ?? null
    }
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : String(e)
  } finally {
    deletingUrl.value = null
  }
}

function onPhotoFilesChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const files = Array.from(input.files || []).filter((f) => f.size > 0)
  input.value = ''
  if (!props.player?.user_id || !props.player.player_card_id || !files.length) return

  uploadError.value = null
  for (const f of files) {
    pendingFiles.value.push(f)
    pendingBlobUrls.value.push(URL.createObjectURL(f))
  }
  const last = pendingBlobUrls.value[pendingBlobUrls.value.length - 1]
  if (last) selectedUrl.value = last
}
</script>

<template>
  <Teleport to="body">
    <Transition name="app-modal">
      <div v-if="open" class="app-modal" role="presentation">
        <div class="app-modal__backdrop" aria-hidden="true" @click.self="!saving && close()" />
        <div class="app-modal__wrap lmp-modal__wrap" role="dialog" aria-modal="true" aria-labelledby="lmp-title">
          <div class="app-modal__panel">
            <div class="app-modal__head">
              <h2 id="lmp-title" class="app-modal__title">Фото в лобби</h2>
              <button type="button" class="app-modal__close" aria-label="Закрыть" :disabled="saving" @click="close">
                ×
              </button>
            </div>

            <div class="app-modal__body app-modal__body--tight">
              <p v-if="player" class="lmp__subtitle">{{ player.nickname }}</p>
              <p class="lmp__lead">Выбранное фото будет основным только в игровом лобби и для плашки в Overlay. В разделе «Мои игроки» аватар останется прежним.</p>

              <p v-if="loading" class="lmp__status">Загрузка…</p>
              <template v-else>
                <p v-if="loadError && !photoUrls.length" class="lmp__banner" role="alert">{{ loadError }}</p>

                <p v-if="uploadError" class="lmp__banner" role="alert">{{ uploadError }}</p>
                <p v-if="deleteError" class="lmp__banner" role="alert">{{ deleteError }}</p>

                <p v-if="loadWarning" class="lmp__banner lmp__banner--soft" role="status">{{ loadWarning }}</p>

                <div v-if="gridUrls.length" class="lmp__grid" :class="{ 'lmp__grid--spaced-bottom': !canUpload }">
                  <div
                    v-for="(url, idx) in gridUrls"
                    :key="`${url}-${idx}`"
                    class="lmp__cell"
                    :class="{ 'lmp__cell--selected': selectedUrl === url, 'lmp__cell--pending': pendingBlobUrls.includes(url) }"
                  >
                    <button
                      type="button"
                      class="lmp__cell-select"
                      :aria-pressed="selectedUrl === url"
                      :aria-label="`Фото ${idx + 1}`"
                      :disabled="saving || !!deletingUrl"
                      @click="pickUrl(url)"
                    >
                      <img :src="url" alt="" class="lmp__img" />
                    </button>
                    <button
                      type="button"
                      class="lmp__cell-delete"
                      :disabled="saving || !!deletingUrl"
                      :aria-label="`Удалить фото ${idx + 1}`"
                      @click.stop="deletePhoto(url)"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <p v-else-if="!loadError" class="lmp__empty" :class="{ 'lmp__empty--no-add-below': !canUpload }">
                  У игрока пока что нету добавленных фотографий.
                </p>

                <div v-if="player && canUpload" class="lmp__add-row">
                  <input
                    :id="fileInputId"
                    class="lmp__file-input"
                    type="file"
                    accept="image/*"
                    multiple
                    :disabled="saving"
                    @change="onPhotoFilesChange"
                  />
                  <label class="lmp__add-btn" :class="{ 'lmp__add-btn--disabled': saving }" :for="fileInputId">
                    Добавить фото игрока
                  </label>
                </div>

                <p v-if="saveError" class="lmp__banner" role="alert">{{ saveError }}</p>
                <div class="app-modal__actions">
                  <button
                    type="button"
                    class="app-modal__btn-primary"
                    :disabled="saving || !selectedUrl || !gridUrls.length"
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
</template>

<style scoped>
.lmp-modal__wrap {
  max-width: min(26rem, calc(100vw - 2rem));
}

.lmp__subtitle {
  margin: 0 0 0.35rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
}

.lmp__lead,
.lmp__empty {
  font-size: 0.8125rem;
  line-height: 1.45;
  font-weight: 400;
  color: #6b7280;
}

.lmp__lead {
  margin: 0 0 0.65rem;
}

.lmp__add-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
}

.lmp__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.lmp__add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.95rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
}

.lmp__add-btn:hover:not(.lmp__add-btn--disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.lmp__add-btn--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.lmp__status {
  margin: 0;
  font-size: 0.9375rem;
  color: #6b7280;
}

.lmp__banner {
  margin: 0 0 0.75rem;
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

.lmp__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
  gap: 0.5rem;
  margin-bottom: 0;
}

.lmp__grid--spaced-bottom {
  margin-bottom: 1rem;
}

.lmp__cell {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1;
  margin: 0;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #f3f4f6;
  box-sizing: border-box;
}

.lmp__cell--pending {
  border-style: dashed;
}

.lmp__cell:hover:not(:disabled) {
  border-color: #93c5fd;
}

.lmp__cell--selected {
  border-color: #2f6feb;
  box-shadow: 0 0 0 2px rgba(47, 111, 235, 0.35);
}

.lmp__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.lmp__cell-select {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.lmp__cell-select:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.lmp__cell-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.82);
  color: #fff;
  font: inherit;
  font-size: 0.95rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lmp__cell-delete:hover:not(:disabled) {
  background: rgba(185, 28, 28, 0.92);
}

.lmp__cell-delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lmp__empty {
  margin: 0 0 0.35rem;
}

.lmp__empty--no-add-below {
  margin-bottom: 1rem;
}
</style>
