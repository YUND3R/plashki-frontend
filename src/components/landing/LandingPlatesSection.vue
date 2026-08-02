<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import LandingDesignShowcaseItem from '@/components/landing/LandingDesignShowcaseItem.vue'
import { designPreviewSeats, showcaseDesigns } from '@/constants/landingContent'

const auth = useAuthStore()
const { token } = storeToRefs(auth)
const isAuthed = computed(() => !!token.value)
</script>

<template>
  <section id="plates" class="landing__section landing__section--designs landing__screen">
    <header class="landing__pillar-head landing__section-head landing__section-head--designs landing__section-head--tight">
      <span class="landing__pillar-num landing__pillar-num--light">01</span>
      <h2 class="landing__section-title">Classic · Masters · Plus</h2>
    </header>

    <div class="landing__designs-stage">
      <LandingDesignShowcaseItem
        v-for="(design, index) in showcaseDesigns"
        :key="design.code"
        :index="index"
        :design-code="design.code"
        :title="design.title"
        :seats="designPreviewSeats(design.preview)"
        :seat-numbers="[design.preview.seat]"
      />
    </div>

    <p v-if="isAuthed" class="landing__designs-note">
      <RouterLink class="landing__text-link landing__text-link--center" :to="{ name: 'card-design' }">
        Все дизайны →
      </RouterLink>
    </p>
  </section>
</template>
