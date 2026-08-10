<script setup lang="ts">
import { computed } from 'vue'
import OverlayDesignPlatePreview from '@/components/overlay/OverlayDesignPlatePreview.vue'
import AppPageError from '@/components/common/AppPageError.vue'
import { useCardDesignPicker } from '@/composables/useCardDesignPicker'
import { demoPhotoLayoutForDesign } from '@/utils/contentAssets'

const props = withDefaults(
  defineProps<{
    lobbyId: string
    saveSuccessMessage?: string
    showLobbyContext?: boolean
    showCancel?: boolean
    showSaveAction?: boolean
  }>(),
  {
    saveSuccessMessage: undefined,
    showLobbyContext: true,
    showCancel: false,
    showSaveAction: true,
  },
)

const emit = defineEmits<{
  saved: []
  close: []
}>()

const lobbyIdRef = computed(() => props.lobbyId)

const {
  loading,
  saving,
  error,
  saveMessage,
  rentMessage,
  selectedDesign,
  initialSelectedDesign,
  previewSeats,
  filteredDesigns,
  hasUnsavedChanges,
  canSave,
  activeDesignTitle,
  formatDesignPriceRub,
  formatDesignRentalLabel,
  formatDesignAccessLabel,
  designUsesPhotoCutout,
  isRentingDesign,
  rentDesign,
  saveDesign,
} = useCardDesignPicker(lobbyIdRef, {
  saveSuccessMessage: props.saveSuccessMessage,
  onSaved: () => emit('saved'),
})

const radioName = computed(() => `overlay-design-${props.lobbyId || 'none'}`)
const showFooter = computed(
  () =>
    props.showSaveAction ||
    props.showCancel ||
    !!saveMessage.value ||
    !!rentMessage.value ||
    (props.showLobbyContext && !!props.lobbyId && !loading.value && !!initialSelectedDesign.value),
)

async function onSave() {
  await saveDesign()
}

function onCancel() {
  emit('close')
}

function previewSeatsForDesign(designCode: string) {
  return previewSeats.value.map((player) => {
    if (!player) return null
    const photoUrl = (player.lobby_photo_url ?? player.photo_urls?.[0] ?? '').trim()
    if (!photoUrl) return player
    return {
      ...player,
      photo_layouts: {
        ...(player.photo_layouts ?? {}),
        [photoUrl]: demoPhotoLayoutForDesign(photoUrl, designCode),
      },
    }
  })
}
</script>

<template>
  <section class="card-design__designs" aria-label="Доступные дизайны">
    <div class="card-design__designs-body">
      <p v-if="loading" class="card-design__status">
        <span class="card-design__spinner" aria-hidden="true" />
        Загружаем доступные дизайны…
      </p>

      <AppPageError
        v-else-if="error"
        compact
        inline
        :message="error"
      />

      <div v-else-if="filteredDesigns.length" class="card-design__content">
        <div class="card-design__list" role="radiogroup" aria-label="Доступные дизайны карточек">
          <label
            v-for="item in filteredDesigns"
            :key="item.code"
            class="card-design__option"
            :class="{
              'card-design__option--locked': !item.selectable,
              'card-design__option--selected': selectedDesign === item.code,
              'card-design__option--active': item.code === initialSelectedDesign,
            }"
          >
            <input
              v-model="selectedDesign"
              class="card-design__radio"
              type="radio"
              :name="radioName"
              :value="item.code"
              :disabled="!item.selectable || saving"
            />

            <span class="card-design__option-layout">
              <span class="card-design__option-meta-card">
                <span class="card-design__option-meta-top">
                  <span class="card-design__option-title-wrap">
                    <span class="card-design__option-title-block">
                      <span class="card-design__option-title">{{ item.title }}</span>
                    </span>
                    <span class="card-design__option-price">{{ formatDesignPriceRub(item.price_rub) }}</span>
                  </span>
                </span>
                <span class="card-design__option-meta-bottom">
                  <span class="card-design__option-details">
                    <span class="card-design__detail">
                      {{ formatDesignRentalLabel(item.rental_hours) }}
                    </span>
                    <span v-if="formatDesignAccessLabel(item.access_expires_at)" class="card-design__detail">
                      {{ formatDesignAccessLabel(item.access_expires_at) }}
                    </span>
                    <span class="card-design__detail">
                      Анимации: {{ item.animations_supported ? 'Да' : 'Нет' }}
                    </span>
                    <span
                      v-if="designUsesPhotoCutout(item.code)"
                      class="card-design__detail"
                      aria-label="Для дизайна нужны фото без фона"
                    >
                      Фото без фона
                    </span>
                  </span>
                  <button
                    type="button"
                    class="card-design__rent"
                    :disabled="!!isRentingDesign(item.code) || saving"
                    @click.stop.prevent="rentDesign(item.code)"
                  >
                    {{
                      isRentingDesign(item.code)
                        ? 'Оформляем…'
                        : 'Приобрести'
                    }}
                  </button>
                </span>
              </span>

              <OverlayDesignPlatePreview
                class="card-design__preview"
                :design-code="item.code"
                :seats="previewSeatsForDesign(item.code)"
              />
            </span>
          </label>
        </div>
      </div>

      <p v-else-if="showLobbyContext && lobbyId" class="card-design__status">
        Для этого лобби нет доступных дизайнов.
      </p>
    </div>

    <footer v-if="showFooter" class="card-design__footer">
      <div class="card-design__footer-note">
        <p v-if="showLobbyContext && lobbyId && !loading && initialSelectedDesign" class="card-design__current">
          <span class="card-design__current-label">Сейчас в overlay:</span>
          <span class="card-design__current-value">{{ activeDesignTitle }}</span>
        </p>
        <p v-else-if="showSaveAction && hasUnsavedChanges" class="card-design__unsaved">Есть несохранённые изменения</p>
        <p v-else-if="saveMessage" class="card-design__ok" role="status">{{ saveMessage }}</p>
        <p v-else-if="rentMessage" class="card-design__ok" role="status">{{ rentMessage }}</p>
        <p v-else-if="showSaveAction" class="card-design__footer-hint">Изменения применятся к overlay после сохранения.</p>
      </div>
      <div v-if="showSaveAction || showCancel" class="card-design__footer-actions">
        <button
          v-if="showCancel"
          type="button"
          class="card-design__cancel"
          :disabled="saving"
          @click="onCancel"
        >
          Отмена
        </button>
        <button v-if="showSaveAction" type="button" class="card-design__save" :disabled="!canSave" @click="onSave">
          {{ saving ? 'Сохраняем…' : 'Сохранить дизайн' }}
        </button>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.card-design__designs {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  min-height: 0;
  height: 100%;
  padding: 0;
  background: #fff;
  overflow: hidden;
  position: relative;
  z-index: 1;
  --card-design-bottom-bar-min-h: 4.25rem;
}

.card-design__inline-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.card-design__inline-filters {
  flex-shrink: 0;
}

.card-design__designs-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0.5rem 0.75rem 0 0.5rem;
  box-sizing: border-box;
}

.card-design__current {
  margin: 0;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-size: 0.8125rem;
  line-height: 1.35;
}

.card-design__current-label {
  color: #6b7280;
}

.card-design__current-value {
  font-weight: 600;
  color: #1d4ed8;
  line-height: 1.35;
}

.card-design__status {
  margin: 0;
  padding: 1rem 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.875rem;
  color: #4b5563;
}

.card-design__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #dbeafe;
  border-top-color: #2f6feb;
  border-radius: 50%;
  animation: card-design-spin 0.7s linear infinite;
}

@keyframes card-design-spin {
  to {
    transform: rotate(360deg);
  }
}

.card-design__alert {
  margin: 0;
  padding: 1rem 0.75rem;
  border-radius: 0;
  font-size: 0.875rem;
}

.card-design__alert--error {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.6rem;
  text-align: center;
  color: #b91c1c;
  background: #fff1f2;
  border: none;
  border-bottom: 1px solid #fecaca;
}

.card-design__auth-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.32rem 0.62rem;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  background: #fff1f2;
  color: #9f1239;
  font-size: 0.8rem;
  text-decoration: none;
}

.card-design__auth-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.card-design__auth-link--ghost {
  border-color: #fecaca;
  background: #ffffff;
}

.card-design__auth-link:hover {
  background: #ffe4e6;
}

.card-design__content {
  margin-top: 0;
  display: flex;
  flex-direction: column;
}

.card-design__list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}

.card-design__option {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 0.6rem;
  padding: 0.75rem 0 0.95rem;
  border: none;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 0;
  background: #fff;
  cursor: pointer;
  box-sizing: border-box;
  overflow: visible;
  transition: background-color 0.2s ease;
}

.card-design__option:last-child {
  border-bottom: none;
}

.card-design__option:hover:not(.card-design__option--locked) {
  background: #fff;
}

.card-design__option:focus-within:not(.card-design__option--locked) {
  background: #fff;
}

.card-design__option--selected {
  background: #fff;
}

.card-design__option--locked {
  cursor: default;
}

.card-design__radio {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.card-design__badge {
  display: inline-flex;
  align-items: center;
  min-height: 1.35rem;
  padding: 0 0.45rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.card-design__option-layout {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(14rem, 18.5rem) minmax(0, 1fr);
  align-items: stretch;
  gap: 0.85rem;
  padding: 0 0.75rem;
  box-sizing: border-box;
}

.card-design__option-meta-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.65rem;
  min-height: 100%;
  padding: 1.05rem 1.2rem;
  border: none;
  border-radius: 10px;
  background: #f4f6f8;
  box-sizing: border-box;
  transition: background-color 0.2s ease;
}

.card-design__option--selected .card-design__option-meta-card {
  background: #f4f6f8;
}

.card-design__option:hover:not(.card-design__option--locked) .card-design__option-meta-card,
.card-design__option:focus-within:not(.card-design__option--locked) .card-design__option-meta-card {
  background: #eef2f5;
}

.card-design__option--selected:hover .card-design__option-meta-card,
.card-design__option--selected:focus-within .card-design__option-meta-card {
  background: #eef2f5;
}

.card-design__option-meta-top {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0.75rem;
  min-width: 0;
}

.card-design__option-title-wrap {
  min-width: 0;
  display: grid;
  gap: 0.4rem;
  padding: 0.12rem 0 0.2rem;
  justify-items: start;
  text-align: left;
}

.card-design__option-meta-bottom {
  min-height: 1.75rem;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.8rem;
}

.card-design__preview {
  width: 100%;
  max-width: 100%;
  overflow: visible;
  background: transparent;
  padding: 0.15rem 0.35rem 0.25rem 0.35rem;
  box-sizing: border-box;
  border: none;
  min-height: 0;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  position: relative;
  z-index: 2;
}


.card-design__option-title-block {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  padding: 0.08rem 0;
  margin-right: 0.15rem;
  overflow: visible;
}

.card-design__option-title {
  font-size: 1.52rem;
  color: #111827;
  font-weight: 700;
  line-height: 1.2;
}

.card-design__option-price {
  display: inline-block;
  align-self: flex-start;
  min-height: 0;
  padding: 0.1rem 0;
  border: none;
  border-radius: 0;
  font-size: 2.45rem;
  font-weight: 800;
  line-height: 1;
  color: #020617;
  background: transparent;
}

.card-design__option--selected .card-design__option-price {
  color: #020617;
}

@media (max-width: 980px) {
  .card-design__option-layout {
    grid-template-columns: 1fr;
    gap: 0.55rem;
  }
}

.card-design__option-details {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.32rem;
}

.card-design__detail {
  display: inline-flex;
  align-items: center;
  min-height: 1.25rem;
  font-size: 0.95rem;
  font-weight: 450;
  line-height: 1.25;
  color: #64748b;
}

.card-design__rent {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  align-self: flex-end;
  flex: 0 0 auto;
  min-height: 2.2rem;
  margin: 0;
  padding: 0.35rem 0.75rem;
  border: none;
  border-radius: 8px;
  background: #eaf2fb;
  color: #2563eb;
  font: inherit;
  font-size: 1.02rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.card-design__rent:hover:not(:disabled) {
  background: #dfeaf7;
  color: #1d4ed8;
}

.card-design__rent:focus-visible {
  outline: 2px solid #bfdbfe;
  outline-offset: 2px;
}

.card-design__rent:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.card-design__footer {
  flex-shrink: 0;
  margin-top: 0;
  min-height: var(--card-design-bottom-bar-min-h);
  padding: 0.625rem 0.75rem;
  border-top: 1px solid #e5e7eb;
  background: #fff;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  box-sizing: border-box;
}

.card-design__footer-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.card-design__footer-note {
  flex: 1 1 auto;
  min-width: 0;
}

.card-design__footer-hint,
.card-design__unsaved,
.card-design__ok {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.35;
}

.card-design__footer-hint {
  color: #6b7280;
}

.card-design__unsaved {
  color: #b45309;
  font-weight: 600;
}

.card-design__ok {
  color: #15803d;
  font-weight: 600;
}

.card-design__save {
  border: 1px solid #2f6feb;
  background: #2f6feb;
  color: #fff;
  border-radius: 8px;
  min-height: 2.25rem;
  padding: 0.45rem 1rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.card-design__save:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.card-design__save:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}

.card-design__save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  background: #9ca3af;
  border-color: #9ca3af;
}

.card-design__cancel {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
  border-radius: 8px;
  min-height: 2.25rem;
  padding: 0.45rem 1rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.card-design__cancel:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.card-design__cancel:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .card-design__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .card-design__footer-note {
    margin-right: 0;
  }

  .card-design__save {
    width: 100%;
  }
}
</style>
