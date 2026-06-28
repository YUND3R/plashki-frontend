<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { getLobbyImportedParticipants } from '@/api/lobbies'

const props = defineProps<{
  modelValue: boolean
  /** UUID лобби */
  lobbyId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const lines = ref<string[]>([])
const searchQuery = ref('')

const filteredLines = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const list = lines.value
  if (!q) return list
  return list.filter((line) => line.toLowerCase().includes(q))
})

const totalLabel = computed(() => {
  const n = lines.value.length
  const m = n % 100
  const m10 = n % 10
  let w = 'участников'
  if (m10 === 1 && m !== 11) w = 'участник'
  else if (m10 >= 2 && m10 <= 4 && (m < 12 || m > 14)) w = 'участника'
  return `${n} ${w}`
})

async function fetchList() {
  const id = props.lobbyId.trim()
  if (!id) return
  loading.value = true
  error.value = null
  lines.value = []
  searchQuery.value = ''
  try {
    lines.value = await getLobbyImportedParticipants(id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, props.lobbyId] as const,
  ([open]) => {
    if (!open) {
      searchQuery.value = ''
      return
    }
    void fetchList()
  },
)

function onEscapeWindow(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !props.modelValue) return
  e.preventDefault()
  close()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) window.addEventListener('keydown', onEscapeWindow)
    else window.removeEventListener('keydown', onEscapeWindow)
  },
)

onUnmounted(() => window.removeEventListener('keydown', onEscapeWindow))

function close() {
  emit('update:modelValue', false)
  error.value = null
}

function onOverlayPointerDown(e: PointerEvent) {
  if (e.target === e.currentTarget) close()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="imported-pmodal" role="dialog" aria-modal="true" aria-label="Участники турнира из GoMafia">
      <div class="imported-pmodal__overlay" @pointerdown="onOverlayPointerDown" />
      <div class="imported-pmodal__card">
        <div class="imported-pmodal__head">
          <h3 class="imported-pmodal__title">Все участники турнира (GoMafia)</h3>
          <button type="button" class="imported-pmodal__close" aria-label="Закрыть" title="Закрыть" @click="close">
            ×
          </button>
        </div>

        <div class="imported-pmodal__body">
          <p v-if="loading" class="imported-pmodal__status">Загрузка…</p>
          <p v-else-if="error" class="imported-pmodal__status imported-pmodal__status--error" role="alert">
            {{ error }}
          </p>
          <p v-else-if="!lines.length" class="imported-pmodal__status">Список пуст.</p>
          <div v-else class="imported-pmodal__panel">
            <div class="imported-pmodal__tools">
              <input
                v-model="searchQuery"
                type="search"
                class="imported-pmodal__search"
                placeholder="Поиск по списку…"
                aria-label="Поиск по списку участников"
                autocomplete="off"
              />
              <p class="imported-pmodal__total">Всего: {{ totalLabel }}</p>
              <p
                v-if="!filteredLines.length"
                class="imported-pmodal__status imported-pmodal__empty-filter"
              >
                Ничего не найдено.
              </p>
            </div>
            <ul v-if="filteredLines.length" class="imported-pmodal__list" role="list">
              <li
                v-for="(line, idx) in filteredLines"
                :key="`${idx}-${line}`"
                class="imported-pmodal__item"
              >
                {{ line }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.imported-pmodal {
  position: fixed;
  inset: 0;
  z-index: 340;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  pointer-events: none;
}

.imported-pmodal__overlay {
  position: absolute;
  inset: 0;
  background: rgba(17, 24, 39, 0.5);
  pointer-events: auto;
}

.imported-pmodal__card {
  position: relative;
  z-index: 1;
  width: min(480px, 100%);
  height: min(72vh, 620px);
  max-height: min(72vh, 620px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 0.95rem;
  box-sizing: border-box;
  pointer-events: auto;
}

.imported-pmodal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-shrink: 0;
}

.imported-pmodal__title {
  margin: 0;
  font-size: 1rem;
  color: #111827;
}

.imported-pmodal__close {
  border: 1px solid #e5e7eb;
  background: transparent;
  color: #6b7280;
  border-radius: 8px;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  font: inherit;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.imported-pmodal__close:hover {
  color: #111827;
  background: #f3f4f6;
}

.imported-pmodal__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.imported-pmodal__status {
  margin: 0.85rem 0 0;
  font-size: 0.875rem;
  color: #4b5563;
}

.imported-pmodal__status--error {
  color: #b91c1c;
}

.imported-pmodal__empty-filter {
  margin-top: 0.45rem;
  margin-bottom: 0;
}

.imported-pmodal__panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.imported-pmodal__tools {
  flex: 0 0 auto;
}

.imported-pmodal__search {
  display: block;
  width: 100%;
  margin-top: 0.85rem;
  padding: 0.65rem 0.75rem;
  font: inherit;
  font-size: 0.9375rem;
  color: #111827;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-sizing: border-box;
}

.imported-pmodal__search:focus {
  outline: 2px solid #93c5fd;
  outline-offset: 1px;
}

.imported-pmodal__search::placeholder {
  color: #9ca3af;
}

.imported-pmodal__total {
  margin: 0.55rem 0 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #374151;
}

.imported-pmodal__list {
  flex: 1 1 auto;
  min-height: 0;
  margin: 0.65rem 0 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  font-size: 1rem;
  line-height: 1.5;
  color: #111827;
}

.imported-pmodal__item {
  margin: 0;
  padding: 0.7rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.imported-pmodal__item:last-child {
  border-bottom: none;
}
</style>
