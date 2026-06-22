<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getLobbyOverlayDesigns } from '@/api/lobbies'
import { useLobbyManageUiStore } from '@/stores/lobbyManageUi'
import deleteIcon from '@/assets/icons/delete.svg?url'

const route = useRoute()
const router = useRouter()
const lobbyManageUi = useLobbyManageUiStore()
const { designChangedToken } = storeToRefs(lobbyManageUi)
const previewBusy = ref(false)
const copyOverlayBusy = ref(false)
const overlayLinkCopied = ref(false)
const selectedDesign = ref('classic')
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

function overlayAbsoluteUrl(): string {
  const resolved = router.resolve({
    name: 'overlay-lobby',
    params: { lobbyId: lobbyId.value },
  })
  if (typeof window === 'undefined') return resolved.href
  if (/^https?:\/\//i.test(resolved.href)) return resolved.href
  return `${window.location.origin}${resolved.href}`
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
    await loadSelectedDesign()
    const url = overlayAbsoluteUrl()
    await navigator.clipboard.writeText(url)
    overlayLinkCopied.value = true
    if (overlayLinkCopiedTimer) clearTimeout(overlayLinkCopiedTimer)
    overlayLinkCopiedTimer = setTimeout(() => {
      overlayLinkCopied.value = false
      overlayLinkCopiedTimer = null
    }, 2000)
  } catch {
    window.prompt('Скопируйте ссылку overlay для OBS:', overlayAbsoluteUrl())
  } finally {
    copyOverlayBusy.value = false
  }
}

onMounted(() => {
  void loadSelectedDesign()
})

watch(lobbyId, () => {
  void loadSelectedDesign()
})

watch(designChangedToken, () => {
  void loadSelectedDesign()
})
</script>

<template>
  <div class="shell-lobby-toolbar">
    <button
      type="button"
      class="shell-lobby-toolbar__obs shell-lobby-toolbar__obs--design-main"
      :title="`Выбранный дизайн: ${selectedDesignLabel}`"
      aria-label="Выбрать дизайн плашек"
      @click="lobbyManageUi.requestOpenDesignPicker"
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />
        </svg>
      </span>
      <span class="shell-lobby-toolbar__label-wide">{{ previewBusy ? 'Overlay…' : 'Overlay' }}</span>
    </button>
    <div class="shell-lobby-toolbar__obs-wrap">
      <Transition name="shell-lobby-toolbar__toast">
        <span
          v-if="overlayLinkCopied"
          class="shell-lobby-toolbar__toast"
          role="status"
          aria-live="polite"
        >
          Ссылка скопирована
        </span>
      </Transition>
      <button
        type="button"
        class="shell-lobby-toolbar__obs shell-lobby-toolbar__obs--icon"
        :disabled="!lobbyId || copyOverlayBusy"
        title="Скопировать ссылку overlay для OBS"
        aria-label="Скопировать ссылку для OBS"
        @click="copyOverlayLink"
      >
        <span class="shell-lobby-toolbar__obs-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" />
            <path
              d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </span>
        <span class="shell-lobby-toolbar__label-wide">Док-панель OBS</span>
      </button>
    </div>
    <button
      type="button"
      class="shell-lobby-toolbar__obs shell-lobby-toolbar__obs--danger shell-lobby-toolbar__obs--icon"
      :disabled="!lobbyId"
      title="Удалить текущее лобби"
      aria-label="Удалить лобби"
      @click="lobbyManageUi.requestOpenDeleteConfirm"
    >
      <span class="shell-lobby-toolbar__obs-icon" aria-hidden="true">
        <span class="shell-lobby-toolbar__delete-icon" />
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
}

.shell-lobby-toolbar__obs-wrap {
  position: relative;
  display: inline-flex;
}

.shell-lobby-toolbar__toast {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.45rem);
  transform: translateX(-50%);
  z-index: 2;
  padding: 0.3rem 0.55rem;
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  color: #166534;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  pointer-events: none;
}

.shell-lobby-toolbar__toast::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #a7f3d0;
}

.shell-lobby-toolbar__toast-enter-active,
.shell-lobby-toolbar__toast-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.shell-lobby-toolbar__toast-enter-from,
.shell-lobby-toolbar__toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
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

.shell-lobby-toolbar__delete-icon {
  width: 14px;
  height: 14px;
  background-color: currentColor;
  -webkit-mask-image: url(v-bind(deleteIcon));
  mask-image: url(v-bind(deleteIcon));
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
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
