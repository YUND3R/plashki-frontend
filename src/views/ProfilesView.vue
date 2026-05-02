<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { me } from '@/api/auth'
import { deletePlayerCard, listPlayerCards, type PlayerCard } from '@/api/playerCards'
import PlayerCardCreateModal from '@/components/account/PlayerCardCreateModal.vue'
import PlayerCardInfoModal from '@/components/account/PlayerCardInfoModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useProfilesUiStore } from '@/stores/profilesUi'

const { token } = storeToRefs(useAuthStore())
const profilesUi = useProfilesUiStore()
const { searchQuery } = storeToRefs(profilesUi)

const cards = ref<PlayerCard[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const selectedId = ref<string | null>(null)
const menuOpenId = ref<string | null>(null)
const cardModalOpen = ref(false)
const cardModalEditTarget = ref<PlayerCard | null>(null)
const infoModalOpen = ref(false)
const infoCardId = ref<string | null>(null)
const deleteConfirmCard = ref<PlayerCard | null>(null)
const deleteLoading = ref(false)
const deleteButtonReady = ref(false)
const deleteCountdown = ref(0)
let deleteReadyInterval: ReturnType<typeof setInterval> | null = null

watch(cardModalOpen, (open) => {
  if (!open) cardModalEditTarget.value = null
})

watch(infoModalOpen, (open) => {
  if (!open) infoCardId.value = null
})

watch(deleteConfirmCard, (c, _, onCleanup) => {
  if (deleteReadyInterval) {
    clearInterval(deleteReadyInterval)
    deleteReadyInterval = null
  }
  if (!c) {
    deleteButtonReady.value = false
    deleteCountdown.value = 0
    return
  }

  deleteButtonReady.value = false
  deleteCountdown.value = 3
  deleteReadyInterval = setInterval(() => {
    deleteCountdown.value -= 1
    if (deleteCountdown.value <= 0) {
      if (deleteReadyInterval) {
        clearInterval(deleteReadyInterval)
        deleteReadyInterval = null
      }
      deleteCountdown.value = 0
      deleteButtonReady.value = true
    }
  }, 1000)

  const prevOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  const onEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !deleteLoading.value) cancelDelete()
  }
  document.addEventListener('keydown', onEsc)

  onCleanup(() => {
    document.removeEventListener('keydown', onEsc)
    document.body.style.overflow = prevOverflow
    if (deleteReadyInterval) {
      clearInterval(deleteReadyInterval)
      deleteReadyInterval = null
    }
    deleteButtonReady.value = false
    deleteCountdown.value = 0
  })
})

function openDeleteConfirm(c: PlayerCard) {
  menuOpenId.value = null
  deleteConfirmCard.value = c
}

function cancelDelete() {
  if (deleteLoading.value) return
  deleteConfirmCard.value = null
}

async function confirmDelete() {
  const c = deleteConfirmCard.value
  if (!c || deleteLoading.value || !deleteButtonReady.value) return
  deleteLoading.value = true
  error.value = null
  try {
    const u = await me()
    await deletePlayerCard(u.id, c.id)
    if (selectedId.value === c.id) selectedId.value = null
    deleteConfirmCard.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    deleteLoading.value = false
  }
}

function openCreateModal() {
  cardModalEditTarget.value = null
  cardModalOpen.value = true
}

function openEditModal(c: PlayerCard) {
  menuOpenId.value = null
  cardModalEditTarget.value = c
  cardModalOpen.value = true
}

function openInfoModal(c: PlayerCard) {
  menuOpenId.value = null
  infoCardId.value = c.id
  infoModalOpen.value = true
}

const filteredCards = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return cards.value
  return cards.value.filter((c) => {
    const hay = `${c.nickname} ${c.first_name} ${c.last_name}`.toLowerCase()
    return hay.includes(q)
  })
})

async function load() {
  if (!token.value) {
    cards.value = []
    selectedId.value = null
    return
  }
  loading.value = true
  error.value = null
  try {
    const u = await me()
    cards.value = await listPlayerCards(u.id)
    if (selectedId.value && !cards.value.some((c) => c.id === selectedId.value)) {
      selectedId.value = cards.value[0]?.id ?? null
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    cards.value = []
  } finally {
    loading.value = false
  }
}

watch(token, load, { immediate: true })

watch(
  () => cards.value.length,
  (n) => {
    profilesUi.playerCardsTotal = n
  },
  { immediate: true },
)

function onCardClick(c: PlayerCard) {
  selectedId.value = c.id
  menuOpenId.value = null
}

function toggleMenu(id: string) {
  menuOpenId.value = menuOpenId.value === id ? null : id
}

function onDocClick() {
  menuOpenId.value = null
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  profilesUi.setOpenCreateHandler(openCreateModal)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  profilesUi.setOpenCreateHandler(null)
  profilesUi.playerCardsTotal = 0
  profilesUi.resetSearch()
  if (deleteReadyInterval) {
    clearInterval(deleteReadyInterval)
    deleteReadyInterval = null
  }
})

function cardPhoto(c: PlayerCard): string {
  const u = c.photo_urls?.[0]
  return typeof u === 'string' && u.trim() ? u.trim() : ''
}

</script>

<template>
  <section class="profiles">
    <PlayerCardCreateModal
      v-model="cardModalOpen"
      :editing-card="cardModalEditTarget"
      @created="load"
    />
    <PlayerCardInfoModal v-model="infoModalOpen" :card-id="infoCardId" @updated="load" />

    <Teleport to="body">
      <Transition name="app-modal">
        <div v-if="deleteConfirmCard" class="app-modal" role="presentation">
          <div
            class="app-modal__backdrop"
            aria-hidden="true"
            @click.self="!deleteLoading && cancelDelete()"
          />
          <div
            class="app-modal__wrap"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="prd-title"
            aria-describedby="prd-desc"
          >
            <div class="app-modal__panel app-modal__panel--alert">
              <h2 id="prd-title" class="app-modal__title">Удалить профиль?</h2>
              <p id="prd-desc" class="app-modal__alert-text">
                <span class="app-modal__embed">{{ deleteConfirmCard.nickname }}</span>
                будет удалён навсегда. Отменить это действие потом будет нельзя.
              </p>
              <div class="app-modal__actions app-modal__actions--end">
                <button
                  type="button"
                  class="app-modal__btn-secondary"
                  :disabled="deleteLoading"
                  @click="cancelDelete"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  class="app-modal__btn-danger"
                  :disabled="deleteLoading || !deleteButtonReady"
                  @click="confirmDelete"
                >
                  {{
                    deleteLoading
                      ? 'Удаление…'
                      : deleteButtonReady
                        ? 'Удалить'
                        : `Удалить (${deleteCountdown})`
                  }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <div v-if="!token" class="profiles__guest">
      <p class="profiles__guest-text">Войдите, чтобы видеть и создавать профили игроков.</p>
      <div class="profiles__guest-actions">
        <RouterLink class="profiles__link profiles__link--primary" :to="{ name: 'login' }">Вход</RouterLink>
        <RouterLink class="profiles__link profiles__link--outline" :to="{ name: 'register' }">
          Регистрация
        </RouterLink>
      </div>
    </div>

    <template v-else>
      <p v-if="loading" class="profiles__status">Загрузка…</p>
      <p v-else-if="error" class="profiles__status profiles__status--error" role="alert">{{ error }}</p>

      <div v-else-if="filteredCards.length" class="profiles__grid">
        <article
          v-for="c in filteredCards"
          :key="c.id"
          class="profiles__card"
          :class="{
            'profiles__card--selected': selectedId === c.id,
            'profiles__card--menu-open': menuOpenId === c.id,
          }"
          @click="onCardClick(c)"
        >
          <div class="profiles__photo">
            <img v-if="cardPhoto(c)" :src="cardPhoto(c)" alt="" class="profiles__photo-img" />
          </div>
          <div class="profiles__card-body">
            <div class="profiles__card-info">
              <span class="profiles__nick">{{ c.nickname }}</span>
              <span class="profiles__full-name">{{ c.first_name }} {{ c.last_name }}</span>
              <template v-if="c.gomafia_url?.trim()">
                <a
                  class="profiles__gomafia-link"
                  :href="c.gomafia_url.trim()"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="c.gomafia_url.trim()"
                  @click.stop
                >
                  {{ c.gomafia_url.trim() }}
                </a>
              </template>
              <span v-else class="profiles__gomafia-muted">Нет аккаунта на GoMafia</span>
            </div>
            <div class="profiles__menu-wrap" @click.stop>
              <button
                type="button"
                class="profiles__menu-trigger"
                aria-label="Меню профиля"
                aria-haspopup="true"
                :aria-expanded="menuOpenId === c.id"
                @click.stop="toggleMenu(c.id)"
              >
                ⋮
              </button>
              <div v-if="menuOpenId === c.id" class="profiles__menu" role="menu">
                <button
                  type="button"
                  class="profiles__menu-item profiles__menu-item--edit"
                  role="menuitem"
                  @click="openInfoModal(c)"
                >
                  Информация о игроке
                </button>
                <button
                  type="button"
                  class="profiles__menu-item profiles__menu-item--edit"
                  role="menuitem"
                  @click="openEditModal(c)"
                >
                  Редактировать
                </button>
                <button
                  type="button"
                  class="profiles__menu-item profiles__menu-item--danger"
                  role="menuitem"
                  @click="openDeleteConfirm(c)"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="profiles__empty-wrap">
        <p class="profiles__empty">Пока нет профилей. Нажмите «Создать профиль».</p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.profiles {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  max-width: none;
  padding: 0 0 1rem;
  box-sizing: border-box;
  overflow: visible;
}

.profiles__guest {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 0;
  text-align: center;
}

.profiles__guest-text {
  margin: 0;
  font-size: 0.9375rem;
  color: #6b7280;
  max-width: 22rem;
  line-height: 1.45;
}

.profiles__guest-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.profiles__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 7.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  border-radius: 8px;
  border: 1px solid transparent;
  box-sizing: border-box;
}

.profiles__link--primary {
  color: #fff;
  background: #2f6feb;
  border-color: #2f6feb;
}

.profiles__link--primary:hover {
  background: #2563d4;
  border-color: #2563d4;
}

.profiles__link--outline {
  color: #2f6feb;
  background: #fff;
  border-color: #d1d5db;
}

.profiles__link--outline:hover {
  background: #f9fafb;
}

.profiles__status {
  margin: 0;
  padding: 0;
  font-size: 0.9375rem;
  color: #6b7280;
}

.profiles__status--error {
  color: #b91c1c;
}

.profiles__empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: min(70vh, 36rem);
  padding: 2rem 1.25rem;
  box-sizing: border-box;
  text-align: center;
}

.profiles__empty {
  margin: 0;
  max-width: 24rem;
  padding: 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: #6b7280;
  text-align: center;
}

.profiles__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15.5rem, 1fr));
  gap: 0.55rem;
  align-items: start;
  overflow: visible;
}

.profiles__card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  background: #fff;
  cursor: pointer;
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: visible;
}

.profiles__card:focus,
.profiles__card:focus-visible {
  outline: none;
}

.profiles__card--selected {
  z-index: 1;
  border-color: #2f6feb;
  box-shadow: 0 0 0 2px #2f6feb;
}

.profiles__card--menu-open {
  z-index: 40;
}

.profiles__photo {
  aspect-ratio: 1;
  width: 100%;
  background: #f3f4f6;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 14px 14px 0 0;
}

.profiles__photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.profiles__card-body {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.45rem;
  padding: 0.8rem 0.7rem 0.85rem 0.85rem;
  min-height: 3.6rem;
  box-sizing: border-box;
}

.profiles__card-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.22rem;
  min-width: 0;
}

.profiles__nick {
  font-size: 1.0625rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.profiles__full-name {
  font-size: 0.8125rem;
  font-weight: 400;
  color: #6b7280;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.profiles__gomafia-muted {
  font-size: 0.75rem;
  font-weight: 400;
  color: #9ca3af;
  line-height: 1.3;
  max-width: 100%;
}

.profiles__gomafia-link {
  display: block;
  max-width: 100%;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.35;
  color: #2f6feb;
  text-decoration: underline;
  text-underline-offset: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profiles__gomafia-link:hover {
  color: #2563d4;
}

.profiles__menu-wrap {
  position: relative;
  flex-shrink: 0;
}

.profiles__menu-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  padding: 0;
  font-size: 1.15rem;
  line-height: 1;
  color: #6b7280;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.profiles__menu-trigger:hover {
  background: #f3f4f6;
  color: #111827;
}

.profiles__menu-trigger:focus,
.profiles__menu-trigger:active {
  outline: none;
}

.profiles__menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.2rem;
  min-width: 7.5rem;
  padding: 0.25rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  z-index: 50;
}

.profiles__menu-item {
  display: block;
  width: 100%;
  padding: 0.45rem 0.6rem;
  font: inherit;
  font-size: 0.8125rem;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.profiles__menu-item--edit {
  color: #374151;
}

.profiles__menu-item--edit:hover {
  background: #f3f4f6;
}

.profiles__menu-item--danger {
  color: #b91c1c;
}

.profiles__menu-item--danger:hover {
  background: #fef2f2;
}

@media (max-width: 1024px) {
  .profiles {
    gap: 1rem;
    padding-bottom: 0.75rem;
  }

  .profiles__grid {
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    gap: 0.45rem;
  }

  .profiles__card-body {
    padding: 0.65rem 0.55rem 0.75rem 0.7rem;
  }

  .profiles__nick {
    font-size: 1rem;
  }
}

@media (max-width: 767px) {
  .profiles__grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  /*
   * Кнопка ⋮ справа карточки: правый край меню = правый край кнопки, раскрытие влево.
   */
  .profiles__menu {
    right: 0;
    left: auto;
    min-width: 11.5rem;
    max-width: min(18rem, calc(100vw - 1rem));
  }
}

</style>
