<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { me } from '@/api/auth'
import {
  createPlayerCard,
  patchPlayerCard,
  uploadPlayerCardPhoto,
  type PlayerCard,
} from '@/api/playerCards'

const open = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    /** Если задан — режим редактирования (PATCH + догрузка фото на ту же карточку). */
    editingCard?: PlayerCard | null
  }>(),
  { editingCard: null },
)

const fileInputId = useId()
const isEdit = computed(() => props.editingCard != null)
const modalTitle = computed(() =>
  isEdit.value ? 'Редактировать профиль' : 'Новая карточка игрока',
)
const submitLabel = computed(() => {
  if (isEdit.value) return 'Сохранить'
  return 'Создать карточку'
})
const submitLoadingLabel = computed(() => (isEdit.value ? 'Сохранение…' : 'Создание…'))

const emit = defineEmits<{
  created: []
}>()

const firstName = ref('')
const lastName = ref('')
const nickname = ref('')
const club = ref('')
const gomafiaUrl = ref('')
/** Файлы отправляются после создания карточки: POST …/player-cards/{id}/photo */
const pendingPhotoFiles = ref<File[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const serverError = ref<string | null>(null)
const firstInputRef = ref<HTMLInputElement | null>(null)

const toastVisible = ref(false)
const toastMessage = ref('')
let toastHideTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string) {
  if (toastHideTimer) {
    clearTimeout(toastHideTimer)
    toastHideTimer = null
  }
  toastMessage.value = message
  toastVisible.value = true
  toastHideTimer = setTimeout(() => {
    toastVisible.value = false
    toastHideTimer = null
  }, 2800)
}

function resetForm() {
  firstName.value = ''
  lastName.value = ''
  nickname.value = ''
  club.value = ''
  gomafiaUrl.value = ''
  pendingPhotoFiles.value = []
  serverError.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function applyEditingCard(c: PlayerCard) {
  firstName.value = c.first_name
  lastName.value = c.last_name
  nickname.value = c.nickname
  club.value = c.club ?? ''
  gomafiaUrl.value = c.gomafia_url ?? ''
  pendingPhotoFiles.value = []
  serverError.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function close() {
  if (loading.value) return
  open.value = false
}

function removePendingPhoto(index: number) {
  pendingPhotoFiles.value.splice(index, 1)
}

function truncateUrl(u: string) {
  return u.length <= 44 ? u : `${u.slice(0, 24)}…${u.slice(-14)}`
}

function onPhotoFilesChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (!files.length) return
  pendingPhotoFiles.value.push(...files)
  input.value = ''
}

watch(open, (isOpen, _, onCleanup) => {
  if (isOpen) {
    toastVisible.value = false
    if (toastHideTimer) {
      clearTimeout(toastHideTimer)
      toastHideTimer = null
    }
    if (props.editingCard) applyEditingCard(props.editingCard)
    else resetForm()
    void nextTick(() => firstInputRef.value?.focus())
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading.value) close()
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

async function submit() {
  serverError.value = null
  const fn = firstName.value.trim()
  const ln = lastName.value.trim()
  const nn = nickname.value.trim()
  if (!fn || !ln || !nn) {
    serverError.value = 'Заполните имя, фамилию и никнейм'
    return
  }
  loading.value = true
  try {
    const user = await me()
    const clubTrim = club.value.trim()
    const goTrim = gomafiaUrl.value.trim()
    const files = [...pendingPhotoFiles.value]

    const patchBody = {
      first_name: fn,
      last_name: ln,
      nickname: nn,
      ...(clubTrim ? { club: clubTrim } : { club: null }),
      ...(goTrim ? { gomafia_url: goTrim } : { gomafia_url: null }),
    }

    let cardId: string
    if (props.editingCard) {
      await patchPlayerCard(user.id, props.editingCard.id, patchBody)
      cardId = props.editingCard.id
    } else {
      const card = await createPlayerCard(user.id, {
        first_name: fn,
        last_name: ln,
        nickname: nn,
        ...(clubTrim ? { club: clubTrim } : {}),
        ...(goTrim ? { gomafia_url: goTrim } : {}),
      })
      cardId = card.id
    }

    let uploadErr: string | null = null
    for (const file of files) {
      try {
        await uploadPlayerCardPhoto(user.id, cardId, file)
      } catch (e) {
        uploadErr = e instanceof Error ? e.message : String(e)
        break
      }
    }

    emit('created')
    if (uploadErr) {
      serverError.value = props.editingCard
        ? `Профиль сохранён. Не удалось загрузить фото: ${uploadErr}`
        : `Карточка создана. Не удалось загрузить фото: ${uploadErr}`
      return
    }
    if (!props.editingCard) {
      showToast('Профиль создан')
    }
    loading.value = false
    close()
  } catch (e) {
    serverError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="app-modal">
      <div
        v-if="open"
        class="app-modal"
        role="presentation"
      >
        <div
          class="app-modal__backdrop"
          aria-hidden="true"
          @click.self="!loading && close()"
        />
        <div
          class="app-modal__wrap"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pcm-title"
        >
          <div class="app-modal__panel">
            <div class="app-modal__head">
              <h2 id="pcm-title" class="app-modal__title">{{ modalTitle }}</h2>
              <button
                type="button"
                class="app-modal__close"
                aria-label="Закрыть"
                :disabled="loading"
                @click="close"
              >
                ×
              </button>
            </div>

            <form class="app-modal__body" novalidate @submit.prevent="submit">
              <p v-if="serverError" class="pcm__banner" role="alert">{{ serverError }}</p>

              <label class="pcm__field">
                <span class="pcm__label">Имя</span>
                <input
                  ref="firstInputRef"
                  v-model="firstName"
                  class="pcm__input"
                  type="text"
                  name="first_name"
                  autocomplete="given-name"
                />
              </label>
              <label class="pcm__field">
                <span class="pcm__label">Фамилия</span>
                <input
                  v-model="lastName"
                  class="pcm__input"
                  type="text"
                  name="last_name"
                  autocomplete="family-name"
                />
              </label>
              <label class="pcm__field">
                <span class="pcm__label">Никнейм</span>
                <input
                  v-model="nickname"
                  class="pcm__input"
                  type="text"
                  name="nickname"
                  autocomplete="nickname"
                />
              </label>

              <label class="pcm__field">
                <span class="pcm__label">Клуб <span class="pcm__optional">(необязательно)</span></span>
                <input
                  v-model="club"
                  class="pcm__input"
                  type="text"
                  name="club"
                  autocomplete="organization"
                  placeholder="Название клуба"
                />
              </label>

              <label class="pcm__field">
                <span class="pcm__label">Ссылка на профиль GoMafia <span class="pcm__optional">(необязательно)</span></span>
                <input
                  v-model="gomafiaUrl"
                  class="pcm__input"
                  type="url"
                  name="gomafia_url"
                  inputmode="url"
                  placeholder="https://…"
                />
              </label>

              <div class="pcm__field">
                <div class="pcm__file-row">
                  <input
                    :id="fileInputId"
                    ref="fileInputRef"
                    class="pcm__visually-hidden"
                    type="file"
                    accept="image/*"
                    multiple
                    :disabled="loading"
                    @change="onPhotoFilesChange"
                  />
                  <label
                    class="pcm__file-btn"
                    :class="{ 'pcm__file-btn--disabled': loading }"
                    :for="fileInputId"
                  >
                    Добавить фото
                  </label>
                </div>
                <ul v-if="pendingPhotoFiles.length" class="pcm__chips" aria-label="Выбранные фото">
                  <li
                    v-for="(file, idx) in pendingPhotoFiles"
                    :key="`${file.name}-${file.size}-${file.lastModified}-${idx}`"
                    class="pcm__chip"
                  >
                    <span class="pcm__chip-text" :title="file.name">{{ truncateUrl(file.name) }}</span>
                    <button
                      type="button"
                      class="pcm__chip-remove"
                      :disabled="loading"
                      aria-label="Убрать файл"
                      @click="removePendingPhoto(idx)"
                    >
                      ×
                    </button>
                  </li>
                </ul>
              </div>

              <div class="app-modal__actions">
                <button type="submit" class="app-modal__btn-primary" :disabled="loading">
                  {{ loading ? submitLoadingLabel : submitLabel }}
                </button>
                <button type="button" class="app-modal__btn-secondary" :disabled="loading" @click="close">
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="pcm-toast">
      <div
        v-if="toastVisible"
        class="pcm-toast"
        role="status"
        aria-live="polite"
      >
        {{ toastMessage }}
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pcm__banner {
  margin: 0;
  padding: 0.65rem 0.75rem;
  font-size: 0.8125rem;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.pcm__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.pcm__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
}

.pcm__optional {
  font-weight: 400;
  color: #9ca3af;
}

.pcm__input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.55rem 0.75rem;
  font: inherit;
  font-size: 0.9375rem;
  color: #111827;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.pcm__input:-webkit-autofill,
.pcm__input:-webkit-autofill:hover,
.pcm__input:-webkit-autofill:focus,
.pcm__input:-webkit-autofill:focus-visible {
  -webkit-box-shadow: 0 0 0 1000px #fff inset;
  -webkit-text-fill-color: #111827;
}

.pcm__visually-hidden {
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

.pcm__file-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.pcm__file-btn {
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
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.pcm__file-btn:hover:not(.pcm__file-btn--disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.pcm__file-btn--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.pcm__chips {
  list-style: none;
  margin: 0.35rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.pcm__chip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.75rem;
}

.pcm__chip-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #4b5563;
}

.pcm__chip-remove {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  font: inherit;
  font-size: 1.1rem;
  line-height: 1;
  color: #6b7280;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pcm__chip-remove:hover:not(:disabled) {
  color: #111827;
  background: #f3f4f6;
}

.pcm__chip-remove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pcm-toast {
  position: fixed;
  bottom: max(1.25rem, env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 3200;
  max-width: min(22rem, calc(100vw - 2rem));
  padding: 0.75rem 1.15rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #166534;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 10px;
  box-sizing: border-box;
  text-align: center;
  pointer-events: none;
}

.pcm-toast-enter-active,
.pcm-toast-leave-active {
  transition: opacity 0.2s ease;
}

.pcm-toast-enter-from,
.pcm-toast-leave-to {
  opacity: 0;
}
</style>
