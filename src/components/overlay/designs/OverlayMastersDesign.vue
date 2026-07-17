<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
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
import killedStatusIcon from '@/assets/icons/killed.svg?url'
import votedStatusIcon from '@/assets/icons/voted.svg?url'
import deletedStatusIcon from '@/assets/icons/deleted.svg?url'
import seat1Icon from '@/assets/icons/numbers/1.svg?url'
import seat2Icon from '@/assets/icons/numbers/2.svg?url'
import seat3Icon from '@/assets/icons/numbers/3.svg?url'
import seat4Icon from '@/assets/icons/numbers/4.svg?url'
import seat5Icon from '@/assets/icons/numbers/5.svg?url'
import seat6Icon from '@/assets/icons/numbers/6.svg?url'
import seat7Icon from '@/assets/icons/numbers/7.svg?url'
import seat8Icon from '@/assets/icons/numbers/8.svg?url'
import seat9Icon from '@/assets/icons/numbers/9.svg?url'
import seat10Icon from '@/assets/icons/numbers/10.svg?url'

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

const MASTERS_DESIGN = 'masters-yug25'

function photoUrl(p: LobbyPlayer | null): string {
  return rowPhoto(p)
}

function hasPhoto(p: LobbyPlayer | null): boolean {
  return !!photoUrl(p)
}

function roleIcon(role: string | null): string {
  const value = (role ?? '').trim().toLowerCase()
  if (value === 'mafia') return mafiaRoleIcon
  if (value === 'don') return donRoleIcon
  if (value === 'peaceful') return civilianRoleIcon
  if (value === 'sheriff') return sheriffRoleIcon
  return ''
}

function roleToneClass(role: string | null): string {
  const value = (role ?? '').trim().toLowerCase()
  if (value === 'peaceful') return 'overlay-masters-card--peaceful'
  if (value === 'sheriff') return 'overlay-masters-card--sheriff'
  if (value === 'don') return 'overlay-masters-card--don'
  if (value === 'mafia') return 'overlay-masters-card--mafia'
  return ''
}

function statusKey(status: string | null | undefined): string {
  return (status ?? '').trim().toLowerCase()
}

function isEliminatedStatus(status: string | null | undefined): boolean {
  const key = statusKey(status)
  return key === 'killed' || key === 'deleted' || key === 'voted' || key === 'best-move'
}

function eliminatedStatusIcon(status: string | null | undefined): string {
  const key = statusKey(status)
  if (key === 'killed') return killedStatusIcon
  if (key === 'voted') return votedStatusIcon
  if (key === 'deleted') return deletedStatusIcon
  if (key === 'best-move') return killedStatusIcon
  return ''
}

function eliminatedStatusClass(status: string | null | undefined): string {
  const key = statusKey(status)
  if (key === 'killed' || key === 'best-move') return 'overlay-masters-card--status-killed'
  if (key === 'voted') return 'overlay-masters-card--status-voted'
  if (key === 'deleted') return 'overlay-masters-card--status-deleted'
  return ''
}

function trimNickname(raw: string | null | undefined, maxLen: number): string {
  const value = (raw ?? '').trim()
  if (!value) return ''
  if (value.length <= maxLen) return value
  return `${value.slice(0, maxLen)}..`
}

function displayNickname(p: LobbyPlayer | null): string {
  if (!p) return ''
  const maxLen = isEliminatedStatus(p.status) ? 10 : 12
  return trimNickname(p.nickname, maxLen)
}

function normalizedRole(role: string | null | undefined): string {
  return (role ?? '').trim().toLowerCase()
}

function seatKey(p: LobbyPlayer | null, idx: number): string {
  return p?.membership_id ?? `empty-${idx}`
}

const roleStageBySeat = ref<Record<string, 1 | 2 | 3 | 4 | undefined>>({})
const previousRoleBySeat = ref<Record<string, string>>({})
const timersBySeat = new Map<string, ReturnType<typeof setTimeout>[]>()
const initialized = ref(false)

function setStage(key: string, stage?: 1 | 2 | 3 | 4) {
  if (stage) {
    roleStageBySeat.value = { ...roleStageBySeat.value, [key]: stage }
    return
  }
  const next = { ...roleStageBySeat.value }
  delete next[key]
  roleStageBySeat.value = next
}

function clearSeatTimers(key: string) {
  const timers = timersBySeat.get(key) ?? []
  timers.forEach((timerId) => clearTimeout(timerId))
  timersBySeat.delete(key)
}

function runRoleAnimation(key: string) {
  clearSeatTimers(key)
  setStage(key, 1)
  const t1 = setTimeout(() => setStage(key, 2), 520) // closed -> opening empty
  const t2 = setTimeout(() => setStage(key, 3), 1040) // center icon appears
  const t3 = setTimeout(() => setStage(key, 4), 1440) // hold center 0.4s then move
  const t4 = setTimeout(() => setStage(key), 2480) // settle to default
  timersBySeat.set(key, [t1, t2, t3, t4])
}

function stageOf(p: LobbyPlayer | null, idx: number): 0 | 1 | 2 | 3 | 4 {
  return roleStageBySeat.value[seatKey(p, idx)] ?? 0
}

function stageClass(p: LobbyPlayer | null, idx: number): string {
  const stage = stageOf(p, idx)
  if (stage === 1) return 'overlay-masters-card--anim-drop'
  if (stage === 2) return 'overlay-masters-card--anim-rise'
  return ''
}

function toneClassForSeat(p: LobbyPlayer | null, idx: number): string {
  if (isEliminatedStatus(p?.status)) return ''
  const stage = stageOf(p, idx)
  const key = seatKey(p, idx)
  const current = normalizedRole(p?.game_role)
  const previous = previousRoleBySeat.value[key] ?? ''
  if (stage === 1) return ''
  if (stage === 0) return roleToneClass((previous || current) || null)
  return roleToneClass(current || null)
}

function showContent(stage: 0 | 1 | 2 | 3 | 4): boolean {
  return stage === 0 || stage === 4
}

function showRoleBadge(p: LobbyPlayer | null, idx: number): boolean {
  const stage = stageOf(p, idx)
  return !!roleIcon(p?.game_role ?? null) && (stage === 0 || stage === 3 || stage === 4)
}

function isDoubleDigitSeat(idx: number): boolean {
  return idx + 1 >= 10
}

function seatIcon(idx: number): string {
  const n = idx + 1
  if (n === 1) return seat1Icon
  if (n === 2) return seat2Icon
  if (n === 3) return seat3Icon
  if (n === 4) return seat4Icon
  if (n === 5) return seat5Icon
  if (n === 6) return seat6Icon
  if (n === 7) return seat7Icon
  if (n === 8) return seat8Icon
  if (n === 9) return seat9Icon
  if (n === 10) return seat10Icon
  return ''
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

onMounted(() => {
  const next: Record<string, string> = {}
  props.seats.forEach((p, idx) => {
    next[seatKey(p, idx)] = normalizedRole(p?.game_role)
  })
  previousRoleBySeat.value = next
  initialized.value = true
})

watch(
  () => props.seats.map((p, idx) => `${seatKey(p, idx)}:${normalizedRole(p?.game_role)}`).join('|'),
  () => {
    const next: Record<string, string> = {}
    props.seats.forEach((p, idx) => {
      const key = seatKey(p, idx)
      const current = normalizedRole(p?.game_role)
      const previous = previousRoleBySeat.value[key] ?? ''
      if (initialized.value && current && current !== previous) runRoleAnimation(key)
      next[key] = current
    })
    previousRoleBySeat.value = next
  },
)

onUnmounted(() => {
  Array.from(timersBySeat.keys()).forEach(clearSeatTimers)
})
</script>

<template>
  <section class="overlay-masters">
    <Transition name="overlay-masters-popup">
      <article
        v-if="props.popupMessage"
        :key="props.popupMessage.id"
        class="overlay-masters__popup"
      >
        <p
          v-if="props.popupMessage.h1"
          class="overlay-masters__popup-h1"
          :style="{ color: textToneColor(props.popupMessage.h1_color) }"
        >
          {{ props.popupMessage.h1 }}
        </p>
        <p
          v-if="props.popupMessage.h2"
          class="overlay-masters__popup-h2"
          :style="{ color: textToneColor(props.popupMessage.h2_color) }"
        >
          {{ props.popupMessage.h2 }}
        </p>
      </article>
    </Transition>
    <p
      v-if="props.persistentMessage.trim()"
      class="overlay-masters__persistent"
      :style="{ color: textToneColor(props.persistentColor) }"
    >
      {{ props.persistentMessage }}
    </p>
    <article
      v-for="(p, idx) in props.seats"
      :key="p?.membership_id ?? `empty-${idx}`"
      class="overlay-masters-card"
      :class="[
        toneClassForSeat(p, idx),
        stageClass(p, idx),
        eliminatedStatusClass(p?.status),
        {
          'overlay-masters-card--eliminated': isEliminatedStatus(p?.status),
          'overlay-masters-card--no-photo': !hasPhoto(p),
          'overlay-masters-card--seat-double': isDoubleDigitSeat(idx),
        },
      ]"
    >
      <div v-if="isSheriffSeat(p) && sheriffCheckLabels().length" class="overlay-masters-card__checks">
        <span
          v-for="(label, checkIdx) in sheriffCheckLabels()"
          :key="`${seatKey(p, idx)}-check-${checkIdx}-${label}`"
          class="overlay-masters-card__check-badge"
          :class="{ 'overlay-masters-card__check-badge--mafia': isSheriffCheckMafiaLike(label) }"
        >
          {{ label }}
        </span>
      </div>

      <div v-if="isBestMoveSeat(p) && bestMoveLabels(p).length" class="overlay-masters-card__checks overlay-masters-card__checks--right">
        <span class="overlay-masters-card__check-prefix">ЛХ</span>
        <span
          v-for="(label, checkIdx) in bestMoveLabels(p)"
          :key="`${seatKey(p, idx)}-best-move-${checkIdx}-${label}`"
          class="overlay-masters-card__check-badge"
          :class="{ 'overlay-masters-card__check-badge--mafia': isSheriffCheckMafiaLike(label) }"
        >
          {{ label }}
        </span>
      </div>

      <div class="overlay-masters-card__photo-mask">
        <Transition name="overlay-masters-content-fade">
          <div
            v-if="hasPhoto(p) && showContent(stageOf(p, idx))"
            class="overlay-masters-card__photo-stage"
          >
            <OverlayPlayerPhoto
              :player="p"
              :design-code="MASTERS_DESIGN"
              img-class="overlay-masters-card__photo-inner"
            />
          </div>
        </Transition>
        <Transition name="overlay-masters-content-fade">
          <div
            v-if="!hasPhoto(p) && showContent(stageOf(p, idx))"
            class="overlay-masters-card__photo-stage overlay-masters-card__photo-stage--empty"
          />
        </Transition>
      </div>

      <div
        v-if="stageOf(p, idx) === 1 || stageOf(p, idx) === 2"
        class="overlay-masters-card__curtain"
        :class="{
          'overlay-masters-card__curtain--drop': stageOf(p, idx) === 1,
          'overlay-masters-card__curtain--lift': stageOf(p, idx) === 2,
        }"
      />

      <span class="overlay-masters-card__head">
        <Transition name="overlay-masters-content-fade">
          <span
            v-if="showContent(stageOf(p, idx))"
            class="overlay-masters-card__seat"
            :class="{ 'overlay-masters-card__seat--double': isDoubleDigitSeat(idx) }"
          >
            <img :src="seatIcon(idx)" alt="" class="overlay-masters-card__seat-icon" />
          </span>
        </Transition>
      </span>

      <span
        v-if="showRoleBadge(p, idx)"
        class="overlay-masters-card__role-center"
        :class="{
          'overlay-masters-card__role-center--center': stageOf(p, idx) === 3,
          'overlay-masters-card__role-center--move': stageOf(p, idx) === 4,
          'overlay-masters-card__role-center--final': stageOf(p, idx) === 0,
        }"
      >
        <img :src="roleIcon(p?.game_role ?? null)" alt="" class="overlay-masters-card__role-center-icon" />
      </span>

      <Transition name="overlay-masters-status-fade">
        <span v-if="isEliminatedStatus(p?.status)" class="overlay-masters-card__status-badge">
          <img :src="eliminatedStatusIcon(p?.status)" alt="" class="overlay-masters-card__status-icon" />
        </span>
      </Transition>

      <Transition name="overlay-masters-content-fade">
        <p v-if="showContent(stageOf(p, idx))" class="overlay-masters-card__nick">{{ displayNickname(p) }}</p>
      </Transition>
    </article>
  </section>
</template>

<style scoped>
.overlay-masters {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(10, 185px);
  gap: 5px;
  justify-content: center;
  align-items: flex-end;
  padding: 0;
}

.overlay-masters__persistent {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 88vw;
  margin: 0;
  padding: 8px 18px;
  border-radius: 5px;
  border: none;
  background:
    radial-gradient(ellipse 220% 160% at 100% 100%, rgba(75, 85, 99, 0.2) 0%, transparent 72%),
    #0a0a0a;
  color: #f8fafc;
  font-family: 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.12;
  text-align: center;
  width: fit-content;
  white-space: pre-wrap;
  z-index: 200;
}

.overlay-masters__popup {
  position: fixed;
  left: 20px;
  top: 20px;
  transform: none;
  max-width: min(36vw, 680px);
  margin: 0;
  padding: 11px 16px;
  border-radius: 5px;
  border: none;
  outline: none;
  box-shadow: none;
  background:
    radial-gradient(ellipse 220% 160% at 100% 100%, rgba(75, 85, 99, 0.2) 0%, transparent 72%),
    #0a0a0a;
  color: #f8fafc;
  z-index: 210;
}

.overlay-masters__popup-h1 {
  margin: 0;
  font-family: 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 30px;
  line-height: 1.05;
  font-weight: 700;
}

.overlay-masters__popup-h2 {
  margin: 6px 0 0;
  font-family: 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 21px;
  line-height: 1.12;
  font-weight: 500;
  opacity: 0.95;
}

.overlay-masters-popup-enter-active {
  transition:
    transform 320ms ease-out,
    opacity 320ms ease-out;
}

.overlay-masters-popup-leave-active {
  transition:
    transform 220ms ease-in,
    opacity 220ms ease-in;
}

.overlay-masters-popup-enter-from {
  opacity: 0;
  transform: translateX(-24px);
}

.overlay-masters-popup-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.overlay-masters-card {
  width: 185px;
  height: 125px;
  position: relative;
  overflow: visible;
  border-radius: 5px;
  background: #0a0a0a;
  transition: height 520ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: height;
}

.overlay-masters-card__checks {
  position: absolute;
  left: 0;
  bottom: calc(100% + 3px);
  transform: none;
  z-index: 12;
  display: inline-flex;
  align-items: center;
  gap: 0;
  pointer-events: none;
}

.overlay-masters-card__checks--right {
  left: auto;
  right: 0;
}

.overlay-masters-card__checks--right .overlay-masters-card__check-badge:first-child {
  border-radius: 0;
}

.overlay-masters-card__check-badge {
  min-width: 22px;
  height: 26px;
  padding: 0 5px;
  border-radius: 0;
  background: #0a0a0a;
  border-left: 0;
  border-right: 0;
  color: #f8fafc;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
  font-size: 18px;
  font-weight: 200;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.overlay-masters-card__check-badge:first-child {
  border-radius: 4px 0 0 4px;
}

.overlay-masters-card__check-badge:last-child {
  border-radius: 0 4px 4px 0;
}

.overlay-masters-card__check-badge:not(:last-child) {
  border-right: 0.5px solid #4b5563;
}

.overlay-masters-card__check-badge--mafia {
  color: #8977FE;
}

.overlay-masters-card__check-prefix {
  min-width: 28px;
  height: 26px;
  padding: 0 7px;
  border-radius: 4px 0 0 4px;
  background: #0a0a0a;
  color: #f8fafc;
  font-family: Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
  font-size: 16px;
  font-weight: 300;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-right: 0.5px solid #4b5563;
}

.overlay-masters-card--eliminated {
  height: 70px;
}

.overlay-masters-card--anim-drop {
  height: 0;
  overflow: hidden;
}

.overlay-masters-card--anim-rise {
  height: 125px;
  overflow: hidden;
}

.overlay-masters-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  border-radius: 5px;
  background: linear-gradient(
    180deg,
    rgba(10, 10, 10, 0) 20%,
    rgba(10, 10, 10, 0.52) 68%,
    rgba(10, 10, 10, 0.86) 100%
  );
  transition: background 420ms ease;
}

.overlay-masters-card::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  border-radius: 5px;
  background: none;
  opacity: 1;
  transition: opacity 420ms ease;
}

.overlay-masters-card--peaceful::after {
  background:
    radial-gradient(160px 94px at 42% 86%, rgba(220, 24, 62, 0.95) 0%, rgba(220, 24, 62, 0.35) 42%, rgba(4, 6, 12, 0) 100%);
}

.overlay-masters-card--sheriff::after {
  background:
    radial-gradient(160px 94px at 42% 86%, rgba(34, 197, 94, 0.92) 0%, rgba(34, 197, 94, 0.34) 42%, rgba(4, 6, 12, 0) 100%);
}

.overlay-masters-card--don::after {
  background:
    radial-gradient(160px 94px at 42% 86%, rgba(147, 51, 234, 0.95) 0%, rgba(147, 51, 234, 0.36) 42%, rgba(4, 6, 12, 0) 100%);
}

.overlay-masters-card--mafia::after {
  background:
    radial-gradient(160px 94px at 42% 86%, rgba(109, 40, 217, 0.95) 0%, rgba(109, 40, 217, 0.36) 42%, rgba(4, 6, 12, 0) 100%);
}

.overlay-masters-card--eliminated::after {
  opacity: 1;
}

.overlay-masters-card--status-killed::after {
  background:
    radial-gradient(170px 98px at 86% 88%, rgba(250, 204, 21, 0.34) 0%, rgba(250, 204, 21, 0.12) 44%, rgba(4, 6, 12, 0) 100%),
    linear-gradient(145deg, rgba(161, 98, 7, 0) 48%, rgba(161, 98, 7, 0.08) 78%, rgba(161, 98, 7, 0.16) 100%);
}

.overlay-masters-card--status-voted::after {
  background:
    radial-gradient(170px 98px at 86% 88%, rgba(59, 130, 246, 0.32) 0%, rgba(59, 130, 246, 0.11) 44%, rgba(4, 6, 12, 0) 100%),
    linear-gradient(145deg, rgba(30, 64, 175, 0) 48%, rgba(30, 64, 175, 0.07) 78%, rgba(30, 64, 175, 0.14) 100%);
}

.overlay-masters-card--status-deleted::after {
  background:
    radial-gradient(170px 98px at 86% 88%, rgba(55, 65, 81, 0.3) 0%, rgba(31, 41, 55, 0.12) 44%, rgba(4, 6, 12, 0) 100%),
    linear-gradient(145deg, rgba(17, 24, 39, 0) 48%, rgba(17, 24, 39, 0.07) 78%, rgba(17, 24, 39, 0.14) 100%);
}

.overlay-masters-card--eliminated::before {
  background: linear-gradient(180deg, rgba(10, 10, 10, 0.12) 0%, rgba(10, 10, 10, 0.86) 100%);
}

.overlay-masters-card--no-photo:not(.overlay-masters-card--eliminated)::before,
.overlay-masters-card--no-photo:not(.overlay-masters-card--eliminated)::after {
  background: none;
}

.overlay-masters-card--no-photo:not(.overlay-masters-card--eliminated)::after {
  opacity: 0;
}

.overlay-masters-card__photo-stage {
  position: absolute;
  inset: 0;
  transform: translate(32px, 20px) scale(1.7);
  transform-origin: center center;
}

.overlay-masters-card__photo-inner {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform-origin: center center;
  display: block;
}

.overlay-masters-card__photo-stage--empty {
  background: transparent;
}

.overlay-masters-card__photo-mask {
  position: absolute;
  top: -40px;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  overflow: hidden;
  border-radius: 5px;
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 420ms ease,
    transform 420ms ease;
}

.overlay-masters-card--eliminated .overlay-masters-card__photo-mask {
  opacity: 0;
  transform: translateY(6px);
}

.overlay-masters-card__head {
  position: absolute;
  top: 6px;
  left: 12px;
  z-index: 5;
  display: inline-flex;
  align-items: flex-start;
  gap: 0;
  transition:
    top 420ms cubic-bezier(0.22, 1, 0.36, 1),
    left 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.overlay-masters-card--eliminated .overlay-masters-card__head {
  top: 8px;
  left: 8px;
}

.overlay-masters-card__seat {
  display: inline-flex;
  align-items: flex-start;
  justify-content: flex-start;
  min-width: 28px;
  margin-left: -10px;
}

.overlay-masters-card__seat--double {
  min-width: 34px;
}

.overlay-masters-card__seat-icon {
  width: 42px;
  height: 40px;
  object-fit: contain;
  display: block;
}

.overlay-masters-card--eliminated .overlay-masters-card__seat {
  min-width: 22px;
  margin-left: -4px;
}

.overlay-masters-card--eliminated .overlay-masters-card__seat--double {
  min-width: 28px;
}

.overlay-masters-card--eliminated .overlay-masters-card__seat-icon {
  width: 24px;
  height: 23px;
}

.overlay-masters-card__nick {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 14px;
  z-index: 5;
  margin: 0;
  font-family: 'Neue Machina', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #f8fafc;
  text-shadow: none;
}

.overlay-masters-card__curtain {
  position: absolute;
  inset: 0;
  z-index: 7;
  pointer-events: none;
  border-radius: 5px;
  background: #0a0a0a;
}

.overlay-masters-card__curtain--drop {
  animation: overlay-masters-curtain-drop 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.overlay-masters-card__curtain--lift {
  transform: translateY(0);
  animation: overlay-masters-curtain-lift 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.overlay-masters-card__role-center {
  position: absolute;
  top: 14px;
  left: var(--role-final-left, 39px);
  width: 18px;
  height: 18px;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(0, 0);
  opacity: 1;
  transition:
    top 420ms cubic-bezier(0.22, 1, 0.36, 1),
    left 420ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 260ms ease;
}

.overlay-masters-card--seat-double .overlay-masters-card__role-center {
  top: 13px;
  left: 42px;
}

.overlay-masters-card--eliminated .overlay-masters-card__role-center {
  top: 10px;
  left: calc(var(--role-final-left, 39px) - 10px);
}

.overlay-masters-card--eliminated.overlay-masters-card--seat-double .overlay-masters-card__role-center {
  top: 9px;
  left: 32px;
}

.overlay-masters-card__role-center--center {
  top: 50%;
  left: 50%;
  width: 54px;
  height: 54px;
  transform: translate(-50%, -50%);
}

.overlay-masters-card__role-center--move {
  transition:
    top 1040ms cubic-bezier(0.22, 1, 0.36, 1),
    left 1040ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 1040ms cubic-bezier(0.22, 1, 0.36, 1),
    width 1040ms cubic-bezier(0.22, 1, 0.36, 1),
    height 1040ms cubic-bezier(0.22, 1, 0.36, 1);
  top: 14px;
  left: var(--role-final-left, 39px);
  transform: translate(0, 0);
  width: 18px;
  height: 18px;
}

.overlay-masters-card--seat-double .overlay-masters-card__role-center--move {
  top: 13px;
  left: 42px;
}

.overlay-masters-card--eliminated.overlay-masters-card--seat-double .overlay-masters-card__role-center--move {
  top: 9px;
  left: 32px;
}

.overlay-masters-card__role-center-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(97%) sepia(2%) saturate(749%) hue-rotate(183deg)
    brightness(118%) contrast(95%);
}

.overlay-masters-card__status-badge {
  position: absolute;
  top: 50%;
  right: 12px;
  width: 22px;
  height: 22px;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
}

.overlay-masters-card__status-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.75;
  filter: brightness(0) saturate(100%) invert(97%) sepia(2%) saturate(749%) hue-rotate(183deg)
    brightness(118%) contrast(95%);
}

.overlay-masters-content-fade-enter-active {
  transition:
    opacity 360ms ease,
    transform 360ms ease;
}

.overlay-masters-content-fade-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.overlay-masters-content-fade-enter-from,
.overlay-masters-content-fade-leave-to {
  opacity: 0;
  transform: translateY(3px);
}

.overlay-masters-status-fade-enter-active {
  transition:
    opacity 360ms ease,
    transform 360ms ease;
}

.overlay-masters-status-fade-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.overlay-masters-status-fade-enter-from,
.overlay-masters-status-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@keyframes overlay-masters-curtain-drop {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes overlay-masters-curtain-lift {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-100%);
  }
}

</style>
