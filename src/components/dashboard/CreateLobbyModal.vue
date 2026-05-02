<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { me } from '@/api/auth'
import { addCardToLobby, createLobby, type GameLobby } from '@/api/lobbies'
import { listPlayerCards, type PlayerCard } from '@/api/playerCards'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  created: [payload: { lobby: GameLobby; name: string }]
}>()

const auth = useAuthStore()
const { token } = storeToRefs(auth)

const lobbyName = ref('')
const slots = ref<(PlayerCard | null)[]>(Array.from({ length: 10 }, () => null))
/** Панель «Мои составы» скрыта до первого клика по слоту, затем всегда видна. */
const rosterPanelOpen = ref(false)
const pickForSlot = ref<number | null>(null)
const roster = ref<PlayerCard[]>([])
const rosterSearchQuery = ref('')
const loadError = ref<string | null>(null)
const submitting = ref(false)
const serverError = ref<string | null>(null)
const pickerPanelRef = ref<HTMLElement | null>(null)
const slotsSectionRef = ref<HTMLElement | null>(null)

let escHandler: ((e: KeyboardEvent) => void) | null = null
let prevBodyOverflow = ''

const filteredRoster = computed(() => {
  const q = rosterSearchQuery.value.trim().toLowerCase()
  if (!q) return roster.value
  return roster.value.filter((c) => {
    const hay = `${c.nickname} ${c.first_name} ${c.last_name}`.toLowerCase()
    return hay.includes(q)
  })
})

function slotPhoto(c: PlayerCard): string {
  const u = c.photo_urls?.[0]
  return typeof u === 'string' && u.trim() ? u.trim() : ''
}

function cardFullName(c: PlayerCard): string {
  const parts = [c.first_name?.trim(), c.last_name?.trim()].filter(Boolean)
  return parts.join(' ')
}

function openSlotPicker(i: number) {
  rosterPanelOpen.value = true
  pickForSlot.value = i
}

function clearSlot(i: number) {
  slots.value[i] = null
}

function firstEmptySlotIndex(): number {
  const i = slots.value.findIndex((s) => s === null)
  return i >= 0 ? i : slots.value.length - 1
}

function assignToSlot(slotIndex: number, card: PlayerCard) {
  slots.value[slotIndex] = card
  pickForSlot.value = firstEmptySlotIndex()
}

async function confirmPick(card: PlayerCard) {
  const i = pickForSlot.value
  if (i === null) return
  assignToSlot(i, card)
  await nextTick()
  slotsSectionRef.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

async function loadRoster() {
  if (!token.value) {
    roster.value = []
    return
  }
  loadError.value = null
  try {
    const u = await me()
    roster.value = await listPlayerCards(u.id)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
    roster.value = []
  }
}

function close() {
  if (submitting.value) return
  emit('update:modelValue', false)
}

async function submit() {
  const name = lobbyName.value.trim()
  if (!name) {
    serverError.value = 'Введите название лобби'
    return
  }
  if (!token.value) return

  submitting.value = true
  serverError.value = null
  try {
    let lobby = await createLobby({ max_players: 10, title: name })
    for (let i = 0; i < 10; i++) {
      const c = slots.value[i]
      if (c) lobby = await addCardToLobby(lobby.id, c.id)
    }
    emit('created', { lobby, name })
    emit('update:modelValue', false)
  } catch (e) {
    serverError.value = e instanceof Error ? e.message : String(e)
  } finally {
    submitting.value = false
  }
}

function teardownOverlay() {
  if (escHandler) {
    document.removeEventListener('keydown', escHandler)
    escHandler = null
  }
  document.body.style.overflow = prevBodyOverflow
  prevBodyOverflow = ''
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      serverError.value = null
      loadError.value = null
      rosterPanelOpen.value = false
      pickForSlot.value = null
      rosterSearchQuery.value = ''
      lobbyName.value = ''
      slots.value = Array.from({ length: 10 }, () => null)
      void loadRoster()
      prevBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !submitting.value) close()
      }
      document.addEventListener('keydown', escHandler)
    } else {
      pickForSlot.value = null
      rosterPanelOpen.value = false
      teardownOverlay()
    }
  },
)

watch(pickForSlot, async (v) => {
  if (v === null) {
    rosterSearchQuery.value = ''
    return
  }
  await nextTick()
  if (!rosterPanelOpen.value) return
  pickerPanelRef.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
})

onUnmounted(() => {
  teardownOverlay()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="app-modal">
      <div v-if="modelValue" class="app-modal create-lobby-modal" role="presentation">
        <div class="app-modal__backdrop" aria-hidden="true" @click.self="close" />
        <div
          class="app-modal__wrap create-lobby-modal__wrap"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-lobby-title"
        >
          <div class="app-modal__panel create-lobby-modal__panel">
            <div class="app-modal__head">
              <h2 id="create-lobby-title" class="app-modal__title">Новое лобби</h2>
              <button
                type="button"
                class="app-modal__close"
                aria-label="Закрыть"
                :disabled="submitting"
                @click="close"
              >
                ×
              </button>
            </div>

            <template v-if="!token">
              <div class="app-modal__body app-modal__body--tight create-lobby-modal__body">
                <p class="create-lobby-modal__hint">
                  Войдите в аккаунт, чтобы создать лобби и выбрать игроков из «Моих составов».
                </p>
                <RouterLink class="create-lobby-modal__link" :to="{ name: 'login' }" @click="close">
                  Вход
                </RouterLink>
              </div>
            </template>

            <template v-else>
              <div
                class="app-modal__body app-modal__body--tight create-lobby-modal__body create-lobby-modal__body--scroll"
              >
                <div class="create-lobby-modal__field">
                  <input
                    v-model="lobbyName"
                    class="create-lobby-modal__input"
                    type="text"
                    name="lobby_name"
                    maxlength="120"
                    placeholder="Введите название лобби"
                    autocomplete="off"
                    aria-label="Введите название лобби"
                    :disabled="submitting"
                  />
                </div>

                <p v-if="loadError" class="create-lobby-modal__banner" role="alert">{{ loadError }}</p>

                <div
                  class="create-lobby-modal__split"
                  :class="{ 'create-lobby-modal__split--with-roster': rosterPanelOpen }"
                >
                  <div ref="slotsSectionRef" class="create-lobby-modal__slots-col">
                    <div class="create-lobby-modal__slots" role="list">
                      <div
                        v-for="i in 10"
                        :key="i - 1"
                        class="create-lobby-modal__slot-wrap"
                        role="listitem"
                      >
                        <button
                          type="button"
                          class="create-lobby-modal__slot"
                          :class="{
                            'create-lobby-modal__slot--filled': slots[i - 1],
                            'create-lobby-modal__slot--pick': pickForSlot === i - 1,
                          }"
                          :disabled="submitting"
                          @click="openSlotPicker(i - 1)"
                        >
                          <template v-if="!slots[i - 1]">
                            <span class="create-lobby-modal__slot-plus" aria-hidden="true">+</span>
                            <span class="create-lobby-modal__slot-placeholder">Добавить игрока</span>
                          </template>
                          <template v-else>
                            <img
                              v-if="slotPhoto(slots[i - 1]!)"
                              class="create-lobby-modal__slot-photo"
                              :src="slotPhoto(slots[i - 1]!)"
                              alt=""
                            />
                            <span
                              v-else
                              class="create-lobby-modal__slot-initials"
                              aria-hidden="true"
                            >
                              {{
                                (slots[i - 1]!.first_name?.[0] || '') + (slots[i - 1]!.last_name?.[0] || '')
                              }}
                            </span>
                            <span class="create-lobby-modal__slot-nick">{{ slots[i - 1]!.nickname }}</span>
                          </template>
                        </button>
                        <button
                          v-if="slots[i - 1]"
                          type="button"
                          class="create-lobby-modal__slot-clear"
                          :disabled="submitting"
                          aria-label="Убрать игрока из слота"
                          @click.stop="clearSlot(i - 1)"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>

                  <div v-if="rosterPanelOpen" ref="pickerPanelRef" class="create-lobby-modal__picker-col">
                    <div class="create-lobby-modal__picker">
                      <div class="create-lobby-modal__picker-head">
                    <p class="create-lobby-modal__picker-title">
                      Выберите игрока из раздела «Мои игроки»
                    </p>
                    <p v-if="!roster.length" class="create-lobby-modal__picker-empty">
                      В «Моих составах» пока нет карточек.
                      <RouterLink :to="{ name: 'profiles' }" class="create-lobby-modal__link" @click="close">
                        Создать профиль
                      </RouterLink>
                    </p>
                    <input
                      v-else
                      v-model="rosterSearchQuery"
                      class="create-lobby-modal__picker-search"
                      type="search"
                      name="roster_search"
                      placeholder="Поиск по нику или имени"
                      autocomplete="off"
                      aria-label="Поиск игрока в моих составах"
                      :disabled="submitting"
                      @keydown.stop
                    />
                      </div>
                      <template v-if="roster.length">
                        <div v-if="filteredRoster.length" class="create-lobby-modal__picker-list">
                      <button
                        v-for="c in filteredRoster"
                        :key="c.id"
                        type="button"
                        class="create-lobby-modal__pick-item"
                        :disabled="submitting"
                        @click="confirmPick(c)"
                      >
                        <img v-if="slotPhoto(c)" class="create-lobby-modal__pick-photo" :src="slotPhoto(c)" alt="" />
                        <span v-else class="create-lobby-modal__pick-initials" aria-hidden="true">
                          {{ (c.first_name?.[0] || '') + (c.last_name?.[0] || '') }}
                        </span>
                        <span class="create-lobby-modal__pick-text">
                          <span class="create-lobby-modal__pick-nickname">{{ c.nickname }}</span>
                          <span v-if="cardFullName(c)" class="create-lobby-modal__pick-realname">{{
                            cardFullName(c)
                          }}</span>
                        </span>
                        </button>
                        </div>
                        <p
                          v-else
                          class="create-lobby-modal__picker-empty create-lobby-modal__picker-empty--below-head"
                        >
                          Никого не найдено. Измените запрос.
                        </p>
                      </template>
                    </div>
                  </div>
                </div>

                <p v-if="serverError" class="create-lobby-modal__banner" role="alert">{{ serverError }}</p>
              </div>

              <div class="create-lobby-modal__footer">
                <button
                  type="button"
                  class="app-modal__btn-secondary"
                  :disabled="submitting"
                  @click="close"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  class="app-modal__btn-primary"
                  :disabled="submitting || !lobbyName.trim()"
                  @click="submit"
                >
                  {{ submitting ? 'Создание…' : 'Создать лобби' }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.create-lobby-modal.app-modal {
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-sizing: border-box;
  min-height: 100dvh;
}

.create-lobby-modal__wrap {
  max-width: min(62rem, calc(100vw - 1.25rem));
  width: 100%;
}

/* Панель не выше окна: запас под padding оверлея и safe-area */
.create-lobby-modal__panel.app-modal__panel {
  max-height: calc(
    100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2.5rem
  );
  min-height: 0;
  overflow: hidden;
}

.create-lobby-modal__body--scroll.app-modal__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.create-lobby-modal__body.app-modal__body {
  padding: 0.65rem;
  gap: 0.75rem;
}

.create-lobby-modal__hint {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.45;
  color: #4b5563;
}

.create-lobby-modal__link {
  display: inline-block;
  margin-top: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #2f6feb;
  text-decoration: none;
}

.create-lobby-modal__link:hover {
  text-decoration: underline;
}

.create-lobby-modal__field {
  display: block;
}

.create-lobby-modal__input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.55rem 0.75rem;
  font: inherit;
  font-size: 0.9375rem;
  color: #111827;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.create-lobby-modal__input:disabled {
  opacity: 0.65;
}

.create-lobby-modal__banner {
  margin: 0;
  padding: 0.55rem 0.65rem;
  font-size: 0.8125rem;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.create-lobby-modal__split {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  min-height: auto;
}

/* До открытия состава — без отдельного скролла; при открытии — см. --with-roster */
.create-lobby-modal__split:not(.create-lobby-modal__split--with-roster) {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

/* Скролл только у списка карточек в «Мои составы»; оверлей и тело модалки без скролла */
.create-lobby-modal__split--with-roster {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  align-items: stretch;
}

.create-lobby-modal__split--with-roster .create-lobby-modal__slots-col {
  flex-shrink: 0;
  overflow: hidden;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-self: stretch;
}

.create-lobby-modal__split--with-roster .create-lobby-modal__picker-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}

.create-lobby-modal__split--with-roster .create-lobby-modal__picker {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 0;
  border-top: none;
}

.create-lobby-modal__split--with-roster .create-lobby-modal__picker-head {
  flex-shrink: 0;
}

.create-lobby-modal__split--with-roster .create-lobby-modal__picker-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  grid-template-columns: 1fr;
}

@media (min-width: 720px) {
  .create-lobby-modal__split--with-roster {
    flex-direction: row;
    align-items: stretch;
    gap: 1rem;
  }

  .create-lobby-modal__split--with-roster .create-lobby-modal__slots-col {
    flex: 2 1 0%;
    min-width: 0;
    width: auto;
    align-self: stretch;
  }

  .create-lobby-modal__split--with-roster .create-lobby-modal__picker-col {
    flex: 1 1 0%;
    min-width: 0;
    max-width: 22rem;
    width: auto;
    align-self: stretch;
    min-height: 0;
    padding-left: 1rem;
    border-left: 1px solid #f3f4f6;
  }

  /* Сетка слотов заполняет высоту колонки — без пустого места снизу, как справа у «Мои составы» */
  .create-lobby-modal__split--with-roster .create-lobby-modal__slots {
    flex: 1 1 auto;
    min-height: 0;
    align-self: stretch;
    grid-template-rows: repeat(5, minmax(5.1rem, 1fr));
  }

  .create-lobby-modal__split--with-roster .create-lobby-modal__slot-wrap {
    display: flex;
    min-height: 0;
  }

  .create-lobby-modal__split--with-roster .create-lobby-modal__slot {
    flex: 1 1 auto;
    align-self: stretch;
    width: 100%;
    min-height: 5.1rem;
    height: auto;
  }
}

@media (max-width: 719px) {
  .create-lobby-modal__split--with-roster .create-lobby-modal__picker-col {
    flex: 1 1 auto;
    min-height: 0;
    border-top: 1px solid #f3f4f6;
    padding-top: 0.5rem;
    margin-top: 0.35rem;
  }
}

.create-lobby-modal__slots {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
}

/* После открытия панели «Мои составы»: 5 рядов по 2 слота, а не 2 ряда по 5 */
.create-lobby-modal__split--with-roster .create-lobby-modal__slots {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 520px) {
  .create-lobby-modal__slots {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.create-lobby-modal__picker-col {
  min-width: 0;
}

.create-lobby-modal__slot-wrap {
  position: relative;
  min-width: 0;
}

.create-lobby-modal__slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 100%;
  min-height: 5.1rem;
  margin: 0;
  padding: 0.45rem 0.4rem;
  font: inherit;
  cursor: pointer;
  color: #6b7280;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 14px;
  box-sizing: border-box;
  transition:
    border-color 0.12s ease,
    background 0.12s ease;
}

.create-lobby-modal__slot:hover:not(:disabled) {
  border-color: #60a5fa;
  background: #eff6ff;
  color: #374151;
}

.create-lobby-modal__slot--filled {
  border-style: solid;
  border-color: #e5e7eb;
  background: #fff;
}

.create-lobby-modal__slot--pick {
  border-style: solid;
  border-width: 2px;
  border-color: #3b82f6;
  box-shadow: none;
  outline: none;
}

.create-lobby-modal__slot:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.create-lobby-modal__slot-plus {
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 1;
  color: #9ca3af;
}

.create-lobby-modal__slot-placeholder {
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
}

.create-lobby-modal__slot-photo,
.create-lobby-modal__slot-initials {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
}

.create-lobby-modal__slot-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  font-size: 0.75rem;
  font-weight: 600;
  color: #4b5563;
}

.create-lobby-modal__slot-nick {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #111827;
  text-align: center;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.create-lobby-modal__slot-clear {
  position: absolute;
  top: -0.2rem;
  right: -0.2rem;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  font-size: 1.15rem;
  line-height: 1;
  color: #6b7280;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.create-lobby-modal__slot-clear:hover:not(:disabled) {
  color: #b91c1c;
  border-color: #fecaca;
}

.create-lobby-modal__picker {
  margin: 0;
  padding: 0.75rem 0 0.5rem;
  border-top: 1px solid #f3f4f6;
  box-sizing: border-box;
}

@media (max-width: 719px) {
  .create-lobby-modal__picker-col .create-lobby-modal__picker {
    padding-top: 0.75rem;
  }
}

.create-lobby-modal__picker-head {
  position: sticky;
  top: 0;
  z-index: 2;
  margin: 0 0 0.45rem;
  padding-bottom: 0.45rem;
  background: #fff;
  border-bottom: 1px solid #f3f4f6;
}

.create-lobby-modal__picker-title {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
  line-height: 1.35;
}

.create-lobby-modal__picker-head .create-lobby-modal__picker-title:last-child {
  margin-bottom: 0;
}

.create-lobby-modal__picker-search {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 0.55rem;
  padding: 0.5rem 0.65rem;
  font: inherit;
  font-size: 0.875rem;
  color: #111827;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.create-lobby-modal__picker-search:disabled {
  opacity: 0.65;
}

.create-lobby-modal__picker-search::placeholder {
  color: #9ca3af;
}

.create-lobby-modal__picker-empty {
  margin: 0;
  font-size: 0.8125rem;
  color: #6b7280;
  line-height: 1.45;
}

.create-lobby-modal__picker-empty--below-head {
  margin-top: 0.35rem;
}

.create-lobby-modal__picker-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

@media (max-width: 380px) {
  .create-lobby-modal__picker-list {
    grid-template-columns: 1fr;
  }
}

.create-lobby-modal__pick-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  width: 100%;
  margin: 0;
  padding: 0.55rem 0.6rem;
  font: inherit;
  font-size: 0.875rem;
  text-align: left;
  color: #374151;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  box-sizing: border-box;
}

.create-lobby-modal__pick-item:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #93c5fd;
}

.create-lobby-modal__pick-photo,
.create-lobby-modal__pick-initials {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
}

.create-lobby-modal__pick-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  font-size: 0.75rem;
  font-weight: 600;
  color: #4b5563;
}

.create-lobby-modal__pick-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  min-width: 0;
}

.create-lobby-modal__pick-nickname {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.create-lobby-modal__pick-realname {
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: #6b7280;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  width: 100%;
}

.create-lobby-modal__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-top: 0;
  padding: 0.65rem;
  border-top: 1px solid #f3f4f6;
  background: #fff;
}
</style>
