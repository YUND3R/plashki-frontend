<script setup lang="ts">
import '@/styles/landing-page.css'
import LandingAmbientBg from '@/components/landing/LandingAmbientBg.vue'
import LandingHero from '@/components/landing/LandingHero.vue'
import LandingPlatesSection from '@/components/landing/LandingPlatesSection.vue'
import LandingHostSection from '@/components/landing/LandingHostSection.vue'
import LandingIntegrationsSection from '@/components/landing/LandingIntegrationsSection.vue'
import LandingRatingsSection from '@/components/landing/LandingRatingsSection.vue'
import LandingCta from '@/components/landing/LandingCta.vue'
</script>

<template>
  <section class="landing">
    <LandingAmbientBg />

    <div id="top" class="landing__screen landing__screen--hero">
      <LandingHero />
    </div>

    <LandingPlatesSection />
    <LandingHostSection />
    <LandingIntegrationsSection />
    <LandingRatingsSection />

    <div class="landing__screen landing__screen--cta">
      <LandingCta />
    </div>
  </section>
</template>
