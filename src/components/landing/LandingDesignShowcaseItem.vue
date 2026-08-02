<script setup lang="ts">
import { ref } from 'vue'
import type { LobbyPlayer } from '@/api/lobbies'
import OverlayDesignPlatePreview from '@/components/overlay/OverlayDesignPlatePreview.vue'
import { usePointerTilt } from '@/composables/usePointerTilt'

defineProps<{
  index: number
  designCode: string
  title: string
  text?: string
  seats: LobbyPlayer[]
  seatNumbers: number[]
}>()

const tiltRoot = ref<HTMLElement | null>(null)
usePointerTilt(tiltRoot)
</script>

<template>
  <article
    class="landing__design-showcase"
    :class="`landing__design-showcase--${index + 1}`"
  >
    <div ref="tiltRoot" class="landing__design-tilt">
      <div class="landing__design-tilt-body">
        <OverlayDesignPlatePreview
          class="landing__design-preview"
          size="showcase"
          :design-code="designCode"
          :seats="seats"
          :seat-numbers="seatNumbers"
        />
      </div>
    </div>

    <div class="landing__design-caption">
      <h4 class="landing__design-caption-title">{{ title }}</h4>
      <p v-if="text" class="landing__design-caption-text">{{ text }}</p>
    </div>
  </article>
</template>
