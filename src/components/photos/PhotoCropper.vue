<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { DEFAULT_PHOTO_CROP, normalizePhotoCrop, type PhotoCrop } from '@/utils/photoCrop'
import {
  overlayPhotoAspectRatio,
  overlayPhotoCropViewport,
  type OverlayPhotoSpec,
} from '@/utils/overlayPhotoSpec'
import {
  photoFrameImgStyle,
  photoFramePanDragDamping,
  photoFramePanSlackPx,
} from '@/utils/playerCardPhotoFrame'
import { normalizeOverlayDesignCode } from '@/utils/overlayPersistentMessage'
import '@/styles/plus-fonts.css'

const crop = defineModel<PhotoCrop>({ required: true })

const props = withDefaults(
  defineProps<{
    imageSrc: string
    spec: OverlayPhotoSpec
    disabled?: boolean
    nickname?: string
    seatIndex?: number
  }>(),
  {
    nickname: '',
    seatIndex: 1,
  },
)

const frameRef = ref<HTMLElement | null>(null)
const imgNatural = ref({ w: 0, h: 0 })
const dragging = ref(false)
let startPx = { x: 0, y: 0 }
let startPan = { x_pct: 50, y_pct: 50 }

const designCode = computed(() => normalizeOverlayDesignCode(props.spec.designCode))
const isClassic = computed(() => designCode.value === 'classic')
const isMasters = computed(() => designCode.value === 'masters-yug25')

const displayNickname = computed(() => {
  const nick = props.nickname.trim()
  return nick || 'Никнейм'
})

const seatLabel = computed(() => {
  const n = Math.min(10, Math.max(1, props.seatIndex))
  return String(n)
})

const aspectRatio = computed(() => overlayPhotoAspectRatio(props.spec))

const frameSize = ref({ cw: 0, ch: 0 })

function measureFrame() {
  const el = frameRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  frameSize.value = { cw: rect.width, ch: rect.height }
}

/** translate+scale - тот же viewport, что и OverlayPlayerPhoto. */
const previewStyle = computed(() => {
  const f = normalizePhotoCrop(crop.value)
  const { w: nw, h: nh } = imgNatural.value
  const { cw, ch } = overlayPhotoCropViewport(props.spec)
  const meta = nw >= 1 && nh >= 1 ? { cw, ch, nw, nh } : null
  return photoFrameImgStyle(f, meta)
})

function centerCrop() {
  if (props.disabled) return
  crop.value = { ...DEFAULT_PHOTO_CROP }
}

function onImgLoad(ev: Event) {
  const img = ev.target as HTMLImageElement
  imgNatural.value = {
    w: img.naturalWidth || 0,
    h: img.naturalHeight || 0,
  }
  measureFrame()
}

function previewDisplayScale(): { sx: number; sy: number } {
  const { cw, ch } = frameSize.value
  const { cw: specCw, ch: specCh } = overlayPhotoCropViewport(props.spec)
  return {
    sx: cw >= 1 && specCw >= 1 ? cw / specCw : 1,
    sy: ch >= 1 && specCh >= 1 ? ch / specCh : 1,
  }
}

function panSensitivity(): { kx: number; ky: number } {
  const { cw, ch } = overlayPhotoCropViewport(props.spec)
  const { w: nw, h: nh } = imgNatural.value
  if (nw < 1 || nh < 1) return { kx: 0.15, ky: 0.15 }
  const f = normalizePhotoCrop(crop.value)
  const { slackX, slackY } = photoFramePanSlackPx(f, { cw, ch, nw, nh })
  const damp = photoFramePanDragDamping(f.zoom)
  const { sx, sy } = previewDisplayScale()
  return {
    kx: 50 / (slackX * damp * sx),
    ky: 50 / (slackY * damp * sy),
  }
}

function onDocumentPointerMove(ev: PointerEvent) {
  if (!dragging.value) return
  const dx = ev.clientX - startPx.x
  const dy = ev.clientY - startPx.y
  const { kx, ky } = panSensitivity()
  crop.value = normalizePhotoCrop({
    ...crop.value,
    x_pct: startPan.x_pct - dx * kx,
    y_pct: startPan.y_pct - dy * ky,
  })
}

function onDocumentPointerUp(ev: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  document.removeEventListener('pointermove', onDocumentPointerMove)
  document.removeEventListener('pointerup', onDocumentPointerUp)
  document.removeEventListener('pointercancel', onDocumentPointerUp)
  frameRef.value?.releasePointerCapture(ev.pointerId)
}

function onPointerDown(ev: PointerEvent) {
  if (props.disabled || !props.imageSrc) return
  const el = frameRef.value
  if (!el) return
  ev.preventDefault()
  dragging.value = true
  startPx = { x: ev.clientX, y: ev.clientY }
  startPan = { x_pct: crop.value.x_pct, y_pct: crop.value.y_pct }
  document.addEventListener('pointermove', onDocumentPointerMove)
  document.addEventListener('pointerup', onDocumentPointerUp)
  document.addEventListener('pointercancel', onDocumentPointerUp)
  el.setPointerCapture(ev.pointerId)
}

function onPointerMove(ev: PointerEvent) {
  onDocumentPointerMove(ev)
}

function onPointerUp(ev: PointerEvent) {
  onDocumentPointerUp(ev)
}

let resizeObserver: ResizeObserver | null = null

watch(
  () => frameRef.value,
  (el, _, onCleanup) => {
    resizeObserver?.disconnect()
    resizeObserver = null
    if (!el) return
    measureFrame()
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => measureFrame())
      resizeObserver.observe(el)
      onCleanup(() => resizeObserver?.disconnect())
    }
  },
)

watch(
  () => props.imageSrc,
  async () => {
    imgNatural.value = { w: 0, h: 0 }
    await nextTick()
    measureFrame()
  },
)

onUnmounted(() => {
  resizeObserver?.disconnect()
  document.removeEventListener('pointermove', onDocumentPointerMove)
  document.removeEventListener('pointerup', onDocumentPointerUp)
  document.removeEventListener('pointercancel', onDocumentPointerUp)
})
</script>

<template>
  <div class="photo-cropper">
    <div class="photo-cropper__stage">
      <div class="photo-cropper__preview">
      <article v-if="isClassic" class="pcd-card pcd-card--classic">
        <div class="pcd-classic__top">
          <span class="pcd-classic__seat">{{ seatLabel }}</span>
        </div>
        <div class="pcd-classic__photo-wrap">
          <div
            ref="frameRef"
            class="pcd-classic__photo-float"
            :class="{
              'pcd-classic__photo-float--dragging': dragging,
              'pcd-classic__photo-float--disabled': disabled,
            }"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <img
              v-if="imageSrc"
              :src="imageSrc"
              alt=""
              class="pcd-classic__photo"
              :style="previewStyle"
              draggable="false"
              @load="onImgLoad"
            />
          </div>
        </div>
        <div class="pcd-classic__bottom">
          <p class="pcd-classic__nick">{{ displayNickname }}</p>
        </div>
      </article>

      <article v-else-if="isMasters" class="pcd-card pcd-card--masters">
        <div
          ref="frameRef"
          class="pcd-masters__photo-mask"
          :class="{
            'pcd-masters__photo-mask--dragging': dragging,
            'pcd-masters__photo-mask--disabled': disabled,
          }"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <div class="pcd-masters__photo-stage">
            <img
              v-if="imageSrc"
              :src="imageSrc"
              alt=""
              class="pcd-masters__photo-inner"
              :style="previewStyle"
              draggable="false"
              @load="onImgLoad"
            />
          </div>
        </div>
        <span class="pcd-masters__seat">{{ seatLabel }}</span>
        <p class="pcd-masters__nick">{{ displayNickname }}</p>
      </article>

      <article v-else class="pcd-card pcd-card--plus">
        <div
          ref="frameRef"
          class="pcd-plus__photo"
          :class="{
            'pcd-plus__photo--dragging': dragging,
            'pcd-plus__photo--disabled': disabled,
          }"
          :style="{ aspectRatio }"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <img
            v-if="imageSrc"
            :src="imageSrc"
            alt=""
            class="pcd-plus__img"
            :style="previewStyle"
            draggable="false"
            @load="onImgLoad"
          />
        </div>
        <div class="pcd-plus__footer">
          <span class="pcd-plus__seat">{{ seatLabel }}</span>
          <p class="pcd-plus__nick">{{ displayNickname }}</p>
        </div>
      </article>
      </div>
    </div>

    <div class="photo-cropper__controls">
      <label class="photo-cropper__zoom">
        <input
          v-model.number="crop.zoom"
          type="range"
          min="1"
          max="3"
          step="0.01"
          :disabled="disabled"
          aria-label="Масштаб"
          @input="crop = normalizePhotoCrop(crop)"
        />
      </label>
      <button
        type="button"
        class="photo-cropper__center-btn"
        :disabled="disabled"
        title="Сбросить кадрирование: центр и масштаб 1"
        @click="centerCrop"
      >
        По умолчанию
      </button>
    </div>
  </div>
</template>

<style scoped>
.photo-cropper {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.photo-cropper__stage {
  --pcd-preview-scale: 2.2;
  --pcd-classic-photo-top-overflow: 22px;
  display: flex;
  justify-content: center;
  padding: 0.5rem 0 0.1rem;
  overflow: visible;
}

.photo-cropper__preview {
  position: relative;
  flex-shrink: 0;
  overflow: visible;
}

.photo-cropper__preview > .pcd-card {
  transform: scale(var(--pcd-preview-scale));
  transform-origin: top left;
}

.photo-cropper__preview:has(.pcd-card--classic) {
  width: calc(186px * var(--pcd-preview-scale));
  box-sizing: border-box;
  padding-top: calc(var(--pcd-classic-photo-top-overflow) * var(--pcd-preview-scale));
  height: calc((151px + var(--pcd-classic-photo-top-overflow)) * var(--pcd-preview-scale));
}

.photo-cropper__preview:has(.pcd-card--masters) {
  width: calc(185px * var(--pcd-preview-scale));
  height: calc(165px * var(--pcd-preview-scale));
  box-sizing: border-box;
  padding-top: calc(40px * var(--pcd-preview-scale));
}

.photo-cropper__preview:has(.pcd-card--plus) {
  width: calc(186px * var(--pcd-preview-scale));
  height: calc(224px * var(--pcd-preview-scale));
}

.photo-cropper__controls {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.photo-cropper__zoom {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8125rem;
  color: #374151;
}

.photo-cropper__zoom input[type='range'] {
  width: 100%;
}

.photo-cropper__center-btn {
  flex-shrink: 0;
  padding: 0.45rem 0.7rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.2;
  color: #374151;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}

.photo-cropper__center-btn:hover:not(:disabled) {
  background: #f9fafb;
}

.photo-cropper__center-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pcd-card {
  position: relative;
  flex-shrink: 0;
  user-select: none;
}

/* Classic (1:1 с OverlayClassicDesign) */
.pcd-card--classic {
  width: 186px;
  height: 151px;
  overflow: visible;
  background: transparent;
}

.pcd-classic__top {
  width: 186px;
  height: 105px;
  position: relative;
  overflow: hidden;
  background: #0c0e11;
  border-radius: 5px 5px 0 0;
}

.pcd-classic__seat {
  position: absolute;
  top: 6px;
  left: 8px;
  z-index: 2;
  pointer-events: none;
  font-family: 'Neue Machine', 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 48px;
  line-height: 1;
  font-weight: 800;
  color: #ffffff;
}

.pcd-classic__photo-wrap {
  position: absolute;
  left: 50%;
  bottom: 47px;
  transform: translateX(-50%);
  width: 186px;
  height: 126px;
  z-index: 1;
  pointer-events: none;
}

.pcd-classic__photo-float {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 12px 12px 0 0;
  cursor: grab;
  touch-action: none;
  pointer-events: auto;
}

.pcd-classic__photo-float--dragging {
  cursor: grabbing;
}

.pcd-classic__photo-float--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.pcd-classic__photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 12px 12px 0 0;
  background: transparent;
  pointer-events: none;
}

.pcd-classic__bottom {
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

.pcd-classic__nick {
  margin: 0;
  width: 100%;
  font-family: 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 20px;
  font-weight: 500;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  color: #f8fafc;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.85);
}

/* Masters (1:1 с OverlayMastersDesign) */
.pcd-card--masters {
  width: 185px;
  height: 125px;
  border-radius: 5px;
  background: #0a0a0a;
  overflow: visible;
}

.pcd-masters__photo-mask {
  position: absolute;
  top: -40px;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  overflow: hidden;
  border-radius: 5px;
  cursor: grab;
  touch-action: none;
}

.pcd-masters__photo-mask--dragging {
  cursor: grabbing;
}

.pcd-masters__photo-mask--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.pcd-masters__photo-stage {
  position: absolute;
  inset: 0;
  transform: translate(32px, 20px) scale(1.7);
  transform-origin: center center;
}

.pcd-masters__photo-inner {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform-origin: center center;
  display: block;
  pointer-events: none;
}

.pcd-masters__seat {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 5;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
  font-size: 34px;
  font-weight: 200;
  line-height: 1;
  color: #f8fafc;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.75);
}

.pcd-masters__nick {
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
  pointer-events: none;
}

/* Plus */
.pcd-card--plus {
  width: 186px;
  border-radius: 8px;
  overflow: hidden;
  font-family: var(--plus-font-family);
  font-weight: var(--plus-font-weight);
  background:
    radial-gradient(circle at 80% 20%, #047857 0%, #052e2b 55%, #020617 100%);
}

.pcd-plus__photo {
  position: relative;
  width: 186px;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
  background: #0c0e11;
}

.pcd-plus__photo--dragging {
  cursor: grabbing;
}

.pcd-plus__photo--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.pcd-plus__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  display: block;
  object-fit: cover;
}

.pcd-plus__footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem 0.55rem;
  background: rgba(12, 14, 17, 0.88);
}

.pcd-plus__seat {
  flex-shrink: 0;
  min-width: 1.35rem;
  font-size: 1.0625rem;
  font-weight: inherit;
  color: #ffffff;
}

.pcd-plus__nick {
  margin: 0;
  min-width: 0;
  flex: 1;
  font-size: 0.9375rem;
  font-weight: inherit;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #f8fafc;
}
</style>
