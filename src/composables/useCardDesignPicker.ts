import { computed, ref, watch, type Ref } from 'vue'
import {
  getLobbyOverlayDesigns,
  setLobbyOverlayDesign,
  type LobbyOverlayDesignOption,
  type LobbyPlayer,
} from '@/api/lobbies'
import { getOverlayDesignShopCatalog, purchaseOverlayDesign } from '@/api/shop'
import { normalizeOverlayDesignCode } from '@/utils/overlayPersistentMessage'
import { notifyOverlayLobbyChanged } from '@/utils/overlayLobbySync'
import {
  formatDesignAccessExpires,
  formatDesignAccessLabel,
  formatDesignPriceRub,
  formatDesignRentalLabel,
} from '@/utils/overlayDesignPricing'
import { AUTH_REQUIRED_MESSAGE } from '@/utils/apiErrorMessage'
import { mockPreviewPlayer } from '@/constants/landingContent'
import { contentAssets } from '@/utils/contentAssets'

const AUTH_REQUIRED_TEXT = AUTH_REQUIRED_MESSAGE

type UseCardDesignPickerOptions = {
  onSaved?: () => void
  saveSuccessMessage?: string
}

export function useCardDesignPicker(
  lobbyId: Ref<string>,
  options: UseCardDesignPickerOptions = {},
) {
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

  const filteredDesigns = computed(() => designs.value)

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

  function loadPreviewSeatsForLobby() {
    previewSeats.value = [
      mockPreviewPlayer('Неаполь', 1, 'sheriff', contentAssets.neapol),
      mockPreviewPlayer('Vortex', 2, 'don', contentAssets.vortex),
      mockPreviewPlayer('Luna', 3, 'mafia', contentAssets.lunaCutout),
    ]
  }

  function pickDefaultSelectableDesign(options: LobbyOverlayDesignOption[]): string {
    const selectable = options.find((item) => item.selectable)
    if (selectable?.code?.trim()) return selectable.code.trim()
    const first = options[0]?.code?.trim()
    return first || ''
  }

  async function loadDesignsForLobby(options: { silent?: boolean } = {}) {
    if (!lobbyId.value) {
      if (!options.silent) {
        loading.value = true
      }
      error.value = null
      if (!options.silent) {
        saveMessage.value = null
        rentMessage.value = null
      }
      try {
        const catalog = await getOverlayDesignShopCatalog()
        const items = catalog.items ?? []
        designs.value = items
        const fallback = pickDefaultSelectableDesign(items)
        selectedDesign.value = fallback
        initialSelectedDesign.value = fallback
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
      if (!lobbyId.value || selectedDesign.value !== code) {
        selectedDesign.value = code
      }
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
