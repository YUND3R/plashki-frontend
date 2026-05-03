<script setup lang="ts">
import { RouterView } from 'vue-router'
import CookieConsentBanner from '@/components/common/CookieConsentBanner.vue'
</script>

<template>
  <CookieConsentBanner />
  <RouterView />
</template>
