<script setup lang="ts">
import { computed, onUnmounted, ref, useId, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { me, type UserMe } from '@/api/auth'
import {
  patchMeAvatar,
  patchMeProfile,
  patchProfileEmail,
} from '@/api/profileSettings'
import { useAuthStore } from '@/stores/auth'
import { useProfileSettingsModalStore } from '@/stores/profileSettingsModal'

const router = useRouter()
const modal = useProfileSettingsModalStore()
const { isOpen } = storeToRefs(modal)
const { token } = storeToRefs(useAuthStore())

const avatarInputId = useId()
const avatarInputRef = ref<HTMLInputElement | null>(null)

const firstName = ref('')
const lastName = ref('')
const currentEmail = ref('')
const newEmail = ref('')
const avatarUrl = ref<string | null>(null)
const pendingAvatarFile = ref<File | null>(null)
const avatarPreviewObjectUrl = ref<string | null>(null)

const loadError = ref<string | null>(null)
const loadingUser = ref(false)
const saving = ref(false)
const serverError = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const avatarDisplaySrc = computed(() => {
  if (avatarPreviewObjectUrl.value) return avatarPreviewObjectUrl.value
  const u = avatarUrl.value?.trim()
  return u || ''
})

const avatarInitials = computed(() => {
  const a = (firstName.value.trim()[0] || '') + (lastName.value.trim()[0] || '')
  return a ? a.toUpperCase() : ''
})

function resetPendingAvatar() {
  if (avatarPreviewObjectUrl.value) {
    URL.revokeObjectURL(avatarPreviewObjectUrl.value)
    avatarPreviewObjectUrl.value = null
  }
  pendingAvatarFile.value = null
  if (avatarInputRef.value) avatarInputRef.value.value = ''
}

function applyFromUser(u: UserMe) {
  firstName.value = u.first_name ?? ''
  lastName.value = u.last_name ?? ''
  currentEmail.value = u.email ?? ''
  newEmail.value = u.email ?? ''
  avatarUrl.value = u.avatar_url?.trim() || null
}

function close() {
  if (saving.value) return
  modal.close()
}

async function loadUser() {
  if (!token.value) return
  loadError.value = null
  loadingUser.value = true
  try {
    const u = await me()
    applyFromUser(u)
    resetPendingAvatar()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loadingUser.value = false
  }
}

function onAvatarChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !file.type.startsWith('image/')) {
    input.value = ''
    return
  }
  if (avatarPreviewObjectUrl.value) {
    URL.revokeObjectURL(avatarPreviewObjectUrl.value)
  }
  pendingAvatarFile.value = file
  avatarPreviewObjectUrl.value = URL.createObjectURL(file)
  input.value = ''
}

function isValidEmail(v: string): boolean {
  const t = v.trim()
  if (!t) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

async function onSubmit() {
  serverError.value = null
  successMessage.value = null
  const fn = firstName.value.trim()
  const ln = lastName.value.trim()
  if (!fn || !ln) {
    serverError.value = 'Укажите имя и фамилию'
    return
  }
  const nextEmail = newEmail.value.trim()
  if (nextEmail !== currentEmail.value.trim()) {
    if (!isValidEmail(nextEmail)) {
      serverError.value = 'Введите корректный адрес почты'
      return
    }
  }

  saving.value = true
  try {
    await patchMeProfile({ first_name: fn, last_name: ln })
    if (pendingAvatarFile.value) {
      await patchMeAvatar(pendingAvatarFile.value)
      resetPendingAvatar()
    }
    if (nextEmail !== currentEmail.value.trim()) {
      await patchProfileEmail({ email: nextEmail })
      currentEmail.value = nextEmail
    }
    await loadUser()
    successMessage.value = 'Изменения сохранены'
  } catch (e) {
    serverError.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

watch(token, (t) => {
  if (!t) {
    modal.close()
    void router.replace({ name: 'login' })
  }
})

let escHandler: ((e: KeyboardEvent) => void) | null = null
let prevBodyOverflow = ''

function teardownOverlay() {
  if (escHandler) {
    document.removeEventListener('keydown', escHandler)
    escHandler = null
  }
  document.body.style.overflow = prevBodyOverflow
  prevBodyOverflow = ''
  resetPendingAvatar()
}

watch(isOpen, (open) => {
  if (!open) {
    teardownOverlay()
    return
  }
  if (!token.value) {
    modal.close()
    void router.replace({ name: 'login' })
    return
  }
  successMessage.value = null
  serverError.value = null
  void loadUser()
  escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !saving.value) close()
  }
  document.addEventListener('keydown', escHandler)
  prevBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  teardownOverlay()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="app-modal">
      <div v-if="isOpen" class="app-modal" role="presentation">
        <div class="app-modal__backdrop" aria-hidden="true" @click.self="close" />
        <div class="app-modal__wrap" role="dialog" aria-modal="true" aria-labelledby="psv-title">
          <div class="app-modal__panel">
            <div class="app-modal__head">
              <h2 id="psv-title" class="app-modal__title">Настройки аккаунта</h2>
              <button type="button" class="app-modal__close" aria-label="Закрыть" :disabled="saving" @click="close">
                ×
              </button>
            </div>

            <div class="app-modal__body">
            <p v-if="loadingUser" class="psv__status">Загрузка…</p>
            <p v-else-if="loadError" class="psv__banner" role="alert">{{ loadError }}</p>
            <template v-else>
              <p v-if="successMessage" class="psv__banner psv__banner--ok" role="status">
                {{ successMessage }}
              </p>
              <p v-if="serverError" class="psv__banner" role="alert">{{ serverError }}</p>

              <form class="psv__form" novalidate @submit.prevent="onSubmit">
                <div class="psv__field">
                  <span class="psv__label">Фото профиля</span>
                  <div class="psv__avatar-row">
                    <div class="psv__avatar-wrap">
                      <img v-if="avatarDisplaySrc" :src="avatarDisplaySrc" alt="" class="psv__avatar-img" />
                      <div v-else class="psv__avatar-placeholder" aria-hidden="true">
                        {{ avatarInitials || '-' }}
                      </div>
                    </div>
                    <div class="psv__avatar-actions">
                      <input
                        :id="avatarInputId"
                        ref="avatarInputRef"
                        class="psv__file-input"
                        type="file"
                        accept="image/*"
                        :disabled="saving"
                        @change="onAvatarChange"
                      />
                      <label
                        class="psv__file-btn"
                        :class="{ 'psv__file-btn--disabled': saving }"
                        :for="avatarInputId"
                      >
                        Выбрать фото
                      </label>
                    </div>
                  </div>
                </div>

                <label class="psv__field">
                  <span class="psv__label">Имя</span>
                  <input
                    v-model="firstName"
                    class="psv__input"
                    type="text"
                    name="first_name"
                    autocomplete="given-name"
                    :disabled="saving"
                  />
                </label>

                <label class="psv__field">
                  <span class="psv__label">Фамилия</span>
                  <input
                    v-model="lastName"
                    class="psv__input"
                    type="text"
                    name="last_name"
                    autocomplete="family-name"
                    :disabled="saving"
                  />
                </label>

                <label class="psv__field">
                  <span class="psv__label">Текущая почта</span>
                  <input
                    class="psv__input psv__input--readonly"
                    type="email"
                    :value="currentEmail"
                    readonly
                    tabindex="-1"
                    aria-readonly="true"
                  />
                </label>

                <label class="psv__field">
                  <span class="psv__label">Новая почта</span>
                  <input
                    v-model="newEmail"
                    class="psv__input"
                    type="email"
                    name="email"
                    autocomplete="email"
                    placeholder="Оставьте без изменений или укажите новую"
                    :disabled="saving"
                  />
                </label>

                <div class="app-modal__actions">
                  <button type="submit" class="app-modal__btn-primary" :disabled="saving">
                    {{ saving ? 'Сохранение…' : 'Сохранить' }}
                  </button>
                  <button type="button" class="app-modal__btn-secondary" :disabled="saving" @click="close">
                    Закрыть
                  </button>
                </div>
              </form>
            </template>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.psv__status {
  margin: 0;
  font-size: 0.9375rem;
  color: #6b7280;
}

.psv__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.psv__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.psv__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
}

.psv__avatar-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.psv__avatar-wrap {
  width: 4.5rem;
  height: 4.5rem;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #f3f4f6;
}

.psv__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.psv__avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  font-weight: 600;
  color: #6b7280;
}

.psv__avatar-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
}

.psv__file-input {
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

.psv__file-btn {
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

.psv__file-btn:hover:not(.psv__file-btn--disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.psv__file-btn--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.psv__input {
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

.psv__input--readonly {
  color: #6b7280;
  background: #f9fafb;
  cursor: default;
}

.psv__input--readonly:focus,
.psv__input--readonly:focus-visible {
  outline: none;
  border-color: #e5e7eb;
}

.psv__banner {
  margin: 0;
  padding: 0.65rem 0.75rem;
  font-size: 0.8125rem;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.psv__banner--ok {
  color: #166534;
  background: #f0fdf4;
  border-color: #bbf7d0;
}
</style>
