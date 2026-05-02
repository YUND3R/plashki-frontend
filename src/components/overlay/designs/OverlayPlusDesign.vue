<script setup lang="ts">
import type { PropType } from 'vue'
import type { LobbyPlayer } from '@/api/lobbies'
import type { OverlayPopupMessage } from '@/utils/overlayPopupMessage'
import type { OverlayTextTone } from '@/utils/overlayPersistentMessage'

defineProps({
  seats: {
    type: Array as PropType<(LobbyPlayer | null)[]>,
    required: true,
  },
  persistentMessage: {
    type: String,
    default: '',
  },
  persistentColor: {
    type: String as PropType<OverlayTextTone>,
    default: 'green',
  },
  popupMessage: {
    type: Object as PropType<OverlayPopupMessage | null>,
    default: null,
  },
})

function textToneColor(tone: OverlayTextTone): string {
  if (tone === 'white') return '#f8fafc'
  if (tone === 'yellow') return '#facc15'
  if (tone === 'red') return '#f87171'
  return '#4ade80'
}
</script>

<template>
  <section class="overlay-design overlay-design--plus">
    <Transition name="overlay-plus-popup">
      <article
        v-if="popupMessage"
        :key="popupMessage.id"
        class="overlay-design__popup"
      >
        <p
          v-if="popupMessage.h1"
          class="overlay-design__popup-h1"
          :style="{ color: textToneColor(popupMessage.h1_color) }"
        >
          {{ popupMessage.h1 }}
        </p>
        <p
          v-if="popupMessage.h2"
          class="overlay-design__popup-h2"
          :style="{ color: textToneColor(popupMessage.h2_color) }"
        >
          {{ popupMessage.h2 }}
        </p>
      </article>
    </Transition>
    <p
      v-if="persistentMessage.trim()"
      class="overlay-design__persistent"
      :style="{ color: textToneColor(persistentColor) }"
    >
      {{ persistentMessage }}
    </p>
    <p class="overlay-design__note">Plus design in progress</p>
  </section>
</template>

<style scoped>
.overlay-design {
  width: 100%;
  min-height: 220px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.overlay-design--plus {
  background: radial-gradient(circle at 80% 20%, #047857 0%, #052e2b 55%, #020617 100%);
}

.overlay-design__note {
  margin: 0 0 16px;
  color: #f8fafc;
  font-size: 14px;
  opacity: 0.9;
}

.overlay-design__persistent {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 88vw;
  margin: 0;
  padding: 10px 20px;
  border-radius: 12px;
  background: rgba(6, 78, 59, 0.86);
  border: 1px solid rgba(52, 211, 153, 0.5);
  color: #ecfdf5;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.12;
  text-align: center;
  width: fit-content;
  white-space: pre-wrap;
  z-index: 200;
}

.overlay-design__popup {
  position: fixed;
  left: 20px;
  top: 20px;
  transform: none;
  max-width: min(36vw, 680px);
  margin: 0;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(6, 78, 59, 0.92);
  border: 1px solid rgba(110, 231, 183, 0.48);
  color: #ecfdf5;
  z-index: 210;
}

.overlay-design__popup-h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.08;
  font-weight: 700;
}

.overlay-design__popup-h2 {
  margin: 6px 0 0;
  font-size: 21px;
  line-height: 1.14;
  font-weight: 500;
  opacity: 0.95;
}

.overlay-plus-popup-enter-active {
  transition:
    transform 320ms ease-out,
    opacity 320ms ease-out;
}

.overlay-plus-popup-leave-active {
  transition:
    transform 220ms ease-in,
    opacity 220ms ease-in;
}

.overlay-plus-popup-enter-from {
  opacity: 0;
  transform: translateX(-24px);
}

.overlay-plus-popup-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
