import { onUnmounted, ref, watch, type Ref } from 'vue'

/** Синхронизирует ref с задержкой (для полей поиска q). */
export function useDebouncedRef(source: Ref<string>, delayMs = 400): Ref<string> {
  const debounced = ref(source.value.trim())
  let timer: ReturnType<typeof setTimeout> | null = null

  watch(
    source,
    (value) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        debounced.value = value.trim()
        timer = null
      }, delayMs)
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
  })

  return debounced
}
