<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useRatingsUiStore } from '@/stores/ratingsUi'

const ratingsUi = useRatingsUiStore()
const { canAddGame, detailDeleting, detailTab, tableSearchQuery, gamesSearchQuery } = storeToRefs(ratingsUi)
</script>

<template>
  <div class="shell-rating-toolbar">
    <div class="shell-rating-toolbar__cluster">
      <input
        v-if="detailTab === 'table'"
        v-model="tableSearchQuery"
        class="shell-rating-toolbar__search"
        type="search"
        name="rating_table_search"
        placeholder="Ник, имя, фамилия, клуб"
        autocomplete="off"
        aria-label="Поиск игрока в таблице рейтинга"
      />
      <input
        v-else
        v-model="gamesSearchQuery"
        class="shell-rating-toolbar__search"
        type="search"
        name="rating_games_search"
        placeholder="Название игры"
        autocomplete="off"
        aria-label="Поиск игры в рейтинге"
      />

      <div class="shell-rating-toolbar__actions">
        <button type="button" class="shell-rating-toolbar__btn" @click="ratingsUi.requestAddPlayers">
          <span class="shell-rating-toolbar__label">Добавить игроков</span>
        </button>
        <button
          type="button"
          class="shell-rating-toolbar__btn"
          :disabled="!canAddGame"
          :title="canAddGame ? undefined : 'Нужно минимум 10 игроков в рейтинге'"
          @click="ratingsUi.requestAddGame"
        >
          <span class="shell-rating-toolbar__label">Добавить игру</span>
        </button>
        <button type="button" class="shell-rating-toolbar__btn" @click="ratingsUi.requestEdit">
          <span class="shell-rating-toolbar__label">Редактировать</span>
        </button>
        <button
          type="button"
          class="shell-rating-toolbar__btn shell-rating-toolbar__btn--danger"
          :disabled="detailDeleting"
          @click="ratingsUi.requestDelete"
        >
          <span class="shell-rating-toolbar__label">{{ detailDeleting ? 'Удаление…' : 'Удалить' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shell-rating-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: var(--shell-header-row-h, 2.375rem);
}

.shell-rating-toolbar__cluster {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: nowrap;
  gap: 0.45rem;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}

.shell-rating-toolbar__cluster::-webkit-scrollbar {
  display: none;
}

.shell-rating-toolbar__search {
  width: 14rem;
  min-width: 9rem;
  max-width: 16rem;
  height: var(--shell-header-row-h);
  min-height: var(--shell-header-row-h);
  max-height: var(--shell-header-row-h);
  padding: 0 0.95rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: calc(var(--shell-header-row-h) - 2px);
  color: #374151;
  box-sizing: border-box;
  -webkit-appearance: none;
  appearance: none;
}

.shell-rating-toolbar__search:focus {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
  border-color: #2f6feb;
}

.shell-rating-toolbar__search::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

.shell-rating-toolbar__search::-webkit-search-cancel-button,
.shell-rating-toolbar__search::-webkit-search-decoration {
  -webkit-appearance: none;
  appearance: none;
}

.shell-rating-toolbar__actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.45rem;
  flex: 0 0 auto;
  min-width: 0;
}

.shell-rating-toolbar__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--shell-header-row-h, 2.375rem);
  height: var(--shell-header-row-h, 2.375rem);
  padding: 0 0.95rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  box-sizing: border-box;
  white-space: nowrap;
  line-height: 1;
}

.shell-rating-toolbar__btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #cbd5e1;
}

.shell-rating-toolbar__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.shell-rating-toolbar__btn--danger {
  color: #374151;
  background: #fff;
  border-color: #d1d5db;
}

.shell-rating-toolbar__btn--danger:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #cbd5e1;
}

@media (max-width: 900px) {
  .shell-rating-toolbar {
    justify-content: stretch;
  }

  .shell-rating-toolbar__cluster {
    width: 100%;
    justify-content: stretch;
  }

  .shell-rating-toolbar__search {
    width: 100%;
    min-width: 0;
    max-width: none;
  }

  .shell-rating-toolbar__label {
    font-size: 0.75rem;
  }

  .shell-rating-toolbar__btn {
    padding: 0 0.55rem;
    flex-shrink: 0;
  }
}
</style>
