import { computed, ref, watch, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  getLobby,
  getLobbyOverlayDesigns,
  setLobbyOverlayDesign,
  type LobbyOverlayDesignOption,
  type LobbyPlayer,
} from '@/api/lobbies'
import { useCardsUiStore } from '@/stores/cardsUi'
import { normalizeOverlayDesignCode } from '@/utils/overlayPersistentMessage'

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
  const error = ref<string | null>(null)
  const saveMessage = ref<string | null>(null)
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

  function subscriptionLabel(raw: string): string {
    const s = raw.trim().toLowerCase()
    if (s === 'free') return 'Бесплатно'
    if (s === 'premium') return 'Premium'
    if (s === 'standard') return 'Standard'
    return raw
  }

  function designPreviewVariant(rawCode: string): 'classic' | 'masters-yug25' | 'plus' {
    const code = normalizeOverlayDesignCode(rawCode)
    if (code === 'masters-yug25') return 'masters-yug25'
    if (code === 'plus') return 'plus'
    return 'classic'
  }

  function designMockPrice(rawCode: string): string {
    const variant = designPreviewVariant(rawCode)
    if (variant === 'plus') return '299 ₽'
    if (variant === 'masters-yug25') return '799 ₽'
    return '499 ₽'
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
      previewSeats.value = lobby.players.slice(0, 3)
    } catch {
      previewSeats.value = []
    }
  }

  async function loadDesignsForLobby() {
    if (!lobbyId.value) {
      designs.value = []
      selectedDesign.value = ''
      initialSelectedDesign.value = ''
      return
    }
    loading.value = true
    error.value = null
    saveMessage.value = null
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
      loading.value = false
    }
  }

  async function saveDesign() {
    if (!canSave.value || !lobbyId.value) return
    saving.value = true
    error.value = null
    saveMessage.value = null
    try {
      await setLobbyOverlayDesign(lobbyId.value, { overlay_design: selectedDesign.value })
      initialSelectedDesign.value = selectedDesign.value
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
    error,
    saveMessage,
    designs,
    selectedDesign,
    initialSelectedDesign,
    previewSeats,
    filteredDesigns,
    hasUnsavedChanges,
    canSave,
    activeDesignTitle,
    isAuthRequiredError,
    subscriptionLabel,
    designMockPrice,
    designUsesPhotoCutout,
    saveDesign,
  }
}
