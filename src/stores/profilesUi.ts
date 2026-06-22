import { ref } from 'vue'
import { defineStore } from 'pinia'

const VIEW_MODE_STORAGE_KEY = 'plashki:profiles:view-mode'
type ProfilesViewMode = 'grid' | 'compact'

/** Шапка «Мои игроки»: поиск, счётчик, вызов «Создать» (без Teleport). */
export const useProfilesUiStore = defineStore('profilesUi', () => {
  const searchQuery = ref('')
  /** Всего карточек игроков - обновляет ProfilesView после загрузки списка. */
  const playerCardsTotal = ref(0)
  const viewMode = ref<ProfilesViewMode>('grid')
  let isViewModeHydrated = false

  let openCreateHandler: (() => void) | null = null

  function hydrateViewMode() {
    if (isViewModeHydrated) return
    isViewModeHydrated = true
    if (typeof localStorage === 'undefined') return
    try {
      const raw = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
      if (raw === 'grid' || raw === 'compact') viewMode.value = raw
    } catch {
      viewMode.value = 'grid'
    }
  }

  function setViewMode(mode: ProfilesViewMode) {
    viewMode.value = mode
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
    } catch {
      // ignore storage errors
    }
  }

  function setOpenCreateHandler(fn: (() => void) | null) {
    openCreateHandler = fn
  }

  function requestOpenCreate() {
    openCreateHandler?.()
  }

  function resetSearch() {
    searchQuery.value = ''
  }

  return {
    searchQuery,
    playerCardsTotal,
    viewMode,
    hydrateViewMode,
    setViewMode,
    setOpenCreateHandler,
    requestOpenCreate,
    resetSearch,
  }
})
