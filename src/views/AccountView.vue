<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRouter } from 'vue-router'
import { me, type SubscriptionTier, type UserMe } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { useProfileSettingsModalStore } from '@/stores/profileSettingsModal'

const router = useRouter()
const { token } = storeToRefs(useAuthStore())
const profileSettingsModal = useProfileSettingsModalStore()

const PLANS: { id: SubscriptionTier; label: string; priceLabel: string }[] = [
  { id: 'basic', label: 'Базовый', priceLabel: 'Бесплатно' },
  { id: 'standard', label: 'Стандарт', priceLabel: '299 ₽ / мес' },
  { id: 'premium', label: 'Премиум', priceLabel: '599 ₽ / мес' },
]

function openPlan(planId: SubscriptionTier) {
  void router.push({ name: 'tariffs', query: { plan: planId } })
}

const profile = ref<UserMe | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const currentPlan = computed<SubscriptionTier>(() => {
  const t = profile.value?.subscription_tier
  if (t === 'standard' || t === 'premium' || t === 'basic') return t
  return 'basic'
})

const accountDisplayName = computed(() => {
  const u = profile.value
  if (!u) return ''
  const parts = [u.first_name?.trim(), u.last_name?.trim()].filter(Boolean)
  return parts.join(' ')
})

const accountAvatarInitials = computed(() => {
  const u = profile.value
  if (!u) return ''
  const a = (u.first_name?.trim()[0] || '') + (u.last_name?.trim()[0] || '')
  if (a) return a.toUpperCase()
  return (u.username?.trim()[0] || '?').toUpperCase()
})

async function loadProfile() {
  if (!token.value) {
    profile.value = null
    error.value = null
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    const u = await me()
    profile.value = u
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    profile.value = null
  } finally {
    loading.value = false
  }
}

watch(token, loadProfile, { immediate: true })
</script>

<template>
  <section class="account" :class="{ 'account--signed': token }">
    <div v-if="!token" class="account__guest">
      <p class="account__message">Вы не авторизованы или не зарегистрированы.</p>
      <div class="account__actions">
        <RouterLink class="account__btn account__btn--primary" :to="{ name: 'register' }">
          Регистрация
        </RouterLink>
        <RouterLink class="account__btn account__btn--outline" :to="{ name: 'login' }">
          Вход
        </RouterLink>
      </div>
    </div>

    <div v-else class="account__profile">
      <template v-if="loading">
        <p class="account__status">Загрузка…</p>
      </template>
      <template v-else-if="error">
        <p class="account__status account__status--error" role="alert">{{ error }}</p>
      </template>
      <template v-else-if="profile">
        <div class="account__head-card">
          <div class="account__head-main">
            <div class="account__head-row">
              <img
                v-if="profile.avatar_url?.trim()"
                class="account__avatar"
                :src="profile.avatar_url.trim()"
                alt=""
                width="110"
                height="110"
              />
              <div
                v-else
                class="account__avatar account__avatar--placeholder"
                aria-hidden="true"
              >
                {{ accountAvatarInitials }}
              </div>
              <div class="account__head-text">
                <p class="account__login">{{ profile.username }}</p>
                <p v-if="accountDisplayName" class="account__realname">{{ accountDisplayName }}</p>
                <p class="account__email">{{ profile.email }}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            class="account__settings-btn"
            @click.stop="profileSettingsModal.open()"
          >
            Настройки аккаунта
          </button>
        </div>

        <section class="account__lineups" aria-labelledby="account-lineups-title">
          <h2 id="account-lineups-title" class="account__lineups-title">Созданные составы</h2>
        </section>

        <div class="account__plans">
          <h2 class="account__plans-title">Тип подписки</h2>
          <div class="account__plans-grid" role="group" aria-label="Тарифы подписки">
            <button
              v-for="p in PLANS"
              :key="p.id"
              type="button"
              class="account__card"
              :class="{ 'account__card--current': currentPlan === p.id }"
              :aria-current="currentPlan === p.id || undefined"
              :aria-label="`${p.label}, ${p.priceLabel}. Перейти к тарифу`"
              @click="openPlan(p.id)"
            >
              <span class="account__plan-name">{{ p.label }}</span>
              <span class="account__plan-price">{{ p.priceLabel }}</span>
            </button>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.account {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 1.25rem;
  min-height: min(420px, calc(100svh - 8rem));
  text-align: center;
  padding: 0.25rem 0.5rem 1.5rem;
  box-sizing: border-box;
}

.account--signed {
  align-items: stretch;
  justify-content: flex-start;
  min-height: min(520px, calc(100svh - 9rem));
  padding-top: 0;
  text-align: left;
}

.account--signed > .account__profile {
  flex: 1;
  min-height: 0;
}

.account__guest {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  max-width: 360px;
}

.account__message {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 500;
  color: #374151;
  line-height: 1.5;
}

.account__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
}

.account__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 8.5rem;
  padding: 0.55rem 1.15rem;
  font-size: 0.9375rem;
  font-weight: 500;
  text-decoration: none;
  border-radius: 8px;
  border: 1px solid transparent;
  box-sizing: border-box;
}

.account__btn--primary {
  color: #fff;
  background: #2f6feb;
  border-color: #2f6feb;
}

.account__btn--primary:hover {
  background: #2563d4;
  border-color: #2563d4;
}

.account__btn--outline {
  color: #2f6feb;
  background: #fff;
  border-color: #d1d5db;
}

.account__btn--outline:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.account__profile {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  gap: 2rem;
}

.account__status {
  margin: 0;
  font-size: 0.9375rem;
  color: #6b7280;
}

.account__status--error {
  color: #b91c1c;
}

.account__head-card {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  margin-top: calc(0.85rem + 30px);
  padding: 0.35rem 0.75rem 1rem;
  border: none;
  border-radius: 0;
  background: transparent;
  border-bottom: 1px solid #e5e7eb;
  box-sizing: border-box;
}

.account__head-main {
  flex: 1 1 auto;
  min-width: min(100%, 12rem);
}

.account__head-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.account__head-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  min-width: 0;
}

.account__avatar {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid #e5e7eb;
  box-sizing: border-box;
}

.account__avatar:not(.account__avatar--placeholder) {
  object-fit: cover;
}

.account__avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  font-size: 1.35rem;
  font-weight: 600;
  color: #6b7280;
}

.account__login {
  margin: 0.06rem 0 0.55rem;
  font-size: clamp(2rem, 5.5vw, 2.5rem);
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.02em;
  line-height: 1.12;
  text-align: left;
}

.account__realname {
  margin: 0;
  font-size: clamp(1.125rem, 2.8vw, 1.375rem);
  font-weight: 600;
  color: #374151;
  line-height: 1.35;
}

.account__email {
  margin: 0;
  font-size: 0.8125rem;
  color: #9ca3af;
  line-height: 1.4;
  text-align: left;
  width: 100%;
}

.account__settings-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0.55rem 1rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
  text-align: center;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-sizing: border-box;
  cursor: pointer;
}

.account__settings-btn:focus {
  outline: none;
}

.account__settings-btn:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.account__plans {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  margin-top: auto;
  padding: 0 0.75rem;
  box-sizing: border-box;
}

.account__plans-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #374151;
}

.account__lineups {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  padding: 0.35rem 0.75rem 1rem;
  border: none;
  border-radius: 0;
  background: transparent;
  border-bottom: 1px solid #e5e7eb;
  box-sizing: border-box;
}

.account__lineups-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #374151;
}

.account__plans-grid {
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  width: 100%;
}

.account__card {
  margin: 0;
  width: 100%;
  min-height: 7.5rem;
  padding: 1rem 0.85rem;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font: inherit;
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}

.account__card:hover:not(.account__card--current) {
  border-color: #d1d5db;
  background: #fafafa;
}

.account__card:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.account__plan-name {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #374151;
  text-align: center;
}

.account__plan-price {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #6b7280;
  text-align: center;
  line-height: 1.35;
}

.account__card--current {
  border-color: #2f6feb;
  background: #f4f8ff;
  box-shadow: 0 0 0 2px #2f6feb;
}

.account__card--current .account__plan-name {
  color: #1d4ed8;
}

.account__card--current .account__plan-price {
  color: #3b6fd4;
}

@media (max-width: 1024px) {
  .account {
    padding-inline: 0.35rem;
  }

  .account--signed {
    min-height: min(480px, calc(100svh - 8rem));
  }

  .account__head-card {
    margin-top: 0.5rem;
    padding-inline: 0.5rem;
  }

  .account__head-row {
    flex-wrap: wrap;
  }

  .account__avatar,
  .account__avatar--placeholder {
    width: 96px;
    height: 96px;
  }

  .account__avatar--placeholder {
    font-size: 1.2rem;
  }

  .account__lineups,
  .account__plans {
    padding-inline: 0.5rem;
  }
}

@media (max-width: 1024px) and (min-width: 601px) {
  .account__plans-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem;
  }
}

@media (max-width: 600px) {
  .account__plans-grid {
    grid-template-columns: 1fr;
    max-width: 20rem;
    margin: 0 auto;
  }
}

@media (max-width: 767px) {
  .account {
    padding-inline: 0.15rem;
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }

  .account__head-card {
    flex-direction: column;
    align-items: stretch;
    margin-top: 0.25rem;
  }

  .account__head-main {
    min-width: 0;
  }

  .account__settings-btn {
    width: 100%;
    justify-content: center;
  }

  .account__login {
    font-size: clamp(1.5rem, 8vw, 2rem);
  }

  .account__avatar,
  .account__avatar--placeholder {
    width: 80px;
    height: 80px;
  }

  .account__avatar--placeholder {
    font-size: 1.05rem;
  }
}
</style>
