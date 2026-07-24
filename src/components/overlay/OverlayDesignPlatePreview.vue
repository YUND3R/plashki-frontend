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
import mafiaRoleIcon from '@/assets/icons/mafia.svg?url'
import donRoleIcon from '@/assets/icons/don.svg?url'
import civilianRoleIcon from '@/assets/icons/civilian.svg?url'
import sheriffRoleIcon from '@/assets/icons/sheriff.svg?url'
import '@/styles/plus-fonts.css'

const props = withDefaults(
  defineProps<{
    designCode: string
    seats?: Array<LobbyPlayer | null>
    seatNumbers?: number[]
    size?: 'default' | 'showcase'
  }>(),
  {
    seats: () => [],
    seatNumbers: () => [],
    size: 'default',
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

const targetPlateWidth = computed(() => {
  if (props.size !== 'showcase') return 296
  return plateCount.value === 1 ? 500 : 420
})

const stageInnerHeight = computed(() => {
  if (props.size !== 'showcase') return 378
  return plateCount.value === 1 ? 620 : 560
})

const rootRef = ref<HTMLElement | null>(null)
const rootWidth = ref(320)
const rootHeight = ref(420)

const isShowcaseFill = computed(() => props.size === 'showcase' && plateCount.value === 1)

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

const plateCount = computed(() => (props.seats.length === 1 ? 1 : 3))

const plateSeats = computed(() => {
  if (plateCount.value === 1) {
    return [props.seats[0] ?? null]
  }
  return [0, 1, 2].map((idx) => props.seats[idx] ?? null)
})

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

const scaleReferenceHeight = computed(() =>
  anyPreviewPhoto.value ? renderHeight.value : plateHeight.value,
)

const plateScale = computed(() => {
  const b = bounds.value
  const count = plateCount.value
  const packedWidth = b.w * count + PLATE_GAP_PX * Math.max(0, count - 1)
  const scaleByContainer = (rootWidth.value - STAGE_PAD_X) / packedWidth
  const scaleByTarget = targetPlateWidth.value / b.w
  const scaleByHeight = stageInnerHeight.value / scaleReferenceHeight.value

  if (isShowcaseFill.value) {
    const availableWidth = Math.max(1, rootWidth.value - STAGE_PAD_X)
    const availableHeight = Math.max(1, rootHeight.value)
    const scaleByFillWidth = availableWidth / b.w
    const scaleByFillHeight = availableHeight / scaleReferenceHeight.value
    return Math.min(scaleByFillWidth, scaleByFillHeight) * 0.96
  }

  return Math.min(scaleByContainer, scaleByTarget, scaleByHeight) * 0.98
})

const stageStyle = computed(() => {
  const scaledBleed = anyPreviewPhoto.value
    ? Math.ceil(photoTopBleed.value * plateScale.value)
    : 0

  if (isShowcaseFill.value) {
    return {
      width: '100%',
      height: '100%',
      paddingTop: scaledBleed ? `${scaledBleed}px` : '0px',
      boxSizing: 'border-box' as const,
    }
  }

  return {
    minHeight: `${Math.ceil(plateHeight.value * plateScale.value)}px`,
    paddingTop: scaledBleed ? `${scaledBleed}px` : '0px',
  }
})

const cellStyle = computed(() => ({
  width: `${Math.ceil(bounds.value.w * plateScale.value)}px`,
  height: `${Math.ceil(plateHeight.value * plateScale.value)}px`,
}))

const mastersSeatIcons = [seat1Icon, seat2Icon, seat3Icon]

function mastersSeatIcon(idx: number): string {
  const seatNum = props.seatNumbers[idx] ?? idx + 1
  return mastersSeatIcons[seatNum - 1] ?? seat1Icon
}

function displaySeatNumber(idx: number): number {
  return props.seatNumbers[idx] ?? idx + 1
}

function displayNick(player: LobbyPlayer | null, idx: number): string {
  const nick = (player?.nickname ?? player?.username ?? '').trim()
  const label = nick || `Игрок ${idx + 1}`
  if (label.length <= 12) return label
  return `${label.slice(0, 11)}…`
}

function normalizedRole(role: string | null | undefined): string {
  return (role ?? '').trim().toLowerCase()
}

function roleIcon(role: string | null | undefined): string {
  const value = normalizedRole(role)
  if (value === 'mafia') return mafiaRoleIcon
  if (value === 'don') return donRoleIcon
  if (value === 'peaceful') return civilianRoleIcon
  if (value === 'sheriff') return sheriffRoleIcon
  return ''
}

function roleIconToneClass(role: string | null | undefined): string {
  const value = normalizedRole(role)
  if (value === 'peaceful') return 'odpp__role-icon--peaceful'
  if (value === 'sheriff') return 'odpp__role-icon--sheriff'
  if (value === 'don') return 'odpp__role-icon--don'
  if (value === 'mafia') return 'odpp__role-icon--mafia'
  return ''
}

function plusSeatGroupClass(role: string | null | undefined): string {
  const value = normalizedRole(role)
  if (value === 'sheriff') return 'odpp-plus__seat-group--sheriff'
  if (value === 'don' || value === 'mafia') return 'odpp-plus__seat-group--mafia'
  return 'odpp-plus__seat-group--peaceful'
}

function mastersRoleIsDoubleSeat(seatNum: number): boolean {
  return seatNum >= 10
}

let resizeObserver: ResizeObserver | null = null

function syncRootSize() {
  if (!rootRef.value) return
  const rect = rootRef.value.getBoundingClientRect()
  if (rect.width > 0) rootWidth.value = rect.width
  if (rect.height > 0) rootHeight.value = rect.height
}

onMounted(() => {
  syncRootSize()
  requestAnimationFrame(syncRootSize)
  if (!rootRef.value || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (!rect) return
    if (rect.width > 0) rootWidth.value = rect.width
    if (rect.height > 0) rootHeight.value = rect.height
  })
  resizeObserver.observe(rootRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div
    ref="rootRef"
    class="odpp"
    :class="[`odpp--${variant}`, { 'odpp--single': plateCount === 1, 'odpp--showcase': size === 'showcase' }]"
    :style="stageStyle"
    aria-hidden="true"
  >
    <div v-for="(player, idx) in plateSeats" :key="idx" class="odpp__cell" :style="cellStyle">
      <div class="odpp__scale" :style="scaleStyleFor(player)">
        <article v-if="variant === 'classic'" class="odpp-classic">
          <div class="odpp-classic__top">
            <span class="odpp-classic__seat">{{ displaySeatNumber(idx) }}</span>
            <span v-if="roleIcon(player?.game_role)" class="odpp-classic__role-wrap">
              <img
                :src="roleIcon(player?.game_role)"
                alt=""
                class="odpp-classic__role-icon"
                :class="roleIconToneClass(player?.game_role)"
              />
            </span>
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
          <span
            v-if="roleIcon(player?.game_role)"
            class="odpp-masters__role-center"
            :class="{ 'odpp-masters__role-center--double': mastersRoleIsDoubleSeat(displaySeatNumber(idx)) }"
          >
            <img
              :src="roleIcon(player?.game_role)"
              alt=""
              class="odpp-masters__role-icon"
            />
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
            <div class="odpp-plus__footer-main">
              <span class="odpp-plus__seat-group" :class="plusSeatGroupClass(player?.game_role)">
                <span class="odpp-plus__seat">{{ displaySeatNumber(idx) }}</span>
                <img
                  v-if="roleIcon(player?.game_role)"
                  :src="roleIcon(player?.game_role)"
                  alt=""
                  class="odpp-plus__role-icon"
                />
              </span>
              <p class="odpp-plus__nick">{{ displayNick(player, idx) }}</p>
            </div>
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

.odpp--single {
  justify-content: center;
}

.odpp--single.odpp--showcase {
  width: 100%;
  height: 100%;
  align-items: flex-end;
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

.odpp-classic__role-wrap {
  position: absolute;
  left: 11px;
  top: 55px;
  width: 28px;
  height: 28px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.odpp-classic__role-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  filter: none;
}

.odpp__role-icon--peaceful {
  filter: brightness(0) saturate(100%) invert(52%) sepia(42%) saturate(1400%) hue-rotate(328deg)
    brightness(96%) contrast(94%);
}

.odpp__role-icon--sheriff {
  filter: brightness(0) saturate(100%) invert(48%) sepia(38%) saturate(950%) hue-rotate(186deg)
    brightness(97%) contrast(93%);
}

.odpp__role-icon--don {
  filter: brightness(0) saturate(100%) invert(55%) sepia(32%) saturate(1100%) hue-rotate(224deg)
    brightness(97%) contrast(92%);
}

.odpp__role-icon--mafia {
  filter: brightness(0) saturate(100%) invert(42%) sepia(28%) saturate(1600%) hue-rotate(252deg)
    brightness(94%) contrast(96%);
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

.odpp-masters__role-center {
  position: absolute;
  top: 14px;
  left: 39px;
  width: 18px;
  height: 18px;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.odpp-masters__role-center--double {
  top: 13px;
  left: 42px;
}

.odpp-masters__role-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(97%) sepia(2%) saturate(749%) hue-rotate(183deg)
    brightness(118%) contrast(95%);
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
  font-family: var(--plus-font-family);
  font-weight: var(--plus-font-weight);
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
  height: 38px;
  padding: 0.25rem;
  box-sizing: border-box;
  background: rgba(12, 14, 17, 0.88);
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}

.odpp-plus__footer-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
}

.odpp-plus__seat-group {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  padding: 0.4rem calc(0.4rem + 2px);
  border-radius: 6px;
  box-sizing: border-box;
}

.odpp-plus__seat-group--peaceful {
  background: linear-gradient(135deg, #ec1972 0%, #be185d 100%);
}

.odpp-plus__seat-group--sheriff {
  background: linear-gradient(135deg, #38d36a 0%, #15803d 100%);
}

.odpp-plus__seat-group--mafia {
  background: linear-gradient(135deg, #2563eb 0%, #172554 100%);
}

.odpp-plus__role-icon {
  width: 15px;
  height: 15px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(100%);
}

.odpp-plus__seat {
  flex-shrink: 0;
  min-width: 0;
  font-size: 1.0625rem;
  font-weight: inherit;
  line-height: 1;
  color: #ffffff;
}

.odpp-plus__nick {
  margin: 0;
  min-width: 0;
  flex: 1;
  font-size: 0.9375rem;
  font-weight: inherit;
  line-height: 1.2;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
