<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

export type AdminFilterSelectOption = {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    options: AdminFilterSelectOption[]
    ariaLabel?: string
    defaultValue?: string
  }>(),
  {
    ariaLabel: undefined,
    defaultValue: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const selectedLabel = computed(() => {
  const match = props.options.find((item) => item.value === props.modelValue)
  return match?.label ?? props.options[0]?.label ?? '—'
})

const isActive = computed(() => props.modelValue !== props.defaultValue)

function toggleOpen() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function selectValue(value: string) {
  emit('update:modelValue', value)
  close()
}

function onDocumentPointerDown(event: MouseEvent) {
  const root = rootRef.value
  if (!root || root.contains(event.target as Node)) return
  close()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <div
    ref="rootRef"
    class="admin-filter-select"
    :class="{ 'admin-filter-select--active': isActive, 'admin-filter-select--open': open }"
  >
    <span class="admin-filter-select__label">{{ label }}</span>
    <button
      type="button"
      class="admin-filter-select__trigger"
      :aria-label="ariaLabel || label"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggleOpen"
    >
      <span class="admin-filter-select__value">{{ selectedLabel }}</span>
      <span class="admin-filter-select__chevron" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    </button>

    <div v-if="open" class="admin-filter-select__menu" role="listbox" :aria-label="ariaLabel || label">
      <button
        v-for="item in options"
        :key="item.value || '__all__'"
        type="button"
        role="option"
        class="admin-filter-select__option"
        :class="{ 'admin-filter-select__option--selected': item.value === modelValue }"
        :aria-selected="item.value === modelValue"
        @click="selectValue(item.value)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.admin-filter-select {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.admin-filter-select__label {
  padding-left: 0.1rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.2;
  color: #6b7280;
}

.admin-filter-select--active .admin-filter-select__label {
  color: #1d4ed8;
}

.admin-filter-select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  min-height: 2.5rem;
  padding: 0.45rem 0.65rem 0.45rem 0.7rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  font: inherit;
  font-size: 0.875rem;
  line-height: 1.35;
  color: #111827;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.admin-filter-select--active .admin-filter-select__trigger {
  border-color: #bfdbfe;
  background: #f8fbff;
}

.admin-filter-select--open .admin-filter-select__trigger,
.admin-filter-select__trigger:hover {
  border-color: #cbd5e1;
  background: #fff;
}

.admin-filter-select--open.admin-filter-select--active .admin-filter-select__trigger {
  border-color: #93c5fd;
  background: #fff;
}

.admin-filter-select__trigger:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 1px;
}

.admin-filter-select__value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-filter-select__chevron {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  transition:
    color 0.15s ease,
    transform 0.15s ease;
}

.admin-filter-select--open .admin-filter-select__chevron {
  color: #2f6feb;
  transform: rotate(180deg);
}

.admin-filter-select--active .admin-filter-select__chevron {
  color: #2f6feb;
}

.admin-filter-select__menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  right: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.35rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
}

.admin-filter-select__option {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 2rem;
  padding: 0.4rem 0.55rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  font-size: 0.875rem;
  line-height: 1.35;
  color: #374151;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}

.admin-filter-select__option:hover {
  background: #f3f4f6;
  color: #111827;
}

.admin-filter-select__option--selected {
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}

.admin-filter-select__option:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: -1px;
}
</style>
