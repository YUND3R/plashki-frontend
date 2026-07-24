<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { ApiError } from '@/api/client'
import { submitFeedback, type FeedbackCategory } from '@/api/feedback'
import { useAuthStore } from '@/stores/auth'
import { useContactUiStore } from '@/stores/contactUi'
import { contentAssets } from '@/utils/contentAssets'

const { token } = storeToRefs(useAuthStore())
const contactUi = useContactUiStore()
const { category } = storeToRefs(contactUi)
const message = ref('')
const contactEmail = ref('')
const emailFieldOpen = ref(false)
const emailInputRef = ref<HTMLInputElement | null>(null)
const submitting = ref(false)
const submitted = ref(false)
const fieldErrors = ref<{ message?: string; contact_email?: string; form?: string }>({})

const ERROR_DISPLAY_MS = 5000
let errorDismissTimer: ReturnType<typeof setTimeout> | null = null

function clearErrorDismissTimer() {
  if (errorDismissTimer) {
    clearTimeout(errorDismissTimer)
    errorDismissTimer = null
  }
}

function hasVisibleErrors(): boolean {
  return !!(fieldErrors.value.message || fieldErrors.value.contact_email || fieldErrors.value.form)
}

function scheduleErrorDismiss() {
  clearErrorDismissTimer()
  if (!hasVisibleErrors()) return
  errorDismissTimer = setTimeout(() => {
    fieldErrors.value = {}
    errorDismissTimer = null
  }, ERROR_DISPLAY_MS)
}

watch(fieldErrors, scheduleErrorDismiss, { deep: true })

onUnmounted(clearErrorDismissTimer)

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: 'other', label: 'Другое' },
  { value: 'bug', label: 'Ошибка' },
  { value: 'idea', label: 'Идея' },
]


function setCategory(next: FeedbackCategory) {
  if (submitting.value) return
  contactUi.setCategory(next)
}

function isValidEmail(v: string): boolean {
  const t = v.trim()
  if (!t) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

function resetForm() {
  contactUi.resetCategory()
  message.value = ''
  contactEmail.value = ''
  emailFieldOpen.value = false
  clearErrorDismissTimer()
  fieldErrors.value = {}
}

async function toggleEmailField() {
  if (submitting.value) return
  emailFieldOpen.value = true
  await nextTick()
  emailInputRef.value?.focus()
}

function closeEmailField() {
  if (submitting.value) return
  emailFieldOpen.value = false
  if (fieldErrors.value.contact_email) {
    const next = { ...fieldErrors.value }
    delete next.contact_email
    fieldErrors.value = next
  }
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
    emailFieldOpen.value = true
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
  if (submitting.value || !token.value) return
  if (!validate()) return

  submitting.value = true
  submitted.value = false
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
    submitted.value = true
  } catch (e) {
    mapSubmitError(e)
  } finally {
    submitting.value = false
  }
}

watch(token, (t) => {
  if (!t) {
    submitted.value = false
    resetForm()
  }
})
</script>

<template>
  <section class="contact-layout">
    <div class="contact-workspace">
      <div v-if="!token" class="contact-workspace__panel">
        <div class="contact-workspace__frame contact-workspace__frame--guest">
          <div class="contact-workspace__section">
            <p class="contact-workspace__hint">
              Войдите в аккаунт, чтобы отправить сообщение в поддержку.
            </p>
            <div class="contact-workspace__auth-actions">
              <RouterLink
                class="contact-workspace__auth-btn contact-workspace__auth-btn--primary"
                :to="{ name: 'login' }"
              >
                Вход
              </RouterLink>
              <RouterLink
                class="contact-workspace__auth-btn contact-workspace__auth-btn--outline"
                :to="{ name: 'register' }"
              >
                Регистрация
              </RouterLink>
            </div>
          </div>
        </div>
      </div>

      <form v-else class="contact-workspace__panel contact-workspace__panel--form" novalidate @submit.prevent="onSubmit">
        <div class="contact-workspace__scroll">
          <Transition name="contact-alert">
            <p v-if="submitted" class="contact-workspace__success" role="status">Спасибо! Сообщение отправлено.</p>
          </Transition>
          <p v-if="fieldErrors.form" class="contact-workspace__banner" role="alert">{{ fieldErrors.form }}</p>

          <div class="contact-workspace__frame">
            <div class="contact-workspace__section contact-workspace__section--category">
              <div class="segmented-filter" role="radiogroup" aria-label="Категория">
                <button
                  v-for="opt in CATEGORY_OPTIONS"
                  :key="opt.value"
                  type="button"
                  role="radio"
                  class="segmented-filter__btn"
                  :class="{ 'segmented-filter__btn--active': category === opt.value }"
                  :aria-checked="category === opt.value"
                  :disabled="submitting"
                  @click="setCategory(opt.value)"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div class="contact-workspace__section contact-workspace__section--bleed contact-workspace__section--grow">
              <div
                class="contact-workspace__message-box"
                :class="{ 'contact-workspace__message-box--invalid': !!fieldErrors.message }"
              >
                <textarea
                  id="contact-message"
                  v-model="message"
                  class="contact-workspace__textarea"
                  name="message"
                  rows="8"
                  maxlength="4000"
                  placeholder="Введите сообщение"
                  aria-label="Сообщение"
                  :aria-invalid="fieldErrors.message ? 'true' : undefined"
                  :aria-describedby="fieldErrors.message ? 'contact-message-error' : undefined"
                  :disabled="submitting"
                  required
                />
                <p
                  v-if="fieldErrors.message"
                  id="contact-message-error"
                  class="contact-workspace__message-error"
                  role="alert"
                >
                  {{ fieldErrors.message }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="contact-workspace__footer">
          <div class="contact-workspace__footer-bar">
            <p
              v-if="fieldErrors.contact_email"
              class="contact-workspace__inline-error contact-workspace__inline-error--footer"
              role="alert"
            >
              {{ fieldErrors.contact_email }}
            </p>

            <div
              class="contact-workspace__footer-actions"
              :class="{
                'contact-workspace__footer-actions--joined': emailFieldOpen,
                'contact-workspace__footer-actions--invalid': !!fieldErrors.contact_email,
              }"
            >
              <div class="contact-workspace__footer-email-slot">
                <button
                  v-if="!emailFieldOpen"
                  type="button"
                  class="contact-workspace__email-btn"
                  :disabled="submitting"
                  @click="toggleEmailField"
                >
                  Ввести почту
                </button>
                <input
                  v-else
                  id="contact-email"
                  ref="emailInputRef"
                  v-model="contactEmail"
                  class="contact-workspace__footer-email-input"
                  type="email"
                  name="contact_email"
                  autocomplete="email"
                  placeholder="name@example.com"
                  aria-label="Email для ответа"
                  :aria-invalid="fieldErrors.contact_email ? 'true' : undefined"
                  :disabled="submitting"
                  @keydown.escape.prevent="closeEmailField"
                />
              </div>
              <button type="submit" class="app-modal__btn-primary contact-workspace__footer-submit" :disabled="submitting">
                {{ submitting ? 'Отправка…' : 'Отправить' }}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>

    <aside class="contact-aside" aria-hidden="true">
      <span class="contact-aside__connector" aria-hidden="true" />
      <div class="contact-aside__bubble-wrap">
        <img
          class="contact-aside__bubble"
          :src="contentAssets.contactSpeechBubble"
          alt=""
          width="480"
          height="480"
          decoding="async"
        />
      </div>
      <div class="contact-aside__inner">
        <span class="contact-aside__badge">Поддержка</span>
        <p class="contact-aside__copy">
          <span class="contact-aside__copy-line">Пишите свободно,</span>
          <span class="contact-aside__copy-line">мы читаем каждое сообщение.</span>
        </p>
      </div>
    </aside>
  </section>
</template>

<style scoped>
.contact-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 38%);
  width: 100%;
  box-sizing: border-box;
}

.contact-aside {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e5e7eb;
  background:
    radial-gradient(ellipse 120% 90% at 88% 6%, rgba(147, 197, 253, 0.28), transparent 62%),
    radial-gradient(ellipse 100% 75% at 10% 94%, rgba(191, 219, 254, 0.22), transparent 58%),
    linear-gradient(180deg, #ffffff 0%, #fcfdff 55%, #f7faff 100%);
}

.contact-aside::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.07) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.22), transparent 88%);
}

.contact-aside__bubble-wrap {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 1rem 0.35rem 0;
  box-sizing: border-box;
}

.contact-aside__bubble-wrap::before {
  content: '';
  position: absolute;
  width: min(100%, 30rem);
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(191, 219, 254, 0.28) 0%, rgba(219, 234, 254, 0.12) 45%, transparent 74%);
  pointer-events: none;
}

.contact-aside__bubble {
  position: relative;
  z-index: 1;
  display: block;
  width: min(100%, 32rem);
  max-width: 100%;
  height: auto;
  object-fit: contain;
  transform: scaleX(-1);
  filter: drop-shadow(0 18px 36px rgba(148, 163, 184, 0.18));
  user-select: none;
  pointer-events: none;
}

.contact-aside__inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  justify-content: flex-end;
  padding: 0 1.75rem 2rem;
  box-sizing: border-box;
}

.contact-aside__badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 0.35rem 0.7rem;
  margin-bottom: 0.75rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #3b82f6;
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  box-shadow: none;
}

.contact-aside__copy {
  margin: 0;
  max-width: 100%;
  font-size: 0.9375rem;
  font-weight: 400;
  line-height: 1.55;
  color: #64748b;
}

.contact-aside__copy-line {
  display: block;
}

.contact-aside__connector {
  position: absolute;
  top: 50%;
  left: -1px;
  z-index: 2;
  width: 1px;
  height: 4.5rem;
  background: linear-gradient(180deg, transparent, #e5e7eb 18%, #e5e7eb 82%, transparent);
  transform: translateY(-50%);
}

.contact-workspace {
  --contact-stroke: 1px;
  --contact-border: #e5e7eb;
  --contact-border-focus: #2f6feb;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: #fff;
}

.contact-workspace__panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0 0;
  box-sizing: border-box;
}

.contact-workspace__panel--form {
  height: 100%;
}

.contact-workspace__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0;
  box-sizing: border-box;
}

.contact-workspace__frame {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  gap: 0;
}

.contact-workspace__frame--guest {
  flex: 0 0 auto;
}

.contact-workspace__section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.875rem;
  box-sizing: border-box;
}

.contact-workspace__section--bleed {
  padding-inline: 0;
  padding-block: 0.875rem 0;
}

.contact-workspace__section--bleed.contact-workspace__section--grow {
  padding-top: 0;
}

.contact-workspace__section--bleed .contact-workspace__label-row,
.contact-workspace__section--bleed > .contact-workspace__label,
.contact-workspace__section--bleed > .contact-workspace__field-note,
.contact-workspace__section--bleed > .contact-workspace__error {
  padding-inline: 0.875rem;
}

.contact-workspace__section--bleed .contact-workspace__textarea,
.contact-workspace__section--bleed .contact-workspace__input {
  width: 100%;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: var(--contact-stroke) solid var(--contact-border);
  border-bottom: var(--contact-stroke) solid var(--contact-border);
}

.contact-workspace__section--bleed .contact-workspace__textarea:focus,
.contact-workspace__section--bleed .contact-workspace__textarea:focus-visible,
.contact-workspace__section--bleed .contact-workspace__input:focus,
.contact-workspace__section--bleed .contact-workspace__input:focus-visible {
  border-left: none;
  border-right: none;
  border-top: var(--contact-stroke) solid var(--contact-border-focus);
  border-bottom: var(--contact-stroke) solid var(--contact-border-focus);
}

.contact-workspace__section:last-child {
  border-bottom: none;
}

.contact-workspace__section--grow {
  flex: 1 1 auto;
  min-height: 0;
}

.contact-workspace__message-box {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  background: #fff;
  border-top: var(--contact-stroke) solid var(--contact-border);
  border-bottom: var(--contact-stroke) solid var(--contact-border);
  box-sizing: border-box;
}

.contact-workspace__message-box:focus-within {
  border-top-color: var(--contact-border-focus);
  border-bottom-color: var(--contact-border-focus);
}

.contact-workspace__message-box--invalid {
  border-bottom-color: #fca5a5;
}

.contact-workspace__message-box--invalid:focus-within {
  border-top-color: var(--contact-border-focus);
  border-bottom-color: #ef4444;
}

.contact-workspace__message-box .contact-workspace__textarea {
  flex: 1 1 auto;
  min-height: 8rem;
  border: none;
  border-radius: 0;
  resize: vertical;
}

.contact-workspace__message-box .contact-workspace__textarea:focus,
.contact-workspace__message-box .contact-workspace__textarea:focus-visible {
  border: none;
  box-shadow: none;
}

.contact-workspace__message-error {
  margin: 0;
  padding: 0.55rem 0.875rem 0.65rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #b91c1c;
  background: #fef2f2;
  border-top: var(--contact-stroke) solid #fecaca;
  flex-shrink: 0;
}

.contact-workspace__hint {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.45;
  color: #4b5563;
}

.contact-workspace__auth-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.75rem;
}

.contact-workspace__auth-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 7.25rem;
  padding: 0.48rem 0.95rem;
  border-radius: 8px;
  border: 1px solid transparent;
  box-sizing: border-box;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
}

.contact-workspace__auth-btn--primary {
  color: #ffffff;
  background: #2f6feb;
  border-color: #2f6feb;
}

.contact-workspace__auth-btn--primary:hover {
  background: #2563d4;
  border-color: #2563d4;
}

.contact-workspace__auth-btn--outline {
  color: #2f6feb;
  background: #ffffff;
  border-color: #d1d5db;
}

.contact-workspace__auth-btn--outline:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.contact-workspace__success,
.contact-workspace__banner {
  margin: 0 0.875rem;
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  border-radius: 8px;
  box-sizing: border-box;
}

.contact-workspace__success {
  color: #166534;
  background: #f0fdf4;
  border: var(--contact-stroke) solid #bbf7d0;
}

.contact-workspace__banner {
  color: #b91c1c;
  background: #fef2f2;
  border: var(--contact-stroke) solid #fecaca;
}

.contact-workspace__label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.contact-workspace__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
}

.contact-workspace__field-note {
  font-size: 0.75rem;
  line-height: 1.4;
  color: #9ca3af;
}

.contact-workspace__counter {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: #9ca3af;
}

.contact-workspace__input,
.contact-workspace__textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.55rem 0.75rem;
  font: inherit;
  font-size: 0.9375rem;
  color: #111827;
  background: #fff;
  border: var(--contact-stroke) solid var(--contact-border);
  border-radius: 8px;
}

.contact-workspace__textarea {
  flex: 1 1 auto;
  min-height: 10rem;
  resize: vertical;
  line-height: 1.45;
  padding: 1.1rem 0.95rem;
  font-size: 1.5rem;
}

.contact-workspace__textarea::placeholder {
  font-size: 1.5rem;
  color: #9ca3af;
}

.contact-workspace__input::placeholder {
  color: #9ca3af;
}

.contact-workspace__input:focus,
.contact-workspace__input:focus-visible,
.contact-workspace__textarea:focus,
.contact-workspace__textarea:focus-visible {
  outline: none;
  border: var(--contact-stroke) solid var(--contact-border-focus);
  box-shadow: none;
}

.contact-workspace__input:disabled,
.contact-workspace__textarea:disabled {
  opacity: 0.65;
}

.contact-workspace__inline-error {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #b91c1c;
}

.contact-workspace__inline-error--footer {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  padding: 0 0.25rem 0 0;
  text-align: right;
}

.contact-workspace__footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  margin-top: 0;
  padding: 0.65rem 0.875rem;
  background: #fff;
  box-sizing: border-box;
}

.contact-workspace__footer-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.contact-workspace__footer-actions {
  display: inline-grid;
  grid-template-columns: 10.75rem auto;
  align-items: stretch;
  gap: 0.5rem;
  flex: 0 0 auto;
  max-width: 100%;
}

.contact-workspace__footer-actions--joined {
  gap: 0;
  border: var(--contact-stroke) solid #93c5fd;
  border-radius: 8px;
  overflow: hidden;
}

.contact-workspace__footer-actions--joined:focus-within {
  border-color: var(--contact-border-focus);
}

.contact-workspace__footer-actions--invalid,
.contact-workspace__footer-actions--invalid:focus-within {
  border-color: #fca5a5;
}

.contact-workspace__footer-actions--invalid.contact-workspace__footer-actions--joined .contact-workspace__footer-submit {
  border-left-color: #fca5a5;
}

.contact-workspace__footer-email-slot {
  min-width: 0;
  display: flex;
}

.contact-workspace__footer-email-input {
  width: 100%;
  min-width: 0;
  min-height: 2.375rem;
  padding: 0.55rem 0.875rem;
  box-sizing: border-box;
  font: inherit;
  font-size: 1rem;
  color: #111827;
  background: #fff;
  border: var(--contact-stroke) solid #93c5fd;
  border-radius: 8px;
}

.contact-workspace__footer-actions--joined .contact-workspace__footer-email-input {
  border: none;
  border-radius: 0;
}

.contact-workspace__footer-email-input:focus,
.contact-workspace__footer-email-input:focus-visible {
  outline: none;
  box-shadow: none;
}

.contact-workspace__footer-email-input:disabled {
  opacity: 0.65;
}

.contact-workspace__footer-email-input::placeholder {
  color: #9ca3af;
}

.contact-workspace__footer-submit {
  min-height: 2.375rem;
  white-space: nowrap;
}

.contact-workspace__footer-actions--joined .contact-workspace__footer-submit {
  border-radius: 0;
  border: none;
  border-left: var(--contact-stroke) solid #93c5fd;
}

.contact-workspace__footer-actions--joined:focus-within .contact-workspace__footer-submit {
  border-left-color: var(--contact-border-focus);
}

.contact-workspace__footer-actions--invalid:focus-within .contact-workspace__footer-submit {
  border-left-color: #fca5a5;
}

.contact-workspace__email-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.375rem;
  padding: 0.55rem 1rem;
  font: inherit;
  font-size: 1rem;
  font-weight: 500;
  color: #2f6feb;
  background: #eff6ff;
  border: var(--contact-stroke) solid #93c5fd;
  border-radius: 8px;
  cursor: pointer;
  box-sizing: border-box;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.contact-workspace__email-btn:hover:not(:disabled) {
  background: #dbeafe;
  border-color: #60a5fa;
}

.contact-workspace__email-btn:focus {
  outline: none;
}

.contact-workspace__email-btn:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}


.contact-workspace__email-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.contact-workspace__footer .app-modal__btn-primary {
  font-size: 1rem;
}

.contact-alert-enter-active,
.contact-alert-leave-active {
  transition: opacity 0.18s ease;
}

.contact-alert-enter-from,
.contact-alert-leave-to {
  opacity: 0;
}

@media (max-width: 1024px) {
  .contact-workspace__section--category {
    display: none;
  }

  .contact-workspace__panel {
    padding-top: 0;
  }

  .contact-workspace__scroll {
    gap: 0;
  }

  .contact-workspace__success,
  .contact-workspace__banner {
    margin-inline: 0;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  .contact-workspace__frame--guest .contact-workspace__section {
    padding: 0.875rem 0.625rem;
  }

  .contact-workspace__message-box .contact-workspace__textarea {
    min-height: 11rem;
    padding: 0.875rem 0.625rem;
    font-size: 1rem;
  }

  .contact-workspace__message-box .contact-workspace__textarea::placeholder {
    font-size: 1rem;
  }

  .contact-workspace__footer {
    padding: 0.625rem 0.625rem calc(0.625rem + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid #e5e7eb;
  }

  .contact-workspace__footer-bar {
    align-items: center;
    gap: 0.5rem;
  }

  .contact-workspace__inline-error--footer {
    flex: 1 1 auto;
    min-width: 0;
    padding: 0;
    font-size: 0.75rem;
    text-align: left;
  }

  .contact-workspace__footer-actions {
    width: 100%;
    min-width: 0;
    grid-template-columns: minmax(0, 1fr) auto;
  }
}

@media (max-width: 900px) {
  .contact-layout {
    grid-template-columns: 1fr;
  }

  .contact-aside {
    min-height: 10rem;
    border-left: none;
    border-top: 1px solid #e5e7eb;
    order: 2;
  }

  .contact-workspace {
    order: 1;
  }

  .contact-aside__bubble-wrap {
    flex: 0 0 auto;
    padding: 0.85rem 0.35rem 0;
  }

  .contact-aside__bubble-wrap::before {
    width: min(92vw, 21rem);
  }

  .contact-aside__bubble {
    width: min(88vw, 21rem);
  }

  .contact-aside__inner {
    padding: 0 1.25rem 1.35rem;
  }

  .contact-aside__copy {
    font-size: 0.875rem;
  }

  .contact-aside__connector {
    top: auto;
    bottom: -1px;
    left: 50%;
    right: auto;
    width: 4.5rem;
    height: 1px;
    transform: translateX(-50%);
    background: linear-gradient(90deg, transparent, #e5e7eb 18%, #e5e7eb 82%, transparent);
  }
}
</style>
