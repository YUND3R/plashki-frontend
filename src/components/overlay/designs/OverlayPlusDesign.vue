<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { PropType } from 'vue'
import type { LobbyPlayer } from '@/api/lobbies'
import type { OverlayPopupMessage } from '@/utils/overlayPopupMessage'
import type { OverlayTextTone } from '@/utils/overlayPersistentMessage'
import { rowPhoto } from '@/utils/playerCardPhotoFrame'
import OverlayPlayerPhoto from '@/components/overlay/OverlayPlayerPhoto.vue'
import '@/styles/plus-fonts.css'
import mafiaRoleIcon from '@/assets/icons/mafia.svg?url'
import donRoleIcon from '@/assets/icons/don.svg?url'
import civilianRoleIcon from '@/assets/icons/civilian.svg?url'
import sheriffRoleIcon from '@/assets/icons/sheriff.svg?url'
import sheriffCheckIcon from '@/assets/icons/shriff_check.svg?url'
import votedStatusIcon from '@/assets/icons/voted.svg?url'
import deletedStatusIcon from '@/assets/icons/deleted.svg?url'
import killedStatusIcon from '@/assets/icons/killed.svg?url'
import bestMoveStatusIcon from '@/assets/icons/best_move.svg?url'

const props = defineProps({
  seats: {
    type: Array as PropType<(LobbyPlayer | null)[]>,
    required: true,
  },
  sheriffCheck: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  bestMove: {
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

const PLUS_DESIGN = 'plus'

type ElimAnimStage = 'fill' | 'drop'
type RoleRevealStage = 'intro' | 'settle'

const elimStageBySeat = ref<Record<string, ElimAnimStage>>({})
const elimTimingBySeat = ref<Record<string, { fillMs: number; dropMs: number }>>({})
const previousStatusBySeat = ref<Record<string, string>>({})
const elimTimersBySeat = new Map<string, ReturnType<typeof setTimeout>[]>()
const elimInitialized = ref(false)
const roleRevealStageBySeat = ref<Record<string, RoleRevealStage>>({})
const previousRoleBySeat = ref<Record<string, string>>({})
const roleRevealTimersBySeat = new Map<string, ReturnType<typeof setTimeout>[]>()
const roleRevealInitialized = ref(false)

const ELIM_FILL_MS = 480
const ELIM_DROP_MS = 1080
const LH_NUM_APPEAR_MS = 460
const LH_FILL_SETTLE_MS = 180
const LH_NUM_BASE_DELAY_MS = 180
const LH_NUM_STEP_MS = 140
const ROLE_REVEAL_INTRO_MS = 820
const ROLE_REVEAL_SETTLE_MS = 220

function textToneColor(tone: OverlayTextTone): string {
  if (tone === 'yellow') return '#facc15'
  if (tone === 'red') return '#f87171'
  return '#f8fafc'
}

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

function seatGroupClass(role: string | null | undefined): string {
  const value = normalizedRole(role)
  if (value === 'sheriff') return 'overlay-plus-card__seat-group--sheriff'
  if (value === 'don' || value === 'mafia') return 'overlay-plus-card__seat-group--mafia'
  return 'overlay-plus-card__seat-group--peaceful'
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

function bestMoveLabels(): string[] {
  const labels: string[] = []
  for (const raw of props.bestMove ?? []) {
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
  return isSheriffSeat(p) && sheriffCheckLabels().length > 0
}

function isEliminatedStatus(status: string | null | undefined): boolean {
  const key = statusKey(status)
  return key === 'killed' || key === 'voted' || key === 'deleted' || key === 'best-move'
}

function isAnimatableEliminationStatus(status: string | null | undefined): boolean {
  const key = statusKey(status)
  return key === 'killed' || key === 'voted' || key === 'deleted'
}

function isAnimatableBestMoveStatus(status: string | null | undefined): boolean {
  return statusKey(status) === 'best-move'
}

function shouldRunEliminationAnimation(previous: string, current: string): boolean {
  if (!elimInitialized.value) return false
  if (isAnimatableEliminationStatus(current) && !isAnimatableEliminationStatus(previous)) return true
  const hasBestMovePayload = bestMoveLabels().length > 0
  return isAnimatableBestMoveStatus(current) && !isAnimatableBestMoveStatus(previous) && hasBestMovePayload
}

function showBestMoveFillOverlay(p: LobbyPlayer | null, idx: number): boolean {
  return elimStage(p, idx) === 'fill' && isBestMoveSeat(p) && bestMoveLabels().length > 0
}

function bestMoveFillNumDelay(checkIdx: number): string {
  return `${LH_NUM_BASE_DELAY_MS + checkIdx * LH_NUM_STEP_MS}ms`
}

function elimStage(p: LobbyPlayer | null, idx: number): ElimAnimStage | null {
  return elimStageBySeat.value[seatKey(p, idx)] ?? null
}

function setElimStage(key: string, stage?: ElimAnimStage) {
  if (stage) {
    elimStageBySeat.value = { ...elimStageBySeat.value, [key]: stage }
    return
  }
  const next = { ...elimStageBySeat.value }
  delete next[key]
  elimStageBySeat.value = next
}

function roleRevealStage(p: LobbyPlayer | null, idx: number): RoleRevealStage | null {
  return roleRevealStageBySeat.value[seatKey(p, idx)] ?? null
}

function setRoleRevealStage(key: string, stage?: RoleRevealStage) {
  if (stage) {
    roleRevealStageBySeat.value = { ...roleRevealStageBySeat.value, [key]: stage }
    return
  }
  const next = { ...roleRevealStageBySeat.value }
  delete next[key]
  roleRevealStageBySeat.value = next
}

function setElimTiming(key: string, fillMs: number, dropMs: number) {
  elimTimingBySeat.value = { ...elimTimingBySeat.value, [key]: { fillMs, dropMs } }
}

function clearElimTiming(key: string) {
  if (!elimTimingBySeat.value[key]) return
  const next = { ...elimTimingBySeat.value }
  delete next[key]
  elimTimingBySeat.value = next
}

function clearElimTimers(key: string) {
  const timers = elimTimersBySeat.get(key) ?? []
  timers.forEach((timerId) => clearTimeout(timerId))
  elimTimersBySeat.delete(key)
}

function clearRoleRevealTimers(key: string) {
  const timers = roleRevealTimersBySeat.get(key) ?? []
  timers.forEach((timerId) => clearTimeout(timerId))
  roleRevealTimersBySeat.delete(key)
}

function runEliminationAnimation(key: string, status: string) {
  clearElimTimers(key)
  const isBestMove = status === 'best-move'
  const lhCount = isBestMove ? bestMoveLabels().length : 0
  const lhFillMs =
    lhCount > 0 ? LH_NUM_BASE_DELAY_MS + (lhCount - 1) * LH_NUM_STEP_MS + LH_NUM_APPEAR_MS + LH_FILL_SETTLE_MS : 0
  const fillMs = Math.max(ELIM_FILL_MS, lhFillMs)
  const dropMs = ELIM_DROP_MS
  setElimTiming(key, fillMs, dropMs)
  setElimStage(key, 'fill')
  const t1 = setTimeout(() => setElimStage(key, 'drop'), fillMs)
  const t2 = setTimeout(() => finishEliminationAnimation(key), fillMs + dropMs + 32)
  elimTimersBySeat.set(key, [t1, t2])
}

function isRevealableRole(role: string): boolean {
  return role === 'mafia' || role === 'don' || role === 'peaceful' || role === 'sheriff'
}

function shouldRunRoleReveal(previous: string, current: string): boolean {
  if (!roleRevealInitialized.value) return false
  if (!isRevealableRole(current)) return false
  return current !== previous
}

function runRoleRevealAnimation(key: string) {
  clearRoleRevealTimers(key)
  setRoleRevealStage(key, 'intro')
  const t1 = setTimeout(() => setRoleRevealStage(key, 'settle'), ROLE_REVEAL_INTRO_MS)
  const t2 = setTimeout(() => setRoleRevealStage(key), ROLE_REVEAL_INTRO_MS + ROLE_REVEAL_SETTLE_MS)
  roleRevealTimersBySeat.set(key, [t1, t2])
}

function triggerBestMoveAnimationsAfterSave() {
  props.seats.forEach((p, idx) => {
    if (!isBestMoveSeat(p)) return
    const key = seatKey(p, idx)
    if (elimStageBySeat.value[key]) return
    runEliminationAnimation(key, 'best-move')
  })
}

function finishEliminationAnimation(key: string) {
  if (elimStageBySeat.value[key] !== 'drop') return
  clearElimTimers(key)
  requestAnimationFrame(() => {
    setElimStage(key)
    clearElimTiming(key)
  })
}

function onElimPhotoAnimationEnd(p: LobbyPlayer | null, idx: number, event: AnimationEvent) {
  if (event.target !== event.currentTarget) return
  if (elimStage(p, idx) !== 'drop') return
  if (event.animationName !== 'overlay-plus-photo-scale-out') return
  finishEliminationAnimation(seatKey(p, idx))
}

function showPhotoWrap(p: LobbyPlayer | null, idx: number): boolean {
  if (!isEliminatedStatus(p?.status ?? null)) return true
  const stage = elimStage(p, idx)
  return stage === 'fill' || stage === 'drop'
}

function showStatusBar(p: LobbyPlayer | null, idx: number): boolean {
  if (!isEliminatedStatus(p?.status ?? null)) return false
  return elimStage(p, idx) !== 'fill'
}

function showRoleRevealBanner(p: LobbyPlayer | null, idx: number): boolean {
  if (!roleLabel(p?.game_role ?? null)) return false
  return roleRevealStage(p, idx) === 'intro'
}

function showFooterMainHidden(p: LobbyPlayer | null, idx: number): boolean {
  return roleRevealStage(p, idx) === 'intro'
}

function showFooterMainRevealIn(p: LobbyPlayer | null, idx: number): boolean {
  return roleRevealStage(p, idx) === 'settle'
}

function roleRevealTextToneClass(role: string | null | undefined): string {
  const key = normalizedRole(role)
  if (key === 'sheriff') return 'overlay-plus-card__footer-role-reveal-text--sheriff'
  if (key === 'mafia' || key === 'don') return 'overlay-plus-card__footer-role-reveal-text--mafia'
  return 'overlay-plus-card__footer-role-reveal-text--peaceful'
}

function showStatusFillOverlay(p: LobbyPlayer | null, idx: number): boolean {
  const stage = elimStage(p, idx)
  return stage === 'fill' || stage === 'drop'
}

function elimCardAnimStyle(p: LobbyPlayer | null, idx: number): Record<string, string> | undefined {
  const timing = elimTimingBySeat.value[seatKey(p, idx)]
  if (!timing) return undefined
  return {
    '--plus-elim-fill-ms': `${timing.fillMs}ms`,
    '--plus-elim-drop-ms': `${timing.dropMs}ms`,
  }
}

function isCardEliminatedLayout(p: LobbyPlayer | null, idx: number): boolean {
  if (!isEliminatedStatus(p?.status ?? null)) return false
  const stage = elimStage(p, idx)
  return stage !== 'fill' && stage !== 'drop'
}

function isCardDropAnimating(p: LobbyPlayer | null, idx: number): boolean {
  return elimStage(p, idx) === 'drop'
}

function statusIcon(status: string | null): string {
  const key = statusKey(status)
  if (key === 'killed') return killedStatusIcon
  if (key === 'voted') return votedStatusIcon
  if (key === 'deleted') return deletedStatusIcon
  if (key === 'best-move') return bestMoveStatusIcon
  return ''
}

function eliminatedStatusIcon(status: string | null | undefined): string {
  const key = statusKey(status)
  if (key === 'best-move') return killedStatusIcon
  return statusIcon(status ?? null)
}

function showEliminatedStatusBarIcon(p: LobbyPlayer | null): boolean {
  if (!eliminatedStatusIcon(p?.status ?? null)) return false
  if (isBestMoveSeat(p) && bestMoveLabels().length > 0) return false
  return true
}

function trimNickname(raw: string | null | undefined, maxLen: number): string {
  const value = (raw ?? '').trim()
  if (!value) return ''
  if (value.length <= maxLen) return value
  return `${value.slice(0, maxLen)}..`
}

function displayNickname(p: LobbyPlayer | null): string {
  if (!p) return ''
  const maxLen = isEliminatedStatus(p.status) ? 10 : 14
  return trimNickname(p.nickname, maxLen)
}

onMounted(() => {
  const nextStatus: Record<string, string> = {}
  const nextRole: Record<string, string> = {}
  props.seats.forEach((p, idx) => {
    const key = seatKey(p, idx)
    nextStatus[key] = statusKey(p?.status)
    nextRole[key] = normalizedRole(p?.game_role)
  })
  previousStatusBySeat.value = nextStatus
  previousRoleBySeat.value = nextRole
  elimInitialized.value = true
  roleRevealInitialized.value = true
})

watch(
  () => props.seats.map((p, idx) => `${seatKey(p, idx)}:${statusKey(p?.status)}`).join('|'),
  () => {
    const next: Record<string, string> = {}
    props.seats.forEach((p, idx) => {
      const key = seatKey(p, idx)
      const current = statusKey(p?.status)
      const previous = previousStatusBySeat.value[key] ?? ''
      if (shouldRunEliminationAnimation(previous, current)) {
        runEliminationAnimation(key, current)
      }
      next[key] = current
    })
    previousStatusBySeat.value = next
  },
)

watch(
  () => bestMoveLabels().join('|'),
  (current, previous) => {
    if (!current || current === previous) return
    triggerBestMoveAnimationsAfterSave()
  },
)

watch(
  () => props.seats.map((p, idx) => `${seatKey(p, idx)}:${normalizedRole(p?.game_role)}`).join('|'),
  () => {
    const next: Record<string, string> = {}
    props.seats.forEach((p, idx) => {
      const key = seatKey(p, idx)
      const current = normalizedRole(p?.game_role)
      const previous = previousRoleBySeat.value[key] ?? ''
      if (shouldRunRoleReveal(previous, current)) {
        runRoleRevealAnimation(key)
      }
      if (!isRevealableRole(current)) {
        clearRoleRevealTimers(key)
        setRoleRevealStage(key)
      }
      next[key] = current
    })
    previousRoleBySeat.value = next
  },
)

onUnmounted(() => {
  elimTimersBySeat.forEach((timers) => timers.forEach(clearTimeout))
  elimTimersBySeat.clear()
  roleRevealTimersBySeat.forEach((timers) => timers.forEach(clearTimeout))
  roleRevealTimersBySeat.clear()
})
</script>

<template>
  <section class="overlay-plus">
    <Transition name="overlay-plus-popup">
      <article
        v-if="props.popupMessage"
        :key="props.popupMessage.id"
        class="overlay-plus__popup"
      >
        <p
          v-if="props.popupMessage.h1"
          class="overlay-plus__popup-h1"
          :style="{ color: textToneColor(props.popupMessage.h1_color) }"
        >
          {{ props.popupMessage.h1 }}
        </p>
        <p
          v-if="props.popupMessage.h2"
          class="overlay-plus__popup-h2"
          :style="{ color: textToneColor(props.popupMessage.h2_color) }"
        >
          {{ props.popupMessage.h2 }}
        </p>
      </article>
    </Transition>
    <p
      v-if="props.persistentMessage.trim()"
      class="overlay-plus__persistent"
      :style="{ color: textToneColor(props.persistentColor) }"
    >
      {{ props.persistentMessage }}
    </p>

    <article
      v-for="(p, idx) in props.seats"
      :key="p?.membership_id ?? `empty-${idx}`"
      class="overlay-plus-card"
      :class="{
        'overlay-plus-card--eliminated': isCardEliminatedLayout(p, idx),
        'overlay-plus-card--anim-drop': isCardDropAnimating(p, idx),
      }"
      :style="elimCardAnimStyle(p, idx)"
    >
      <div v-if="showSheriffChecksAbove(p)" class="overlay-plus-card__checks">
        <div class="overlay-plus-card__checks-badge">
          <img :src="sheriffCheckIcon" alt="" class="overlay-plus-card__checks-icon" />
          <span
            v-for="(label, checkIdx) in sheriffCheckLabels()"
            :key="`${seatKey(p, idx)}-check-${checkIdx}-${label}`"
            class="overlay-plus-card__check-num"
            :class="{ 'overlay-plus-card__check-num--mafia': isSheriffCheckMafiaLike(label) }"
          >
            {{ label }}
          </span>
        </div>
      </div>

      <div
        v-if="showPhotoWrap(p, idx)"
        class="overlay-plus-card__photo-wrap"
        :class="{
          'overlay-plus-card__photo-wrap--anim-fill': elimStage(p, idx) === 'fill',
          'overlay-plus-card__photo-wrap--anim-drop': elimStage(p, idx) === 'drop',
        }"
        @animationend="onElimPhotoAnimationEnd(p, idx, $event)"
      >
        <div class="overlay-plus-card__photo">
          <OverlayPlayerPhoto
            v-if="photoUrl(p)"
            :player="p"
            :design-code="PLUS_DESIGN"
            img-class="overlay-plus-card__photo-img"
          />
          <div v-else class="overlay-plus-card__photo-img overlay-plus-card__photo-img--empty" />
        </div>
        <div
          v-if="showStatusFillOverlay(p, idx)"
          class="overlay-plus-card__status-fill"
          :class="{
            'overlay-plus-card__status-fill--lh': showBestMoveFillOverlay(p, idx),
            'overlay-plus-card__status-fill--fade-out': elimStage(p, idx) === 'drop',
          }"
        >
          <div v-if="showBestMoveFillOverlay(p, idx)" class="overlay-plus-card__status-fill-lh">
            <span class="overlay-plus-card__status-fill-lh-label">ЛХ</span>
            <span
              v-for="(label, checkIdx) in bestMoveLabels()"
              :key="`${seatKey(p, idx)}-fill-lh-${checkIdx}-${label}`"
              class="overlay-plus-card__status-fill-lh-num"
              :class="{ 'overlay-plus-card__status-fill-lh-num--mafia': isSheriffCheckMafiaLike(label) }"
              :style="{ animationDelay: bestMoveFillNumDelay(checkIdx) }"
            >
              {{ label }}
            </span>
          </div>
          <img
            v-else
            :src="eliminatedStatusIcon(p?.status)"
            alt=""
            class="overlay-plus-card__status-fill-icon"
          />
        </div>
      </div>

      <div
        v-if="showStatusBar(p, idx)"
        class="overlay-plus-card__status-bar"
        :class="{
          'overlay-plus-card__status-bar--anim-in': elimStage(p, idx) === 'drop',
          'overlay-plus-card__status-bar--ready': showStatusBar(p, idx) && elimStage(p, idx) !== 'drop',
        }"
      >
        <img
          v-if="showEliminatedStatusBarIcon(p)"
          :src="eliminatedStatusIcon(p?.status)"
          alt=""
          class="overlay-plus-card__status-bar-icon"
        />
        <span
          v-if="isBestMoveSeat(p) && bestMoveLabels().length"
          class="overlay-plus-card__status-lh"
        >
          <span class="overlay-plus-card__status-lh-label">ЛХ</span>
          <span
            v-for="(label, checkIdx) in bestMoveLabels()"
            :key="`${seatKey(p, idx)}-best-move-${checkIdx}-${label}`"
            class="overlay-plus-card__status-lh-num"
            :class="{ 'overlay-plus-card__status-lh-num--mafia': isSheriffCheckMafiaLike(label) }"
          >
            {{ label }}
          </span>
        </span>
      </div>

      <div
        class="overlay-plus-card__footer"
        :class="{ 'overlay-plus-card__footer--eliminated': isCardEliminatedLayout(p, idx) }"
      >
        <div v-if="showRoleRevealBanner(p, idx)" class="overlay-plus-card__footer-role-reveal">
          <span
            class="overlay-plus-card__footer-role-reveal-text"
            :class="roleRevealTextToneClass(p?.game_role)"
          >
            {{ roleLabel(p?.game_role ?? null) }}
          </span>
        </div>
        <div
          class="overlay-plus-card__footer-main"
          :class="{
            'overlay-plus-card__footer-main--hidden': showFooterMainHidden(p, idx),
            'overlay-plus-card__footer-main--reveal-in': showFooterMainRevealIn(p, idx),
          }"
        >
          <span class="overlay-plus-card__seat-group" :class="seatGroupClass(p?.game_role)">
            <span class="overlay-plus-card__seat">{{ idx + 1 }}</span>
            <Transition name="overlay-plus-role" mode="out-in">
              <img
                v-if="roleIcon(p?.game_role ?? null)"
                :key="`role-${p?.membership_id ?? idx}-${p?.game_role ?? 'none'}`"
                :src="roleIcon(p?.game_role ?? null)"
                :alt="roleLabel(p?.game_role ?? null)"
                class="overlay-plus-card__role-icon"
              />
            </Transition>
          </span>
          <p class="overlay-plus-card__nick">{{ displayNickname(p) }}</p>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.overlay-plus {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(10, 186px);
  gap: 6px;
  justify-content: center;
  align-items: end;
  padding: 0;
  background: transparent;
  font-family: var(--plus-font-family);
  font-weight: var(--plus-font-weight);
  --plus-elim-drop-ms: 1080ms;
}

.overlay-plus__persistent {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 88vw;
  margin: 0;
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(12, 14, 17, 0.94);
  color: #f8fafc;
  font-size: 22px;
  font-weight: inherit;
  line-height: 1.12;
  text-align: center;
  width: fit-content;
  white-space: pre-wrap;
  z-index: 200;
}

.overlay-plus__popup {
  position: fixed;
  left: 20px;
  top: 20px;
  transform: none;
  max-width: min(36vw, 680px);
  margin: 0;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(12, 14, 17, 0.94);
  color: #f8fafc;
  z-index: 210;
}

.overlay-plus__popup-h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.08;
  font-weight: inherit;
  color: #f8fafc;
}

.overlay-plus__popup-h2 {
  margin: 6px 0 0;
  font-size: 20px;
  line-height: 1.14;
  font-weight: inherit;
  opacity: 0.95;
  color: #f8fafc;
}

.overlay-plus-popup-enter-active {
  transition:
    transform 320ms ease-out,
    opacity 320ms ease-out;
}

.overlay-plus-popup-leave-active {
  transition:
    transform 220ms ease-in,
    opacity 220ms ease-in;
}

.overlay-plus-popup-enter-from {
  opacity: 0;
  transform: translateX(-24px);
}

.overlay-plus-popup-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.overlay-plus-card {
  position: relative;
  width: 186px;
  height: 224px;
  border-radius: 8px;
  overflow: visible;
  background: #0c0e11;
}

.overlay-plus-card--anim-drop {
  height: 224px;
  overflow: hidden;
  background: rgba(12, 14, 17, 0.92);
  animation: overlay-plus-card-shrink var(--plus-elim-drop-ms, 1080ms)
    cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
}

.overlay-plus-card--anim-drop .overlay-plus-card__status-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 5;
}

.overlay-plus-card--eliminated {
  display: flex;
  flex-direction: column;
  height: auto;
  padding-bottom: 38px;
  box-sizing: border-box;
  overflow: visible;
  background: rgba(12, 14, 17, 0.92);
  transition: background 320ms ease;
}

.overlay-plus-card__status-bar--anim-in {
  animation: overlay-plus-status-bar-in var(--plus-elim-drop-ms, 720ms)
    cubic-bezier(0.25, 0.85, 0.35, 1) forwards;
}

.overlay-plus-card__status-bar--ready {
  opacity: 1;
}

.overlay-plus-card__status-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  min-height: 36px;
  padding: 0.35rem 0.55rem;
  box-sizing: border-box;
  border-radius: 8px 8px 0 0;
  flex-shrink: 0;
  background: rgba(12, 14, 17, 0.88);
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
  position: relative;
  z-index: 3;
  will-change: opacity;
}

.overlay-plus-card__status-bar-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(97%) sepia(6%) saturate(326%) hue-rotate(189deg)
    brightness(104%) contrast(96%);
}

.overlay-plus-card__status-lh {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #f8fafc;
  font-size: 0.8125rem;
  font-weight: inherit;
  line-height: 1;
}

.overlay-plus-card__status-lh-label {
  font-size: 0.9375rem;
}

.overlay-plus-card__status-lh-num {
  font-size: 0.9375rem;
}

.overlay-plus-card__status-lh-num--mafia {
  color: #60a5fa;
}

.overlay-plus-card__photo-wrap {
  position: relative;
  width: 186px;
  height: 186px;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  flex-shrink: 0;
}

.overlay-plus-card__photo-wrap--anim-drop {
  transform-origin: top center;
  animation: overlay-plus-photo-scale-out var(--plus-elim-drop-ms, 1080ms)
    cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
  pointer-events: none;
  will-change: transform;
}

.overlay-plus-card__photo-wrap--anim-drop .overlay-plus-card__photo {
  animation: overlay-plus-photo-fade-out var(--plus-elim-drop-ms, 720ms)
    linear forwards;
  will-change: opacity;
}

.overlay-plus-card__photo-wrap--anim-fill .overlay-plus-card__photo {
  animation: overlay-plus-photo-dim var(--plus-elim-fill-ms, 480ms) ease forwards;
}

.overlay-plus-card__status-fill {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(12, 14, 17, 0.78);
  pointer-events: none;
}

.overlay-plus-card__photo-wrap--anim-fill .overlay-plus-card__status-fill {
  animation: overlay-plus-fill-bg var(--plus-elim-fill-ms, 480ms) ease forwards;
}

.overlay-plus-card__status-fill--fade-out {
  animation: overlay-plus-fill-out 180ms ease-out forwards;
}

.overlay-plus-card__status-fill-icon {
  width: 72px;
  height: 72px;
  object-fit: contain;
  opacity: 0;
  transform: scale(0.35);
  filter: brightness(0) saturate(100%) invert(97%) sepia(6%) saturate(326%) hue-rotate(189deg)
    brightness(104%) contrast(96%);
}

.overlay-plus-card__photo-wrap--anim-fill .overlay-plus-card__status-fill-icon {
  animation: overlay-plus-fill-icon 480ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.overlay-plus-card__status-fill--lh {
  flex-direction: column;
  gap: 0.65rem;
}

.overlay-plus-card__status-fill-lh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.55rem;
  padding: 0 0.75rem;
}

.overlay-plus-card__status-fill-lh-label {
  font-size: 1.75rem;
  font-weight: inherit;
  line-height: 1;
  color: #f8fafc;
  opacity: 0;
  transform: scale(0.35);
}

.overlay-plus-card__photo-wrap--anim-fill .overlay-plus-card__status-fill-lh-label {
  animation: overlay-plus-fill-icon 360ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.overlay-plus-card__status-fill-lh-num {
  font-size: 1.75rem;
  font-weight: inherit;
  line-height: 1;
  color: #f8fafc;
  opacity: 0;
  transform: scale(0.35);
}

.overlay-plus-card__photo-wrap--anim-fill .overlay-plus-card__status-fill-lh-num {
  animation: overlay-plus-fill-icon 360ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.overlay-plus-card__status-fill-lh-num--mafia {
  color: #60a5fa;
}

@keyframes overlay-plus-photo-dim {
  to {
    opacity: 0.35;
  }
}

@keyframes overlay-plus-fill-bg {
  from {
    background: rgba(12, 14, 17, 0);
  }
  to {
    background: rgba(12, 14, 17, 0.78);
  }
}

@keyframes overlay-plus-fill-icon {
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes overlay-plus-photo-scale-out {
  from {
    transform: scaleY(1);
  }
  to {
    transform: scaleY(0);
  }
}

@keyframes overlay-plus-card-shrink {
  from {
    height: 224px;
  }
  to {
    height: 74px;
  }
}

@keyframes overlay-plus-fill-out {
  from {
    background: rgba(12, 14, 17, 0.78);
  }
  to {
    background: rgba(12, 14, 17, 0);
  }
}

@keyframes overlay-plus-photo-fade-out {
  0% {
    opacity: 0.35;
  }
  24% {
    opacity: 0.2;
  }
  62% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

@keyframes overlay-plus-status-bar-in {
  0% {
    opacity: 0;
  }
  35% {
    opacity: 0.45;
  }
  100% {
    opacity: 1;
  }
}

.overlay-plus-card__photo {
  width: 100%;
  height: 100%;
  background: #0c0e11;
  overflow: hidden;
}

.overlay-plus-card__photo-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.overlay-plus-card__photo-img--empty {
  background: linear-gradient(180deg, #111827 0%, #0c0e11 100%);
}

.overlay-plus-card__seat-group {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  padding: 0.4rem;
  border-radius: 6px;
  box-sizing: border-box;
}

.overlay-plus-card__seat-group--peaceful {
  /* Мирный: насыщенный малиновый, заметный даже на маленьком экране. */
  background: linear-gradient(135deg, #ec1972 0%, #be185d 100%);
}

.overlay-plus-card__seat-group--sheriff {
  /* Шериф: яркий зелёный. */
  background: linear-gradient(135deg, #38d36a 0%, #15803d 100%);
}

.overlay-plus-card__seat-group--mafia {
  /* Мафия и дон: глубокий синий с яркой синей окантовкой. */
  background: linear-gradient(135deg, #2563eb 0%, #172554 100%);
}

.overlay-plus-card__role-icon {
  width: 15px;
  height: 15px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(100%);
}

.overlay-plus-role-enter-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.overlay-plus-role-leave-active {
  transition: opacity 100ms ease;
}

.overlay-plus-role-enter-from {
  opacity: 0;
  transform: scale(0.82);
}

.overlay-plus-role-leave-to {
  opacity: 0;
}

.overlay-plus-card__footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0.25rem;
  box-sizing: border-box;
  background: rgba(12, 14, 17, 0.88);
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}

.overlay-plus-card__footer-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
}

.overlay-plus-card__footer-main--hidden {
  opacity: 0;
}

.overlay-plus-card__footer-main--reveal-in {
  animation: overlay-plus-footer-main-in 220ms ease-out forwards;
}

.overlay-plus-card__footer-role-reveal {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.6rem;
  box-sizing: border-box;
  background: rgba(12, 14, 17, 0.94);
  pointer-events: none;
  animation: overlay-plus-role-reveal-banner 820ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
}

.overlay-plus-card__footer-role-reveal-text {
  font-size: 0.9375rem;
  font-weight: inherit;
  line-height: 1;
  color: #f8fafc;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overlay-plus-card__footer-role-reveal-text--peaceful {
  color: #fb4b93;
}

.overlay-plus-card__footer-role-reveal-text--sheriff {
  color: #4ade80;
}

.overlay-plus-card__footer-role-reveal-text--mafia {
  color: #60a5fa;
}

@keyframes overlay-plus-role-reveal-banner {
  0% {
    opacity: 0;
    transform: scaleX(0.78);
  }
  18% {
    opacity: 1;
    transform: scaleX(1);
  }
  72% {
    opacity: 1;
    transform: scaleX(1);
  }
  100% {
    opacity: 0;
    transform: scaleX(0.88);
  }
}

@keyframes overlay-plus-footer-main-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.overlay-plus-card__seat {
  flex-shrink: 0;
  min-width: 0;
  font-size: 1.0625rem;
  font-weight: inherit;
  line-height: 1;
  color: #ffffff;
}

.overlay-plus-card__nick {
  margin: 0;
  min-width: 0;
  flex: 1;
  font-size: 0.9375rem;
  font-weight: inherit;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #f8fafc;
}

.overlay-plus-card__checks {
  position: absolute;
  left: 0;
  bottom: calc(100% + 3px);
  z-index: 12;
  display: inline-flex;
  align-items: center;
  pointer-events: none;
}

.overlay-plus-card__checks-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.65rem;
  border-radius: 5px;
  box-sizing: border-box;
  background: rgba(12, 14, 17, 0.88);
}

.overlay-plus-card__checks-icon {
  width: 20px;
  height: 15px;
  flex-shrink: 0;
  display: block;
  object-fit: contain;
}

.overlay-plus-card__check-num {
  font-size: 0.9375rem;
  font-weight: inherit;
  line-height: 1;
  color: #ffffff;
}

.overlay-plus-card__check-num--mafia {
  color: #60a5fa;
}
</style>
