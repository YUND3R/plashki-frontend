<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { landingSections, overlaySeats, seatPhotoStyle } from '@/constants/landingContent'
import logoFull from '@/assets/plashki.svg?url'
import iconObs from '@/assets/icons/obs.svg?url'

const auth = useAuthStore()
const { token } = storeToRefs(auth)
const isAuthed = computed(() => !!token.value)
</script>

<template>
  <div class="landing__hero">
    <div class="landing__hero-bg" aria-hidden="true">
      <span class="landing__noise" />
      <span class="landing__grid" />
    </div>

    <div class="landing__hero-inner">
      <div class="landing__hero-copy">
        <div class="landing__brand-mark">
          <img class="landing__brand-logo" :src="logoFull" alt="plashki" width="108" height="24" />
          <span class="landing__live-badge">
            <span class="landing__live-dot" />
            Live
          </span>
        </div>

        <h1 class="landing__title">
          Плашки, эфир<br />
          <span class="landing__title-accent">и турнирный стол</span>
        </h1>

        <p class="landing__lead">Overlay в OBS, стол с телефона, таблица без Excel.</p>

        <nav class="landing__pillars" aria-label="Разделы">
          <a
            v-for="section in landingSections"
            :key="section.id"
            class="landing__pillar-link"
            :href="`#${section.id}`"
          >
            <span class="landing__pillar-link-num">{{ section.num }}</span>
            {{ section.label }}
          </a>
        </nav>

        <div class="landing__actions">
          <RouterLink
            v-if="isAuthed"
            class="landing__btn landing__btn--primary"
            :to="{ name: 'dashboard' }"
          >
            <span>Панель</span>
            <span class="landing__btn-arrow" aria-hidden="true">→</span>
          </RouterLink>
          <RouterLink v-else class="landing__btn landing__btn--primary" :to="{ name: 'register' }">
            <span>Начать бесплатно</span>
            <span class="landing__btn-arrow" aria-hidden="true">→</span>
          </RouterLink>
          <RouterLink
            v-if="isAuthed"
            class="landing__btn landing__btn--ghost"
            :to="{ name: 'profiles' }"
          >
            Игроки
          </RouterLink>
          <RouterLink v-else class="landing__btn landing__btn--ghost" :to="{ name: 'login' }">
            Войти
          </RouterLink>
        </div>
      </div>

      <div class="landing__hero-visual">
        <div class="landing__hero-visual-glow" aria-hidden="true" />
        <div class="landing__browser">
          <div class="landing__browser-chrome">
            <span class="landing__browser-dots" aria-hidden="true">
              <i /><i /><i />
            </span>
            <span class="landing__browser-url">
              <img class="landing__browser-url-icon" :src="iconObs" alt="" />
              overlay
            </span>
            <span class="landing__browser-live">REC</span>
          </div>

          <div class="landing__browser-body">
            <div class="landing__stream-stage">
              <div class="landing__stream-stage-top">
                <span>Overlay</span>
                <span class="landing__stream-stage-live"><i /> LIVE</span>
              </div>
              <article
                v-for="seat in overlaySeats"
                :key="seat.seat"
                class="landing__seat-card"
                :class="`landing__seat-card--${seat.tone}`"
              >
                <span class="landing__seat-num">{{ seat.seat }}</span>
                <span class="landing__seat-avatar">
                  <img
                    v-if="seat.photo"
                    :src="seat.photo"
                    alt=""
                    :style="seatPhotoStyle(seat.photo)"
                  />
                </span>
                <span class="landing__seat-nick">{{ seat.nick }}</span>
                <img class="landing__seat-role" :src="seat.roleIcon" alt="" />
              </article>
            </div>
          </div>

          <span class="landing__browser-glow" aria-hidden="true" />
        </div>

        <div class="landing__floating-note landing__floating-note--import">
          <span class="landing__floating-note-icon">↙</span>
          <span><b>GoMafia</b></span>
        </div>
        <div class="landing__floating-note landing__floating-note--sync">
          <span class="landing__floating-note-icon">✓</span>
          <span><b>OBS sync</b></span>
        </div>
      </div>
    </div>
  </div>
</template>
