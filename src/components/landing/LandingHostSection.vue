<script setup lang="ts">
import { overlaySeats, seatPhotoStyle } from '@/constants/landingContent'
import LandingLobbyPhonePreview from '@/components/landing/LandingLobbyPhonePreview.vue'
import iconObs from '@/assets/icons/obs.svg?url'
</script>

<template>
  <section id="host" class="landing__section landing__section--host landing__screen">
    <header class="landing__pillar-head landing__section-head landing__section-head--tight">
      <span class="landing__pillar-num">02</span>
      <h2 class="landing__section-title landing__host-title">Эфир и телефон ведущего</h2>
    </header>

    <div class="landing__host-showcase landing__host-showcase--duo">
      <div class="landing__host-side landing__host-side--viewer">
        <h3 class="landing__host-side-label">В эфире</h3>
        <div class="landing__host-preview landing__host-preview--stream">
          <span class="landing__host-preview-badge">
            <img :src="iconObs" alt="" />
            LIVE
          </span>
          <div class="landing__stream-stage landing__stream-stage--compact">
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
      </div>

      <div class="landing__host-phone-stage">
        <span class="landing__host-phone-glow" aria-hidden="true" />
        <LandingLobbyPhonePreview />
      </div>
    </div>
  </section>
</template>
