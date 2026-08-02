<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import deleteRatingIcon from '@/assets/icons/delete.svg?url'
import odapoIcon from '@/assets/icons/odapo.png?url'
import { useRatingsUiStore } from '@/stores/ratingsUi'
import {
  createRating,
  deleteRating,
  listRatings,
  type RatingListItem,
} from '@/api/ratings'
import AppPageError from '@/components/common/AppPageError.vue'

const router = useRouter()
const ratingsUi = useRatingsUiStore()

const ratings = ref<RatingListItem[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)

const createOpen = ref(false)
const createSubmitting = ref(false)
const createError = ref<string | null>(null)
const createName = ref('')
const createDate = ref('')

const deletingId = ref<string | null>(null)

function formatDate(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function participantsWord(n: number): string {
  const m = n % 100
  const m10 = n % 10
  if (m10 === 1 && m !== 11) return 'участник'
  if (m10 >= 2 && m10 <= 4 && (m < 12 || m > 14)) return 'участника'
  return 'участников'
}

async function loadRatings() {
  loading.value = true
  loadError.value = null
  try {
    ratings.value = await listRatings()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Не удалось загрузить рейтинги'
    ratings.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  createOpen.value = true
  createError.value = null
  createName.value = ''
  createDate.value = new Date().toISOString().slice(0, 10)
}

function closeCreate() {
  if (createSubmitting.value) return
  createOpen.value = false
}

async function submitCreate() {
  if (createSubmitting.value) return
  const name = createName.value.trim()
  const eventDate = createDate.value.trim()
  if (!name) return (createError.value = 'Введите название рейтинга')
  if (!eventDate) return (createError.value = 'Выберите дату')

  createSubmitting.value = true
  createError.value = null
  try {
    const row = await createRating({ name, event_date: eventDate, player_card_ids: [] })
    createOpen.value = false
    await router.push({ name: 'rating-detail', params: { ratingId: row.id } })
  } catch (e) {
    createError.value = e instanceof Error ? e.message : 'Не удалось создать рейтинг'
  } finally {
    createSubmitting.value = false
  }
}

async function deleteRatingById(item: RatingListItem) {
  if (deletingId.value) return
  if (!window.confirm(`Удалить рейтинг «${item.name}»?`)) return
  deletingId.value = item.id
  try {
    await deleteRating(item.id)
    await loadRatings()
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Не удалось удалить рейтинг')
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  ratingsUi.setOpenCreateHandler(openCreate)
  void loadRatings()
})

onUnmounted(() => {
  ratingsUi.setOpenCreateHandler(null)
})
</script>

<template>
  <section class="dashboard">
    <div class="dashboard__actions">
      <button
        type="button"
        class="dashboard-lobby-card dashboard-lobby-card--action dashboard-lobby-card--action-create"
        @click="openCreate"
      >
        <span class="dashboard-lobby-card__icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </span>
        <span class="dashboard-lobby-card__text">
          <span class="dashboard-lobby-card__title">Создать турнир</span>
          <span class="dashboard-lobby-card__desc">Новая таблица для турнира или серии игр</span>
        </span>
      </button>

      <button
        type="button"
        class="dashboard-lobby-card dashboard-lobby-card--action dashboard-lobby-card--action-soon"
        disabled
      >
        <span class="dashboard-lobby-card__icon dashboard-lobby-card__icon--odapo" aria-hidden="true">
          <img :src="odapoIcon" alt="" class="dashboard-lobby-card__odapo-icon" width="26" height="26" />
        </span>
        <span class="dashboard-lobby-card__text">
          <span class="dashboard-lobby-card__title">Интеграция с ODAPO</span>
          <span class="dashboard-lobby-card__desc">Синхронизация рейтингов и результатов</span>
        </span>
        <span class="dashboard-lobby-card__soon">Скоро</span>
      </button>
    </div>

    <p v-if="loading" class="dashboard__text">Загружаем турниры…</p>
    <div v-else-if="loadError" class="dashboard__page-error">
      <AppPageError :message="loadError" @retry="loadRatings" />
    </div>

    <div v-else-if="ratings.length" class="dashboard__created">
      <div class="dashboard__created-head">
        <h2 class="dashboard__created-title">Созданные турниры</h2>
      </div>
      <ul class="dashboard__created-list">
        <li v-for="item in ratings" :key="item.id">
          <div class="dashboard-lobby-card dashboard-lobby-card--saved-shell">
            <RouterLink
              :to="{ name: 'rating-detail', params: { ratingId: item.id } }"
              class="dashboard-lobby-card__nav"
            >
              <span class="dashboard-lobby-card__icon dashboard-lobby-card__icon--saved" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M8 21h8"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                  <path
                    d="M12 17v4"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                  <path
                    d="M7 4h10v5a5 5 0 01-10 0V4z"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M7 4H5.5A1.5 1.5 0 003 5.5V6c0 1.933 1.567 3.5 3.5 3.5H7"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                  <path
                    d="M17 4h1.5A1.5 1.5 0 0121 5.5V6c0 1.933-1.567 3.5-3.5 3.5H17"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </span>
              <span class="dashboard-lobby-card__text">
                <span class="dashboard-lobby-card__title">{{ item.name }}</span>
                <span class="dashboard-lobby-card__desc">
                  {{ formatDate(item.event_date) }} · {{ item.participant_count }}
                  {{ participantsWord(item.participant_count) }}
                </span>
              </span>
            </RouterLink>
            <button
              type="button"
              class="dashboard-lobby-card__delete"
              :disabled="deletingId === item.id"
              :aria-label="`Удалить рейтинг ${item.name}`"
              @click.stop="deleteRatingById(item)"
            >
              <img :src="deleteRatingIcon" alt="" class="dashboard-lobby-card__delete-img" width="16" height="20" />
            </button>
          </div>
        </li>
      </ul>
    </div>

    <Teleport to="body">
      <Transition name="app-modal">
        <div v-if="createOpen" class="app-modal" role="presentation">
          <div class="app-modal__backdrop" aria-hidden="true" @click.self="closeCreate" />
          <div class="app-modal__wrap" role="dialog" aria-modal="true" aria-labelledby="rating-create-title">
            <div class="app-modal__panel">
              <div class="app-modal__head">
                <h3 id="rating-create-title" class="app-modal__title">Создать турнир</h3>
                <button type="button" class="app-modal__close" :disabled="createSubmitting" @click="closeCreate">×</button>
              </div>
              <form class="app-modal__body app-modal__body--tight" @submit.prevent="submitCreate">
                <div class="app-modal__form">
                  <label class="app-modal__field">
                    <span class="app-modal__label">Название</span>
                    <input v-model="createName" class="app-modal__input" type="text" maxlength="200" />
                  </label>
                  <label class="app-modal__field">
                    <span class="app-modal__label">Дата</span>
                    <input v-model="createDate" class="app-modal__input" type="date" />
                  </label>
                  <p v-if="createError" class="app-modal__banner" role="alert">{{ createError }}</p>
                </div>
                <div class="app-modal__actions app-modal__actions--end">
                  <button type="button" class="app-modal__btn-secondary" :disabled="createSubmitting" @click="closeCreate">Отмена</button>
                  <button type="submit" class="app-modal__btn-primary" :disabled="createSubmitting">
                    {{ createSubmitting ? 'Создание…' : 'Создать' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped src="@/styles/dashboard-lobby-card.css"></style>
