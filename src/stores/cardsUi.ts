import { ref } from 'vue'
import { defineStore } from 'pinia'

export type CardDesignFilter = 'all' | 'available'

/** Шапка «Все дизайны карточек»: фильтр списка плашек на /card-design */
export const useCardsUiStore = defineStore('cardsUi', () => {
  const designFilter = ref<CardDesignFilter>('all')

  function resetDesignFilter() {
    designFilter.value = 'all'
  }

  return { designFilter, resetDesignFilter }
})
