<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'

export type AppModalSelectOption = {
  value: string
  label: string
}

const model = defineModel<string>({ required: true })

const props = withDefaults(
  defineProps<{
    options: AppModalSelectOption[]
    ariaLabel?: string
    disabled?: boolean
    compact?: boolean
  }>(),
  {
    ariaLabel: undefined,
    disabled: false,
    compact: false,
  },
)

const open = ref(false)
const triggerRef = ref<HTMLButtonElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

const selectedLabel = computed(() => {
  const match = props.options.find((item) => item.value === model.value)
  return match?.label ?? props.options[0]?.label ?? '—'
})

function updateMenuPosition() {
  const trigger = triggerRef.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  menuStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
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
  if (target instanceof Element && target.closest('.app-modal-select__menu')) return
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
    document.addEventListener('pointerdown', onDocumentPointerDown)
    document.addEventListener('keydown', onDocumentKeydown)
    void nextTick(() => {
      updateMenuPosition()
      attachScrollListeners()
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
    class="app-modal-select"
    :class="{
      'app-modal-select--open': open,
      'app-modal-select--compact': compact,
      'app-modal-select--disabled': disabled,
    }"
  >
    <button
      ref="triggerRef"
      type="button"
      class="app-modal-select__trigger"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggleOpen"
    >
      <span class="app-modal-select__value">{{ selectedLabel }}</span>
      <span class="app-modal-select__arrow" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        class="app-modal-select__menu"
        :class="{ 'app-modal-select__menu--compact': compact }"
        :style="menuStyle"
        role="listbox"
        :aria-label="ariaLabel"
      >
        <button
          v-for="item in options"
          :key="item.value"
          type="button"
          role="option"
          class="app-modal-select__option"
          :class="{ 'app-modal-select__option--active': item.value === model }"
          :aria-selected="item.value === model"
          @click="selectValue(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
    </Teleport>
  </div>
</template>
