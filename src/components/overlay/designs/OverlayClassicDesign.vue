<script setup lang="ts">
import type { PropType } from 'vue'
import type { LobbyPlayer } from '@/api/lobbies'
import type { OverlayPopupMessage } from '@/utils/overlayPopupMessage'
import type { OverlayTextTone } from '@/utils/overlayPersistentMessage'
import mafiaRoleIcon from '../../../../mafia.svg?url'
import donRoleIcon from '../../../../don.svg?url'
import civilianRoleIcon from '../../../../civilian.svg?url'
import sheriffRoleIcon from '../../../../sheriff.svg?url'
import votedStatusIcon from '../../../../voted.svg?url'
import deletedStatusIcon from '../../../../deleted.svg?url'
import killedStatusIcon from '../../../../killed.svg?url'

const props = defineProps({
  seats: {
    type: Array as PropType<(LobbyPlayer | null)[]>,
    required: true,
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

function rowPhoto(p: LobbyPlayer | null): string {
  if (!p) return ''
  const byLobby = typeof p.lobby_photo_url === 'string' ? p.lobby_photo_url.trim() : ''
  if (byLobby) return byLobby
  const first = p.photo_urls?.[0]
  return typeof first === 'string' ? first.trim() : ''
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

function statusKey(status: string | null): string {
  return (status ?? '').trim().toLowerCase()
}

function isEliminatedStatus(status: string | null): boolean {
  const key = statusKey(status)
  return key === 'killed' || key === 'voted' || key === 'deleted'
}

function statusIcon(status: string | null): string {
  const key = statusKey(status)
  if (key === 'killed') return killedStatusIcon
  if (key === 'voted') return votedStatusIcon
  if (key === 'deleted') return deletedStatusIcon
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
        <img v-if="rowPhoto(p)" :src="rowPhoto(p)" alt="" class="overlay-card__photo" />
        <div v-else class="overlay-card__photo overlay-card__photo--empty" />
      </div>
      <div v-else class="overlay-card__meta-row">
        <span class="overlay-card__meta-box">
          <img
            v-if="roleIcon(p?.game_role ?? null)"
            :src="roleIcon(p?.game_role ?? null)"
            alt=""
            class="overlay-card__meta-icon"
            :class="roleIconToneClass(p?.game_role ?? null)"
          />
        </span>
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
  border-radius: 10px;
  background: rgba(12, 14, 17, 0.9);
  border: 1px solid rgba(203, 213, 225, 0.32);
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
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.45);
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
  bottom: 47px;
  transform: translateX(-50%);
  width: 186px;
  height: 126px;
  pointer-events: none;
  z-index: 1;
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
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 12px 12px 0 0;
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
  bottom: 47px;
  z-index: 3;
  display: flex;
  align-items: center;
}

.overlay-card__meta-box {
  width: 40px;
  height: 40px;
  background: #0c0e11;
  border-right: 1px solid #4b5563;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px 0 0 0;
}

.overlay-card__meta-box--status {
  background: #0c0e11;
  border: none;
  border-radius: 0 5px 0 0;
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
  filter: brightness(0) saturate(100%) invert(9%) sepia(98%) saturate(6182%) hue-rotate(336deg)
    brightness(95%) contrast(111%);
}

.overlay-card__role-icon--sheriff {
  filter: brightness(0) saturate(100%) invert(59%) sepia(97%) saturate(399%) hue-rotate(84deg)
    brightness(94%) contrast(93%);
}

.overlay-card__role-icon--don {
  filter: brightness(0) saturate(100%) invert(53%) sepia(75%) saturate(1554%) hue-rotate(230deg)
    brightness(99%) contrast(96%);
}

.overlay-card__role-icon--mafia {
  filter: brightness(0) saturate(100%) invert(17%) sepia(59%) saturate(2852%) hue-rotate(254deg)
    brightness(91%) contrast(102%);
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
</style>
