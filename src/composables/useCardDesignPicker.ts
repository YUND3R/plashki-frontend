import { computed, ref, watch, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  getLobby,
  getLobbyOverlayDesigns,
  setLobbyOverlayDesign,
  type LobbyOverlayDesignOption,
  type LobbyPlayer,
} from '@/api/lobbies'
import { purchaseOverlayDesign } from '@/api/shop'
import { useCardsUiStore } from '@/stores/cardsUi'
import { normalizeOverlayDesignCode } from '@/utils/overlayPersistentMessage'
import { notifyOverlayLobbyChanged } from '@/utils/overlayLobbySync'
import {
  formatDesignAccessExpires,
  formatDesignAccessLabel,
  formatDesignPriceRub,
  formatDesignRentalLabel,
} from '@/utils/overlayDesignPricing'
import { enrichLobbyPhotoLayouts } from '@/utils/overlayPhotoLayoutBridge'

const AUTH_REQUIRED_TEXT = 'Авторизуйтесь или зарегистрируйтесь.'

type UseCardDesignPickerOptions = {
  onSaved?: () => void
  saveSuccessMessage?: string
}

export function useCardDesignPicker(
  lobbyId: Ref<string>,
  options: UseCardDesignPickerOptions = {},
) {
  const cardsUi = useCardsUiStore()
  const { designFilter } = storeToRefs(cardsUi)

  const loading = ref(false)
  const saving = ref(false)
  const rentingDesignCode = ref<string | null>(null)
  const error = ref<string | null>(null)
  const saveMessage = ref<string | null>(null)
  const rentMessage = ref<string | null>(null)
  const designs = ref<LobbyOverlayDesignOption[]>([])
  const selectedDesign = ref('')
  const initialSelectedDesign = ref('')
  const previewSeats = ref<Array<LobbyPlayer | null>>([])

  const filteredDesigns = computed(() => {
    if (designFilter.value === 'available') {
      return designs.value.filter((item) => item.selectable)
    }
    return designs.value
  })

  const hasUnsavedChanges = computed(
    () => !!selectedDesign.value && selectedDesign.value !== initialSelectedDesign.value,
  )

  const canSave = computed(() => {
    if (!lobbyId.value) return false
    if (!selectedDesign.value) return false
    if (saving.value) return false
    if (!hasUnsavedChanges.value) return false
    return true
  })

  const activeDesignTitle = computed(() => designTitle(initialSelectedDesign.value))

  const isAuthRequiredError = computed(() => (error.value ?? '').trim() === AUTH_REQUIRED_TEXT)

  function designPreviewVariant(rawCode: string): 'classic' | 'masters-yug25' | 'plus' {
    const code = normalizeOverlayDesignCode(rawCode)
    if (code === 'masters-yug25') return 'masters-yug25'
    if (code === 'plus') return 'plus'
    return 'classic'
  }

  function designUsesPhotoCutout(rawCode: string): boolean {
    const variant = designPreviewVariant(rawCode)
    return variant === 'classic' || variant === 'masters-yug25'
  }

  function designTitle(rawCode: string): string {
    const code = (rawCode ?? '').trim()
    if (!code) return 'Не выбран'
    const option = designs.value.find((item) => item.code === code)
    if (option?.title?.trim()) return option.title.trim()
    return code
      .split(/[-_\s]+/g)
      .filter(Boolean)
      .map((part) => (part[0] ? part[0].toUpperCase() + part.slice(1) : part))
      .join(' ')
  }

  async function loadPreviewSeatsForLobby() {
    if (!lobbyId.value) {
      previewSeats.value = []
      return
    }
    try {
      const lobby = await getLobby(lobbyId.value)
      const enriched = await enrichLobbyPhotoLayouts(lobby)
      previewSeats.value = enriched.players.slice(0, 3)
    } catch {
      previewSeats.value = []
    }
  }

  async function loadDesignsForLobby(options: { silent?: boolean } = {}) {
    if (!lobbyId.value) {
      designs.value = []
      selectedDesign.value = ''
      initialSelectedDesign.value = ''
      return
    }
    if (!options.silent) {
      loading.value = true
    }
    error.value = null
    if (!options.silent) {
      saveMessage.value = null
      rentMessage.value = null
    }
    try {
      const data = await getLobbyOverlayDesigns(lobbyId.value)
      designs.value = data.options ?? []
      selectedDesign.value = data.selected_overlay_design ?? ''
      initialSelectedDesign.value = data.selected_overlay_design ?? ''
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      designs.value = []
      selectedDesign.value = ''
      initialSelectedDesign.value = ''
    } finally {
      if (!options.silent) {
        loading.value = false
      }
    }
  }

  function isRentingDesign(rawCode: string): boolean {
    return rentingDesignCode.value === rawCode.trim()
  }

  async function rentDesign(rawCode: string) {
    const code = rawCode.trim()
    if (!code || rentingDesignCode.value) return
    rentingDesignCode.value = code
    error.value = null
    rentMessage.value = null
    try {
      const result = await purchaseOverlayDesign({ design_code: code })
      await loadDesignsForLobby({ silent: true })
      selectedDesign.value = code
      const expiresLabel = formatDesignAccessExpires(result.expires_at)
      rentMessage.value = expiresLabel
        ? `Аренда «${designTitle(code)}» активна до ${expiresLabel}.`
        : `Аренда «${designTitle(code)}» активирована.`
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      rentingDesignCode.value = null
    }
  }

  async function saveDesign() {
    if (!canSave.value || !lobbyId.value) return
    saving.value = true
    error.value = null
    saveMessage.value = null
    rentMessage.value = null
    try {
      await setLobbyOverlayDesign(lobbyId.value, { overlay_design: selectedDesign.value })
      initialSelectedDesign.value = selectedDesign.value
      notifyOverlayLobbyChanged(lobbyId.value)
      saveMessage.value =
        options.saveSuccessMessage ?? 'Дизайн сохранён для выбранного лобби.'
      options.onSaved?.()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      saving.value = false
    }
  }

  watch(
    lobbyId,
    () => {
      void loadPreviewSeatsForLobby()
      void loadDesignsForLobby()
    },
    { immediate: true },
  )

  return {
    designFilter,
    loading,
    saving,
    rentingDesignCode,
    error,
    saveMessage,
    rentMessage,
    designs,
    selectedDesign,
    initialSelectedDesign,
    previewSeats,
    filteredDesigns,
    hasUnsavedChanges,
    canSave,
    activeDesignTitle,
    isAuthRequiredError,
    formatDesignPriceRub,
    formatDesignRentalLabel,
    formatDesignAccessLabel,
    designUsesPhotoCutout,
    isRentingDesign,
    rentDesign,
    saveDesign,
  }
}
