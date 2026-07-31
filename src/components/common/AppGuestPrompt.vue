<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { AUTH_REQUIRED_MESSAGE } from '@/utils/apiErrorMessage'

withDefaults(
  defineProps<{
    message?: string
    compact?: boolean
    inline?: boolean
  }>(),
  {
    message: AUTH_REQUIRED_MESSAGE,
    compact: false,
    inline: false,
  },
)
</script>

<template>
  <div
    class="app-guest-prompt"
    :class="{
      'app-guest-prompt--compact': compact,
      'app-guest-prompt--inline': inline,
    }"
    role="alert"
  >
    <p class="app-guest-prompt__emoji" aria-hidden="true">😔</p>
    <p class="app-guest-prompt__text">{{ message }}</p>
    <div class="app-guest-prompt__actions">
      <RouterLink class="app-guest-prompt__btn app-guest-prompt__btn--primary" :to="{ name: 'register' }">
        Регистрация
      </RouterLink>
      <RouterLink class="app-guest-prompt__btn app-guest-prompt__btn--primary" :to="{ name: 'login' }">
        Вход
      </RouterLink>
    </div>
  </div>
</template>
