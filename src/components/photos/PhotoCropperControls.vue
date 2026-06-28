<script setup lang="ts">
import { computed } from 'vue'
import {
  DEFAULT_PHOTO_CROP,
  MAX_PHOTO_CROP_ZOOM,
  MIN_PHOTO_CROP_ZOOM,
  normalizePhotoCrop,
  type PhotoCrop,
} from '@/utils/photoCrop'

const crop = defineModel<PhotoCrop>({ required: true })

const props = defineProps<{
  disabled?: boolean
}>()

const zoomPercent = computed(() => Math.round(normalizePhotoCrop(crop.value).zoom * 100))

function centerCrop() {
  if (props.disabled) return
  crop.value = { ...DEFAULT_PHOTO_CROP }
}
</script>

<template>
  <div class="photo-cropper-controls" title="Колёсико мыши — увеличение и уменьшение">
    <span class="photo-cropper-controls__value">{{ zoomPercent }}%</span>
    <label class="photo-cropper-controls__slider-wrap">
      <input
        v-model.number="crop.zoom"
        type="range"
        class="photo-cropper-controls__slider"
        :min="MIN_PHOTO_CROP_ZOOM"
        :max="MAX_PHOTO_CROP_ZOOM"
        step="0.01"
        :disabled="disabled"
        aria-label="Масштаб"
        @input="crop = normalizePhotoCrop(crop)"
      />
    </label>
    <button
      type="button"
      class="photo-cropper-controls__reset"
      :disabled="disabled"
      title="Сбросить кадрирование: центр и масштаб 1"
      @click="centerCrop"
    >
      По умолчанию
    </button>
  </div>
</template>

<style scoped>
.photo-cropper-controls {
  --pcc-track-h: 0.75rem;
  --pcc-thumb: 1.375rem;
  flex: 0 1 auto;
  width: min(100%, 36rem);
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.35rem 0;
  background: transparent;
}

.photo-cropper-controls__value {
  flex-shrink: 0;
  min-width: 2.75rem;
  margin-right: -0.4rem;
  font-size: 0.875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #111827;
  text-align: left;
  white-space: nowrap;
}

.photo-cropper-controls__slider-wrap {
  flex: 1 1 20rem;
  min-width: 14rem;
  max-width: 26rem;
  display: flex;
  align-items: center;
  padding: 0.45rem 0;
}

.photo-cropper-controls__slider {
  width: 100%;
  height: 1.5rem;
  margin: 0;
  background: transparent;
  accent-color: #2f6feb;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.photo-cropper-controls__slider::-webkit-slider-runnable-track {
  height: var(--pcc-track-h);
  border-radius: 999px;
  background: #d1d5db;
}

.photo-cropper-controls__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: var(--pcc-thumb);
  height: var(--pcc-thumb);
  margin-top: calc((var(--pcc-track-h) - var(--pcc-thumb)) / 2);
  border: 0;
  border-radius: 50%;
  background: #2f6feb;
}

.photo-cropper-controls__slider::-moz-range-track {
  height: var(--pcc-track-h);
  border-radius: 999px;
  background: #d1d5db;
}

.photo-cropper-controls__slider::-moz-range-thumb {
  width: var(--pcc-thumb);
  height: var(--pcc-thumb);
  border: 0;
  border-radius: 50%;
  background: #2f6feb;
}

.photo-cropper-controls__slider::-moz-range-progress {
  height: var(--pcc-track-h);
  border-radius: 999px 0 0 999px;
  background: #2f6feb;
}

.photo-cropper-controls__reset {
  flex-shrink: 0;
  padding: 0.4rem 0.7rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.2;
  color: #374151;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}

.photo-cropper-controls__reset:hover:not(:disabled) {
  background: #f3f4f6;
}

.photo-cropper-controls__reset:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
