<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { submitFeedback, type FeedbackCategory } from '@/api/feedback'
import { useAuthStore } from '@/stores/auth'
import { useFeedbackModalStore } from '@/stores/feedbackModal'

const router = useRouter()
const modal = useFeedbackModalStore()
const { isOpen } = storeToRefs(modal)
const { token } = storeToRefs(useAuthStore())

const category = ref<FeedbackCategory>('other')
const message = ref('')
const contactEmail = ref('')
const submitting = ref(false)
const fieldErrors = ref<{ message?: string; contact_email?: string; form?: string }>({})

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: 'other', label: 'Другое' },
  { value: 'bug', label: 'Ошибка' },
  { value: 'idea', label: 'Идея' },
]

const messageLength = computed(() => message.value.trim().length)

function setCategory(next: FeedbackCategory) {
  if (submitting.value) return
  category.value = next
}

function isValidEmail(v: string): boolean {
  const t = v.trim()
  if (!t) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

function resetForm() {
  category.value = 'other'
  message.value = ''
  contactEmail.value = ''
  fieldErrors.value = {}
}

function close() {
  if (submitting.value) return
  modal.close()
}

function validate(): boolean {
  fieldErrors.value = {}
  const trimmedMessage = message.value.trim()
  const trimmedEmail = contactEmail.value.trim()

  if (trimmedMessage.length < 10) {
    fieldErrors.value.message = 'Сообщение должно содержать не менее 10 символов'
  } else if (trimmedMessage.length > 4000) {
    fieldErrors.value.message = 'Сообщение не должно превышать 4000 символов'
  }

  if (trimmedEmail && !isValidEmail(trimmedEmail)) {
    fieldErrors.value.contact_email = 'Введите корректный адрес почты'
  }

  return !fieldErrors.value.message && !fieldErrors.value.contact_email
}

function mapSubmitError(e: unknown): void {
  if (e instanceof ApiError) {
    if (e.status === 401) {
      fieldErrors.value.form = 'Нужно авторизоваться'
      return
    }
    if (e.status === 403) {
      fieldErrors.value.form = 'Ошибка безопасности (CSRF), обновите страницу'
      return
    }
    if (e.status === 422) {
      fieldErrors.value.form = e.message || 'Проверьте правильность заполнения формы'
      return
    }
    if (e.status >= 500) {
      fieldErrors.value.form = 'Сервис временно недоступен, попробуйте позже'
      return
    }
    fieldErrors.value.form = e.message || 'Не удалось отправить сообщение'
    return
  }
  fieldErrors.value.form = e instanceof Error ? e.message : 'Не удалось отправить сообщение'
}

async function onSubmit() {
  if (submitting.value) return
  if (!validate()) return

  submitting.value = true
  fieldErrors.value = {}

  const trimmedMessage = message.value.trim()
  const trimmedEmail = contactEmail.value.trim()
  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''

  try {
    await submitFeedback({
      category: category.value,
      message: trimmedMessage,
      page_url: pageUrl,
      contact_email: trimmedEmail || undefined,
    })
    resetForm()
    modal.close()
    modal.showToast('Спасибо! Сообщение отправлено.')
  } catch (e) {
    mapSubmitError(e)
  } finally {
    submitting.value = false
  }
}

watch(token, (t) => {
  if (!t) {
    modal.close()
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
}

watch(isOpen, (open) => {
  if (!open) {
    teardownOverlay()
    return
  }
  if (!token.value) {
    modal.close()
    void router.push({ name: 'login' })
    return
  }
  resetForm()
  submitting.value = false
  escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !submitting.value) close()
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
        <div class="app-modal__wrap fb__wrap" role="dialog" aria-modal="true" aria-labelledby="fb-title">
          <div class="app-modal__panel fb__panel">
            <div class="app-modal__head">
              <h2 id="fb-title" class="app-modal__title">Обратная связь</h2>
              <button type="button" class="app-modal__close" aria-label="Закрыть" :disabled="submitting" @click="close">
                ×
              </button>
            </div>

            <div class="app-modal__body app-modal__body--tight">
              <p v-if="fieldErrors.form" class="fb__banner" role="alert">{{ fieldErrors.form }}</p>

              <form class="fb__form" novalidate @submit.prevent="onSubmit">
                <div class="fb__field">
                  <span id="fb-category-label" class="fb__label">Категория</span>
                  <div
                    class="fb__category"
                    role="radiogroup"
                    aria-labelledby="fb-category-label"
                  >
                    <button
                      v-for="opt in CATEGORY_OPTIONS"
                      :key="opt.value"
                      type="button"
                      role="radio"
                      class="fb__category-btn"
                      :class="{ 'fb__category-btn--active': category === opt.value }"
                      :aria-checked="category === opt.value"
                      :disabled="submitting"
                      @click="setCategory(opt.value)"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </div>

                <div class="fb__field">
                  <div class="fb__label-row">
                    <label class="fb__label" for="fb-message">Сообщение</label>
                    <span class="fb__counter" aria-live="polite">{{ messageLength }} / 4000</span>
                  </div>
                  <textarea
                    id="fb-message"
                    v-model="message"
                    class="fb__textarea"
                    name="message"
                    rows="5"
                    maxlength="4000"
                    placeholder="Что случилось или что хотите предложить?"
                    :disabled="submitting"
                    required
                  />
                  <span v-if="fieldErrors.message" class="fb__error">{{ fieldErrors.message }}</span>
                </div>

                <div class="fb__field">
                  <label class="fb__label" for="fb-email">Email для ответа</label>
                  <span class="fb__field-note">Необязательно - если не указать, ответим на почту привязанную к аккаунту</span>
                  <input
                    id="fb-email"
                    v-model="contactEmail"
                    class="fb__input"
                    type="email"
                    name="contact_email"
                    autocomplete="email"
                    placeholder="name@example.com"
                    :disabled="submitting"
                  />
                  <span v-if="fieldErrors.contact_email" class="fb__error">{{ fieldErrors.contact_email }}</span>
                </div>

                <div class="app-modal__actions app-modal__actions--end fb__actions">
                  <button type="button" class="app-modal__btn-secondary" :disabled="submitting" @click="close">
                    Отмена
                  </button>
                  <button type="submit" class="app-modal__btn-primary" :disabled="submitting">
                    {{ submitting ? 'Отправка…' : 'Отправить' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fb__wrap {
  max-width: 28rem;
}

.fb__panel {
  padding-bottom: calc(1.35rem + 4px);
}

.fb__form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.fb__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.fb__label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.fb__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
}

.fb__field-note {
  font-size: 0.75rem;
  line-height: 1.4;
  color: #9ca3af;
}

.fb__counter {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: #9ca3af;
}

.fb__category {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}

.fb__category-btn {
  margin: 0;
  padding: 0.5rem 0.35rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.fb__category-btn:hover:not(:disabled):not(.fb__category-btn--active) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.fb__category-btn:focus {
  outline: none;
}

.fb__category-btn:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.fb__category-btn--active {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #93c5fd;
}

.fb__category-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.fb__input,
.fb__textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem 0.75rem;
  font: inherit;
  font-size: 0.9375rem;
  color: #111827;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.fb__textarea {
  min-height: 6.5rem;
  max-height: 14rem;
  resize: vertical;
  line-height: 1.45;
}

.fb__textarea::placeholder {
  color: #9ca3af;
}

.fb__input::placeholder {
  color: #9ca3af;
}

.fb__error {
  font-size: 0.8125rem;
  color: #b91c1c;
}

.fb__banner {
  margin: 0;
  padding: 0.65rem 0.75rem;
  font-size: 0.8125rem;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.fb__actions {
  margin-top: 0.35rem;
  padding-top: 0.15rem;
}

@media (max-width: 767px) {
  .fb__wrap {
    max-width: 100%;
  }

  .fb__category {
    grid-template-columns: 1fr;
  }

  .fb__actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .fb__actions .app-modal__btn-primary,
  .fb__actions .app-modal__btn-secondary {
    width: 100%;
    justify-content: center;
  }
}
</style>
