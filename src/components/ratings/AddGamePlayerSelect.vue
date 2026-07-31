<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'

export type AddGamePlayerSelectOption = {
  value: string
  label: string
  photoUrl?: string
  initials: string
}

const model = defineModel<string>({ required: true })

const props = withDefaults(
  defineProps<{
    options: AddGamePlayerSelectOption[]
    ariaLabel?: string
    disabled?: boolean
    placement?: 'top' | 'bottom'
  }>(),
  {
    ariaLabel: undefined,
    disabled: false,
    placement: 'bottom',
  },
)

const open = ref(false)
const searchQuery = ref('')
const triggerRef = ref<HTMLButtonElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

const selectableOptions = computed(() => props.options.filter((item) => item.value))

const selectedOption = computed(() => selectableOptions.value.find((item) => item.value === model.value) ?? null)

const filteredOptions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return selectableOptions.value
  return selectableOptions.value.filter((item) => item.label.toLowerCase().includes(q))
})

function updateMenuPosition() {
  const trigger = triggerRef.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const minWidthPx = 18 * rootFontSize
  const maxWidthPx = Math.min(24 * rootFontSize, window.innerWidth - 16)
  const width = Math.min(Math.max(rect.width, minWidthPx), maxWidthPx)
  const left = Math.min(rect.left, window.innerWidth - width - 8)
  const horizontalStyle = {
    left: `${Math.max(8, left)}px`,
    width: `${width}px`,
  }
  menuStyle.value =
    props.placement === 'top'
      ? {
          ...horizontalStyle,
          top: 'auto',
          bottom: `${window.innerHeight - rect.top + 4}px`,
          maxHeight: `${Math.max(160, rect.top - 12)}px`,
        }
      : {
          ...horizontalStyle,
          top: `${rect.bottom + 4}px`,
          bottom: 'auto',
          maxHeight: `${Math.max(160, window.innerHeight - rect.bottom - 12)}px`,
        }
}

function close() {
  open.value = false
}

function toggleOpen() {
  if (props.disabled) return
  open.value = !open.value
}

function selectValue(value: string) {
  model.value = value
  close()
}

function onDocumentPointerDown(event: MouseEvent) {
  const trigger = triggerRef.value
  const target = event.target as Node
  if (trigger?.contains(target)) return
  if (target instanceof Element && target.closest('.add-game-player-select__menu')) return
  close()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

let scrollListenerAttached = false

function attachScrollListeners() {
  if (scrollListenerAttached) return
  scrollListenerAttached = true
  window.addEventListener('scroll', updateMenuPosition, true)
  window.addEventListener('resize', updateMenuPosition)
}

function detachScrollListeners() {
  if (!scrollListenerAttached) return
  scrollListenerAttached = false
  window.removeEventListener('scroll', updateMenuPosition, true)
  window.removeEventListener('resize', updateMenuPosition)
}

watch(open, (isOpen) => {
  if (isOpen) {
    searchQuery.value = ''
    document.addEventListener('pointerdown', onDocumentPointerDown)
    document.addEventListener('keydown', onDocumentKeydown)
    void nextTick(() => {
      updateMenuPosition()
      attachScrollListeners()
      searchRef.value?.focus()
    })
    return
  }
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
  detachScrollListeners()
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
  detachScrollListeners()
})
</script>

<template>
  <div
    class="add-game-player-select"
    :class="{
      'add-game-player-select--open': open,
      'add-game-player-select--disabled': disabled,
      'add-game-player-select--placeholder': !selectedOption,
    }"
  >
    <button
      ref="triggerRef"
      type="button"
      class="add-game-player-select__trigger"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggleOpen"
    >
      <span v-if="selectedOption" class="add-game-player-select__selected">
        <span class="add-game-player-select__avatar" aria-hidden="true">
          <img
            v-if="selectedOption.photoUrl"
            :src="selectedOption.photoUrl"
            alt=""
            class="add-game-player-select__avatar-img"
          />
          <span v-else class="add-game-player-select__avatar-ph">{{ selectedOption.initials }}</span>
        </span>
        <span class="add-game-player-select__label">{{ selectedOption.label }}</span>
      </span>
      <span v-else class="add-game-player-select__placeholder">Выберите игрока</span>
      <span class="add-game-player-select__arrow" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        class="add-game-player-select__menu"
        :style="menuStyle"
        role="listbox"
        :aria-label="ariaLabel"
      >
        <div class="add-game-player-select__search-wrap">
          <input
            ref="searchRef"
            v-model="searchQuery"
            class="add-game-player-select__search"
            type="search"
            placeholder="Поиск игрока"
            autocomplete="off"
            aria-label="Поиск игрока"
            @keydown.stop
          />
        </div>
        <div class="add-game-player-select__options">
          <button
            v-for="item in filteredOptions"
            :key="item.value"
            type="button"
            role="option"
            class="add-game-player-select__option"
            :class="{ 'add-game-player-select__option--active': item.value === model }"
            :aria-selected="item.value === model"
            @click="selectValue(item.value)"
          >
            <span class="add-game-player-select__avatar" aria-hidden="true">
              <img v-if="item.photoUrl" :src="item.photoUrl" alt="" class="add-game-player-select__avatar-img" />
              <span v-else class="add-game-player-select__avatar-ph">{{ item.initials }}</span>
            </span>
            <span class="add-game-player-select__option-label">{{ item.label }}</span>
          </button>
          <p v-if="!filteredOptions.length" class="add-game-player-select__empty">Игроки не найдены</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.add-game-player-select {
  position: relative;
  width: 100%;
  min-width: 0;
}

.add-game-player-select__trigger {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 2.25rem;
  padding: 0.35rem 0.45rem 0.35rem 2rem;
  font: inherit;
  text-align: left;
  border: none;
  border-radius: 0;
  background: transparent;
  box-sizing: border-box;
  cursor: pointer;
}

.add-game-player-select--disabled .add-game-player-select__trigger {
  opacity: 0.65;
  cursor: not-allowed;
}

.add-game-player-select__selected {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1 1 auto;
}

.add-game-player-select__placeholder {
  color: #94a3b8;
  font-size: 0.875rem;
}

.add-game-player-select__label,
.add-game-player-select__option-label {
  min-width: 0;
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-game-player-select__avatar,
.add-game-player-select__avatar-ph,
.add-game-player-select__avatar-img {
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 999px;
  flex-shrink: 0;
}

.add-game-player-select__avatar-img {
  display: block;
  object-fit: cover;
  background: #f3f4f6;
}

.add-game-player-select__avatar-ph {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #64748b;
}

.add-game-player-select__arrow {
  position: absolute;
  top: 50%;
  left: 0.55rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  color: #64748b;
  pointer-events: none;
  transform: translateY(-50%);
}

.add-game-player-select--open .add-game-player-select__arrow {
  color: #2f6feb;
  transform: translateY(-50%) rotate(180deg);
}

.add-game-player-select__menu {
  position: fixed;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  max-height: min(18rem, calc(100dvh - 6rem));
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  box-sizing: border-box;
}

.add-game-player-select__search-wrap {
  flex-shrink: 0;
  padding: 0.55rem;
  border-bottom: 1px solid #f1f5f9;
}

.add-game-player-select__search {
  width: 100%;
  box-sizing: border-box;
  min-height: 2.25rem;
  padding: 0.45rem 0.65rem;
  font: inherit;
  font-size: 0.875rem;
  color: #111827;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 8px;
  background: #fff;
}

.add-game-player-select__search:focus,
.add-game-player-select__search:focus-visible {
  outline: none;
  border-color: #2f6feb;
  box-shadow: 0 0 0 3px rgba(47, 111, 235, 0.12);
}

.add-game-player-select__options {
  overflow-y: auto;
  padding: 0.35rem;
}

.add-game-player-select__option {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  margin: 0;
  padding: 0.45rem 0.55rem;
  font: inherit;
  text-align: left;
  color: #374151;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}

.add-game-player-select__option:hover {
  background: #f3f4f6;
}

.add-game-player-select__option--active {
  background: #eff6ff;
}

.add-game-player-select__empty {
  margin: 0;
  padding: 0.75rem 0.55rem;
  font-size: 0.8125rem;
  color: #94a3b8;
  text-align: center;
}
</style>
