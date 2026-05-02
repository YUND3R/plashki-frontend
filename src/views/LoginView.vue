<script setup lang="ts">
import { RouterLink } from 'vue-router'
import logoFull from '@/assets/plashki.svg?url'
import { useLoginForm } from '@/composables/useLoginForm'

const { loginValue, password, loading, serverError, fieldErrors, submit } = useLoginForm()
</script>

<template>
  <div class="auth">
    <div class="auth__card">
      <RouterLink class="auth__logo" :to="{ name: 'landing' }" aria-label="plashki">
        <img :src="logoFull" alt="" width="100" height="22" />
      </RouterLink>

      <h1 class="auth__title">Вход</h1>
      <p class="auth__lead">Войдите по логину или email и паролю.</p>

      <form class="auth__form" novalidate @submit.prevent="submit">
        <p v-if="serverError" class="auth__banner" role="alert">{{ serverError }}</p>

        <label class="auth__field">
          <span class="auth__label">Логин или email</span>
          <input
            v-model="loginValue"
            class="auth__input"
            type="text"
            name="login"
            autocomplete="username"
            maxlength="255"
            required
            placeholder="Ваш логин или email"
          />
          <span v-if="fieldErrors.loginValue" class="auth__error">{{ fieldErrors.loginValue }}</span>
        </label>

        <label class="auth__field">
          <span class="auth__label">Пароль</span>
          <input
            v-model="password"
            class="auth__input"
            type="password"
            name="password"
            autocomplete="current-password"
            required
            placeholder="Пароль"
          />
          <span v-if="fieldErrors.password" class="auth__error">{{ fieldErrors.password }}</span>
        </label>

        <button class="auth__submit" type="submit" :disabled="loading">
          {{ loading ? 'Вход…' : 'Войти' }}
        </button>

        <p class="auth__extra">
          <RouterLink class="auth__link" :to="{ name: 'forgot-password' }">Забыли пароль?</RouterLink>
        </p>
      </form>

      <p class="auth__footer">
        Нет аккаунта?
        <RouterLink class="auth__link" :to="{ name: 'register' }">Регистрация</RouterLink>
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
  outline: none;
  border-color: #2f6feb;
  box-shadow: 0 0 0 2px #2f6feb;
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
