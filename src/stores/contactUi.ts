import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { FeedbackCategory } from '@/api/feedback'

/** Шапка contact на мобилке: фильтр категории обратной связи. */
export const useContactUiStore = defineStore('contactUi', () => {
  const category = ref<FeedbackCategory>('other')

  function setCategory(next: FeedbackCategory) {
    category.value = next
  }

  function resetCategory() {
    category.value = 'other'
  }

  return {
    category,
    setCategory,
    resetCategory,
  }
})
