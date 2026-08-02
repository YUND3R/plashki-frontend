<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listPlayerCards, type PlayerCard } from '@/api/playerCards'
import {
  createRatingGame,
  getRating,
  getRatingTable,
  type Rating,
  type RatingGameResultWrite,
  type RatingGameRole,
  type RatingTableRow,
  type RatingWinnerSide,
} from '@/api/ratings'
import { useRatingsUiStore } from '@/stores/ratingsUi'
import AddGamePlayerSelect, { type AddGamePlayerSelectOption } from '@/components/ratings/AddGamePlayerSelect.vue'
import RatingRolePicker from '@/components/ratings/RatingRolePicker.vue'
import AppPageError from '@/components/common/AppPageError.vue'

type AddGameSeatRow = {
  seat: number
  player_card_id: string
  role: RatingGameRole | null
  bonus_points: string
  total_points: string
}

const route = useRoute()
const router = useRouter()
const ratingsUi = useRatingsUiStore()

const ratingId = computed(() => String(route.params.ratingId ?? ''))
const ratingDetail = ref<Rating | null>(null)
const tableRows = ref<RatingTableRow[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)

const addGameSubmitting = ref(false)
const addGameError = ref<string | null>(null)
const addGameTitle = ref('')
const addGameDate = ref('')
const addGameWinner = ref<RatingWinnerSide>('red')
const addGameRows = ref<AddGameSeatRow[]>([])

const ADD_GAME_SEATS = 10
const PLAYERS_PAGE_LIMIT = 100
const ADD_GAME_REQUIRED_ROLE_COUNTS: Record<RatingGameRole, number> = {
  peaceful: 6,
  mafia: 2,
  don: 1,
  sheriff: 1,
}

const winnerSideOptions: { value: RatingWinnerSide; label: string }[] = [
  { value: 'red', label: 'Мирные' },
  { value: 'black', label: 'Мафия' },
]

const addGameValidationMessage = computed(() => validateAddGameSeats())
const addGameCanSubmit = computed(() => !addGameValidationMessage.value && !addGameSubmitting.value)

function createEmptyRows(): AddGameSeatRow[] {
  return Array.from({ length: ADD_GAME_SEATS }, (_, i) => ({
    seat: i + 1,
    player_card_id: '',
    role: null,
    bonus_points: '0',
    total_points: '0',
  }))
}

function parsePoints(value: string): number | null {
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return null
  const n = Number(normalized)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 10) / 10
}

function scoreTeamPointByWinner(role: RatingGameRole, winnerSide: RatingWinnerSide): number {
  if (winnerSide === 'black') return role === 'mafia' || role === 'don' ? 1 : 0
  return role === 'peaceful' || role === 'sheriff' ? 1 : 0
}

function formatTotal(role: RatingGameRole, bonusRaw: string): string {
  const bonus = parsePoints(bonusRaw) ?? 0
  const team = scoreTeamPointByWinner(role, addGameWinner.value)
  return String(Math.round((team + bonus) * 10) / 10)
}

function syncRowTotal(row: AddGameSeatRow) {
  row.total_points =
    row.player_card_id.trim() && row.role ? formatTotal(row.role, row.bonus_points) : '0'
}

function syncAllTotals() {
  for (const row of addGameRows.value) syncRowTotal(row)
}

function onPlayerChange(row: AddGameSeatRow) {
  if (!row.player_card_id.trim()) {
    row.role = null
    row.bonus_points = '0'
  }
  syncRowTotal(row)
}

function onBonusInput(row: AddGameSeatRow) {
  syncRowTotal(row)
}

function changeBonusByStep(row: AddGameSeatRow, delta: number) {
  const current = parsePoints(row.bonus_points) ?? 0
  const next = Math.min(99.9, Math.max(-99.9, Math.round((current + delta) * 10) / 10))
  row.bonus_points = String(next)
  syncRowTotal(row)
}

function onRoleChange(row: AddGameSeatRow) {
  syncRowTotal(row)
}

function participantPhoto(playerCardId: string): string {
  const tableRow = tableRows.value.find((row) => row.player_card_id === playerCardId)
  return tableRow?.photo_url?.trim() ?? ''
}

function participantInitials(participant: { nickname: string; first_name?: string; last_name?: string }): string {
  const fromName = `${participant.first_name?.[0] || ''}${participant.last_name?.[0] || ''}`.trim()
  if (fromName) return fromName.toUpperCase()
  return (participant.nickname?.[0] || '?').toUpperCase()
}

function playerOptionsForSeat(seatIndex: number): AddGamePlayerSelectOption[] {
  const currentId = addGameRows.value[seatIndex]?.player_card_id ?? ''
  const taken = new Set(
    addGameRows.value
      .map((row, index) => (index === seatIndex ? '' : row.player_card_id.trim()))
      .filter(Boolean),
  )
  const participants = ratingDetail.value?.participants ?? []
  return participants
    .filter((p) => !taken.has(p.player_card_id) || p.player_card_id === currentId)
    .map((p) => ({
      value: p.player_card_id,
      label: p.nickname,
      photoUrl: participantPhoto(p.player_card_id),
      initials: participantInitials(p),
    }))
}

function validateAddGameSeats(): string | null {
  const participants = ratingDetail.value?.participants ?? []
  if (participants.length < ADD_GAME_SEATS) {
    return `В рейтинге должно быть минимум ${ADD_GAME_SEATS} игроков. Сейчас: ${participants.length}.`
  }

  const filled = addGameRows.value.filter((row) => row.player_card_id.trim())
  if (filled.length !== ADD_GAME_SEATS) {
    return `Заполните все ${ADD_GAME_SEATS} мест - выберите игрока в каждой строке.`
  }
  if (new Set(filled.map((row) => row.player_card_id)).size !== filled.length) {
    return 'Один игрок не может занимать два места за столом.'
  }

  const roleCounts: Record<RatingGameRole, number> = { peaceful: 0, mafia: 0, don: 0, sheriff: 0 }
  for (const row of filled) {
    if (row.role) roleCounts[row.role] += 1
  }

  const mismatches: string[] = []
  if (roleCounts.peaceful !== ADD_GAME_REQUIRED_ROLE_COUNTS.peaceful) mismatches.push(`мирных ${roleCounts.peaceful}/${ADD_GAME_REQUIRED_ROLE_COUNTS.peaceful}`)
  if (roleCounts.mafia !== ADD_GAME_REQUIRED_ROLE_COUNTS.mafia) mismatches.push(`мафии ${roleCounts.mafia}/${ADD_GAME_REQUIRED_ROLE_COUNTS.mafia}`)
  if (roleCounts.don !== ADD_GAME_REQUIRED_ROLE_COUNTS.don) mismatches.push(`дона ${roleCounts.don}/${ADD_GAME_REQUIRED_ROLE_COUNTS.don}`)
  if (roleCounts.sheriff !== ADD_GAME_REQUIRED_ROLE_COUNTS.sheriff) mismatches.push(`шерифа ${roleCounts.sheriff}/${ADD_GAME_REQUIRED_ROLE_COUNTS.sheriff}`)
  return mismatches.length ? `Неверный состав ролей: ${mismatches.join(', ')}.` : null
}

async function loadAllOwnerCards(ownerUserId: string): Promise<PlayerCard[]> {
  const all: PlayerCard[] = []
  let offset = 0
  while (true) {
    const chunk = await listPlayerCards(ownerUserId, {
      sort_by: 'nickname',
      sort_order: 'asc',
      limit: PLAYERS_PAGE_LIMIT,
      offset,
    })
    all.push(...chunk)
    if (chunk.length < PLAYERS_PAGE_LIMIT) break
    offset += PLAYERS_PAGE_LIMIT
    if (offset > 5000) break
  }
  return all
}

async function mergeRowPhotos(ownerUserId: string, rows: RatingTableRow[]): Promise<RatingTableRow[]> {
  if (!rows.length || !ownerUserId) return rows
  try {
    const cards = await loadAllOwnerCards(ownerUserId)
    const photoByCardId = new Map(cards.map((card) => [card.id, card.photo_urls?.[0]?.trim() || null] as const))
    return rows.map((row) => ({ ...row, photo_url: photoByCardId.get(row.player_card_id) ?? row.photo_url }))
  } catch {
    return rows
  }
}

async function loadContext() {
  const id = ratingId.value
  if (!id) return
  loading.value = true
  loadError.value = null
  try {
    const [detail, table] = await Promise.all([getRating(id), getRatingTable(id)])
    ratingDetail.value = detail
    tableRows.value = await mergeRowPhotos(detail.owner_user_id, table.rows)
    ratingsUi.setDetailTitle(detail.name)
    ratingsUi.setCanAddGame((detail.participants.length ?? 0) >= ADD_GAME_SEATS)
    addGameRows.value = createEmptyRows()
    addGameTitle.value = ''
    addGameDate.value = new Date().toISOString().slice(0, 10)
    addGameWinner.value = 'red'
    addGameError.value = null
    syncAllTotals()
    if ((detail.participants.length ?? 0) < ADD_GAME_SEATS) {
      addGameError.value = `Для игры нужно ${ADD_GAME_SEATS} игроков в рейтинге. Добавьте участников через «Добавить игроков».`
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Не удалось открыть рейтинг'
    ratingDetail.value = null
    tableRows.value = []
  } finally {
    loading.value = false
  }
}

async function submitAddGame() {
  if (!ratingId.value || addGameSubmitting.value) return
  const validationError = validateAddGameSeats()
  if (validationError) return void (addGameError.value = validationError)
  if (!addGameDate.value.trim()) return void (addGameError.value = 'Выберите дату игры')

  const results: RatingGameResultWrite[] = []
  for (const row of addGameRows.value) {
    const playerCardId = row.player_card_id.trim()
    if (!playerCardId) continue
    const bonus = parsePoints(row.bonus_points)
    const total = parsePoints(row.total_points)
    if (bonus === null || total === null) {
      addGameError.value = `Проверьте баллы у места ${row.seat}`
      return
    }
    if (!row.role) {
      addGameError.value = `Выберите роль для места ${row.seat}`
      return
    }
    results.push({
      player_card_id: playerCardId,
      role: row.role,
      bonus_points: bonus,
      total_points: total,
    })
  }

  addGameSubmitting.value = true
  addGameError.value = null
  try {
    await createRatingGame(ratingId.value, {
      title: addGameTitle.value.trim(),
      played_at: addGameDate.value.trim(),
      winner_side: addGameWinner.value,
      results,
    })
    ratingsUi.bumpDetailRefresh()
    ratingsUi.setDetailTab('games')
    await router.push({ name: 'rating-detail', params: { ratingId: ratingId.value } })
  } catch (e) {
    addGameError.value = e instanceof Error ? e.message : 'Не удалось добавить игру'
  } finally {
    addGameSubmitting.value = false
  }
}

function closePage() {
  if (addGameSubmitting.value) return
  void router.push({ name: 'rating-detail', params: { ratingId: ratingId.value } })
}

watch(addGameWinner, () => {
  syncAllTotals()
})

onMounted(() => {
  void loadContext()
})
</script>

<template>
  <section class="dashboard dashboard--full rating-add-game-page">
    <div v-if="loading" class="rating-add-game-page__status">
      <p class="dashboard__text">Загружаем рейтинг…</p>
    </div>
    <div v-else-if="loadError" class="rating-add-game-page__status">
      <AppPageError compact :message="loadError" @retry="loadContext" />
    </div>
    <div v-else class="rating-add-game-page__panel">
      <div class="rating-add-game-page__split">
        <section class="rating-add-game-page__form-col">
          <div class="rating-add-game-page__form-body">
            <input
              v-model="addGameTitle"
              class="rating-add-game-page__input"
              type="text"
              maxlength="255"
              placeholder="Название игры"
              :disabled="addGameSubmitting"
            />
            <input
              v-model="addGameDate"
              class="rating-add-game-page__input"
              type="date"
              :disabled="addGameSubmitting"
            />
            <p
              v-if="addGameValidationMessage && !addGameError"
              class="rating-add-game-page__hint"
              :class="{ 'rating-add-game-page__hint--warn': !addGameCanSubmit }"
            >
              {{ addGameValidationMessage }}
            </p>
            <p v-if="addGameError" class="app-modal__banner" role="alert">{{ addGameError }}</p>
          </div>
        </section>

        <section class="rating-add-game-page__rows-col">
          <div class="rating-add-game-page__rows">
            <div
              v-for="(row, seatIndex) in addGameRows"
              :key="row.seat"
              class="rating-add-game-page__row"
            >
              <span class="rating-add-game-page__seat">{{ row.seat }}</span>
              <div class="rating-add-game-page__player-select">
                <AddGamePlayerSelect
                  v-model="row.player_card_id"
                  :options="playerOptionsForSeat(seatIndex)"
                  :aria-label="`Игрок на месте ${row.seat}`"
                  :disabled="addGameSubmitting"
                  :placement="seatIndex >= 6 ? 'top' : 'bottom'"
                  @update:model-value="onPlayerChange(row)"
                />
              </div>
              <div class="rating-add-game-page__cell rating-add-game-page__cell--roles">
                <RatingRolePicker
                  v-model="row.role"
                  :disabled="addGameSubmitting || !row.player_card_id"
                  :aria-label="`Роль на месте ${row.seat}`"
                  @update:model-value="onRoleChange(row)"
                />
              </div>
              <div class="rating-add-game-page__cell rating-add-game-page__cell--total">
                <input
                  :value="row.total_points"
                  class="rating-add-game-page__total-input"
                  type="text"
                  readonly
                  tabindex="-1"
                />
              </div>
              <div class="rating-add-game-page__cell--bonus">
                <div class="rating-add-game-page__bonus-stepper">
                  <input
                    v-model="row.bonus_points"
                    class="rating-add-game-page__bonus-input"
                    type="number"
                    inputmode="decimal"
                    min="-99.9"
                    max="99.9"
                    step="0.1"
                    :disabled="addGameSubmitting || !row.player_card_id"
                    @input="onBonusInput(row)"
                  />
                  <div class="rating-add-game-page__bonus-actions">
                    <button
                      type="button"
                      tabindex="-1"
                      aria-label="Увеличить на 0.1"
                      :disabled="addGameSubmitting || !row.player_card_id"
                      @click="changeBonusByStep(row, 0.1)"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      tabindex="-1"
                      aria-label="Уменьшить на 0.1"
                      :disabled="addGameSubmitting || !row.player_card_id"
                      @click="changeBonusByStep(row, -0.1)"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="rating-add-game-page__bottom">
            <p class="rating-add-game-page__note">
              За столом 10 мест: 6 мирных, 2 мафии, 1 дон, 1 шериф. Выберите игрока в каждой строке.
            </p>
            <div class="rating-add-game-page__winner">
              <span class="rating-add-game-page__winner-label">Победитель</span>
              <div class="segmented-filter segmented-filter--inline segmented-filter--compact" role="group" aria-label="Победитель">
                <button
                  v-for="opt in winnerSideOptions"
                  :key="opt.value"
                  type="button"
                  class="segmented-filter__btn"
                  :class="{ 'segmented-filter__btn--active': addGameWinner === opt.value }"
                  :aria-pressed="addGameWinner === opt.value"
                  :disabled="addGameSubmitting"
                  @click="addGameWinner = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer class="rating-add-game-page__footer">
        <button type="button" class="app-modal__btn-secondary" :disabled="addGameSubmitting" @click="closePage">
          Закрыть
        </button>
        <button type="button" class="app-modal__btn-primary" :disabled="!addGameCanSubmit" @click="submitAddGame">
          {{ addGameSubmitting ? 'Сохранение…' : 'Сохранить игру' }}
        </button>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.rating-add-game-page {
  --surface-0: #ffffff;
  --surface-1: #f8fafc;
  --surface-2: #f1f5f9;
  --border: #e2e8f0;
  --text-soft: #64748b;
  --text-main: #0f172a;
  --accent: #2563eb;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--surface-0);
}

.rating-add-game-page__status {
  flex: 1 1 auto;
  display: flex;
  min-height: 0;
  padding: 0;
}

.rating-add-game-page__panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.rating-add-game-page__split {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 17rem) minmax(0, 1fr);
  overflow: hidden;
}

.rating-add-game-page__form-col {
  border-right: 1px solid var(--border);
  background: #fff;
}

.rating-add-game-page__form-body {
  padding: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.rating-add-game-page__input {
  width: 100%;
  min-height: 2.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  font: inherit;
  color: var(--text-main);
  background: #fff;
  box-sizing: border-box;
}

.rating-add-game-page__input:focus,
.rating-add-game-page__input:focus-visible {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}

.rating-add-game-page__hint {
  margin: 0;
  padding: 0.6rem 0.7rem;
  border: 1px solid #e6edf5;
  border-radius: 10px;
  background: #f8fafc;
  color: var(--text-soft);
  font-size: 0.75rem;
  line-height: 1.35;
}

.rating-add-game-page__hint--warn {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.rating-add-game-page__rows-col {
  min-width: 0;
  min-height: 0;
  padding: 0.55rem 0.75rem 0.35rem;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.rating-add-game-page__rows {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rating-add-game-page__row {
  flex: 1 1 0;
  min-height: 2.72rem;
  display: grid;
  grid-template-columns: 1.75rem minmax(16rem, 1fr) 10.2rem 3.4rem 5.25rem;
  gap: 0.55rem;
  align-items: center;
  padding: 0.35rem 0.55rem;
  border-radius: 10px;
  background: var(--surface-1);
  border: 1px solid #edf2f7;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.rating-add-game-page__row:hover {
  border-color: #dbe5f1;
  background: #f6f9fd;
}

.rating-add-game-page__seat {
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.rating-add-game-page__cell {
  min-height: 2rem;
  border: 1px solid #e5eaf1;
  border-radius: 9px;
  background: #fff;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.rating-add-game-page__player-select {
  min-width: 0;
  width: 100%;
}

.rating-add-game-page__player-select :deep(.add-game-player-select__trigger) {
  min-height: 2.25rem;
  border: none;
  border-radius: 0;
  background: transparent;
}

.rating-add-game-page__player-select :deep(.add-game-player-select__trigger:hover:not(:disabled)) {
  background: transparent;
}

.rating-add-game-page__player-select :deep(.add-game-player-select__selected) {
  gap: 0.65rem;
}

.rating-add-game-page__player-select :deep(.add-game-player-select__selected .add-game-player-select__avatar),
.rating-add-game-page__player-select :deep(.add-game-player-select__selected .add-game-player-select__avatar-ph),
.rating-add-game-page__player-select :deep(.add-game-player-select__selected .add-game-player-select__avatar-img) {
  width: 2.15rem;
  height: 2.15rem;
}

.rating-add-game-page__player-select :deep(.add-game-player-select__selected .add-game-player-select__label) {
  font-size: 1rem;
  font-weight: 600;
}

.rating-add-game-page__cell--roles {
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  overflow: visible;
}

.rating-add-game-page__total-input {
  width: 100%;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #334155;
}

.rating-add-game-page__total-input:focus {
  outline: none;
}

.rating-add-game-page__cell--bonus {
  min-width: 0;
}

.rating-add-game-page__bonus-stepper {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1.45rem;
  width: 100%;
  min-height: 2.25rem;
  overflow: hidden;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  box-sizing: border-box;
}

.rating-add-game-page__bonus-stepper:focus-within {
  border-color: #2f6feb;
}

.rating-add-game-page__bonus-input {
  width: 100%;
  min-width: 0;
  min-height: 2rem;
  padding: 0.3rem 0.45rem;
  border: 0;
  border-radius: 6px 0 0 6px;
  background: #fff;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  text-align: center;
  font-variant-numeric: tabular-nums;
  box-sizing: border-box;
  color: #0f172a;
}

.rating-add-game-page__bonus-input:focus {
  outline: none;
}

.rating-add-game-page__bonus-input::-webkit-inner-spin-button,
.rating-add-game-page__bonus-input::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

.rating-add-game-page__bonus-actions {
  display: grid;
  grid-template-rows: 1fr 1fr;
  border-left: 1px solid #e5e7eb;
}

.rating-add-game-page__bonus-actions button {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  color: #64748b;
  background: #f8fafc;
  font: inherit;
  font-size: 0.55rem;
  line-height: 1;
  cursor: pointer;
}

.rating-add-game-page__bonus-actions button + button {
  border-top: 1px solid #e5e7eb;
}

.rating-add-game-page__bonus-actions button:hover:not(:disabled) {
  color: #2f6feb;
  background: #eff6ff;
}

.rating-add-game-page__bonus-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rating-add-game-page__bottom {
  flex: 0 0 auto;
  margin-top: 0.5rem;
  padding: 0.65rem 0.1rem 0.1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-top: 1px solid #edf2f7;
}

.rating-add-game-page__note {
  margin: 0;
  padding: 0.55rem 0.65rem;
  border: 1px solid #fde68a;
  border-radius: 8px;
  background: #fffbeb;
  font-size: 0.78rem;
  line-height: 1.35;
  color: #92400e;
}

.rating-add-game-page__winner {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
}

.rating-add-game-page__winner-label {
  font-size: 0.78rem;
  color: var(--text-soft);
  font-weight: 600;
}

.rating-add-game-page__footer {
  flex: 0 0 auto;
  border-top: 1px solid var(--border);
  padding: 0.65rem 0.75rem;
  background: #fff;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

@media (max-width: 900px) {
  .rating-add-game-page__split {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
    min-height: 0;
  }

  .rating-add-game-page__form-col {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .rating-add-game-page__form-body {
    padding: 0.75rem;
  }

  .rating-add-game-page__rows-col {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    padding: 0.45rem 0.55rem 0;
    display: flex;
    flex-direction: column;
  }

  .rating-add-game-page__rows {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 0.25rem;
  }

  .rating-add-game-page__row {
    flex: 0 0 auto;
    min-height: auto;
    grid-template-columns: 1.35rem minmax(0, 1fr) 2.75rem 4.85rem;
    grid-template-areas:
      'seat player player player'
      'seat roles total bonus';
    gap: 0.35rem 0.4rem;
    row-gap: 0.4rem;
    padding: 0.45rem 0.45rem 0.5rem;
    align-items: center;
  }

  .rating-add-game-page__seat {
    grid-area: seat;
    align-self: start;
    padding-top: 0.45rem;
  }

  .rating-add-game-page__player-select {
    grid-area: player;
    min-width: 0;
    min-height: 2.25rem;
    border: 1px solid #e5eaf1;
    border-radius: 9px;
    background: #fff;
    overflow: hidden;
  }

  .rating-add-game-page__player-select :deep(.add-game-player-select__trigger) {
    min-height: 2.25rem;
  }

  .rating-add-game-page__player-select :deep(.add-game-player-select__selected .add-game-player-select__avatar),
  .rating-add-game-page__player-select :deep(.add-game-player-select__selected .add-game-player-select__avatar-ph),
  .rating-add-game-page__player-select :deep(.add-game-player-select__selected .add-game-player-select__avatar-img) {
    width: 1.75rem;
    height: 1.75rem;
  }

  .rating-add-game-page__player-select :deep(.add-game-player-select__selected .add-game-player-select__label) {
    font-size: 0.875rem;
  }

  .rating-add-game-page__cell--roles {
    grid-area: roles;
    min-width: 0;
    align-self: center;
    justify-content: flex-start;
    overflow: visible;
  }

  .rating-add-game-page__cell--roles :deep(.rating-role-picker) {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.25rem;
    width: 100%;
    max-width: 100%;
  }

  .rating-add-game-page__cell--roles :deep(.rating-role-picker__button) {
    width: 100%;
    height: 2rem;
    min-width: 0;
    min-height: 2rem;
    border-radius: 8px;
  }

  .rating-add-game-page__cell--roles :deep(.rating-role-picker__icon) {
    width: 1.2rem;
    height: 1.2rem;
  }

  .rating-add-game-page__cell--bonus {
    grid-area: bonus;
    align-self: center;
    min-width: 0;
  }

  .rating-add-game-page__cell--total {
    grid-area: total;
    align-self: center;
    min-width: 0;
    min-height: 2.25rem;
    padding: 0 0.2rem;
  }

  .rating-add-game-page__total-input {
    font-size: 0.8125rem;
  }

  .rating-add-game-page__bottom {
    flex: 0 0 auto;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
    margin-top: 0.5rem;
    padding: 0.65rem 0 0.35rem;
    background: #fff;
    flex-direction: column;
    align-items: stretch;
    gap: 0.65rem;
  }

  .rating-add-game-page__note {
    font-size: 0.72rem;
  }

  .rating-add-game-page__winner {
    justify-content: space-between;
  }

  .rating-add-game-page__footer {
    flex-wrap: wrap;
    justify-content: stretch;
    gap: 0.45rem;
  }

  .rating-add-game-page__footer .app-modal__btn-secondary,
  .rating-add-game-page__footer .app-modal__btn-primary {
    flex: 1 1 calc(50% - 0.25rem);
    min-width: 0;
  }
}
</style>
