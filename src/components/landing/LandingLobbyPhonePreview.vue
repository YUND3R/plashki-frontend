<script setup lang="ts">
import { contentAssets } from '@/utils/contentAssets'

const PHONE_WIDTH = 473
const PHONE_HEIGHT = 1024
const PHONE_ASPECT = `${PHONE_WIDTH} / ${PHONE_HEIGHT}`
</script>

<template>
  <div class="landing-phone">
    <img
      class="landing-phone__image"
      :src="contentAssets.landingPhone"
      alt="Управление лобби на iPhone — демо интерфейса"
      :width="PHONE_WIDTH"
      :height="PHONE_HEIGHT"
      decoding="async"
      fetchpriority="high"
    />
  </div>
</template>

<style scoped>
.landing-phone {
  display: block;
  width: 100%;
  max-width: 100%;
  margin-inline: auto;
  flex-shrink: 0;
}

.landing-phone__image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: v-bind(PHONE_ASPECT);
  box-shadow:
    0 24px 48px rgba(15, 23, 42, 0.2),
    0 0 0 1px rgba(148, 163, 184, 0.12);
  user-select: none;
  pointer-events: none;
}
</style>
