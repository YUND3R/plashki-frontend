<script setup lang="ts">
import { computed } from 'vue'
import type { LobbyPlayer } from '@/api/lobbies'
import { rowPhoto } from '@/utils/playerCardPhotoFrame'
import mafiaRoleIcon from '@/assets/icons/mafia.svg?url'
import donRoleIcon from '@/assets/icons/don.svg?url'
import civilianRoleIcon from '@/assets/icons/civilian.svg?url'
import sheriffRoleIcon from '@/assets/icons/sheriff.svg?url'

const props = withDefaults(
  defineProps<{
    winner: 'mafia' | 'peaceful'
    seats: Array<LobbyPlayer | null>
    designCode: string
    persistentMessage?: string
    showScores?: boolean
  }>(),
  {
    persistentMessage: '',
    showScores: false,
  },
)

const winnerTitle = computed(() => (props.winner === 'mafia' ? 'Победа мафии' : 'Победа мирных'))
const mvpMembershipId = computed(() => {
  let maxPoints = 0
  let mvpId: string | null = null
  for (const player of props.seats) {
    const points = player?.bonus_points ?? 0
    if (points > maxPoints && player?.membership_id) {
      maxPoints = points
      mvpId = player.membership_id
    }
  }
  return mvpId
})

function playerName(player: LobbyPlayer | null, index: number): string {
  const name = (player?.nickname ?? player?.username ?? '').trim()
  return name || `Игрок ${index + 1}`
}

function playerInitials(player: LobbyPlayer | null, index: number): string {
  return playerName(player, index).slice(0, 1).toUpperCase()
}

function roleLabel(role: string | null | undefined): string {
  const value = (role ?? '').trim().toLowerCase()
  if (value === 'mafia') return 'Мафия'
  if (value === 'don') return 'Дон'
  if (value === 'sheriff') return 'Шериф'
  if (value === 'peaceful') return 'Мирный'
  return 'Роль не раскрыта'
}

function roleIcon(role: string | null | undefined): string {
  const value = (role ?? '').trim().toLowerCase()
  if (value === 'mafia') return mafiaRoleIcon
  if (value === 'don') return donRoleIcon
  if (value === 'sheriff') return sheriffRoleIcon
  if (value === 'peaceful') return civilianRoleIcon
  return ''
}

function roleIconClass(role: string | null | undefined): string {
  const value = (role ?? '').trim().toLowerCase()
  if (value === 'mafia' || value === 'don') return 'overlay-victory__role--mafia'
  if (value === 'sheriff') return 'overlay-victory__role--sheriff'
  if (value === 'peaceful') return 'overlay-victory__role--peaceful'
  return ''
}

function bonusPointsClass(points: number | null | undefined): string {
  if ((points ?? 0) > 0.7) return 'overlay-victory__bonus--high'
  if ((points ?? 0) > 0) return 'overlay-victory__bonus--positive'
  if ((points ?? 0) < 0) return 'overlay-victory__bonus--negative'
  return 'overlay-victory__bonus--zero'
}

function basePoints(player: LobbyPlayer | null): number {
  const role = (player?.game_role ?? '').trim().toLowerCase()
  if (props.winner === 'mafia') return role === 'mafia' || role === 'don' ? 1 : 0
  return role === 'peaceful' || role === 'sheriff' ? 1 : 0
}

function formatPoints(points: number): string {
  const value = Math.round(points * 10) / 10
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
}
</script>

<template>
  <section class="overlay-victory" :class="`overlay-victory--${winner}`">
    <div class="overlay-victory__result">
      <div class="overlay-victory__result-content">
        <span class="overlay-victory__eyebrow">{{ persistentMessage.trim() || 'Игра завершена' }}</span>
        <h1 class="overlay-victory__title">{{ winnerTitle }}</h1>
      </div>
    </div>

    <div class="overlay-victory__players" aria-label="Участники игры">
      <article
        v-for="(player, index) in seats"
        :key="player?.membership_id ?? `empty-${index}`"
        class="overlay-victory__player"
        :class="{ 'overlay-victory__player--mvp': player?.membership_id === mvpMembershipId }"
      >
        <span class="overlay-victory__seat">{{ index + 1 }}</span>
        <div class="overlay-victory__photo">
          <img
            v-if="rowPhoto(player)"
            :src="rowPhoto(player)"
            alt=""
            class="overlay-victory__photo-img"
          />
          <span v-else class="overlay-victory__photo-fallback">{{ playerInitials(player, index) }}</span>
        </div>
        <div class="overlay-victory__player-info">
          <div class="overlay-victory__name-line">
            <span class="overlay-victory__name">{{ playerName(player, index) }}</span>
            <span v-if="player?.membership_id === mvpMembershipId" class="overlay-victory__mvp">MVP</span>
          </div>
          <div class="overlay-victory__player-meta" :class="{ 'overlay-victory__player-meta--role-only': !showScores }">
            <template v-if="showScores">
              <span v-if="player" class="overlay-victory__team-points">{{ basePoints(player) }}</span>
              <div v-if="player" class="overlay-victory__bonus-meta">
              <span class="overlay-victory__bonus" :class="bonusPointsClass(player.bonus_points)">
                {{ formatPoints(player.bonus_points ?? 0) }}
              </span>
              </div>
            </template>
            <span
              v-if="roleIcon(player?.game_role)"
              class="overlay-victory__role"
              :class="roleIconClass(player?.game_role)"
              :title="roleLabel(player?.game_role)"
              :aria-label="roleLabel(player?.game_role)"
            >
              <img :src="roleIcon(player?.game_role)" :alt="roleLabel(player?.game_role)" />
            </span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.overlay-victory {
  --victory-accent: #1687ff;
  --victory-accent-soft: rgba(22, 135, 255, 0.24);
  --victory-accent-wash: rgba(22, 135, 255, 0.08);
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(25rem, 0.85fr);
  width: 100%;
  height: 100%;
  min-height: 0;
  gap: 0;
  padding: 0;
  box-sizing: border-box;
  isolation: isolate;
  overflow: hidden;
  color: #f8fafc;
  background:
    #070b14;
  font-family: 'Neue Machina', Inter, 'Segoe UI', Roboto, Arial, sans-serif;
}

.overlay-victory--peaceful {
  --victory-accent: #f43f5e;
  --victory-accent-soft: rgba(244, 63, 94, 0.22);
  --victory-accent-wash: rgba(244, 63, 94, 0.08);
}

.overlay-victory__result {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 0;
  border-left: clamp(0.3rem, 0.55vw, 0.55rem) solid var(--victory-accent);
}

.overlay-victory__result-content {
  position: relative;
  z-index: 1;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
  padding: clamp(1.1rem, 2vw, 2rem);
  text-align: left;
}

.overlay-victory__eyebrow {
  display: block;
  margin: 0 0 0 0.08em;
  font-size: clamp(0.95rem, 1.65vw, 1.45rem);
  font-weight: 700;
  letter-spacing: 0.16em;
  color: #f8fafc;
  text-transform: uppercase;
}

.overlay-victory__title {
  align-self: flex-end;
  margin: 0 clamp(0.9rem, 1.7vw, 2rem) 0 0;
  max-width: 9ch;
  color: var(--victory-accent);
  font-size: clamp(3.2rem, 7.5vw, 8.5rem);
  font-weight: 800;
  line-height: 0.98;
  letter-spacing: -0.065em;
  text-align: right;
  text-wrap: balance;
  text-transform: uppercase;
}

.overlay-victory__players {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: repeat(10, minmax(0, 1fr));
  gap: 0;
  min-width: 0;
  padding: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.14);
}

.overlay-victory__player {
  display: grid;
  grid-template-columns: 1.5rem clamp(3.5rem, 4.6vw, 5rem) minmax(0, 1fr);
  align-items: center;
  min-height: 0;
  padding:
    0.45rem clamp(2.25rem, 3.5vw, 4.5rem)
    0.45rem clamp(1.25rem, 2vw, 2.5rem);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.overlay-victory__player--mvp {
  background: linear-gradient(90deg, rgba(167, 139, 250, 0.12), rgba(167, 139, 250, 0.035) 58%, transparent);
}

.overlay-victory__photo {
  position: relative;
  width: clamp(3rem, 3.8vw, 4rem);
  height: clamp(3rem, 3.8vw, 4rem);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.overlay-victory__photo-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.overlay-victory__photo-fallback {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: rgba(248, 250, 252, 0.85);
  font-size: 1rem;
  font-weight: 800;
  background: var(--victory-accent-wash);
}

.overlay-victory__player-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 0.7rem;
}

.overlay-victory__name-line {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 0.45rem;
}

.overlay-victory__seat {
  flex: 0 0 auto;
  color: #f8fafc;
  font-size: clamp(0.85rem, 1.1vw, 1rem);
  font-weight: 800;
  text-align: center;
  transform: translateX(-15px);
}

.overlay-victory__name {
  min-width: 0;
  overflow: hidden;
  font-size: clamp(1.05rem, 1.6vw, 1.45rem);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overlay-victory__role {
  display: grid;
  flex: 0 0 auto;
  width: 1.75rem;
  height: 1.75rem;
  margin-left: 1.3rem;
  place-items: center;
}

.overlay-victory__player-meta {
  display: grid;
  grid-template-columns: 2rem minmax(3.75rem, auto) 1.75rem;
  flex: 0 0 auto;
  align-items: center;
  gap: 1.85rem;
}

.overlay-victory__player-meta--role-only {
  grid-template-columns: 1.75rem;
}

.overlay-victory__team-points {
  display: grid;
  place-items: center;
  color: #f8fafc;
  font-size: clamp(1rem, 1.35vw, 1.25rem);
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.overlay-victory__bonus-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
}

.overlay-victory__bonus {
  font-size: clamp(1rem, 1.35vw, 1.25rem);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.overlay-victory__bonus--negative {
  color: #f87171;
}

.overlay-victory__bonus--zero {
  color: #f8fafc;
}

.overlay-victory__bonus--positive {
  color: #4ade80;
}

.overlay-victory__bonus--high {
  color: #a78bfa;
}

.overlay-victory__mvp {
  color: #a78bfa;
  font-size: clamp(0.78rem, 1.05vw, 0.98rem);
  font-weight: 800;
  letter-spacing: 0.08em;
}

.overlay-victory__role img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.overlay-victory__role--mafia {
  filter: brightness(0) saturate(100%) invert(43%) sepia(96%) saturate(2658%) hue-rotate(196deg) brightness(101%) contrast(106%);
}

.overlay-victory__role--sheriff {
  filter: brightness(0) saturate(100%) invert(64%) sepia(83%) saturate(563%) hue-rotate(94deg) brightness(91%) contrast(94%);
}

.overlay-victory__role--peaceful {
  filter: brightness(0) saturate(100%) invert(47%) sepia(88%) saturate(3495%) hue-rotate(309deg) brightness(103%) contrast(101%);
}

@media (max-width: 780px) {
  .overlay-victory {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(13rem, 38vh) 1fr;
    gap: 0.8rem;
    padding: 0.8rem;
  }

  .overlay-victory__result-content {
    padding: 2rem 1.5rem;
  }

  .overlay-victory__players {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(5, minmax(0, 1fr));
    align-content: start;
  }

  .overlay-victory__player {
    grid-template-columns: 1.4rem 2.8rem minmax(0, 1fr);
    min-height: 3.5rem;
  }

  .overlay-victory__photo {
    width: 2.45rem;
    height: 2.45rem;
  }
}
</style>
