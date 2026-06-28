<script setup lang="ts">
import { ref, watch } from 'vue'
import PhotoCropper from '@/components/photos/PhotoCropper.vue'
import { DEFAULT_PHOTO_CROP, normalizePhotoCrop, type PhotoCrop } from '@/utils/photoCrop'
import type { OverlayPhotoSpec } from '@/utils/overlayPhotoSpec'

const open = defineModel<boolean>({ default: false })

const props = defineProps<{
  imageSrc: string
  spec: OverlayPhotoSpec
  title?: string
  saving?: boolean
  initialCrop?: PhotoCrop | null
  nickname?: string
  seatIndex?: number
}>()

const emit = defineEmits<{
  save: [crop: PhotoCrop]
}>()

const crop = ref<PhotoCrop>({ ...DEFAULT_PHOTO_CROP })

watch(
  () => [open.value, props.initialCrop, props.imageSrc] as const,
  ([isOpen, initial]) => {
    if (!isOpen) return
    crop.value = normalizePhotoCrop(initial ?? DEFAULT_PHOTO_CROP)
  },
)

function close() {
  if (props.saving) return
  open.value = false
}

function submit() {
  emit('save', normalizePhotoCrop(crop.value))
}
</script>

<template>
  <Teleport to="body">
    <Transition name="pcm-crop-screen">
      <div v-if="open" class="pcm-crop-screen" role="dialog" aria-modal="true" aria-labelledby="pcm-title">
        <header class="pcm-crop-screen__header">
          <h2 id="pcm-title" class="pcm-crop-screen__title">{{ title ?? 'Кадрирование фото' }}</h2>
          <button
            type="button"
            class="pcm-crop-screen__close"
            :disabled="saving"
            @click="close"
          >
            Закрыть
          </button>
        </header>

        <main class="pcm-crop-screen__body">
          <PhotoCropper
            v-model="crop"
            :image-src="imageSrc"
            :spec="spec"
            :nickname="nickname"
            :seat-index="seatIndex"
            :disabled="saving || !imageSrc"
          />
        </main>

        <footer class="pcm-crop-screen__footer">
          <div class="pcm-crop-screen__footer-spacer" aria-hidden="true" />
          <button
            type="button"
            class="pcm-crop-screen__save"
            :disabled="saving || !imageSrc"
            @click="submit"
          >
            {{ saving ? 'Сохранение…' : 'Сохранить' }}
          </button>
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pcm-crop-screen {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  grid-template-rows: 3.125rem minmax(0, 1fr) 3.125rem;
  background: #ffffff;
  color: #111827;
}

.pcm-crop-screen__header,
.pcm-crop-screen__footer {
  display: flex;
  align-items: center;
  border-color: #d9d9d9;
  background: #ffffff;
}

.pcm-crop-screen__header {
  justify-content: space-between;
  padding: 0 1.5rem;
  border-bottom: 1px solid #d9d9d9;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.pcm-crop-screen__title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1;
  color: #111827;
}

.pcm-crop-screen__close {
  padding: 0;
  border: 0;
  background: transparent;
  color: #111827;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}

.pcm-crop-screen__close:disabled,
.pcm-crop-screen__save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pcm-crop-screen__body {
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  overflow: hidden;
  background: #ffffff;
}

.pcm-crop-screen__footer {
  position: relative;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0 0.75rem;
  border-top: 1px solid #d9d9d9;
  box-shadow: 0 -1px 2px rgba(15, 23, 42, 0.08);
}

.pcm-crop-screen__footer-spacer {
  width: 6.75rem;
  height: 1px;
}

.pcm-crop-screen__save {
  padding: 0.55rem 1rem;
  border: 0;
  border-radius: 8px;
  background: #2f6feb;
  color: #ffffff;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: normal;
  box-sizing: border-box;
  cursor: pointer;
}

.pcm-crop-screen__save:hover:not(:disabled) {
  background: #2563d4;
}

.pcm-crop-screen :deep(.photo-cropper) {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  gap: 0;
}

.pcm-crop-screen :deep(.photo-cropper__stage) {
  align-items: center;
  padding: 0;
}

.pcm-crop-screen :deep(.photo-cropper__preview) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pcm-crop-screen :deep(.photo-cropper__hint) {
  display: none;
}

.pcm-crop-screen :deep(.photo-cropper__controls) {
  position: fixed;
  left: 50%;
  bottom: 1rem;
  z-index: 1002;
  width: min(27.5rem, calc(100vw - 18rem));
  transform: translateX(-50%);
}

.pcm-crop-screen :deep(.photo-cropper__zoom) {
  width: 100%;
}

.pcm-crop-screen :deep(.photo-cropper__zoom input[type='range']) {
  display: block;
  height: 0.875rem;
  accent-color: #cfcfcf;
}

.pcm-crop-screen :deep(.photo-cropper__center-btn) {
  display: none;
}

.pcm-crop-screen-enter-active,
.pcm-crop-screen-leave-active {
  transition: opacity 160ms ease;
}

.pcm-crop-screen-enter-from,
.pcm-crop-screen-leave-to {
  opacity: 0;
}
</style>
