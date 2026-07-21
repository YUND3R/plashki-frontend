<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import {
  normalizePhotoCrop,
  type PhotoCrop,
} from '@/utils/photoCrop'
import {
  MASTERS_PHOTO_MASK_TOP_OFFSET,
  overlayPhotoCropViewport,
  type OverlayPhotoSpec,
} from '@/utils/overlayPhotoSpec'
import {
  photoFrameImgStyle,
  photoFrameRenderedSize,
} from '@/utils/playerCardPhotoFrame'
import { normalizeOverlayDesignCode } from '@/utils/overlayPersistentMessage'
import seat1Icon from '@/assets/icons/numbers/1.svg?url'
import seat2Icon from '@/assets/icons/numbers/2.svg?url'
import seat3Icon from '@/assets/icons/numbers/3.svg?url'
import seat4Icon from '@/assets/icons/numbers/4.svg?url'
import seat5Icon from '@/assets/icons/numbers/5.svg?url'
import seat6Icon from '@/assets/icons/numbers/6.svg?url'
import seat7Icon from '@/assets/icons/numbers/7.svg?url'
import seat8Icon from '@/assets/icons/numbers/8.svg?url'
import seat9Icon from '@/assets/icons/numbers/9.svg?url'
import seat10Icon from '@/assets/icons/numbers/10.svg?url'
import '@/styles/plus-fonts.css'
import PhotoCropperControls from '@/components/photos/PhotoCropperControls.vue'

const crop = defineModel<PhotoCrop>({ required: true })

const props = withDefaults(
  defineProps<{
    imageSrc: string
    spec: OverlayPhotoSpec
    disabled?: boolean
    nickname?: string
    seatIndex?: number
    hideControls?: boolean
  }>(),
  {
    nickname: '',
    seatIndex: 1,
    hideControls: false,
  },
)

const frameRef = ref<HTMLElement | null>(null)
const imgNatural = ref({ w: 0, h: 0 })
const dragging = ref(false)
let startPx = { x: 0, y: 0 }
let startPan = { x_pct: 50, y_pct: 50 }

const designCode = computed(() => normalizeOverlayDesignCode(props.spec.designCode))
const designLabel = computed(() => {
  if (designCode.value === 'masters-yug25') return 'Masters'
  if (designCode.value === 'plus') return 'Plus'
  return 'Classic'
})

const displayNickname = computed(() => {
  const nick = props.nickname.trim()
  return nick || 'Никнейм'
})

const seatLabel = computed(() => {
  const n = Math.min(10, Math.max(1, props.seatIndex))
  return String(n)
})

const mastersSeatIcon = computed(() => {
  const n = Math.min(10, Math.max(1, props.seatIndex))
  if (n === 1) return seat1Icon
  if (n === 2) return seat2Icon
  if (n === 3) return seat3Icon
  if (n === 4) return seat4Icon
  if (n === 5) return seat5Icon
  if (n === 6) return seat6Icon
  if (n === 7) return seat7Icon
  if (n === 8) return seat8Icon
  if (n === 9) return seat9Icon
  return seat10Icon
})

const cropViewport = computed(() => overlayPhotoCropViewport(props.spec))

const frameBoxStyle = computed(() => {
  const { cw, ch } = cropViewport.value
  return {
    width: `${cw}px`,
    height: `${ch}px`,
  }
})

const frameSize = ref({ cw: 0, ch: 0 })

function measureFrame() {
  const el = frameRef.value
  if (!el) return
  frameSize.value = {
    cw: el.offsetWidth || el.clientWidth,
    ch: el.offsetHeight || el.clientHeight,
  }
}

const sourcePreviewStyle = computed(() => {
  const f = normalizePhotoCrop(crop.value)
  const { w: nw, h: nh } = imgNatural.value
  const specVp = cropViewport.value
  const cw = frameSize.value.cw >= 1 ? frameSize.value.cw : specVp.cw
  const ch = frameSize.value.ch >= 1 ? frameSize.value.ch : specVp.ch
  const meta = nw >= 1 && nh >= 1 && cw >= 1 && ch >= 1 ? { cw, ch, nw, nh } : null
  return photoFrameImgStyle(f, meta)
})

function onWheel(ev: WheelEvent) {
  if (props.disabled || !props.imageSrc) return
  ev.preventDefault()
  const current = normalizePhotoCrop(crop.value)
  const factor = Math.exp(-ev.deltaY * 0.0012)
  crop.value = normalizePhotoCrop({
    ...current,
    zoom: current.zoom * factor,
  })
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
  const el = frameRef.value
  const { cw: specCw, ch: specCh } = overlayPhotoCropViewport(props.spec)
  if (!el) return { sx: 1, sy: 1 }
  const rect = el.getBoundingClientRect()
  return {
    sx: rect.width >= 1 && specCw >= 1 ? rect.width / specCw : 1,
    sy: rect.height >= 1 && specCh >= 1 ? rect.height / specCh : 1,
  }
}

function dragToCropDelta(dx: number, dy: number): { dxPct: number; dyPct: number } {
  const { cw, ch } = frameSize.value
  const { w: nw, h: nh } = imgNatural.value
  if (nw < 1 || nh < 1 || cw < 1 || ch < 1) return { dxPct: 0, dyPct: 0 }
  const f = normalizePhotoCrop(crop.value)
  const rendered = photoFrameRenderedSize(f, { cw, ch, nw, nh })
  const { sx, sy } = previewDisplayScale()
  const stageScale = Math.max(0.01, props.spec.stageScale || 1)
  return {
    dxPct: rendered.width > 0 ? (dx / (sx * stageScale * rendered.width)) * 100 : 0,
    dyPct: rendered.height > 0 ? (dy / (sy * stageScale * rendered.height)) * 100 : 0,
  }
}

function onDocumentPointerMove(ev: PointerEvent) {
  if (!dragging.value) return
  const dx = ev.clientX - startPx.x
  const dy = ev.clientY - startPx.y
  const delta = dragToCropDelta(dx, dy)
  crop.value = normalizePhotoCrop({
    ...crop.value,
    x_pct: startPan.x_pct - delta.dxPct,
    y_pct: startPan.y_pct - delta.dyPct,
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
    <div class="photo-cropper__stage" @wheel.prevent="onWheel">
      <div class="photo-cropper__preview">
        <div
          class="photo-cropper__source"
          :class="`photo-cropper__source--${designCode}`"
          :style="
            designCode === 'masters-yug25'
              ? { '--masters-mask-top': `${MASTERS_PHOTO_MASK_TOP_OFFSET}px` }
              : undefined
          "
        >
          <div class="photo-cropper__design-card">
            <div class="photo-cropper__crop-shell" :class="`photo-cropper__crop-shell--${designCode}`">
              <div
                ref="frameRef"
                class="photo-cropper__frame"
                :class="{
                  'photo-cropper__frame--dragging': dragging,
                  'photo-cropper__frame--disabled': disabled,
                }"
                :style="frameBoxStyle"
                @pointerdown="onPointerDown"
                @pointermove="onPointerMove"
                @pointerup="onPointerUp"
                @pointercancel="onPointerUp"
              >
              <div class="photo-cropper__photo-layer photo-cropper__photo-layer--muted">
                <div class="photo-cropper__photo-stage">
                  <img
                    v-if="imageSrc"
                    :src="imageSrc"
                    alt=""
                    class="photo-cropper__source-img photo-cropper__source-img--muted"
                    :style="sourcePreviewStyle"
                    draggable="false"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div class="photo-cropper__photo-layer photo-cropper__photo-layer--active">
                <div class="photo-cropper__photo-stage">
                  <img
                    v-if="imageSrc"
                    :src="imageSrc"
                    alt=""
                    class="photo-cropper__source-img"
                    :style="sourcePreviewStyle"
                    draggable="false"
                    @load="onImgLoad"
                  />
                </div>
              </div>
              <div class="photo-cropper__frame-guide" aria-hidden="true">
                <span class="photo-cropper__seat">
                  <img
                    v-if="designCode === 'masters-yug25'"
                    :src="mastersSeatIcon"
                    alt=""
                    class="photo-cropper__seat-icon"
                  />
                  <template v-else>{{ seatLabel }}</template>
                </span>
              </div>
            </div>
            </div>
            <div class="photo-cropper__design-footer" aria-hidden="true">
              <span v-if="designCode === 'plus'" class="photo-cropper__footer-seat">{{ seatLabel }}</span>
              <span class="photo-cropper__footer-nick">{{ displayNickname }}</span>
            </div>
          </div>
          <p class="photo-cropper__hint">
            Видно всё исходное фото. Синяя рамка — область фото, которая попадёт в плашку {{ designLabel }}.
          </p>
        </div>
      </div>
    </div>

    <PhotoCropperControls v-if="!hideControls" v-model="crop" :disabled="disabled" />
  </div>
</template>

<style scoped>
.photo-cropper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-height: 0;
}

.photo-cropper__stage {
  --pcd-preview-scale: 2.2;
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.25rem 0;
  overflow: visible;
}

.photo-cropper__preview {
  position: relative;
  width: 100%;
  flex-shrink: 0;
  overflow: visible;
}

.photo-cropper__source {
  width: min(100%, calc(186px * var(--pcd-preview-scale)));
  margin: 0 auto;
  overflow: visible;
}

.photo-cropper__design-card {
  position: relative;
  width: 186px;
  height: 151px;
  overflow: visible;
  box-sizing: border-box;
  transform: scale(var(--pcd-preview-scale));
  transform-origin: top left;
}

.photo-cropper__frame {
  position: relative;
  overflow: visible;
  cursor: grab;
  touch-action: none;
  z-index: 3;
  box-sizing: border-box;
}

.photo-cropper__crop-shell {
  position: absolute;
  z-index: 3;
  overflow: visible;
}

.photo-cropper__crop-shell--classic {
  left: 50%;
  bottom: 46px;
  transform: translateX(-50%);
}

.photo-cropper__crop-shell--plus {
  top: 0;
  left: 0;
}

.photo-cropper__crop-shell--masters-yug25 {
  top: 0;
  left: 0;
  overflow: visible;
}

.photo-cropper__frame--dragging {
  cursor: grabbing;
}

.photo-cropper__frame--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.photo-cropper__photo-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.photo-cropper__photo-layer--muted {
  z-index: 0;
  overflow: visible;
}

.photo-cropper__photo-layer--active {
  z-index: 1;
  overflow: hidden;
  border-radius: inherit;
}

.photo-cropper__photo-stage {
  position: absolute;
  inset: 0;
  transform-origin: center center;
}

.photo-cropper__source-img {
  position: absolute;
  left: 50%;
  top: 50%;
  max-width: none;
  max-height: none;
  object-fit: fill;
  display: block;
  pointer-events: none;
  user-select: none;
}

.photo-cropper__source-img--muted {
  filter: grayscale(1) saturate(0) brightness(0.78);
  opacity: 0.82;
}

.photo-cropper__frame-guide {
  position: absolute;
  inset: 0;
  z-index: 2;
  border: 1.5px solid #2f6feb;
  pointer-events: none;
}

.photo-cropper__seat {
  position: absolute;
  left: 12px;
  top: 10px;
  z-index: 3;
  color: #fff;
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
}

.photo-cropper__seat-icon {
  display: block;
  width: 42px;
  height: 40px;
  object-fit: contain;
}

.photo-cropper__hint {
  margin: 0.45rem 0 0;
  color: #6b7280;
  font-size: 0.75rem;
  line-height: 1.35;
  text-align: center;
}

.photo-cropper__design-footer {
  position: absolute;
  z-index: 5;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  overflow: hidden;
}

.photo-cropper__footer-seat,
.photo-cropper__footer-nick {
  min-width: 0;
  color: #f8fafc;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.photo-cropper__source--classic .photo-cropper__design-card {
  width: 186px;
  height: 151px;
  background: transparent;
  border-radius: 0;
}

.photo-cropper__source--classic {
  padding-top: calc(22px * var(--pcd-preview-scale));
  height: calc((151px + 22px) * var(--pcd-preview-scale));
  box-sizing: border-box;
}

.photo-cropper__source--classic .photo-cropper__design-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 186px;
  height: 105px;
  overflow: hidden;
  background: #0c0e11;
  border-radius: 5px 5px 0 0;
}

.photo-cropper__source--classic .photo-cropper__frame {
  border-radius: 12px 12px 0 0;
  background: transparent;
}

.photo-cropper__source--classic .photo-cropper__photo-layer--active {
  border-radius: 12px 12px 0 0;
}

.photo-cropper__source--classic .photo-cropper__frame-guide {
  border-radius: 12px 12px 0 0;
}

.photo-cropper__source--classic .photo-cropper__seat {
  font-family: 'Neue Machine', 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  left: 8px;
  top: 28px;
  z-index: 2;
  font-size: 48px;
  font-weight: 800;
  text-shadow: none;
}

.photo-cropper__source--classic .photo-cropper__design-footer {
  justify-content: center;
  left: 0;
  bottom: 0;
  width: 186px;
  height: 45px;
  padding: 0 8px;
  background: #0c0e11;
  border-radius: 0 0 5px 5px;
}

.photo-cropper__source--classic .photo-cropper__footer-nick {
  width: 100%;
  text-align: center;
  font-family: 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 20px;
  font-weight: 500;
}

.photo-cropper__source--masters-yug25 .photo-cropper__design-card {
  width: 185px;
  height: calc(125px + var(--masters-mask-top, 40px));
  background: transparent;
  border-radius: 0;
}

.photo-cropper__source--masters-yug25 {
  width: min(100%, calc(185px * var(--pcd-preview-scale)));
  padding-top: 0;
  height: calc((125px + var(--masters-mask-top, 40px)) * var(--pcd-preview-scale));
  box-sizing: border-box;
}

.photo-cropper__source--masters-yug25 .photo-cropper__design-card::after {
  content: '';
  position: absolute;
  top: var(--masters-mask-top, 40px);
  left: 0;
  width: 185px;
  height: 125px;
  z-index: 1;
  pointer-events: none;
  border-radius: 5px;
  background: #0a0a0a;
}

.photo-cropper__source--masters-yug25 .photo-cropper__design-card::before {
  content: '';
  position: absolute;
  top: var(--masters-mask-top, 40px);
  left: 0;
  width: 185px;
  height: 125px;
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

.photo-cropper__source--masters-yug25 .photo-cropper__frame {
  border-radius: 5px;
  background: transparent;
}

.photo-cropper__source--masters-yug25 .photo-cropper__photo-layer--muted {
  overflow: visible;
}

.photo-cropper__source--masters-yug25 .photo-cropper__photo-layer--active {
  border-radius: 5px;
}

.photo-cropper__source--masters-yug25 .photo-cropper__frame-guide {
  border-radius: 5px;
}

.photo-cropper__source--masters-yug25 .photo-cropper__photo-stage {
  transform: translate(32px, 20px) scale(1.7);
}

.photo-cropper__source--masters-yug25 .photo-cropper__seat {
  display: inline-flex;
  align-items: flex-start;
  justify-content: flex-start;
  min-width: 28px;
  left: 2px;
  top: calc(var(--masters-mask-top, 40px) + 12px);
  z-index: 5;
  margin-left: 0;
  text-shadow: none;
}

.photo-cropper__source--masters-yug25 .photo-cropper__design-footer {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 14px;
  z-index: 4;
  background: transparent;
  pointer-events: none;
}

.photo-cropper__source--masters-yug25 .photo-cropper__footer-nick {
  width: 100%;
  font-family: 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 20px;
  font-weight: 700;
}

.photo-cropper__source--plus .photo-cropper__design-card {
  width: 186px;
  height: 224px;
  background:
    radial-gradient(circle at 82% 18%, rgba(52, 211, 153, 0.22) 0%, transparent 42%),
    radial-gradient(circle at 12% 88%, rgba(251, 191, 36, 0.08) 0%, transparent 48%),
    linear-gradient(180deg, #0f172a 0%, #020617 100%);
  border-radius: 8px;
  font-family: var(--plus-font-family);
  font-weight: var(--plus-font-weight);
}

.photo-cropper__source--plus {
  width: min(100%, calc(186px * var(--pcd-preview-scale)));
  height: calc(224px * var(--pcd-preview-scale));
}

.photo-cropper__source--plus .photo-cropper__frame {
  background: transparent;
  border-radius: 8px 8px 0 0;
}

.photo-cropper__source--plus .photo-cropper__photo-layer--active {
  border-radius: 8px 8px 0 0;
}

.photo-cropper__source--plus .photo-cropper__frame-guide {
  border-radius: 8px 8px 0 0;
}

.photo-cropper__source--plus .photo-cropper__seat {
  display: none;
}

.photo-cropper__source--plus .photo-cropper__design-footer {
  gap: 0.5rem;
  left: 0;
  right: 0;
  bottom: 0;
  height: 38px;
  padding: 0.25rem;
  background: rgba(12, 14, 17, 0.88);
  border-radius: 0 0 8px 8px;
}

.photo-cropper__source--plus .photo-cropper__footer-seat {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  min-width: 0;
  padding: 0.4rem;
  border-radius: 5px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.16);
  font-size: 1.0625rem;
}

.photo-cropper__source--plus .photo-cropper__footer-nick {
  flex: 1;
  font-size: 0.9375rem;
  line-height: 1.2;
}
</style>
