<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue'
import { me } from '@/api/auth'
import {
  getPlayerCard,
  patchPlayerCard,
  uploadPlayerCardPhoto,
  type PlayerCard,
} from '@/api/playerCards'

const open = defineModel<boolean>({ default: false })

const props = defineProps<{
  cardId: string | null
}>()

const emit = defineEmits<{
  updated: []
}>()

const fileInputId = useId()
const fileInputRef = ref<HTMLInputElement | null>(null)

const card = ref<PlayerCard | null>(null)
const loadError = ref<string | null>(null)
const loading = ref(false)
const uploadLoading = ref(false)
const uploadError = ref<string | null>(null)
const selectedPhotoUrl = ref<string | null>(null)
const setMainLoading = ref(false)

function close() {
  if (uploadLoading.value || setMainLoading.value) return
  open.value = false
}

function selectPhoto(url: string) {
  selectedPhotoUrl.value = selectedPhotoUrl.value === url ? null : url
}

function canMakeMain(): boolean {
  const c = card.value
  const u = selectedPhotoUrl.value
  if (!c?.photo_urls?.length || !u) return false
  const i = c.photo_urls.indexOf(u)
  return i > 0
}

async function makeSelectedMain() {
  const c = card.value
  const u = selectedPhotoUrl.value
  if (!c || !u || !canMakeMain()) return
  uploadError.value = null
  setMainLoading.value = true
  try {
    const urls = [...c.photo_urls]
    const i = urls.indexOf(u)
    if (i <= 0) return
    urls.splice(i, 1)
    urls.unshift(u)
    const meUser = await me()
    await patchPlayerCard(meUser.id, c.id, { photo_urls: urls })
    card.value = await getPlayerCard(meUser.id, c.id)
    selectedPhotoUrl.value = null
    emit('updated')
  } catch (e) {
    uploadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    setMainLoading.value = false
  }
}

async function fetchCard() {
  const id = props.cardId
  if (!id) {
    card.value = null
    return
  }
  loading.value = true
  loadError.value = null
  try {
    const u = await me()
    card.value = await getPlayerCard(u.id, id)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
    card.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, props.cardId] as const,
  async ([isOpen, id]) => {
    if (isOpen && id) {
      uploadError.value = null
      selectedPhotoUrl.value = null
      await fetchCard()
      void nextTick(() => fileInputRef.value && (fileInputRef.value.value = ''))
    } else if (!isOpen) {
      card.value = null
      loadError.value = null
      uploadError.value = null
      selectedPhotoUrl.value = null
    }
  },
)

watch(open, (isOpen, _, onCleanup) => {
  if (isOpen) {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploadLoading.value && !setMainLoading.value) close()
    }
    document.addEventListener('keydown', onEsc)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    onCleanup(() => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prevOverflow
    })
  }
})

function displayText(value: string | null | undefined): string {
  const t = value?.trim()
  return t ? t : '—'
}

async function onPhotoFilesChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  uploadError.value = null
  if (!files.length || !card.value) return
  uploadLoading.value = true
  try {
    const u = await me()
    for (const f of files) {
      await uploadPlayerCardPhoto(u.id, card.value.id, f)
    }
    card.value = await getPlayerCard(u.id, card.value.id)
    selectedPhotoUrl.value = null
    emit('updated')
  } catch (e) {
    uploadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    uploadLoading.value = false
    input.value = ''
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="app-modal">
      <div v-if="open" class="app-modal" role="presentation">
        <div
          class="app-modal__backdrop"
          aria-hidden="true"
          @click.self="!uploadLoading && !setMainLoading && close()"
        />
        <div class="app-modal__wrap" role="dialog" aria-modal="true" aria-labelledby="pim-title">
          <div class="app-modal__panel">
            <div class="app-modal__head">
              <h2 id="pim-title" class="app-modal__title">Информация о игроке</h2>
              <button
                type="button"
                class="app-modal__close"
                aria-label="Закрыть"
                :disabled="uploadLoading || setMainLoading"
                @click="close"
              >
                ×
              </button>
            </div>

            <div class="app-modal__body app-modal__body--tight">
              <p v-if="loading" class="pim__status">Загрузка…</p>
              <p v-else-if="loadError" class="pim__banner" role="alert">{{ loadError }}</p>
              <template v-else-if="card">
                <div class="pim__form">
                  <div class="pim__field">
                    <span class="pim__label">Имя</span>
                    <p
                      class="pim__value"
                      :class="{ 'pim__value--empty': !card.first_name?.trim() }"
                    >
                      {{ displayText(card.first_name) }}
                    </p>
                  </div>
                  <div class="pim__field">
                    <span class="pim__label">Фамилия</span>
                    <p
                      class="pim__value"
                      :class="{ 'pim__value--empty': !card.last_name?.trim() }"
                    >
                      {{ displayText(card.last_name) }}
                    </p>
                  </div>
                  <div class="pim__field">
                    <span class="pim__label">Никнейм</span>
                    <p
                      class="pim__value"
                      :class="{ 'pim__value--empty': !card.nickname?.trim() }"
                    >
                      {{ displayText(card.nickname) }}
                    </p>
                  </div>
                  <div class="pim__field">
                    <span class="pim__label">
                      Клуб <span class="pim__optional">(необязательно)</span>
                    </span>
                    <p
                      class="pim__value"
                      :class="{ 'pim__value--empty': !card.club?.trim() }"
                    >
                      {{ displayText(card.club) }}
                    </p>
                  </div>
                  <div class="pim__field">
                    <span class="pim__label">
                      Ссылка на профиль GoMafia
                      <span class="pim__optional">(необязательно)</span>
                    </span>
                    <p v-if="card.gomafia_url?.trim()" class="pim__value">
                      <a
                        :href="card.gomafia_url.trim()"
                        class="pim__link pim__value-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {{ card.gomafia_url.trim() }}
                      </a>
                    </p>
                    <p v-else class="pim__value pim__value--empty">—</p>
                  </div>
                </div>

                <div class="pim__photos-section">
                  <p class="pim__photos-label">Фотографии</p>
                  <div v-if="card.photo_urls?.length" class="pim__photo-grid">
                    <div
                      v-for="(url, idx) in card.photo_urls"
                      :key="`${url}-${idx}`"
                      class="pim__photo-cell"
                      :class="{
                        'pim__photo-cell--selected': selectedPhotoUrl === url,
                        'pim__photo-cell--main': idx === 0,
                      }"
                      role="button"
                      tabindex="0"
                      :aria-pressed="selectedPhotoUrl === url"
                      :aria-label="`Фото ${idx + 1}, выбрать`"
                      @click="selectPhoto(url)"
                      @keydown.enter.prevent="selectPhoto(url)"
                      @keydown.space.prevent="selectPhoto(url)"
                    >
                      <img :src="url" alt="" class="pim__photo-img" />
                      <span v-if="idx === 0" class="pim__photo-badge">Основная</span>
                    </div>
                  </div>
                  <p v-else class="pim__photos-empty">Пока нет загруженных фото</p>

                  <div class="pim__add-row">
                    <input
                      :id="fileInputId"
                      ref="fileInputRef"
                      class="pim__file-input"
                      type="file"
                      accept="image/*"
                      multiple
                      :disabled="uploadLoading || setMainLoading"
                      @change="onPhotoFilesChange"
                    />
                    <label
                      class="pim__add-btn"
                      :class="{ 'pim__add-btn--disabled': uploadLoading || setMainLoading }"
                      :for="fileInputId"
                    >
                      {{ uploadLoading ? 'Загрузка…' : 'Добавить фото' }}
                    </label>
                    <button
                      v-if="canMakeMain()"
                      type="button"
                      class="app-modal__btn-primary"
                      :disabled="setMainLoading || uploadLoading"
                      @click="makeSelectedMain"
                    >
                      {{ setMainLoading ? 'Сохранение…' : 'Сделать основной' }}
                    </button>
                  </div>
                  <p v-if="uploadError" class="pim__banner pim__banner--soft" role="alert">
                    {{ uploadError }}
                  </p>
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
.pim__status {
  margin: 0;
  font-size: 0.9375rem;
  color: #6b7280;
}

.pim__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pim__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.pim__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
}

.pim__optional {
  font-weight: 400;
  color: #9ca3af;
}

.pim__value {
  margin: 0;
  padding: 0.55rem 0.75rem;
  font-size: 0.9375rem;
  color: #111827;
  line-height: 1.4;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  word-break: break-word;
}

.pim__value--empty {
  color: #9ca3af;
}

.pim__value-link {
  word-break: break-all;
}

.pim__link {
  color: #2f6feb;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.pim__link:hover {
  color: #2563d4;
}

.pim__photos-section {
  margin-top: 0.35rem;
  padding-top: 0.85rem;
  border-top: 1px solid #f3f4f6;
}

.pim__photos-label {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
}

.pim__photos-empty {
  margin: 0 0 0.65rem;
  font-size: 0.8125rem;
  color: #9ca3af;
}

.pim__photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5.75rem, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.pim__photo-cell {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #f3f4f6;
  cursor: pointer;
  padding: 0;
  margin: 0;
  font: inherit;
  box-sizing: border-box;
  position: relative;
  transition: none;
}

.pim__photo-cell:focus {
  outline: none;
}

.pim__photo-cell:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.pim__photo-cell--selected {
  border: 2px solid #2f6feb;
}

.pim__photo-badge {
  position: absolute;
  bottom: 0.25rem;
  left: 0.25rem;
  right: 0.25rem;
  padding: 0.12rem 0.2rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-align: center;
  color: #fff;
  background: rgba(17, 24, 39, 0.72);
  border-radius: 4px;
  line-height: 1.2;
  pointer-events: none;
}

.pim__photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}

.pim__add-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.pim__file-input {
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

.pim__add-btn {
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

.pim__add-btn:hover:not(.pim__add-btn--disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.pim__add-btn--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.pim__banner {
  margin: 0;
  padding: 0.65rem 0.75rem;
  font-size: 0.8125rem;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.pim__banner--soft {
  color: #92400e;
  background: #fffbeb;
  border-color: #fcd34d;
}

</style>
