import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { DOCS_SECTIONS, type DocsSectionId } from '@/constants/docsSections'

/** Шапка docs на мобилке: горизонтальные вкладки разделов рядом с меню. */
export const useDocsUiStore = defineStore('docsUi', () => {
  const activeSection = ref<DocsSectionId>('about')
  let headerNavEl: HTMLElement | null = null

  function setHeaderNavEl(el: HTMLElement | null) {
    headerNavEl = el
  }

  function syncHeaderNavScroll(id: DocsSectionId, behavior: ScrollBehavior = 'smooth') {
    if (typeof window === 'undefined' || !headerNavEl) return
    const chip = headerNavEl.querySelector<HTMLElement>(`[data-docs-section="${id}"]`)
    chip?.scrollIntoView({ behavior, block: 'nearest', inline: 'center' })
  }

  function scrollToSection(id: DocsSectionId) {
    const el = document.getElementById(`docs-section-${id}`)
    if (!el) return
    activeSection.value = id
    syncHeaderNavScroll(id)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function setActiveSection(id: DocsSectionId) {
    activeSection.value = id
  }

  watch(activeSection, (id) => {
    syncHeaderNavScroll(id)
  })

  return {
    sections: DOCS_SECTIONS,
    activeSection,
    setHeaderNavEl,
    scrollToSection,
    setActiveSection,
    syncHeaderNavScroll,
  }
})
