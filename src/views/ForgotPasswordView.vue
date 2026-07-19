<script setup lang="ts">
import { RouterLink } from 'vue-router'
import logoFull from '@/assets/plashki.svg?url'
import { useForgotPasswordForm } from '@/composables/useForgotPasswordForm'

const { email, loading, submitted, successMessage, serverError, fieldErrors, submit } =
  useForgotPasswordForm()
</script>

<template>
  <div class="auth">
    <div class="auth__card">
      <RouterLink class="auth__logo" :to="{ name: 'landing' }" aria-label="plashki">
        <img :src="logoFull" alt="" width="100" height="22" />
      </RouterLink>

      <h1 class="auth__title">Забыли пароль?</h1>
      <p class="auth__lead">Введите email, и мы отправим письмо со ссылкой на сброс пароля.</p>

      <form class="auth__form" novalidate @submit.prevent="submit">
        <p v-if="serverError" class="auth__banner auth__banner--error" role="alert">{{ serverError }}</p>
        <p v-if="submitted && successMessage" class="auth__banner auth__banner--success" role="status">
          {{ successMessage }}
        </p>

        <label class="auth__field">
          <span class="auth__label">Email</span>
          <input
            v-model="email"
            class="auth__input"
            type="email"
            name="email"
            autocomplete="email"
            placeholder="you@example.com"
            required
          />
          <span v-if="fieldErrors.email" class="auth__error">{{ fieldErrors.email }}</span>
        </label>

        <button class="auth__submit" type="submit" :disabled="loading">
          {{ loading ? 'Отправка…' : 'Отправить ссылку' }}
        </button>

        <p class="auth__extra">
          Уже получили письмо?
          <RouterLink class="auth__link" :to="{ name: 'reset-password' }">Перейти к сбросу</RouterLink>
        </p>
      </form>

      <p class="auth__footer">
        <RouterLink class="auth__link" :to="{ name: 'login' }">← Назад ко входу</RouterLink>
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
  border-radius: 8px;
}

.auth__banner--error {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.auth__banner--success {
  color: #166534;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
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

.auth__extra {
  margin: 0;
  font-size: 0.8125rem;
  text-align: center;
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
