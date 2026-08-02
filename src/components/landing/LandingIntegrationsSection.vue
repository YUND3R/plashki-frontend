<script setup lang="ts">
import { platformIntegrations } from '@/constants/landingContent'
</script>

<template>
  <section id="integrations" class="landing__section landing__section--integrations landing__screen">
    <header class="landing__pillar-head landing__section-head landing__section-head--tight">
      <span class="landing__pillar-num">↗</span>
      <h2 class="landing__section-title">Импорт из GoMafia</h2>
    </header>

    <div class="landing__integrations-grid">
      <article
        v-for="platform in platformIntegrations"
        :key="platform.id"
        class="landing__integration-card landing__integration-card--compact"
        :class="[
          `landing__integration-card--${platform.accent}`,
          { 'landing__integration-card--soon': platform.status === 'soon' },
        ]"
      >
        <header class="landing__integration-head">
          <span
            class="landing__integration-logo"
            :class="`landing__integration-logo--${platform.accent}`"
          >
            <img v-if="platform.logo" :src="platform.logo" alt="" />
            <span v-else class="landing__integration-logo-text">MU</span>
          </span>
          <div>
            <h3 class="landing__integration-name">{{ platform.name }}</h3>
            <a
              class="landing__integration-site"
              :href="platform.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ platform.siteLabel }} ↗
            </a>
          </div>
          <span
            class="landing__integration-badge"
            :class="`landing__integration-badge--${platform.status}`"
          >
            {{ platform.statusLabel }}
          </span>
        </header>
      </article>
    </div>
  </section>
</template>
