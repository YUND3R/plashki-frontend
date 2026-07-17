<script setup lang="ts">
import type { PropType } from 'vue'
import type { LobbyPlayer } from '@/api/lobbies'
import type { OverlayPopupMessage } from '@/utils/overlayPopupMessage'
import type { OverlayTextTone } from '@/utils/overlayPersistentMessage'
import { rowPhoto } from '@/utils/playerCardPhotoFrame'
import OverlayPlayerPhoto from '@/components/overlay/OverlayPlayerPhoto.vue'
import mafiaRoleIcon from '@/assets/icons/mafia.svg?url'
import donRoleIcon from '@/assets/icons/don.svg?url'
import civilianRoleIcon from '@/assets/icons/civilian.svg?url'
import sheriffRoleIcon from '@/assets/icons/sheriff.svg?url'
import votedStatusIcon from '@/assets/icons/voted.svg?url'
import deletedStatusIcon from '@/assets/icons/deleted.svg?url'
import killedStatusIcon from '@/assets/icons/killed.svg?url'

const props = defineProps({
  seats: {
    type: Array as PropType<(LobbyPlayer | null)[]>,
    required: true,
  },
  sheriffCheck: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  persistentMessage: {
    type: String,
    default: '',
  },
  persistentColor: {
    type: String as PropType<OverlayTextTone>,
    default: 'green',
  },
  popupMessage: {
    type: Object as PropType<OverlayPopupMessage | null>,
    default: null,
  },
})

function textToneColor(tone: OverlayTextTone): string {
  if (tone === 'white') return '#f8fafc'
  if (tone === 'yellow') return '#facc15'
  if (tone === 'red') return '#f87171'
  return '#4ade80'
}

const CLASSIC_DESIGN = 'classic'

function photoUrl(p: LobbyPlayer | null): string {
  return rowPhoto(p)
}

function roleLabel(role: string | null): string {
  const value = (role ?? '').trim().toLowerCase()
  if (value === 'mafia') return 'Мафия'
  if (value === 'don') return 'Дон'
  if (value === 'peaceful') return 'Мирный'
  if (value === 'sheriff') return 'Шериф'
  return ''
}

function roleIcon(role: string | null): string {
  const value = (role ?? '').trim().toLowerCase()
  if (value === 'mafia') return mafiaRoleIcon
  if (value === 'don') return donRoleIcon
  if (value === 'peaceful') return civilianRoleIcon
  if (value === 'sheriff') return sheriffRoleIcon
  return ''
}

function roleIconToneClass(role: string | null): string {
  const value = (role ?? '').trim().toLowerCase()
  if (value === 'peaceful') return 'overlay-card__role-icon--peaceful'
  if (value === 'sheriff') return 'overlay-card__role-icon--sheriff'
  if (value === 'don') return 'overlay-card__role-icon--don'
  if (value === 'mafia') return 'overlay-card__role-icon--mafia'
  return ''
}

function statusKey(status: string | null | undefined): string {
  return (status ?? '').trim().toLowerCase()
}

function normalizedRole(role: string | null | undefined): string {
  return (role ?? '').trim().toLowerCase()
}

function seatKey(p: LobbyPlayer | null, idx: number): string {
  const id = (p?.membership_id ?? '').trim()
  return id || `seat-${idx}`
}

function sheriffCheckLabels(): string[] {
  const labels: string[] = []
  for (const raw of props.sheriffCheck ?? []) {
    const value = (typeof raw === 'string' ? raw : '').trim()
    if (!value) continue
    labels.push(value)
  }
  return labels
}

function bestMoveLabels(p: LobbyPlayer | null): string[] {
  const labels: string[] = []
  for (const raw of p?.best_move ?? []) {
    const value = (typeof raw === 'string' ? raw : '').trim()
    if (!value) continue
    labels.push(value)
  }
  return labels
}

function isSheriffSeat(p: LobbyPlayer | null): boolean {
  return normalizedRole(p?.game_role) === 'sheriff'
}

function isBestMoveSeat(p: LobbyPlayer | null): boolean {
  return statusKey(p?.status) === 'best-move'
}

function isSheriffCheckMafiaLike(label: string): boolean {
  const seatNum = Number.parseInt(label.trim(), 10)
  if (!Number.isFinite(seatNum) || seatNum < 1) return false
  const seat = props.seats[seatNum - 1] ?? null
  const role = normalizedRole(seat?.game_role)
  return role === 'mafia' || role === 'don'
}

function showSheriffChecksAbove(p: LobbyPlayer | null): boolean {
  return isSheriffSeat(p) && sheriffCheckLabels().length > 0 && !isEliminatedStatus(p?.status ?? null)
}

function showSheriffChecksInMeta(p: LobbyPlayer | null): boolean {
  return isSheriffSeat(p) && sheriffCheckLabels().length > 0 && isEliminatedStatus(p?.status ?? null)
}

function isEliminatedStatus(status: string | null): boolean {
  const key = statusKey(status)
  return key === 'killed' || key === 'voted' || key === 'deleted' || key === 'best-move'
}

function statusIcon(status: string | null): string {
  const key = statusKey(status)
  if (key === 'killed') return killedStatusIcon
  if (key === 'voted') return votedStatusIcon
  if (key === 'deleted') return deletedStatusIcon
  if (key === 'best-move') return killedStatusIcon
  return ''
}
</script>

<template>
  <section class="overlay-classic">
    <Transition name="overlay-classic-popup">
      <article
        v-if="props.popupMessage"
        :key="props.popupMessage.id"
        class="overlay-classic__popup"
      >
        <p
          v-if="props.popupMessage.h1"
          class="overlay-classic__popup-h1"
          :style="{ color: textToneColor(props.popupMessage.h1_color) }"
        >
          {{ props.popupMessage.h1 }}
        </p>
        <p
          v-if="props.popupMessage.h2"
          class="overlay-classic__popup-h2"
          :style="{ color: textToneColor(props.popupMessage.h2_color) }"
        >
          {{ props.popupMessage.h2 }}
        </p>
      </article>
    </Transition>
    <p
      v-if="props.persistentMessage.trim()"
      class="overlay-classic__persistent"
      :style="{ color: textToneColor(props.persistentColor) }"
    >
      {{ props.persistentMessage }}
    </p>
    <article
      v-for="(p, idx) in props.seats"
      :key="p?.membership_id ?? `empty-${idx}`"
      class="overlay-card"
      :class="{ 'overlay-card--eliminated': isEliminatedStatus(p?.status ?? null) }"
    >
      <div v-if="showSheriffChecksAbove(p)" class="overlay-card__checks">
        <span class="overlay-card__checks-inner">
          <span
            v-for="(label, checkIdx) in sheriffCheckLabels()"
            :key="`${seatKey(p, idx)}-check-${checkIdx}-${label}`"
            class="overlay-card__check-num"
            :class="{ 'overlay-card__check-num--mafia': isSheriffCheckMafiaLike(label) }"
          >
            {{ label }}
          </span>
        </span>
      </div>

      <div v-if="!isEliminatedStatus(p?.status ?? null)" class="overlay-card__top">
        <span class="overlay-card__seat">{{ idx + 1 }}</span>
        <span class="overlay-card__role-wrap">
          <Transition name="overlay-role-soft" mode="out-in">
            <img
              v-if="roleIcon(p?.game_role ?? null)"
              :key="`role-${p?.membership_id ?? idx}-${p?.game_role ?? 'none'}`"
              :src="roleIcon(p?.game_role ?? null)"
              :alt="roleLabel(p?.game_role ?? null)"
              class="overlay-card__role-icon"
              :class="roleIconToneClass(p?.game_role ?? null)"
            />
          </Transition>
        </span>
      </div>
      <div v-if="!isEliminatedStatus(p?.status ?? null)" class="overlay-card__photo-float">
        <div class="overlay-card__photo-stage">
          <OverlayPlayerPhoto
            v-if="photoUrl(p)"
            :player="p"
            :design-code="CLASSIC_DESIGN"
            img-class="overlay-card__photo"
          />
          <div v-else class="overlay-card__photo overlay-card__photo--empty" />
        </div>
      </div>
      <div
        v-else
        class="overlay-card__meta-row"
        :class="{ 'overlay-card__meta-row--with-lh': isBestMoveSeat(p) && bestMoveLabels(p).length }"
      >
        <div
          class="overlay-card__meta-role-group"
          :class="{ 'overlay-card__meta-role-group--with-checks': showSheriffChecksInMeta(p) }"
        >
          <img
            v-if="roleIcon(p?.game_role ?? null)"
            :src="roleIcon(p?.game_role ?? null)"
            alt=""
            class="overlay-card__meta-icon"
            :class="roleIconToneClass(p?.game_role ?? null)"
          />
          <span v-if="showSheriffChecksInMeta(p)" class="overlay-card__meta-checks-text">
            <span
              v-for="(label, checkIdx) in sheriffCheckLabels()"
              :key="`${seatKey(p, idx)}-meta-check-${checkIdx}-${label}`"
              class="overlay-card__meta-check-num"
              :class="{ 'overlay-card__meta-check-num--mafia': isSheriffCheckMafiaLike(label) }"
            >
              {{ label }}
            </span>
          </span>
        </div>
        <div
          v-if="isBestMoveSeat(p) && bestMoveLabels(p).length"
          class="overlay-card__meta-lh"
        >
          <span class="overlay-card__meta-lh-text">
            <span class="overlay-card__meta-lh-label">ЛХ</span>
            <span
              v-for="(label, checkIdx) in bestMoveLabels(p)"
              :key="`${seatKey(p, idx)}-best-move-${checkIdx}-${label}`"
              class="overlay-card__meta-lh-num"
              :class="{ 'overlay-card__meta-lh-num--mafia': isSheriffCheckMafiaLike(label) }"
            >
              {{ label }}
            </span>
          </span>
        </div>
        <span class="overlay-card__meta-box overlay-card__meta-box--status">
          <img
            v-if="statusIcon(p?.status ?? null)"
            :src="statusIcon(p?.status ?? null)"
            alt=""
            class="overlay-card__meta-icon overlay-card__meta-icon--status"
          />
        </span>
      </div>
      <div class="overlay-card__bottom">
        <p class="overlay-card__nick">{{ p?.nickname || '' }}</p>
      </div>
    </article>
  </section>
</template>

<style scoped>
.overlay-classic {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(10, 186px);
  gap: 5px;
  justify-content: center;
  align-items: end;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
}

.overlay-classic__persistent {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 88vw;
  margin: 0;
  padding: 9px 18px;
  border-radius: 5px;
  border: none;
  outline: none;
  box-shadow: none;
  background:
    radial-gradient(ellipse 220% 160% at 100% 100%, rgba(75, 85, 99, 0.22) 0%, transparent 72%),
    #0c0e11;
  color: #f8fafc;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.15;
  text-align: center;
  width: fit-content;
  white-space: pre-wrap;
  z-index: 200;
}

.overlay-classic__popup {
  position: fixed;
  left: 20px;
  top: 20px;
  transform: none;
  max-width: min(36vw, 680px);
  margin: 0;
  padding: 12px 16px;
  border-radius: 5px;
  border: none;
  outline: none;
  box-shadow: none;
  background:
    radial-gradient(ellipse 220% 160% at 100% 100%, rgba(75, 85, 99, 0.22) 0%, transparent 72%),
    #0c0e11;
  color: #f8fafc;
  z-index: 210;
}

.overlay-classic__popup-h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
  font-weight: 700;
}

.overlay-classic__popup-h2 {
  margin: 6px 0 0;
  font-size: 20px;
  line-height: 1.15;
  font-weight: 500;
  opacity: 0.95;
}

.overlay-classic-popup-enter-active {
  transition:
    transform 320ms ease-out,
    opacity 320ms ease-out;
}

.overlay-classic-popup-leave-active {
  transition:
    transform 220ms ease-in,
    opacity 220ms ease-in;
}

.overlay-classic-popup-enter-from {
  opacity: 0;
  transform: translateX(-24px);
}

.overlay-classic-popup-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.overlay-card {
  position: relative;
  width: 186px;
  height: 151px;
  border: none;
  border-radius: 0;
  overflow: visible;
  background: transparent;
}

.overlay-card--eliminated {
  height: 45px;
}

.overlay-card__top {
  width: 186px;
  height: 105px;
  position: relative;
  overflow: hidden;
  background: #0c0e11;
  border-radius: 5px 5px 0 0;
}

.overlay-card__photo-float {
  position: absolute;
  left: 50%;
  bottom: 46px;
  transform: translateX(-50%);
  width: 186px;
  height: 126px;
  overflow: hidden;
  border-radius: 12px 12px 0 0;
  pointer-events: none;
  z-index: 1;
}

.overlay-card__photo-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.overlay-card__seat {
  position: absolute;
  top: 6px;
  left: 8px;
  z-index: 2;
  font-family: 'Neue Machine', 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 48px;
  line-height: 1;
  font-weight: 800;
  color: #ffffff;
  text-shadow: none;
}

.overlay-card__photo {
  position: absolute;
  left: 50%;
  top: 50%;
  max-width: none;
  max-height: none;
  object-fit: fill;
  display: block;
  border-radius: 0;
  background: transparent;
}

.overlay-card__photo--empty {
  background: transparent;
}

.overlay-card__bottom {
  width: 186px;
  height: 45px;
  margin-top: 2px;
  background: #0c0e11;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  box-sizing: border-box;
  border-radius: 0 0 5px 5px;
}

.overlay-card--eliminated .overlay-card__bottom {
  position: absolute;
  left: 0;
  bottom: 0;
  margin-top: 0;
}

.overlay-card__meta-row {
  position: absolute;
  left: 0;
  bottom: 46px;
  z-index: 3;
  display: flex;
  align-items: stretch;
  width: 186px;
  height: 40px;
}

.overlay-card__meta-role-group {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  min-width: 40px;
  background: #0c0e11;
  border-right: 1px solid #4b5563;
  border-radius: 5px 0 0 0;
}

.overlay-card__meta-role-group--with-checks {
  justify-content: flex-start;
  gap: 0.35rem;
  padding: 0 8px;
}

.overlay-card__meta-lh {
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: stretch;
  justify-content: center;
  background: #0c0e11;
  border-right: 1px solid #4b5563;
}

.overlay-card__meta-lh-text {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 40px;
  padding: 0 0.35rem;
  color: #f8fafc;
  font-family: 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
}

.overlay-card__meta-lh-label {
  text-transform: lowercase;
}

.overlay-card__meta-lh-num--mafia {
  color: #8977FE;
}

.overlay-card__meta-checks-text {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #f8fafc;
  font-family: 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
}

.overlay-card__meta-check-num--mafia {
  color: #8977FE;
}

.overlay-card__meta-box--status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #0c0e11;
  border: none;
  border-radius: 0 5px 0 0;
  box-sizing: border-box;
}

.overlay-card__meta-row--with-lh .overlay-card__meta-box--status {
  margin-left: auto;
}

.overlay-card__meta-row:not(.overlay-card__meta-row--with-lh) .overlay-card__meta-box--status {
  margin-left: 0;
}

.overlay-card__meta-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.overlay-card__meta-icon--status {
  width: 22px;
  height: 22px;
  filter: brightness(0) saturate(100%) invert(95%) sepia(5%) saturate(216%) hue-rotate(189deg)
    brightness(101%) contrast(94%);
}

.overlay-card__role-wrap {
  position: absolute;
  left: 11px;
  top: 55px;
  width: 28px;
  height: 28px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.overlay-card__role-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  filter: none;
}

.overlay-card__role-icon--peaceful {
  filter: brightness(0) saturate(100%) invert(52%) sepia(42%) saturate(1400%) hue-rotate(328deg)
    brightness(96%) contrast(94%);
}

.overlay-card__role-icon--sheriff {
  filter: brightness(0) saturate(100%) invert(48%) sepia(38%) saturate(950%) hue-rotate(186deg)
    brightness(97%) contrast(93%);
}

.overlay-card__role-icon--don {
  filter: brightness(0) saturate(100%) invert(55%) sepia(32%) saturate(1100%) hue-rotate(224deg)
    brightness(97%) contrast(92%);
}

.overlay-card__role-icon--mafia {
  filter: brightness(0) saturate(100%) invert(42%) sepia(28%) saturate(1600%) hue-rotate(252deg)
    brightness(94%) contrast(96%);
}

.overlay-role-soft-enter-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.overlay-role-soft-leave-active {
  transition: opacity 100ms ease;
}

.overlay-role-soft-enter-from {
  opacity: 0;
  transform: scale(0.82);
}

.overlay-role-soft-leave-to {
  opacity: 0;
}

.overlay-card__nick {
  margin: 0;
  width: 100%;
  font-family: 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 20px;
  font-weight: 500;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  color: #f8fafc;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.85);
}

.overlay-card__checks {
  position: absolute;
  left: 0;
  bottom: calc(100% + 3px);
  z-index: 12;
  display: inline-flex;
  align-items: center;
  pointer-events: none;
}

.overlay-card__checks-inner {
  display: inline-flex;
  align-items: center;
  gap: 0;
  min-height: 34px;
  padding: 8px 14px;
  border-radius: 5px;
  background: rgba(12, 14, 17, 0.92);
  color: #f8fafc;
  font-family: 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 18px;
  font-weight: 600;
  line-height: 1;
}

.overlay-card__check-num:not(:last-child)::after {
  content: '';
  display: inline-block;
  width: 3px;
  height: 3px;
  margin: 0 0.55rem;
  border-radius: 50%;
  background: #9ca3af;
  opacity: 0.35;
  vertical-align: middle;
  transform: translateY(-1px);
}

.overlay-card__check-num--mafia {
  color: #8977FE;
}

</style>
