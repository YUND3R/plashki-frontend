<script setup lang="ts">
import { onMounted, ref } from 'vue'

const STORAGE_KEY = 'plashki_cookie_notice_decision_v1'
const visible = ref(false)

function safeStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // ignore storage access failures
  }
}

function acceptCookies(): void {
  safeStorageSet(STORAGE_KEY, 'accepted')
  visible.value = false
}

onMounted(() => {
  if (typeof window === 'undefined') return
  visible.value = safeStorageGet(STORAGE_KEY) !== 'accepted'
})
</script>

<template>
  <Transition name="cookie-banner">
    <div v-if="visible" class="cookie-banner" role="region" aria-label="Уведомление об использовании cookie">
      <p class="cookie-banner__text">
        Мы используем cookie для авторизации и стабильной работы сервиса.
      </p>
      <div class="cookie-banner__actions">
        <button type="button" class="cookie-banner__accept" @click="acceptCookies">
          Принять
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.cookie-banner {
  position: fixed;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5000;
  width: min(94vw, 760px);
  min-height: 3rem;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  border-radius: 12px;
  border: 1px solid #dbeafe;
  background: rgba(239, 246, 255, 0.98);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
}

.cookie-banner__text {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.35;
  color: #1f2937;
}

.cookie-banner__actions {
  display: inline-flex;
  align-items: center;
  gap: 0;
}

.cookie-banner__accept {
  flex-shrink: 0;
  border: 1px solid #2f6feb;
  border-radius: 8px;
  background: #2f6feb;
  color: #fff;
  font: inherit;
  font-size: 0.81rem;
  font-weight: 600;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
}

.cookie-banner__accept:hover {
  background: #2563d4;
  border-color: #2563d4;
}
.cookie-banner__accept:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(47, 111, 235, 0.3);
}

.cookie-banner-enter-active,
.cookie-banner-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.cookie-banner-enter-from,
.cookie-banner-leave-to {
  opacity: 0;
  transform: translate(-50%, -6px);
}

@media (max-width: 640px) {
  .cookie-banner {
    top: 0.5rem;
    width: calc(100vw - 1rem);
    gap: 0.55rem;
    padding: 0.65rem 0.7rem;
  }

  .cookie-banner__text {
    font-size: 0.78rem;
  }

  .cookie-banner__actions {
    gap: 0;
  }

  .cookie-banner__accept {
    padding: 0.46rem 0.72rem;
    font-size: 0.77rem;
  }
}
</style>
