<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  getLobbyOverlayDesigns,
  listMyLobbies,
  setLobbyOverlayDesign,
  type LobbyOverlayDesignOption,
} from '@/api/lobbies'
import { normalizeOverlayDesignCode } from '@/utils/overlayPersistentMessage'

type DashboardLobbyEntry = {
  id: string
  name: string
}

const savedLobbies = ref<DashboardLobbyEntry[]>([])
const selectedLobbyId = ref('')
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const saveMessage = ref<string | null>(null)
const AUTH_REQUIRED_TEXT = 'Авторизуйтесь или зарегистрируйтесь.'

const designs = ref<LobbyOverlayDesignOption[]>([])
const selectedDesign = ref('')
const initialSelectedDesign = ref('')

const canSave = computed(() => {
  if (!selectedLobbyId.value) return false
  if (!selectedDesign.value) return false
  if (saving.value) return false
  return true
})

const isAuthRequiredError = computed(() => (error.value ?? '').trim() === AUTH_REQUIRED_TEXT)

function subscriptionLabel(raw: string): string {
  const s = raw.trim().toLowerCase()
  if (s === 'free') return 'Бесплатно'
  if (s === 'premium') return 'Premium'
  if (s === 'standard') return 'Standard'
  return raw
}

function designPreviewVariant(rawCode: string): 'classic' | 'masters-yug25' | 'plus' {
  const code = normalizeOverlayDesignCode(rawCode)
  if (code === 'masters-yug25') return 'masters-yug25'
  if (code === 'plus') return 'plus'
  return 'classic'
}

function designMockPrice(rawCode: string): string {
  const variant = designPreviewVariant(rawCode)
  if (variant === 'plus') return '499 RUB'
  if (variant === 'masters-yug25') return '799 RUB'
  return '299 RUB'
}

function lobbyTitle(id: string, names: Array<string | null | undefined>): string {
  const found = names.find((x) => typeof x === 'string' && x.trim())
  if (typeof found === 'string') return found.trim()
  return `Лобби ${id.slice(0, 8)}`
}

async function loadLobbies() {
  try {
    const list = await listMyLobbies()
    savedLobbies.value = list.map((lobby) => ({
      id: lobby.id,
      name: lobbyTitle(lobby.id, [
        (lobby as { name?: string | null }).name,
        (lobby as { lobby_name?: string | null }).lobby_name,
        (lobby as { title?: string | null }).title,
        (lobby as { lobby_title?: string | null }).lobby_title,
      ]),
    }))
  } catch {
    savedLobbies.value = []
  }

  if (!savedLobbies.value.length) {
    selectedLobbyId.value = ''
    return
  }
  const exists = savedLobbies.value.some((x) => x.id === selectedLobbyId.value)
  if (!exists) selectedLobbyId.value = savedLobbies.value[0].id
}

async function loadDesignsForLobby() {
  if (!selectedLobbyId.value) {
    designs.value = []
    selectedDesign.value = ''
    initialSelectedDesign.value = ''
    return
  }
  loading.value = true
  error.value = null
  saveMessage.value = null
  try {
    const data = await getLobbyOverlayDesigns(selectedLobbyId.value)
    designs.value = data.options ?? []
    selectedDesign.value = data.selected_overlay_design ?? ''
    initialSelectedDesign.value = data.selected_overlay_design ?? ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    designs.value = []
    selectedDesign.value = ''
    initialSelectedDesign.value = ''
  } finally {
    loading.value = false
  }
}

async function saveDesign() {
  if (!canSave.value || !selectedLobbyId.value) return
  saving.value = true
  error.value = null
  saveMessage.value = null
  try {
    await setLobbyOverlayDesign(selectedLobbyId.value, { overlay_design: selectedDesign.value })
    initialSelectedDesign.value = selectedDesign.value
    saveMessage.value = 'Дизайн сохранён.'
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadLobbies()
  void loadDesignsForLobby()
})

watch(selectedLobbyId, () => {
  void loadDesignsForLobby()
})
</script>

<template>
  <section class="card-design">
    <article class="card-design__panel">
      <p v-if="loading" class="card-design__status">Загружаем доступные дизайны…</p>
      <div v-else-if="error" class="card-design__status card-design__status--error" role="alert">
        <span>{{ error }}</span>
        <span v-if="isAuthRequiredError" class="card-design__auth-actions">
          <RouterLink class="card-design__auth-link card-design__auth-link--ghost" to="/login">Вход</RouterLink>
          <RouterLink class="card-design__auth-link" to="/register">Регистрация</RouterLink>
        </span>
      </div>

      <div v-else-if="designs.length" class="card-design__list" role="radiogroup" aria-label="Доступные дизайны карточек">
        <label
          v-for="item in designs"
          :key="item.code"
          class="card-design__option"
          :class="{ 'card-design__option--disabled': !item.selectable }"
        >
          <input
            v-model="selectedDesign"
            class="card-design__radio"
            type="radio"
            name="overlay-design"
            :value="item.code"
            :disabled="!item.selectable || saving"
          />
          <span
            class="card-design__preview"
            :class="`card-design__preview--${designPreviewVariant(item.code)}`"
            aria-hidden="true"
          >
            <span class="card-design__preview-photos">
              <span class="card-design__preview-photo-block" />
              <span class="card-design__preview-photo-block" />
              <span class="card-design__preview-photo-block" />
            </span>
          </span>
          <span class="card-design__option-body">
            <span class="card-design__option-headline">
              <span class="card-design__option-title">{{ item.title }}</span>
              <span class="card-design__option-price">{{ designMockPrice(item.code) }}</span>
            </span>
            <span class="card-design__option-meta">
              Подписка: {{ subscriptionLabel(item.required_subscription) }}
              <span class="card-design__sep">•</span>
              Анимации: {{ item.animation_supported ? 'Да' : 'Нет' }}
            </span>
          </span>
        </label>
      </div>

      <p v-else-if="selectedLobbyId" class="card-design__status">Нет доступных дизайнов.</p>

      <footer class="card-design__actions">
        <button type="button" class="card-design__save" :disabled="!canSave" @click="saveDesign">
          {{ saving ? 'Сохраняем…' : 'Сохранить дизайн' }}
        </button>
        <p v-if="saveMessage" class="card-design__ok" role="status">{{ saveMessage }}</p>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.card-design {
  max-width: 940px;
  margin: 0 auto;
  padding: 0.25rem 0 0.75rem;
}

.card-design__panel {
  border: none;
  border-radius: 14px;
  background: #fff;
  padding: 0.95rem;
}

.card-design__status {
  margin: 0.85rem 0 0;
  font-size: 0.875rem;
  color: #4b5563;
}

.card-design__status--error {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.6rem;
  text-align: center;
  color: #b91c1c;
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

.card-design__list {
  margin-top: 0.9rem;
  display: grid;
  grid-template-columns: repeat(3, 280px);
  grid-auto-rows: 1fr;
  justify-content: start;
  gap: 0.55rem;
}

.card-design__option {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-content: start;
  justify-items: start;
  align-items: start;
  width: 280px;
  gap: 0.65rem;
  padding: 0.65rem 0.75rem;
  height: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  box-sizing: border-box;
}

.card-design__option:has(.card-design__radio:checked) {
  border-color: #60a5fa;
  background: #eff6ff;
}

.card-design__option--disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.card-design__radio {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.card-design__preview {
  position: relative;
  width: 100%;
  max-width: none;
  height: 156px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  overflow: hidden;
  background: #0b1220;
}

.card-design__preview-photos {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  height: 100%;
  padding: 0.55rem;
  box-sizing: border-box;
}

.card-design__preview-photo-block {
  width: 100%;
  height: 100%;
  min-height: 5.8rem;
  border-radius: 6px;
  border: 1px dashed rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.08);
}

.card-design__preview--classic {
  background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
}

.card-design__preview--masters-yug25 {
  background: linear-gradient(180deg, #141414 0%, #0a0a0a 100%);
}

.card-design__preview--plus {
  background: linear-gradient(135deg, #0f172a 0%, #0b1220 42%, #1e293b 100%);
}

.card-design__option-body {
  display: grid;
  gap: 0.2rem;
  width: 100%;
  min-height: 3.4rem;
}

.card-design__option-headline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.card-design__option-title {
  font-size: 1.08rem;
  color: #111827;
  font-weight: 600;
}

.card-design__option-price {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.45rem;
  padding: 0 0.48rem;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #6b7280;
  background: #f9fafb;
}

.card-design__option-meta {
  font-size: 0.8125rem;
  color: #6b7280;
}

.card-design__sep {
  margin: 0 0.25rem;
}

.card-design__actions {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.card-design__save {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #111827;
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}

.card-design__save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.card-design__ok {
  margin: 0;
  font-size: 0.8125rem;
  color: #1d4ed8;
}

@media (max-width: 1024px) {
  .card-design__list {
    grid-template-columns: repeat(2, 280px);
  }

  .card-design__preview {
    width: min(100%, 280px);
    height: 156px;
  }
}
</style>
