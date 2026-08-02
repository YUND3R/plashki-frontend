import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { LEGAL_NAV_SECTIONS, type LegalDocumentId } from '@/constants/legalDocuments'

/** Шапка legal на мобилке: горизонтальные вкладки разделов рядом с меню. */
export const useLegalUiStore = defineStore('legalUi', () => {
  const activeSection = ref<LegalDocumentId>('privacy')
  let headerNavEl: HTMLElement | null = null

  function setHeaderNavEl(el: HTMLElement | null) {
    headerNavEl = el
  }

  function syncHeaderNavScroll(id: LegalDocumentId, behavior: ScrollBehavior = 'smooth') {
    if (typeof window === 'undefined' || !headerNavEl) return
    const chip = headerNavEl.querySelector<HTMLElement>(`[data-legal-section="${id}"]`)
    chip?.scrollIntoView({ behavior, block: 'nearest', inline: 'center' })
  }

  function scrollToSection(id: LegalDocumentId) {
    const el = document.getElementById(`legal-section-${id}`)
    if (!el) return
    activeSection.value = id
    syncHeaderNavScroll(id)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function setActiveSection(id: LegalDocumentId) {
    activeSection.value = id
  }

  watch(activeSection, (id) => {
    syncHeaderNavScroll(id)
  })

  return {
    sections: LEGAL_NAV_SECTIONS,
    activeSection,
    setHeaderNavEl,
    scrollToSection,
    setActiveSection,
    syncHeaderNavScroll,
  }
})
