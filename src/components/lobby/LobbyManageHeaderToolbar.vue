<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { getLobbyOverlayDesigns, getOverlayState, setOverlayActiveLobby } from '@/api/lobbies'
import { useLobbyManageUiStore } from '@/stores/lobbyManageUi'
import overlayPreviewIcon from '@/assets/icons/overlay-prewiev.svg?url'
import obsIcon from '@/assets/icons/obs.svg?url'

const route = useRoute()
const router = useRouter()
const lobbyManageUi = useLobbyManageUiStore()
const { designChangedToken } = storeToRefs(lobbyManageUi)
const previewBusy = ref(false)
const copyOverlayBusy = ref(false)
const overlayLinkCopied = ref(false)
const overlayToastText = ref('Ссылка скопирована')
const selectedDesign = ref('classic')
const activeObsLobbyId = ref('')
let overlayLinkCopiedTimer: ReturnType<typeof setTimeout> | null = null

const lobbyId = computed(() => String(route.params.lobbyId ?? '').trim())

const selectedDesignLabel = computed(() => {
  const value = selectedDesign.value.trim().toLowerCase()
  if (!value) return 'Classic'
  return value
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
})

async function loadSelectedDesign() {
  if (!lobbyId.value) {
    selectedDesign.value = 'classic'
    return
  }
  try {
    const data = await getLobbyOverlayDesigns(lobbyId.value)
    const value = (data.selected_overlay_design ?? '').trim().toLowerCase()
    selectedDesign.value = value || 'classic'
  } catch {
    selectedDesign.value = 'classic'
  }
}

function overlayLiveAbsoluteUrl(): string {
  const resolved = router.resolve({ name: 'overlay-live' })
  if (typeof window === 'undefined') return resolved.href
  if (/^https?:\/\//i.test(resolved.href)) return resolved.href
  return `${window.location.origin}${resolved.href}`
}

const isCurrentLobbyActiveInObs = computed(() => {
  return !!lobbyId.value && activeObsLobbyId.value === lobbyId.value
})

async function syncActiveObsLobby() {
  try {
    const state = await getOverlayState()
    activeObsLobbyId.value = state.active_lobby_id ?? ''
  } catch {
    activeObsLobbyId.value = ''
  }
}

function showObsToast(message: string, ms = 2200) {
  overlayToastText.value = message
  overlayLinkCopied.value = true
  if (overlayLinkCopiedTimer) clearTimeout(overlayLinkCopiedTimer)
  overlayLinkCopiedTimer = setTimeout(() => {
    overlayLinkCopied.value = false
    overlayLinkCopiedTimer = null
  }, ms)
}

function openDesignPicker() {
  lobbyManageUi.requestOpenDesignPicker()
}

async function openDesignPreview() {
  if (!lobbyId.value || previewBusy.value) return
  previewBusy.value = true
  try {
    await loadSelectedDesign()
    const resolved = router.resolve({
      name: 'overlay-lobby',
      params: { lobbyId: lobbyId.value },
    })
    window.open(resolved.href, '_blank', 'noopener,noreferrer')
  } finally {
    previewBusy.value = false
  }
}

async function copyOverlayLink() {
  if (!lobbyId.value || copyOverlayBusy.value) return
  copyOverlayBusy.value = true
  try {
    await setOverlayActiveLobby({ lobby_id: lobbyId.value })
    activeObsLobbyId.value = lobbyId.value
    const url = overlayLiveAbsoluteUrl()
    await navigator.clipboard.writeText(url)
    showObsToast('Лобби активно в OBS. Live-ссылка скопирована.')
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 403) {
        showObsToast('Только хост может переключать OBS-лобби.', 3000)
        return
      }
      if (e.status === 404) {
        showObsToast('Лобби не найдено (возможно удалено).', 3000)
        return
      }
      if (e.status === 400) {
        showObsToast('Некорректный lobby_id.', 3000)
        return
      }
    }
    window.prompt('Скопируйте live-ссылку для OBS:', overlayLiveAbsoluteUrl())
  } finally {
    copyOverlayBusy.value = false
  }
}

onMounted(() => {
  void loadSelectedDesign()
  void syncActiveObsLobby()
})

watch(lobbyId, () => {
  void loadSelectedDesign()
})

watch(designChangedToken, () => {
  void loadSelectedDesign()
})

watch(lobbyId, () => {
  void syncActiveObsLobby()
})
</script>

<template>
  <div class="shell-lobby-toolbar">
    <button
      type="button"
      class="shell-lobby-toolbar__obs shell-lobby-toolbar__obs--design-main"
      :title="`Выбранный дизайн: ${selectedDesignLabel}`"
      aria-label="Выбрать дизайн плашек"
      @click="openDesignPicker"
    >
      <span class="shell-lobby-toolbar__label-wide">Дизайн плашек</span>
      <span class="shell-lobby-toolbar__design-inline-sep shell-lobby-toolbar__label-wide" aria-hidden="true">•</span>
      <strong class="shell-lobby-toolbar__design-inline-name">{{ selectedDesignLabel }}</strong>
    </button>
    <button
      type="button"
      class="shell-lobby-toolbar__obs shell-lobby-toolbar__obs--icon"
      :disabled="!lobbyId || previewBusy"
      title="Открыть предпросмотр текущего дизайна"
      aria-label="Открыть предпросмотр overlay"
      @click="openDesignPreview"
    >
      <span class="shell-lobby-toolbar__obs-icon" aria-hidden="true">
        <img class="shell-lobby-toolbar__overlay-preview-icon" :src="overlayPreviewIcon" alt="" width="16" height="16" />
      </span>
      <span class="shell-lobby-toolbar__label-wide">{{ previewBusy ? 'Превью…' : 'Превью' }}</span>
    </button>
    <div class="shell-lobby-toolbar__obs-wrap">
      <Transition name="shell-lobby-toolbar__toast">
        <span
          v-if="overlayLinkCopied"
          class="shell-lobby-toolbar__toast"
          role="status"
          aria-live="polite"
        >
          {{ overlayToastText }}
        </span>
      </Transition>
      <button
        type="button"
        class="shell-lobby-toolbar__obs shell-lobby-toolbar__obs--icon"
        :disabled="!lobbyId || copyOverlayBusy"
        title="Вывести в OBS"
        aria-label="Вывести текущее лобби в OBS"
        @click="copyOverlayLink"
      >
        <span class="shell-lobby-toolbar__obs-icon" aria-hidden="true">
          <img class="shell-lobby-toolbar__obs-logo-icon" :src="obsIcon" alt="" width="16" height="16" />
        </span>
        <span class="shell-lobby-toolbar__label-wide">
          {{ isCurrentLobbyActiveInObs ? 'Активно в OBS' : 'Вывести в OBS' }}
        </span>
      </button>
    </div>
    <button
      type="button"
      class="shell-lobby-toolbar__obs shell-lobby-toolbar__obs--icon"
      :disabled="!lobbyId"
      title="Удалить текущее лобби"
      aria-label="Удалить лобби"
      @click="lobbyManageUi.requestOpenDeleteConfirm"
    >
      <span class="shell-lobby-toolbar__obs-icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M5 0.75C5 0.335786 5.33579 0 5.75 0H9.75C10.1642 0 10.5 0.335786 10.5 0.75V1.5H14.75C15.1642 1.5 15.5 1.83579 15.5 2.25C15.5 2.66421 15.1642 3 14.75 3H0.75C0.335786 3 0 2.66421 0 2.25C0 1.83579 0.335786 1.5 0.75 1.5H5V0.75Z"
            fill="currentColor"
          />
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M1.9899 5.69478C2.01803 5.44157 2.23206 5.25 2.48684 5.25H13.0132C13.2679 5.25 13.482 5.44157 13.5101 5.69478L13.7102 7.49613C14.071 10.7431 14.071 14.0201 13.7102 17.267L13.6905 17.4444C13.5591 18.6269 12.6426 19.5699 11.4643 19.7349C9.0001 20.0799 6.49989 20.0799 4.03574 19.7349C2.85737 19.5699 1.94085 18.6269 1.80945 17.4444L1.78975 17.267C1.42897 14.0201 1.42897 10.7431 1.78975 7.49613L1.9899 5.69478ZM10.2803 10.2197C10.5732 10.5126 10.5732 10.9874 10.2803 11.2803L8.81066 12.75L10.2803 14.2197C10.5732 14.5126 10.5732 14.9874 10.2803 15.2803C9.98744 15.5732 9.51256 15.5732 9.21967 15.2803L7.75 13.8107L6.28034 15.2803C5.98745 15.5732 5.51257 15.5732 5.21968 15.2803C4.92678 14.9874 4.92678 14.5126 5.21968 14.2197L6.68934 12.75L5.21967 11.2803C4.92678 10.9874 4.92678 10.5126 5.21967 10.2197C5.51256 9.92678 5.98744 9.92678 6.28033 10.2197L7.75 11.6893L9.21968 10.2197C9.51257 9.92678 9.98745 9.92678 10.2803 10.2197Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span class="shell-lobby-toolbar__label-wide">Удалить лобби</span>
    </button>
  </div>
</template>

<style scoped>
.shell-lobby-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  min-height: var(--shell-header-row-h, 2.375rem);
  overflow: visible;
  position: relative;
  z-index: 220;
}

.shell-lobby-toolbar__obs-wrap {
  position: relative;
  display: inline-flex;
  overflow: visible;
  z-index: 230;
}

.shell-lobby-toolbar__toast {
  position: absolute;
  right: 0;
  top: calc(100% + 0.45rem);
  transform: translateY(0);
  z-index: 24;
  padding: 0.3rem 0.55rem;
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1.2;
  white-space: normal;
  max-width: min(16rem, calc(100vw - 1rem));
  text-align: left;
  color: #111827;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  pointer-events: none;
}

.shell-lobby-toolbar__toast::after {
  content: '';
  position: absolute;
  bottom: 100%;
  right: 0.65rem;
  transform: none;
  border: 5px solid transparent;
  border-bottom-color: #fff;
}

.shell-lobby-toolbar__toast-enter-active,
.shell-lobby-toolbar__toast-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.shell-lobby-toolbar__toast-enter-from,
.shell-lobby-toolbar__toast-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.shell-lobby-toolbar__obs {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: var(--shell-header-row-h, 2.375rem);
  height: var(--shell-header-row-h, 2.375rem);
  padding: 0 0.65rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  box-sizing: border-box;
}

.shell-lobby-toolbar__obs-icon {
  display: flex;
  color: #6b7280;
}

.shell-lobby-toolbar__overlay-preview-icon {
  width: 16px;
  height: 16px;
  display: block;
  /* Keep the same neutral icon tone as before. */
  filter: brightness(0) saturate(100%) invert(43%) sepia(9%) saturate(486%) hue-rotate(182deg) brightness(92%)
    contrast(88%);
}

.shell-lobby-toolbar__obs-logo-icon {
  width: 16px;
  height: 16px;
  display: block;
  /* Keep the same neutral icon tone as before. */
  filter: brightness(0) saturate(100%) invert(43%) sepia(9%) saturate(486%) hue-rotate(182deg) brightness(92%)
    contrast(88%);
}

.shell-lobby-toolbar__obs--design-main {
  gap: 0.25rem;
  color: #4b5563;
}

.shell-lobby-toolbar__design-inline-sep {
  color: #9ca3af;
  font-size: 0.75rem;
}

.shell-lobby-toolbar__design-inline-name {
  color: #6b7280;
  font-weight: 600;
}

.shell-lobby-toolbar__obs--danger {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}

.shell-lobby-toolbar__obs--danger:hover:not(:disabled) {
  color: #991b1b;
  background: #fee2e2;
  border-color: #fca5a5;
}

@media (max-width: 1024px) {
  .shell-lobby-toolbar {
    flex-wrap: nowrap;
    gap: 0.35rem;
    overflow: visible;
  }

  .shell-lobby-toolbar__label-wide {
    display: none;
  }

  .shell-lobby-toolbar__obs {
    padding: 0 0.5rem;
    min-width: var(--shell-header-row-h, 2.375rem);
  }

  .shell-lobby-toolbar__obs--design-main {
    max-width: 7.5rem;
    padding: 0 0.55rem;
  }

  .shell-lobby-toolbar__design-inline-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shell-lobby-toolbar__obs--icon {
    width: var(--shell-header-row-h, 2.375rem);
    padding: 0;
  }
}
</style>
