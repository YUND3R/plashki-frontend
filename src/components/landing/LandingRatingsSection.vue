<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { playerInitials, ratingTablePreview } from '@/constants/landingContent'

const auth = useAuthStore()
const { token } = storeToRefs(auth)
const isAuthed = computed(() => !!token.value)
</script>

<template>
  <section id="ratings" class="landing__section landing__section--ratings landing__screen">
    <div class="landing__ratings-layout landing__ratings-layout--visual">
      <div class="landing__ratings-copy landing__ratings-copy--compact">
        <span class="landing__pillar-num">03</span>
        <h2 class="landing__ratings-title">Турнирная таблица</h2>
        <div class="landing__ratings-actions">
          <RouterLink
            v-if="isAuthed"
            class="landing__btn landing__btn--primary landing__btn--ratings"
            :to="{ name: 'ratings' }"
          >
            Создать турнир
          </RouterLink>
          <RouterLink
            v-else
            class="landing__btn landing__btn--primary landing__btn--ratings"
            :to="{ name: 'register' }"
          >
            Попробовать
          </RouterLink>
        </div>
      </div>

      <div class="landing__ratings-visual">
        <div class="landing__ratings-panel">
          <header class="landing__ratings-panel-head">
            <div>
              <p class="landing__ratings-panel-kicker">Весенний кубок</p>
              <h3 class="landing__ratings-panel-title">Таблица</h3>
            </div>
            <span class="landing__ratings-panel-badge">Live</span>
          </header>

          <div class="landing__ratings-table-wrap">
            <table class="landing__ratings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Игрок</th>
                  <th>Итог</th>
                  <th>+</th>
                  <th>−</th>
                  <th>Поб</th>
                  <th>Игр</th>
                  <th>ЛХ</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in ratingTablePreview"
                  :key="row.nick"
                  :class="{ 'landing__ratings-row--leader': row.leader }"
                >
                  <td>{{ row.rank }}</td>
                  <td>
                    <span class="landing__ratings-player">
                      <span class="landing__ratings-avatar" aria-hidden="true">
                        <img v-if="row.photo" :src="row.photo" alt="" />
                        <span v-else class="landing__ratings-avatar-ph">
                          {{ playerInitials(row.nick) }}
                        </span>
                      </span>
                      <span class="landing__ratings-nick">{{ row.nick }}</span>
                    </span>
                  </td>
                  <td><strong>{{ row.total }}</strong></td>
                  <td class="landing__ratings-plus">+{{ row.bonusPlus }}</td>
                  <td class="landing__ratings-minus">
                    {{ row.bonusMinus === '0' ? '0' : `−${row.bonusMinus}` }}
                  </td>
                  <td>{{ row.wins }}</td>
                  <td>{{ row.games }}</td>
                  <td>{{ row.bestMove }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <footer class="landing__ratings-panel-foot">
            <span>После 6-й игры</span>
            <span class="landing__ratings-winner">Мирные</span>
          </footer>
        </div>
      </div>
    </div>
  </section>
</template>
