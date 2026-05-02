<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getLobbyOverlayDesigns } from '@/api/lobbies'
import { useLobbyManageUiStore } from '@/stores/lobbyManageUi'

const route = useRoute()
const router = useRouter()
const lobbyManageUi = useLobbyManageUiStore()
const { designChangedToken } = storeToRefs(lobbyManageUi)
const previewBusy = ref(false)
const selectedDesign = ref('classic')

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

async function openDesignPreview() {
  if (!lobbyId.value || previewBusy.value) return
  previewBusy.value = true
  try {
    await loadSelectedDesign()
    const design = selectedDesign.value
    const resolved = router.resolve({
      name: 'overlay-design',
      params: { design, lobbyId: lobbyId.value },
    })
    window.open(resolved.href, '_blank', 'noopener,noreferrer')
  } finally {
    previewBusy.value = false
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
      @click="lobbyManageUi.requestOpenDesignPicker"
    >
      Дизайн плашек <span class="shell-lobby-toolbar__design-inline-sep" aria-hidden="true">•</span>
      <strong class="shell-lobby-toolbar__design-inline-name">{{ selectedDesignLabel }}</strong>
    </button>
    <button
      type="button"
      class="shell-lobby-toolbar__obs"
      :disabled="!lobbyId || previewBusy"
      title="Открыть предпросмотр текущего дизайна"
      @click="openDesignPreview"
    >
      {{ previewBusy ? 'Overlay…' : 'Overlay' }}
    </button>
    <button
      type="button"
      class="shell-lobby-toolbar__obs"
      title="Управлять прямо из OBS"
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
      Док-панель OBS
    </button>
    <button
      type="button"
      class="shell-lobby-toolbar__obs shell-lobby-toolbar__obs--danger"
      :disabled="!lobbyId"
      title="Удалить текущее лобби"
      @click="lobbyManageUi.requestOpenDeleteConfirm"
    >
      Удалить лобби
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
</style>
