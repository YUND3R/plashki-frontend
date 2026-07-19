<script setup lang="ts">
import { RouterLink } from 'vue-router'
import logoFull from '@/assets/plashki.svg?url'
import { useRegisterForm } from '@/composables/useRegisterForm'

const {
  username,
  email,
  firstName,
  lastName,
  avatarFile,
  password,
  passwordRepeat,
  cookieConsent,
  loading,
  serverError,
  registrationMessage,
  emailVerificationRequired,
  resendLoading,
  resendMessage,
  resendError,
  fieldErrors,
  onAvatarChange,
  submit,
  resendVerificationEmail,
} = useRegisterForm()
</script>

<template>
  <div class="auth">
    <div class="auth__card">
      <RouterLink class="auth__logo" :to="{ name: 'landing' }" aria-label="plashki">
        <img :src="logoFull" alt="" width="100" height="22" />
      </RouterLink>

      <h1 class="auth__title">Регистрация</h1>
      <p class="auth__lead">Создайте аккаунт, чтобы пользоваться сервисом.</p>

      <form v-if="!emailVerificationRequired" class="auth__form" novalidate @submit.prevent="submit">
        <p v-if="serverError" class="auth__banner" role="alert">{{ serverError }}</p>

        <label class="auth__field">
          <span class="auth__label">Логин</span>
          <input
            v-model="username"
            class="auth__input"
            type="text"
            name="username"
            autocomplete="username"
            maxlength="50"
            required
            placeholder="Латиница, цифры, . _ -"
          />
          <span v-if="fieldErrors.username" class="auth__error">{{ fieldErrors.username }}</span>
        </label>

        <label class="auth__field">
          <span class="auth__label">Email</span>
          <input
            v-model="email"
            class="auth__input"
            type="email"
            name="email"
            autocomplete="email"
            required
            placeholder="you@example.com"
          />
          <span v-if="fieldErrors.email" class="auth__error">{{ fieldErrors.email }}</span>
        </label>

        <label class="auth__field">
          <span class="auth__label">Имя</span>
          <input
            v-model="firstName"
            class="auth__input"
            type="text"
            name="firstName"
            autocomplete="given-name"
            maxlength="100"
            required
            placeholder="Как к вам обращаться"
          />
          <span v-if="fieldErrors.firstName" class="auth__error">{{ fieldErrors.firstName }}</span>
        </label>

        <label class="auth__field">
          <span class="auth__label">Фамилия</span>
          <input
            v-model="lastName"
            class="auth__input"
            type="text"
            name="lastName"
            autocomplete="family-name"
            maxlength="100"
            required
            placeholder="Фамилия"
          />
          <span v-if="fieldErrors.lastName" class="auth__error">{{ fieldErrors.lastName }}</span>
        </label>

        <label class="auth__field">
          <span class="auth__label">Фото профиля <span class="auth__optional">(необязательно)</span></span>
          <input
            class="auth__input"
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp,image/gif"
            @change="onAvatarChange"
          />
          <span v-if="avatarFile" class="auth__hint">{{ avatarFile.name }}</span>
        </label>

        <label class="auth__field">
          <span class="auth__label">Пароль</span>
          <input
            v-model="password"
            class="auth__input"
            type="password"
            name="password"
            autocomplete="new-password"
            required
            minlength="8"
            placeholder="Не менее 8 символов"
          />
          <span v-if="fieldErrors.password" class="auth__error">{{ fieldErrors.password }}</span>
        </label>

        <label class="auth__field">
          <span class="auth__label">Пароль ещё раз</span>
          <input
            v-model="passwordRepeat"
            class="auth__input"
            type="password"
            name="passwordRepeat"
            autocomplete="new-password"
            required
            placeholder="Повторите пароль"
          />
          <span v-if="fieldErrors.passwordRepeat" class="auth__error">{{ fieldErrors.passwordRepeat }}</span>
        </label>

        <label class="auth__consent">
          <input
            v-model="cookieConsent"
            class="auth__consent-checkbox"
            type="checkbox"
            name="cookieConsent"
            required
          />
          <span class="auth__consent-text">
            Я согласен(а) с использованием cookie для авторизации и безопасной работы аккаунта.
          </span>
        </label>
        <span v-if="fieldErrors.cookieConsent" class="auth__error">{{ fieldErrors.cookieConsent }}</span>

        <button class="auth__submit" type="submit" :disabled="loading">
          {{ loading ? 'Отправка…' : 'Зарегистрироваться' }}
        </button>
      </form>
      <div v-else class="auth__success" role="status" aria-live="polite">
        <p class="auth__success-title">Проверьте почту</p>
        <p class="auth__success-text">
          {{ registrationMessage }}
        </p>
        <p class="auth__success-email">
          Письмо отправлено на: <strong>{{ email }}</strong>
        </p>
        <button class="auth__success-btn" type="button" :disabled="resendLoading" @click="resendVerificationEmail">
          {{ resendLoading ? 'Отправляем…' : 'Отправить письмо ещё раз' }}
        </button>
        <p v-if="resendMessage" class="auth__success-note auth__success-note--ok" role="status">
          {{ resendMessage }}
        </p>
        <p v-if="resendError" class="auth__success-note auth__success-note--err" role="alert">
          {{ resendError }}
        </p>
        <RouterLink class="auth__success-link" :to="{ name: 'login' }">Перейти ко входу</RouterLink>
      </div>

      <p class="auth__footer">
        Уже есть аккаунт?
        <RouterLink class="auth__link" :to="{ name: 'login' }">Вход</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth {
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  box-sizing: border-box;
  background: #dddddd;
  font-family: 'Inter', system-ui, sans-serif;
}

.auth__card {
  width: 100%;
  max-width: 400px;
  padding: 2rem 1.75rem;
  background: #fff;
  border-radius: 22px;
  border: 1px solid #e8e8ec;
  box-sizing: border-box;
}

.auth__logo {
  display: inline-block;
  line-height: 0;
  margin-bottom: 1.5rem;
}

.auth__logo img {
  display: block;
  width: 100px;
  height: auto;
}

.auth__title {
  margin: 0 0 0.35rem;
  font-size: 1.375rem;
  font-weight: 600;
  color: #111827;
}

.auth__lead {
  margin: 0 0 1.5rem;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.45;
}

.auth__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth__banner {
  margin: 0;
  padding: 0.65rem 0.75rem;
  font-size: 0.8125rem;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.auth__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.auth__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
}

.auth__optional {
  font-weight: 400;
  color: #9ca3af;
}

.auth__hint {
  font-size: 0.75rem;
  color: #6b7280;
}

.auth__input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.55rem 0.75rem;
  font: inherit;
  font-size: 0.9375rem;
  color: #111827;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.auth__input::placeholder {
  color: #9ca3af;
}

.auth__input:focus {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
  border-color: #2f6feb;
}

.auth__error {
  font-size: 0.75rem;
  color: #dc2626;
}

.auth__consent {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: -0.1rem;
  padding: 0.6rem 0.65rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.auth__consent:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.auth__consent-checkbox {
  appearance: none;
  -webkit-appearance: none;
  margin: 0;
  width: 1.05rem;
  height: 1.05rem;
  border: 1.5px solid #94a3b8;
  border-radius: 0.28rem;
  background: #ffffff;
  display: inline-grid;
  place-content: center;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
  flex-shrink: 0;
}

.auth__consent-checkbox::before {
  content: '';
  width: 0.58rem;
  height: 0.58rem;
  transform: scale(0);
  transition: transform 0.14s ease;
  background: #ffffff;
  clip-path: polygon(14% 54%, 0 68%, 40% 100%, 100% 26%, 86% 12%, 40% 68%);
}

.auth__consent-checkbox:checked {
  border-color: #2f6feb;
  background: #2f6feb;
}

.auth__consent-checkbox:checked::before {
  transform: scale(1);
}

.auth__consent-checkbox:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.auth__consent-text {
  font-size: 0.79rem;
  color: #374151;
  line-height: 1.4;
  user-select: none;
}

.auth__consent:has(.auth__consent-checkbox:checked) {
  border-color: #93c5fd;
  background: #eff6ff;
}

.auth__submit {
  margin-top: 0.25rem;
  padding: 0.65rem 1rem;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #fff;
  background: #2f6feb;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.auth__submit:hover:not(:disabled) {
  background: #2563d4;
}

.auth__submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.auth__success {
  margin-top: 0.5rem;
  padding: 0.9rem 1rem;
  border-radius: 10px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
}

.auth__success-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #0c4a6e;
}

.auth__success-text {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #075985;
}

.auth__success-email {
  margin: 0.55rem 0 0;
  font-size: 0.78rem;
  color: #0c4a6e;
}

.auth__success-btn {
  margin-top: 0.7rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #7dd3fc;
  border-radius: 8px;
  background: #fff;
  color: #0369a1;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
}

.auth__success-btn:hover:not(:disabled) {
  background: #f0f9ff;
}

.auth__success-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.auth__success-note {
  margin: 0.45rem 0 0;
  font-size: 0.75rem;
}

.auth__success-note--ok {
  color: #166534;
}

.auth__success-note--err {
  color: #b91c1c;
}

.auth__success-link {
  display: inline-block;
  margin-top: 0.6rem;
  font-size: 0.8125rem;
  font-weight: 500;
  text-decoration: none;
  color: #0369a1;
}

.auth__success-link:hover {
  text-decoration: underline;
}

.auth__footer {
  margin: 1.5rem 0 0;
  font-size: 0.8125rem;
  color: #6b7280;
  text-align: center;
}

.auth__link {
  color: #2f6feb;
  font-weight: 500;
  text-decoration: none;
}

.auth__link:hover {
  text-decoration: underline;
}

@media (max-width: 767px) {
  .auth {
    padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right))
      max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
    align-items: flex-start;
  }

  .auth__card {
    border-radius: 16px;
    padding: 1.5rem 1.15rem;
  }
}
</style>
