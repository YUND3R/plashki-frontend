<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import logoFull from '@/assets/plashki.svg?url'
import { verifyEmail } from '@/api/auth'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const success = ref(false)
const message = ref<string | null>(null)
const error = ref<string | null>(null)
let redirectTimer: ReturnType<typeof setTimeout> | null = null

type VerifyCredentials =
  | { token_id: string; signature: string }
  | { code: string }
  | { token: string }

function readCredentialsFromUrl(): VerifyCredentials | null {
  const hashParams = new URLSearchParams(
    window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '',
  )
  const vidFromHash = hashParams.get('vid')?.trim() ?? ''
  const sigFromHash = hashParams.get('sig')?.trim() ?? ''
  const tokenIdFromPath = typeof route.params.tokenId === 'string' ? route.params.tokenId.trim() : ''
  const signatureFromPath = typeof route.params.signature === 'string' ? route.params.signature.trim() : ''
  const legacyCode = typeof route.query.code === 'string' ? route.query.code.trim() : ''
  const legacyToken = typeof route.query.token === 'string' ? route.query.token.trim() : ''

  if (tokenIdFromPath && signatureFromPath) {
    return { token_id: tokenIdFromPath, signature: signatureFromPath }
  }
  if (vidFromHash && sigFromHash) {
    return { token_id: vidFromHash, signature: sigFromHash }
  }
  if (legacyCode) {
    return { code: legacyCode }
  }
  if (legacyToken) {
    return { token: legacyToken }
  }
  return null
}

async function runVerification(credentials: VerifyCredentials | null) {
  loading.value = true
  success.value = false
  error.value = null
  message.value = null

  try {
    const result = credentials ? await verifyEmail(credentials) : null

    if (!result) {
      throw new Error('Ссылка подтверждения недействительна или устарела')
    }

    success.value = true
    message.value = result.message ?? 'Email успешно подтвержден.'
    redirectTimer = setTimeout(() => {
      router.push({ name: 'login' })
    }, 2500)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось подтвердить email'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const credentials = readCredentialsFromUrl()

  // Очищаем URL заранее, чтобы чувствительные данные не оставались в адресной строке.
  if (route.name === 'verify-email-signed' || route.query.code || route.query.token || route.hash) {
    await router.replace({ name: 'verify-email', query: {}, hash: '' })
  }

  await runVerification(credentials)
})

onUnmounted(() => {
  if (redirectTimer) clearTimeout(redirectTimer)
})
</script>

<template>
  <div class="verify">
    <div class="verify__card">
      <RouterLink class="auth__logo" :to="{ name: 'landing' }" aria-label="plashki">
        <img :src="logoFull" alt="" width="100" height="22" />
      </RouterLink>

      <div class="verify__icon" :class="{ 'verify__icon--success': success && !loading, 'verify__icon--error': !success && !loading }">
        <span v-if="loading">...</span>
        <span v-else-if="success">✓</span>
        <span v-else>!</span>
      </div>

      <h1 class="verify__title">Подтверждение email</h1>
      <p class="verify__lead">Проверяем вашу ссылку и активируем аккаунт.</p>

      <p v-if="loading" class="verify__banner verify__banner--neutral" role="status">Подтверждаем email…</p>
      <p v-else-if="success" class="auth__banner auth__banner--success" role="status">
        {{ message }}
      </p>
      <p v-else class="verify__banner verify__banner--error" role="alert">{{ error }}</p>
      <p v-if="success" class="verify__hint">Сейчас перенаправим на страницу входа…</p>

      <div class="verify__actions">
        <RouterLink class="verify__btn verify__btn--primary" :to="{ name: 'landing' }">
          Перейти на сайт
        </RouterLink>
        <RouterLink class="verify__btn verify__btn--ghost" :to="{ name: 'login' }">
          Ко входу
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.verify {
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 20% 20%, #dbeafe 0%, transparent 32%),
    radial-gradient(circle at 85% 0%, #8977FE 0%, transparent 34%),
    #dddddd;
  font-family: 'Inter', system-ui, sans-serif;
}

.verify__card {
  width: 100%;
  max-width: 460px;
  padding: 2rem 1.75rem;
  background: #fff;
  border-radius: 22px;
  border: 1px solid #e5e7eb;
  box-sizing: border-box;
  box-shadow: 0 18px 45px rgba(17, 24, 39, 0.12);
}

.auth__logo {
  display: inline-block;
  line-height: 0;
  margin-bottom: 1.5rem;
}

.auth__logo img {
  display: block;
  width: 100px;
  height: auto;
}

.verify__icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 1.375rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 1rem;
}

.verify__icon--success {
  background: #dcfce7;
  color: #166534;
}

.verify__icon--error {
  background: #fee2e2;
  color: #b91c1c;
}

.verify__title {
  margin: 0 0 0.35rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.verify__lead {
  margin: 0 0 1.25rem;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.45;
}

.verify__banner {
  margin: 0;
  padding: 0.75rem 0.875rem;
  font-size: 0.85rem;
  border-radius: 8px;
}

.verify__banner--neutral {
  color: #1e3a8a;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.verify__banner--error {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.auth__banner--success {
  color: #166534;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.verify__hint {
  margin: 0.65rem 0 0;
  font-size: 0.75rem;
  color: #6b7280;
}

.verify__actions {
  margin-top: 1.35rem;
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.verify__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0.6rem 0.95rem;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.verify__btn--primary {
  background: #2f6feb;
  color: #fff;
}

.verify__btn--primary:hover {
  background: #2563d4;
}

.verify__btn--ghost {
  background: #f3f4f6;
  color: #374151;
}

.verify__btn--ghost:hover {
  background: #e5e7eb;
}

@media (max-width: 767px) {
  .verify {
    padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right))
      max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
    align-items: flex-start;
  }

  .verify__card {
    border-radius: 16px;
    padding: 1.5rem 1.15rem;
  }
}
</style>
