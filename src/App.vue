<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import CookieConsentBanner from '@/components/common/CookieConsentBanner.vue'

const route = useRoute()
const hideCookieBanner = computed(
  () => route.name === 'overlay-lobby' || route.name === 'overlay-design',
)
</script>

<template>
  <CookieConsentBanner v-if="!hideCookieBanner" />
  <RouterView />
</template>
