<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import OverlayDesignPlatePreview from '@/components/overlay/OverlayDesignPlatePreview.vue'
import { useCardDesignPicker } from '@/composables/useCardDesignPicker'
import { useCardsUiStore } from '@/stores/cardsUi'
import type { CardDesignFilter } from '@/stores/cardsUi'

const props = withDefaults(
  defineProps<{
    lobbyId: string
    saveSuccessMessage?: string
    showLobbyContext?: boolean
    showInlineFilter?: boolean
    showCancel?: boolean
  }>(),
  {
    saveSuccessMessage: undefined,
    showLobbyContext: true,
    showInlineFilter: false,
    showCancel: false,
  },
)

const emit = defineEmits<{
  saved: []
  close: []
}>()

const cardsUi = useCardsUiStore()
const { designFilter } = storeToRefs(cardsUi)

const CARD_DESIGN_FILTER_OPTIONS: { value: CardDesignFilter; label: string }[] = [
  { value: 'all', label: 'Все плашки' },
  { value: 'available', label: 'Доступные мне' },
]

function setDesignFilter(next: CardDesignFilter) {
  cardsUi.designFilter = next
}

const lobbyIdRef = computed(() => props.lobbyId)

const {
  loading,
  saving,
  error,
  saveMessage,
  designs,
  selectedDesign,
  initialSelectedDesign,
  previewSeats,
  filteredDesigns,
  hasUnsavedChanges,
  canSave,
  activeDesignTitle,
  isAuthRequiredError,
  subscriptionLabel,
  designMockPrice,
  designUsesPhotoCutout,
  saveDesign,
} = useCardDesignPicker(lobbyIdRef, {
  saveSuccessMessage: props.saveSuccessMessage,
  onSaved: () => emit('saved'),
})

const radioName = computed(() => `overlay-design-${props.lobbyId || 'none'}`)

async function onSave() {
  await saveDesign()
}

function onCancel() {
  emit('close')
}
</script>

<template>
  <section class="card-design__designs" aria-label="Доступные дизайны">
    <div v-if="showInlineFilter" class="card-design__inline-toolbar">
      <div class="card-design__inline-filters" role="radiogroup" aria-label="Показать плашки">
        <button
          v-for="opt in CARD_DESIGN_FILTER_OPTIONS"
          :key="opt.value"
          type="button"
          role="radio"
          class="card-design__inline-filters-btn"
          :class="{ 'card-design__inline-filters-btn--active': designFilter === opt.value }"
          :aria-checked="designFilter === opt.value"
          @click="setDesignFilter(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
    <div class="card-design__designs-body">
      <p v-if="loading" class="card-design__status">
        <span class="card-design__spinner" aria-hidden="true" />
        Загружаем доступные дизайны…
      </p>

      <div v-else-if="error" class="card-design__alert card-design__alert--error" role="alert">
        <span>{{ error }}</span>
        <span v-if="isAuthRequiredError" class="card-design__auth-actions">
          <RouterLink class="card-design__auth-link card-design__auth-link--ghost" to="/login">Вход</RouterLink>
          <RouterLink class="card-design__auth-link" to="/register">Регистрация</RouterLink>
        </span>
      </div>

      <div v-else-if="filteredDesigns.length" class="card-design__content">
        <div class="card-design__list" role="radiogroup" aria-label="Доступные дизайны карточек">
          <label
            v-for="item in filteredDesigns"
            :key="item.code"
            class="card-design__option"
            :class="{
              'card-design__option--disabled': !item.selectable,
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

            <OverlayDesignPlatePreview
              class="card-design__preview"
              :design-code="item.code"
              :seats="previewSeats"
            />

            <span class="card-design__option-body">
              <span class="card-design__option-info">
                <span class="card-design__option-title-block">
                  <span
                    v-if="designUsesPhotoCutout(item.code)"
                    class="design-cutout-hint"
                    tabindex="0"
                    role="note"
                    aria-label="Фотки должны быть вырезаны"
                    @click.stop
                    @mousedown.stop
                  >
                    <span class="design-cutout-hint__icon" aria-hidden="true" />
                    <span class="design-cutout-hint__tip" role="tooltip">Фотки должны быть вырезаны</span>
                  </span>
                  <span class="card-design__option-title">{{ item.title }}</span>
                </span>
                <span
                  v-if="item.code === initialSelectedDesign"
                  class="card-design__badge card-design__badge--active"
                >
                  Активный
                </span>
                <span v-if="!item.selectable" class="card-design__badge card-design__badge--locked">
                  Недоступен
                </span>
                <span class="card-design__option-price">{{ designMockPrice(item.code) }}</span>
                <span class="card-design__chip">
                  Подписка: {{ subscriptionLabel(item.required_subscription) }}
                </span>
                <span class="card-design__chip">
                  Анимации: {{ item.animation_supported ? 'Да' : 'Нет' }}
                </span>
              </span>
            </span>
          </label>
        </div>
      </div>

      <p
        v-else-if="showLobbyContext && lobbyId && designs.length && designFilter === 'available'"
        class="card-design__status"
      >
        Нет доступных вам плашек.
      </p>
      <p v-else-if="showLobbyContext && lobbyId" class="card-design__status">
        Для этого лобби нет доступных дизайнов.
      </p>
    </div>

    <footer class="card-design__footer">
      <div class="card-design__footer-note">
        <p v-if="showLobbyContext && lobbyId && !loading && initialSelectedDesign" class="card-design__current">
          <span class="card-design__current-label">Сейчас в overlay:</span>
          <span class="card-design__current-value">{{ activeDesignTitle }}</span>
        </p>
        <p v-else-if="hasUnsavedChanges" class="card-design__unsaved">Есть несохранённые изменения</p>
        <p v-else-if="saveMessage" class="card-design__ok" role="status">{{ saveMessage }}</p>
        <p v-else class="card-design__footer-hint">Изменения применятся к overlay после сохранения.</p>
      </div>
      <div class="card-design__footer-actions">
        <button
          v-if="showCancel"
          type="button"
          class="card-design__cancel"
          :disabled="saving"
          @click="onCancel"
        >
          Отмена
        </button>
        <button type="button" class="card-design__save" :disabled="!canSave" @click="onSave">
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
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.card-design__inline-filters-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  min-height: 2rem;
  height: 2rem;
  padding: 0 0.65rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
}

.card-design__inline-filters-btn:hover:not(.card-design__inline-filters-btn--active):not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.card-design__inline-filters-btn--active {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #93c5fd;
}

.card-design__designs-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
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
  gap: 0.75rem;
  padding: 1rem 0;
  border: none;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 0;
  background: #fff;
  cursor: pointer;
  box-sizing: border-box;
  transition: background 0.15s ease;
}

.card-design__option:last-child {
  border-bottom: none;
}

.card-design__option:hover:not(.card-design__option--disabled) {
  background: #f9fafb;
}

.card-design__option:focus-within:not(.card-design__option--disabled) {
  background: #f8fbff;
}

.card-design__option--selected {
  background: #f8fbff;
  box-shadow: inset 3px 0 0 #60a5fa;
}

.card-design__option--disabled {
  opacity: 0.72;
  cursor: not-allowed;
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

.card-design__badge--active {
  color: #1d4ed8;
  background: #dbeafe;
  border: 1px solid #93c5fd;
}

.card-design__badge--locked {
  color: #9f1239;
  background: #fff1f2;
  border: 1px solid #fecaca;
}

.card-design__preview {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  background: transparent;
  padding: 0.25rem 0 0.5rem 0.75rem;
  box-sizing: border-box;
  border: none;
  min-height: 0;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
}

.card-design__option-body {
  width: 100%;
  padding: 0 0.75rem;
  box-sizing: border-box;
}

.card-design__option-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.45rem;
}

.card-design__option-title-block {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  margin-right: 0.15rem;
}

.card-design__option-title {
  font-size: 1rem;
  color: #111827;
  font-weight: 600;
  line-height: 1.3;
}

.card-design__option-price {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.4rem;
  padding: 0 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #374151;
  background: #f9fafb;
}

.card-design__option--selected .card-design__option-price {
  border-color: #bfdbfe;
  background: #fff;
  color: #1d4ed8;
}

.card-design__chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.35rem;
  padding: 0 0.5rem;
  border-radius: 999px;
  background: #f3f4f6;
  font-size: 0.75rem;
  color: #6b7280;
}

.card-design__option--selected .card-design__chip {
  background: #eef4ff;
  color: #4b5563;
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
