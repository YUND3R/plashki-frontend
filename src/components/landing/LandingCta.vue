<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { token } = storeToRefs(auth)
const isAuthed = computed(() => !!token.value)
</script>

<template>
  <footer class="landing__cta">
    <div class="landing__cta-card">
      <h3 class="landing__cta-title">Первый стол — за минуту</h3>
      <div class="landing__actions landing__actions--cta">
        <RouterLink
          v-if="isAuthed"
          class="landing__btn landing__btn--primary landing__btn--light"
          :to="{ name: 'dashboard' }"
        >
          Панель
        </RouterLink>
        <RouterLink
          v-else
          class="landing__btn landing__btn--primary landing__btn--light"
          :to="{ name: 'register' }"
        >
          Регистрация
        </RouterLink>
        <RouterLink class="landing__btn landing__btn--ghost-dark" :to="{ name: 'docs' }">
          Docs
        </RouterLink>
      </div>
    </div>
  </footer>
</template>
