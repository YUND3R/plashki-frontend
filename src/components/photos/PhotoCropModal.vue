<script setup lang="ts">
import { ref, watch } from 'vue'
import PhotoCropper from '@/components/photos/PhotoCropper.vue'
import PhotoCropperControls from '@/components/photos/PhotoCropperControls.vue'
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
  close: []
}>()

const crop = ref<PhotoCrop>({ ...DEFAULT_PHOTO_CROP })

watch(
  () => [open.value, props.initialCrop, props.imageSrc] as const,
  ([isOpen, initial]) => {
    if (!isOpen) return
    crop.value = normalizePhotoCrop(initial ?? DEFAULT_PHOTO_CROP)
  },
)

watch(open, (isOpen, _, onCleanup) => {
  if (!isOpen) return
  const onEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close()
  }
  document.addEventListener('keydown', onEsc)
  onCleanup(() => document.removeEventListener('keydown', onEsc))
})

function close() {
  if (props.saving) return
  open.value = false
  emit('close')
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
            hide-controls
          />
        </main>

        <footer class="pcm-crop-screen__footer">
          <PhotoCropperControls v-model="crop" :disabled="saving || !imageSrc" />
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
  grid-template-rows: auto minmax(0, 1fr) auto;
  background: #f3f4f6;
  color: #111827;
}

.pcm-crop-screen__header,
.pcm-crop-screen__footer {
  display: flex;
  align-items: center;
  background: #ffffff;
}

.pcm-crop-screen__header {
  justify-content: space-between;
  gap: 1rem;
  min-height: 3.75rem;
  padding: 0 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.pcm-crop-screen__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.2;
  color: #111827;
}

.pcm-crop-screen__close {
  padding: 0.45rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #374151;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease;
}

.pcm-crop-screen__close:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.pcm-crop-screen__close:disabled,
.pcm-crop-screen__save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pcm-crop-screen__body {
  position: relative;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1.5rem 1rem;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 0%, rgba(47, 111, 235, 0.05), transparent 42%),
    #f3f4f6;
}

.pcm-crop-screen__footer {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  min-height: 4.25rem;
  padding: 0.85rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.pcm-crop-screen__footer > :first-child {
  grid-column: 2;
  justify-self: center;
}

.pcm-crop-screen__save {
  grid-column: 3;
  justify-self: end;
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
  min-height: 0;
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

.pcm-crop-screen-enter-active,
.pcm-crop-screen-leave-active {
  transition: opacity 160ms ease;
}

.pcm-crop-screen-enter-from,
.pcm-crop-screen-leave-to {
  opacity: 0;
}
</style>
