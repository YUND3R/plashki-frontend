<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { LobbyPlayer } from '@/api/lobbies'
import OverlayPlayerPhoto from '@/components/overlay/OverlayPlayerPhoto.vue'
import { normalizeOverlayDesignCode } from '@/utils/overlayPersistentMessage'
import { MASTERS_PHOTO_MASK_TOP_OFFSET } from '@/utils/overlayPhotoSpec'
import { rowPhoto } from '@/utils/playerCardPhotoFrame'
import seat1Icon from '@/assets/icons/numbers/1.svg?url'
import seat2Icon from '@/assets/icons/numbers/2.svg?url'
import seat3Icon from '@/assets/icons/numbers/3.svg?url'

const props = withDefaults(
  defineProps<{
    designCode: string
    seats?: Array<LobbyPlayer | null>
  }>(),
  {
    seats: () => [],
  },
)

type PreviewBounds = {
  w: number
  h: number
}

const PREVIEW_BOUNDS: Record<'classic' | 'masters-yug25' | 'plus', PreviewBounds> = {
  classic: { w: 186, h: 151 },
  'masters-yug25': { w: 185, h: 125 },
  plus: { w: 186, h: 224 },
}

/** Фото выступает выше плашки — как .photo-mask { top: -40px } и classic photo-float. */
const PHOTO_TOP_BLEED: Record<'classic' | 'masters-yug25' | 'plus', number> = {
  classic: 22,
  'masters-yug25': MASTERS_PHOTO_MASK_TOP_OFFSET,
  plus: 0,
}

const PLATE_GAP_PX = 14
const STAGE_PAD_X = 16
const TARGET_PLATE_WIDTH = 296
const STAGE_INNER_HEIGHT = 378

const rootRef = ref<HTMLElement | null>(null)
const rootWidth = ref(320)

const variant = computed(() => normalizeOverlayDesignCode(props.designCode))

const bounds = computed(
  () => PREVIEW_BOUNDS[variant.value as keyof typeof PREVIEW_BOUNDS] ?? PREVIEW_BOUNDS.classic,
)

const plateHeight = computed(() => bounds.value.h)

const photoTopBleed = computed(
  () => PHOTO_TOP_BLEED[variant.value as keyof typeof PHOTO_TOP_BLEED] ?? 0,
)

/** Высота HTML-контейнера scale: плашка + зона фото над ней (как в overlay). */
const renderHeight = computed(() => plateHeight.value + photoTopBleed.value)

const plateSeats = computed(() =>
  [0, 1, 2].map((idx) => props.seats[idx] ?? null),
)

function hasPhoto(player: LobbyPlayer | null): boolean {
  return !!player && !!rowPhoto(player)
}

const anyPreviewPhoto = computed(() => plateSeats.value.some((player) => hasPhoto(player)))

function scaleStyleFor(player: LobbyPlayer | null) {
  const h = hasPhoto(player) ? renderHeight.value : plateHeight.value
  return {
    width: `${bounds.value.w}px`,
    height: `${h}px`,
    transform: `translateX(-50%) scale(${plateScale.value})`,
    transformOrigin: 'bottom center',
  }
}

const plateScale = computed(() => {
  const b = bounds.value
  const packedWidth = b.w * 3 + PLATE_GAP_PX * 2
  const scaleByContainer = (rootWidth.value - STAGE_PAD_X) / packedWidth
  const scaleByTarget = TARGET_PLATE_WIDTH / b.w
  const scaleByHeight = STAGE_INNER_HEIGHT / plateHeight.value
  return Math.min(scaleByContainer, scaleByTarget, scaleByHeight) * 0.98
})

const stageStyle = computed(() => ({
  minHeight: `${Math.ceil(plateHeight.value * plateScale.value)}px`,
  paddingTop: anyPreviewPhoto.value
    ? `${Math.ceil(photoTopBleed.value * plateScale.value)}px`
    : '0px',
}))

const cellStyle = computed(() => ({
  width: `${Math.ceil(bounds.value.w * plateScale.value)}px`,
  height: `${Math.ceil(plateHeight.value * plateScale.value)}px`,
}))

const mastersSeatIcons = [seat1Icon, seat2Icon, seat3Icon]

function mastersSeatIcon(idx: number): string {
  return mastersSeatIcons[idx] ?? seat1Icon
}

function displayNick(player: LobbyPlayer | null, idx: number): string {
  const nick = (player?.nickname ?? player?.username ?? '').trim()
  const label = nick || `Игрок ${idx + 1}`
  if (label.length <= 12) return label
  return `${label.slice(0, 11)}…`
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!rootRef.value || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect.width
    if (width && width > 0) rootWidth.value = width
  })
  resizeObserver.observe(rootRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div ref="rootRef" class="odpp" :class="`odpp--${variant}`" :style="stageStyle" aria-hidden="true">
    <div v-for="(player, idx) in plateSeats" :key="idx" class="odpp__cell" :style="cellStyle">
      <div class="odpp__scale" :style="scaleStyleFor(player)">
        <article v-if="variant === 'classic'" class="odpp-classic">
          <div class="odpp-classic__top">
            <span class="odpp-classic__seat">{{ idx + 1 }}</span>
          </div>
          <div class="odpp-classic__photo-float">
            <div class="odpp-classic__photo-stage">
              <OverlayPlayerPhoto
                v-if="hasPhoto(player)"
                :player="player"
                design-code="classic"
                img-class="odpp-classic__photo"
              />
              <div v-else class="odpp-classic__photo odpp-classic__photo--empty" />
            </div>
          </div>
          <div class="odpp-classic__bottom">
            <span class="odpp-classic__nick">{{ displayNick(player, idx) }}</span>
          </div>
        </article>

        <article
          v-else-if="variant === 'masters-yug25'"
          class="odpp-masters"
          :class="{ 'odpp-masters--no-photo': !hasPhoto(player) }"
        >
          <div v-if="hasPhoto(player)" class="odpp-masters__photo-mask">
            <div class="odpp-masters__photo-stage">
              <OverlayPlayerPhoto
                :player="player"
                design-code="masters-yug25"
                img-class="odpp-masters__photo"
              />
            </div>
          </div>
          <span class="odpp-masters__head">
            <img :src="mastersSeatIcon(idx)" alt="" class="odpp-masters__seat-icon" />
          </span>
          <p class="odpp-masters__nick">{{ displayNick(player, idx) }}</p>
        </article>

        <article v-else class="odpp-plus">
          <div class="odpp-plus__photo-wrap">
            <div class="odpp-plus__photo">
              <OverlayPlayerPhoto
                v-if="hasPhoto(player)"
                :player="player"
                design-code="plus"
                img-class="odpp-plus__photo-img"
              />
              <div v-else class="odpp-plus__photo-img odpp-plus__photo-img--empty" />
            </div>
          </div>
          <div class="odpp-plus__footer">
            <span class="odpp-plus__seat-group">
              <span class="odpp-plus__seat">{{ idx + 1 }}</span>
            </span>
            <p class="odpp-plus__nick">{{ displayNick(player, idx) }}</p>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.odpp {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 14px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: visible;
  position: relative;
  z-index: 1;
}

.odpp__cell {
  position: relative;
  flex: 0 0 auto;
  overflow: visible;
}

.odpp__scale {
  position: absolute;
  left: 50%;
  bottom: 0;
  will-change: transform;
}

.odpp-classic,
.odpp-masters,
.odpp-plus {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
}

.odpp-classic {
  width: 186px;
  height: 151px;
  overflow: visible;
}

.odpp-classic__top {
  width: 186px;
  height: 105px;
  position: relative;
  overflow: hidden;
  background: #0c0e11;
  border-radius: 5px 5px 0 0;
}

.odpp-classic__seat {
  position: absolute;
  top: 6px;
  left: 8px;
  z-index: 2;
  font-family: 'Neue Machine', 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 48px;
  line-height: 1;
  font-weight: 800;
  color: #ffffff;
}

.odpp-classic__photo-float {
  position: absolute;
  left: 50%;
  bottom: 46px;
  transform: translateX(-50%);
  width: 186px;
  height: 126px;
  overflow: hidden;
  border-radius: 12px 12px 0 0;
  pointer-events: none;
  z-index: 3;
}

.odpp-classic__photo-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.odpp-classic__photo {
  position: absolute;
  left: 50%;
  top: 50%;
  max-width: none;
  max-height: none;
  object-fit: fill;
  display: block;
}

.odpp-classic__photo--empty {
  inset: 0;
  left: 0;
  top: 0;
  transform: none;
  background: transparent;
}

.odpp-classic__bottom {
  width: 186px;
  height: 45px;
  margin-top: 2px;
  background: #0c0e11;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  box-sizing: border-box;
  border-radius: 0 0 5px 5px;
}

.odpp-classic__nick {
  width: 100%;
  text-align: center;
  font-family: 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 20px;
  font-weight: 500;
  line-height: 1;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.odpp-masters {
  width: 185px;
  height: 125px;
  border-radius: 5px;
  background: #0a0a0a;
  overflow: visible;
}

.odpp-masters::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  border-radius: 5px;
  background: linear-gradient(
    180deg,
    rgba(10, 10, 10, 0) 20%,
    rgba(10, 10, 10, 0.52) 68%,
    rgba(10, 10, 10, 0.86) 100%
  );
}

.odpp-masters--no-photo::before {
  background: none;
}

.odpp-masters__photo-mask {
  position: absolute;
  top: -40px;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  overflow: hidden;
  border-radius: 5px;
}

.odpp-masters__photo-stage {
  position: absolute;
  inset: 0;
  transform: translate(32px, 20px) scale(1.7);
  transform-origin: center center;
}

.odpp-masters__photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.odpp-masters__head {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 5;
  display: inline-flex;
}

.odpp-masters__seat-icon {
  width: 42px;
  height: 40px;
  object-fit: contain;
  display: block;
}

.odpp-masters__nick {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 14px;
  z-index: 5;
  margin: 0;
  font-family: 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #f8fafc;
}

.odpp-plus {
  width: 186px;
  height: 224px;
  border-radius: 8px;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 18%, rgba(52, 211, 153, 0.22) 0%, transparent 42%),
    radial-gradient(circle at 12% 88%, rgba(251, 191, 36, 0.08) 0%, transparent 48%),
    linear-gradient(180deg, #0f172a 0%, #020617 100%);
  font-family: 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
}

.odpp-plus__photo-wrap {
  width: 186px;
  height: 186px;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
}

.odpp-plus__photo {
  width: 100%;
  height: 100%;
  background: transparent;
  overflow: hidden;
}

.odpp-plus__photo-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.odpp-plus__photo-img--empty {
  background: linear-gradient(180deg, #111827 0%, #0c0e11 100%);
}

.odpp-plus__footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 38px;
  padding: 0.25rem;
  box-sizing: border-box;
  background: rgba(12, 14, 17, 0.88);
  border-radius: 0 0 8px 8px;
}

.odpp-plus__seat-group {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0.4rem;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.16);
}

.odpp-plus__seat {
  font-size: 1.0625rem;
  line-height: 1;
  color: #f8fafc;
}

.odpp-plus__nick {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.2;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
