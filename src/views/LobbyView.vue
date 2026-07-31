<script setup lang="ts">
import { ref } from 'vue'
import { useLobby } from '@/composables/useLobby'
import AppPageError from '@/components/common/AppPageError.vue'

const { lobby, loading, error, createNew, loadById } = useLobby()
const lobbyIdInput = ref('')

function loadTypedId() {
  const id = lobbyIdInput.value.trim()
  if (id) loadById(id)
}
</script>

<template>
  <section class="lobby">
    <h1 class="lobby__title">Лобби</h1>
    <p class="lobby__hint">
      В API нет списка всех лобби: можно <strong>создать</strong> новое или открыть по <strong>id</strong>.
    </p>

    <div class="lobby__row">
      <button type="button" class="lobby__btn" :disabled="loading" @click="createNew">Создать лобби</button>
    </div>

    <div class="lobby__row lobby__row--gap">
      <input
        v-model="lobbyIdInput"
        class="lobby__input"
        type="text"
        placeholder="ID лобби"
        aria-label="ID лобби"
      />
      <button type="button" class="lobby__btn lobby__btn--secondary" :disabled="loading" @click="loadTypedId">
        Загрузить
      </button>
    </div>

    <p v-if="loading" class="lobby__status">Загрузка…</p>
    <AppPageError
      v-else-if="error"
      compact
      inline
      :message="error"
      @retry="loadTypedId"
    />
    <div v-else-if="lobby" class="lobby__card">
      <p><strong>ID:</strong> {{ lobby.id }}</p>
      <p><strong>Макс. игроков:</strong> {{ lobby.max_players }}</p>
      <p><strong>Игроков в лобби:</strong> {{ lobby.players.length }}</p>
    </div>
    <p v-else class="lobby__status">Создайте лобби или введите id.</p>
  </section>
</template>

<style scoped>
.lobby__title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.75rem;
}

.lobby__hint {
  margin: 0 0 1rem;
  font-size: 0.9375rem;
  color: #6b7280;
  line-height: 1.5;
}

.lobby__row {
  margin-bottom: 0.75rem;
}

.lobby__row--gap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.lobby__input {
  min-width: 12rem;
  padding: 0.5rem 0.65rem;
  font: inherit;
  font-size: 0.9375rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.lobby__btn {
  padding: 0.5rem 1rem;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #fff;
  background: #2f6feb;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.lobby__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lobby__btn--secondary {
  background: #fff;
  color: #2f6feb;
  border: 1px solid #d1d5db;
}

.lobby__status {
  margin: 0.75rem 0 0;
  color: #6b7280;
  font-size: 0.9375rem;
}

.lobby__error {
  margin: 0.75rem 0 0;
  color: #b91c1c;
  font-size: 0.9375rem;
}

.lobby__card {
  margin-top: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9375rem;
}

.lobby__card p {
  margin: 0 0 0.35rem;
}

.lobby__card p:last-child {
  margin-bottom: 0;
}

@media (max-width: 767px) {
  .lobby__row--gap {
    flex-direction: column;
    align-items: stretch;
  }

  .lobby__input {
    min-width: 0;
    width: 100%;
  }

  .lobby__btn {
    width: 100%;
  }
}
</style>
