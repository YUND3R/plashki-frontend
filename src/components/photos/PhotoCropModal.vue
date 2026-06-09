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
    <Transition name="app-modal">
      <div v-if="open" class="app-modal" role="presentation">
        <div class="app-modal__backdrop" aria-hidden="true" @click.self="!saving && close()" />
        <div class="app-modal__wrap pcm-modal__wrap" role="dialog" aria-modal="true" aria-labelledby="pcm-title">
          <div class="app-modal__panel">
            <div class="app-modal__head">
              <h2 id="pcm-title" class="app-modal__title">{{ title ?? 'Кадрирование фото' }}</h2>
              <button type="button" class="app-modal__close" aria-label="Закрыть" :disabled="saving" @click="close">
                ×
              </button>
            </div>
            <div class="app-modal__body app-modal__body--tight">
              <PhotoCropper
                v-model="crop"
                :image-src="imageSrc"
                :spec="spec"
                :nickname="nickname"
                :seat-index="seatIndex"
                :disabled="saving || !imageSrc"
              />
              <div class="app-modal__actions pcm-modal__actions">
                <button type="button" class="app-modal__btn-primary" :disabled="saving || !imageSrc" @click="submit">
                  {{ saving ? 'Сохранение…' : 'Сохранить' }}
                </button>
                <button type="button" class="app-modal__btn-secondary" :disabled="saving" @click="close">
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pcm-modal__wrap {
  max-width: min(29rem, calc(100vw - 2rem));
}

.pcm-modal__wrap .app-modal__panel {
  padding-left: 1rem;
  padding-right: 1rem;
}

.pcm-modal__wrap .app-modal__head {
  margin-bottom: 0.75rem;
}

.pcm-modal__wrap .app-modal__body--tight {
  padding-top: 0.35rem;
  overflow: visible;
}

.pcm-modal__actions {
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 0.65rem;
  margin-top: 0.5rem;
}

.pcm-modal__actions .app-modal__btn-primary,
.pcm-modal__actions .app-modal__btn-secondary {
  flex: 1;
  min-width: 0;
}
</style>
