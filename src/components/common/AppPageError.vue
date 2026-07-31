<script setup lang="ts">
import { computed } from 'vue'
import {
  getPageErrorKind,
  getPageErrorTitle,
  normalizeApiErrorMessage,
} from '@/utils/apiErrorMessage'
import AppGuestPrompt from '@/components/common/AppGuestPrompt.vue'

const props = withDefaults(
  defineProps<{
    message: string
    title?: string
    compact?: boolean
    inline?: boolean
    showAuthActions?: boolean
    retryLabel?: string
  }>(),
  {
    title: undefined,
    compact: false,
    inline: false,
    showAuthActions: true,
    retryLabel: 'Попробовать снова',
  },
)

const emit = defineEmits<{
  retry: []
}>()

const normalizedMessage = computed(() => normalizeApiErrorMessage(props.message))
const kind = computed(() => getPageErrorKind(normalizedMessage.value))
const displayTitle = computed(
  () => props.title ?? getPageErrorTitle(normalizedMessage.value, kind.value),
)
const showAuth = computed(() => props.showAuthActions && kind.value === 'auth')
</script>

<template>
  <AppGuestPrompt
    v-if="showAuth"
    :message="normalizedMessage"
    :compact="compact"
    :inline="inline"
  />

  <div
    v-else
    class="app-page-error"
    :class="{
      'app-page-error--compact': compact,
      'app-page-error--inline': inline,
      [`app-page-error--${kind}`]: true,
    }"
    role="alert"
  >
    <div class="app-page-error__glow" aria-hidden="true" />

    <div class="app-page-error__card">
      <div class="app-page-error__icon-wrap" aria-hidden="true">
        <svg
          v-if="kind === 'forbidden'"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <path d="M9.5 12.5l5-5M14.5 12.5l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>

        <svg
          v-else
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 8v5m0 3h.01M10.3 4.3l-7.4 12.8A2 2 0 004.6 20h14.8a2 2 0 001.7-2.9L13.7 4.3a2 2 0 00-3.4 0z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <h2 class="app-page-error__title">{{ displayTitle }}</h2>
      <p class="app-page-error__message">{{ normalizedMessage }}</p>

      <div v-if="$attrs.onRetry" class="app-page-error__actions">
        <button type="button" class="app-page-error__btn app-page-error__btn--retry" @click="emit('retry')">
          {{ retryLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
