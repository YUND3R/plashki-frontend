import { onMounted, onUnmounted, type Ref } from 'vue'

type PointerTiltOptions = {
  maxDeg?: number
  engagedClass?: string
}

const MOVE_THRESHOLD = 0.025
const DEG_THRESHOLD = 0.35

/**
 * Лёгкий 3D-наклон: CSS-переменные + rAF, без ре-рендеров Vue.
 * Включается только на desktop, в viewport и без prefers-reduced-motion.
 */
export function usePointerTilt(
  root: Ref<HTMLElement | null>,
  { maxDeg = 8, engagedClass = 'landing__design-tilt--engaged' }: PointerTiltOptions = {},
) {
  let enabled = false
  let engaged = false
  let visible = false
  let rafId = 0
  let normX = 0
  let normY = 0
  let lastRx = 0
  let lastRy = 0
  let observer: IntersectionObserver | null = null

  function applyTilt() {
    rafId = 0
    const el = root.value
    if (!el || !engaged || !visible) return

    const rx = -normY * maxDeg
    const ry = normX * maxDeg

    if (Math.abs(rx - lastRx) < DEG_THRESHOLD && Math.abs(ry - lastRy) < DEG_THRESHOLD) {
      return
    }

    lastRx = rx
    lastRy = ry
    el.style.setProperty('--tilt-rx', `${Math.round(rx)}deg`)
    el.style.setProperty('--tilt-ry', `${Math.round(ry)}deg`)
  }

  function scheduleTilt() {
    if (rafId) return
    rafId = requestAnimationFrame(applyTilt)
  }

  function resetTilt() {
    const el = root.value
    if (!el) return
    lastRx = 0
    lastRy = 0
    el.style.setProperty('--tilt-rx', '0deg')
    el.style.setProperty('--tilt-ry', '0deg')
  }

  function onPointerEnter() {
    if (!enabled || !visible) return
    engaged = true
    root.value?.classList.add(engagedClass)
  }

  function onPointerMove(event: PointerEvent) {
    if (!enabled || !engaged || !visible) return
    const el = root.value
    if (!el) return

    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const nextX = (event.clientX - rect.left) / rect.width - 0.5
    const nextY = (event.clientY - rect.top) / rect.height - 0.5
    const clampedX = Math.max(-0.5, Math.min(0.5, nextX)) * 2
    const clampedY = Math.max(-0.5, Math.min(0.5, nextY)) * 2

    if (
      Math.abs(clampedX - normX) < MOVE_THRESHOLD &&
      Math.abs(clampedY - normY) < MOVE_THRESHOLD
    ) {
      return
    }

    normX = clampedX
    normY = clampedY
    scheduleTilt()
  }

  function onPointerLeave() {
    if (!engaged) return
    engaged = false
    normX = 0
    normY = 0
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    root.value?.classList.remove(engagedClass)
    resetTilt()
  }

  onMounted(() => {
    const el = root.value
    if (!el) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    enabled = !reduceMotion && finePointer

    if (!enabled) return

    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          visible = entries.some((entry) => entry.isIntersecting)
          if (!visible && engaged) {
            onPointerLeave()
          }
        },
        { root: null, threshold: 0.12, rootMargin: '40px 0px' },
      )
      observer.observe(el)
    } else {
      visible = true
    }

    el.addEventListener('pointerenter', onPointerEnter)
    el.addEventListener('pointermove', onPointerMove, { passive: true })
    el.addEventListener('pointerleave', onPointerLeave)
  })

  onUnmounted(() => {
    observer?.disconnect()
    if (rafId) cancelAnimationFrame(rafId)
    const el = root.value
    if (!el) return
    el.removeEventListener('pointerenter', onPointerEnter)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerleave', onPointerLeave)
    el.classList.remove(engagedClass)
  })
}
