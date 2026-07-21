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
const slotsStripRef = ref<HTMLElement | null>(null)
const slotButtonRefs = ref<Array<HTMLElement | null>>([])
const slotsStripPanning = ref(false)

let escHandler: ((e: KeyboardEvent) => void) | null = null
let prevBodyOverflow = ''
let slotAutoScrollRaf: number | null = null
let slotsStripPointerDown = false
let slotsStripStartClientX = 0
let slotsStripStartScrollLeft = 0
let slotsStripMoved = false
let slotsStripSuppressClickUntil = 0

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
  if (Date.now() < slotsStripSuppressClickUntil) return
  rosterPanelOpen.value = true
  pickForSlot.value = i
  void nextTick(() => scheduleEnsureActiveSlotVisible())
}

function clearSlot(i: number) {
  slots.value[i] = null
  pickForSlot.value = i
}

/** Следующий слот для выбора: сначала следующий по номеру, без прыжка к началу. */
function nextPickSlotIndex(afterIndex: number): number {
  for (let j = afterIndex + 1; j < slots.value.length; j++) {
    if (slots.value[j] === null) return j
  }
  for (let j = 0; j < afterIndex; j++) {
    if (slots.value[j] === null) return j
  }
  return afterIndex
}

function assignToSlot(slotIndex: number, card: PlayerCard) {
  slots.value[slotIndex] = card
  pickForSlot.value = nextPickSlotIndex(slotIndex)
}

function setSlotButtonRef(index: number, el: Element | null) {
  slotButtonRefs.value[index] = el instanceof HTMLElement ? el : null
}

function ensureActiveSlotVisible() {
  const index = pickForSlot.value
  if (index === null) return
  const btn = slotButtonRefs.value[index]
  const strip = slotsStripRef.value
  if (!btn || !strip) return
  const stripRect = strip.getBoundingClientRect()
  const btnRect = btn.getBoundingClientRect()
  const pad = 8
  if (btnRect.left >= stripRect.left + pad && btnRect.right <= stripRect.right - pad) return
  if (btnRect.left < stripRect.left) {
    strip.scrollLeft += btnRect.left - stripRect.left - pad
  } else if (btnRect.right > stripRect.right) {
    strip.scrollLeft += btnRect.right - stripRect.right + pad
  }
}

function scheduleEnsureActiveSlotVisible() {
  if (slotAutoScrollRaf !== null) {
    cancelAnimationFrame(slotAutoScrollRaf)
    slotAutoScrollRaf = null
  }
  slotAutoScrollRaf = requestAnimationFrame(() => {
    slotAutoScrollRaf = null
    ensureActiveSlotVisible()
  })
}

function teardownSlotAutoScroll() {
  if (slotAutoScrollRaf !== null) {
    cancelAnimationFrame(slotAutoScrollRaf)
    slotAutoScrollRaf = null
  }
}

function isSlotStripInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return !!target.closest('.create-lobby-modal__slot-clear')
}

function onSlotsStripPointerDown(ev: PointerEvent) {
  if (ev.pointerType === 'mouse' && ev.button !== 0) return
  if (isSlotStripInteractiveTarget(ev.target)) return
  const strip = slotsStripRef.value
  if (!strip) return
  slotsStripPointerDown = true
  slotsStripMoved = false
  slotsStripPanning.value = false
  slotsStripStartClientX = ev.clientX
  slotsStripStartScrollLeft = strip.scrollLeft
}

function onSlotsStripPointerMove(ev: PointerEvent) {
  if (!slotsStripPointerDown) return
  const strip = slotsStripRef.value
  if (!strip) return
  const deltaX = ev.clientX - slotsStripStartClientX
  if (!slotsStripMoved && Math.abs(deltaX) > 6) {
    slotsStripMoved = true
    slotsStripPanning.value = true
    strip.setPointerCapture(ev.pointerId)
  }
  if (!slotsStripMoved) return
  strip.scrollLeft = slotsStripStartScrollLeft - deltaX
  ev.preventDefault()
}

function stopSlotsStripPointerDrag(ev?: PointerEvent) {
  const strip = slotsStripRef.value
  if (strip && ev && strip.hasPointerCapture(ev.pointerId)) {
    strip.releasePointerCapture(ev.pointerId)
  }
  if (slotsStripPointerDown && slotsStripMoved) {
    slotsStripSuppressClickUntil = Date.now() + 180
  }
  slotsStripPointerDown = false
  slotsStripMoved = false
  slotsStripPanning.value = false
}

async function confirmPick(card: PlayerCard) {
  const i = pickForSlot.value
  if (i === null) return
  assignToSlot(i, card)
  await nextTick()
  scheduleEnsureActiveSlotVisible()
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
      rosterPanelOpen.value = true
      pickForSlot.value = 0
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
      pickForSlot.value = 0
      rosterPanelOpen.value = true
      teardownOverlay()
    }
  },
)

watch(pickForSlot, (v) => {
  if (v === null) rosterSearchQuery.value = ''
})

onUnmounted(() => {
  stopSlotsStripPointerDrag()
  teardownSlotAutoScroll()
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
          <div
            class="app-modal__panel create-lobby-modal__panel"
            :class="{ 'create-lobby-modal__panel--workspace': !!token }"
          >
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
                  Войдите в аккаунт, чтобы создать лобби и выбрать игроков из раздела «Мои игроки».
                </p>
                <div class="create-lobby-modal__auth-actions">
                  <RouterLink class="create-lobby-modal__auth-btn create-lobby-modal__auth-btn--primary" :to="{ name: 'login' }" @click="close">
                    Вход
                  </RouterLink>
                  <RouterLink class="create-lobby-modal__auth-btn create-lobby-modal__auth-btn--outline" :to="{ name: 'register' }" @click="close">
                    Регистрация
                  </RouterLink>
                </div>
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
                >
                  <div class="create-lobby-modal__slots-col">
                    <div
                      ref="slotsStripRef"
                      class="create-lobby-modal__slots"
                      :class="{ 'create-lobby-modal__slots--dragging': slotsStripPanning }"
                      role="list"
                      @pointerdown="onSlotsStripPointerDown"
                      @pointermove="onSlotsStripPointerMove"
                      @pointerup="stopSlotsStripPointerDrag"
                      @pointercancel="stopSlotsStripPointerDrag"
                      @lostpointercapture="stopSlotsStripPointerDrag"
                    >
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
                          :ref="(el) => setSlotButtonRef(i - 1, el as Element | null)"
                          :disabled="submitting"
                          @click="openSlotPicker(i - 1)"
                        >
                          <template v-if="slots[i - 1]">
                            <img
                              v-if="slotPhoto(slots[i - 1]!)"
                              class="create-lobby-modal__slot-photo"
                              :src="slotPhoto(slots[i - 1]!)"
                              alt=""
                            />
                            <span v-else class="create-lobby-modal__slot-initials" aria-hidden="true">
                              {{ (slots[i - 1]!.first_name?.[0] || '') + (slots[i - 1]!.last_name?.[0] || '') }}
                            </span>
                            <span class="create-lobby-modal__slot-nick">{{ slots[i - 1]!.nickname }}</span>
                          </template>
                          <template v-else>
                            <span class="create-lobby-modal__slot-number">{{ i }}</span>
                            <span class="create-lobby-modal__slot-state">Пусто</span>
                          </template>
                        </button>
                        <button
                          v-if="slots[i - 1]"
                          type="button"
                          class="create-lobby-modal__slot-clear"
                          :disabled="submitting"
                          aria-label="Убрать игрока из слота"
                          @pointerdown.stop
                          @click.stop="clearSlot(i - 1)"
                        >
                          Убрать
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="create-lobby-modal__picker-col">
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

.create-lobby-modal__panel--workspace.app-modal__panel {
  height: min(52rem, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2.5rem));
  min-height: min(52rem, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2.5rem));
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

.create-lobby-modal__auth-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0.55rem;
  margin-top: 0.75rem;
}

.create-lobby-modal__auth-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 7.25rem;
  padding: 0.48rem 0.95rem;
  border-radius: 8px;
  border: 1px solid transparent;
  box-sizing: border-box;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
}

.create-lobby-modal__auth-btn--primary {
  color: #ffffff;
  background: #2f6feb;
  border-color: #2f6feb;
}

.create-lobby-modal__auth-btn--primary:hover {
  background: #2563d4;
  border-color: #2563d4;
}

.create-lobby-modal__auth-btn--outline {
  color: #2f6feb;
  background: #ffffff;
  border-color: #d1d5db;
}

.create-lobby-modal__auth-btn--outline:hover {
  background: #f9fafb;
  border-color: #9ca3af;
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
  gap: 0.65rem;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.create-lobby-modal__slots {
  --slot-gap: 0.55rem;
  --slot-w: 7rem;
  --slot-h: 8.5rem;
  display: flex;
  gap: var(--slot-gap);
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.15rem 0.05rem 0.25rem;
  scroll-snap-type: x proximity;
  scroll-behavior: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  touch-action: pan-x pinch-zoom;
  cursor: grab;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.create-lobby-modal__slots--dragging {
  cursor: grabbing;
  scroll-snap-type: none;
}

.create-lobby-modal__slots--dragging .create-lobby-modal__slot {
  pointer-events: none;
}

.create-lobby-modal__slots::-webkit-scrollbar {
  display: none;
}

.create-lobby-modal__picker-col {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}

.create-lobby-modal__slot-wrap {
  position: relative;
  flex: 0 0 auto;
  width: var(--slot-w);
  min-width: var(--slot-w);
  min-height: var(--slot-h);
}

.create-lobby-modal__slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  width: var(--slot-w);
  height: var(--slot-h);
  margin: 0;
  padding: 0.3rem;
  font: inherit;
  cursor: pointer;
  color: #6b7280;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 14px;
  scroll-snap-align: start;
  box-sizing: border-box;
  -webkit-user-select: none;
  user-select: none;
  touch-action: pan-x pinch-zoom;
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
  outline: none;
}

.create-lobby-modal__slot:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.create-lobby-modal__slot-number {
  font-size: 1.35rem;
  font-weight: 700;
  color: #111827;
  line-height: 1;
}

.create-lobby-modal__slot-state {
  font-size: 0.6875rem;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
  color: #6b7280;
}

.create-lobby-modal__slot-photo,
.create-lobby-modal__slot-initials {
  width: 3.35rem;
  height: 3.35rem;
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
  max-width: 100%;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #111827;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

.create-lobby-modal__slot--filled .create-lobby-modal__slot-photo,
.create-lobby-modal__slot--filled .create-lobby-modal__slot-initials,
.create-lobby-modal__slot--filled .create-lobby-modal__slot-nick {
  transform: translateY(-8px);
}

.create-lobby-modal__slot-clear {
  position: absolute;
  z-index: 2;
  left: 0.45rem;
  right: 0.45rem;
  bottom: 0.45rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: 1.75rem;
  padding: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1;
  color: #64748b;
  background: rgba(248, 250, 252, 0.92);
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.14s ease, border-color 0.14s ease, background-color 0.14s ease;
  touch-action: manipulation;
}

.create-lobby-modal__slot-clear:hover:not(:disabled) {
  color: #b91c1c;
  border-color: #fca5a5;
  background: #fff5f5;
}

.create-lobby-modal__slot-clear:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.create-lobby-modal__picker {
  margin: 0;
  padding: 0.65rem 0 0.4rem;
  border-top: 1px solid #f3f4f6;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;
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
  overflow-y: auto;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
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

@media (max-width: 767px) {
  .create-lobby-modal__wrap {
    width: 100vw;
    max-width: 100vw;
  }

  .create-lobby-modal__panel.app-modal__panel {
    width: 100%;
    border-left: none;
    border-right: none;
    border-bottom: none;
  }

  .create-lobby-modal__panel--workspace.app-modal__panel {
    height: min(94dvh, 52rem);
    min-height: min(94dvh, 52rem);
  }
}
</style>
