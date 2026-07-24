<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { me, type UserMe } from '@/api/auth'
import { listMyLobbies, type GameLobby } from '@/api/lobbies'
import goLobbyIcon from '@/assets/icons/go.svg?url'
import { useAuthStore } from '@/stores/auth'
import { useProfileSettingsModalStore } from '@/stores/profileSettingsModal'

const { token } = storeToRefs(useAuthStore())
const profileSettingsModal = useProfileSettingsModalStore()

const profile = ref<UserMe | null>(null)
const myLobbies = ref<GameLobby[]>([])
const lobbiesLoading = ref(false)
const lobbiesError = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

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

function lobbyTitle(lobby: GameLobby): string {
  const row = lobby as GameLobby & {
    name?: string | null
    lobby_name?: string | null
    title?: string | null
    lobby_title?: string | null
  }
  const title = [row.name, row.lobby_name, row.title, row.lobby_title].find(
    (value) => typeof value === 'string' && value.trim(),
  )
  if (typeof title === 'string') return title.trim()
  return `Лобби ${lobby.id.slice(0, 8)}`
}

function playersWord(n: number): string {
  const m = n % 100
  const m10 = n % 10
  if (m10 === 1 && m !== 11) return 'игрок'
  if (m10 >= 2 && m10 <= 4 && (m < 12 || m > 14)) return 'игрока'
  return 'игроков'
}

function formatLobbyDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function lobbyBriefInfo(lobby: GameLobby): string {
  const count = lobby.players.length
  const max = lobby.max_players ?? 10
  const date = formatLobbyDate(lobby.created_at)
  const playersLine = `${count} из ${max} ${playersWord(max)}`

  if (lobby.imported_state) {
    const variants = lobby.imported_state.variants?.length ?? 0
    const variantsLine = variants > 0 ? ` · ${variants} тур/стол` : ''
    return `GoMafia${variantsLine} · ${playersLine}${date ? ` · ${date}` : ''}`
  }

  return `Обычное лобби · ${playersLine}${date ? ` · ${date}` : ''}`
}

const myLobbiesCount = computed(() => myLobbies.value.length)

function lobbyCreatedAtMs(lobby: GameLobby): number {
  const ts = Date.parse(lobby.created_at ?? '')
  return Number.isNaN(ts) ? 0 : ts
}

const recentLobbies = computed(() => {
  return myLobbies.value
    .slice()
    .sort((a, b) => lobbyCreatedAtMs(b) - lobbyCreatedAtMs(a))
    .slice(0, 3)
})

async function loadProfile() {
  if (!token.value) {
    profile.value = null
    myLobbies.value = []
    lobbiesError.value = null
    lobbiesLoading.value = false
    error.value = null
    loading.value = false
    return
  }
  loading.value = true
  lobbiesLoading.value = true
  error.value = null
  lobbiesError.value = null
  try {
    const [u, lobbies] = await Promise.all([me(), listMyLobbies()])
    profile.value = u
    myLobbies.value = lobbies
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    lobbiesError.value = e instanceof Error ? e.message : String(e)
    profile.value = null
    myLobbies.value = []
  } finally {
    loading.value = false
    lobbiesLoading.value = false
  }
}

watch(token, loadProfile, { immediate: true })
</script>

<template>
  <section class="account" :class="{ 'account--signed': token }">
    <div v-if="!token" class="account__guest">
      <p class="account__emoji" aria-hidden="true">😔</p>
      <p class="account__message">Вы не авторизованы или не зарегистрированы.</p>
      <div class="account__actions">
        <RouterLink class="account__btn account__btn--outline" :to="{ name: 'register' }">
          Регистрация
        </RouterLink>
        <RouterLink class="account__btn account__btn--primary" :to="{ name: 'login' }">
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
          <div class="account__head-actions">
            <RouterLink
              class="account__settings-btn account__settings-btn--secondary"
              :to="{ name: 'contact' }"
            >
              Обратная связь
            </RouterLink>
            <button
              type="button"
              class="account__settings-btn"
              @click.stop="profileSettingsModal.open()"
            >
              Настройки аккаунта
            </button>
          </div>
        </div>

        <section class="account__lineups" aria-labelledby="account-lineups-title">
          <div class="account__lineups-head">
            <div class="account__lineups-head-main">
              <h2 id="account-lineups-title" class="account__lineups-title">Созданные лобби</h2>
              <span v-if="!lobbiesLoading && !lobbiesError" class="account__lineups-count">{{ myLobbiesCount }}</span>
            </div>
            <RouterLink
              v-if="!lobbiesLoading && !lobbiesError"
              class="account__lineups-all-btn"
              :to="{ name: 'dashboard' }"
            >
              Все лобби
            </RouterLink>
          </div>
          <p v-if="lobbiesLoading" class="account__lineups-status">Загрузка лобби…</p>
          <p v-else-if="lobbiesError" class="account__lineups-status account__lineups-status--error" role="alert">
            {{ lobbiesError }}
          </p>
          <ul v-else-if="recentLobbies.length" class="account__lobbies-list">
            <li v-for="lobby in recentLobbies" :key="lobby.id">
              <RouterLink
                class="account__lobby-row"
                :to="{ name: 'lobby-manage', params: { lobbyId: lobby.id } }"
              >
                <span
                  class="account__lobby-icon"
                  :class="lobby.imported_state ? 'account__lobby-icon--gomafia' : 'account__lobby-icon--regular'"
                  aria-hidden="true"
                >
                  <img
                    v-if="lobby.imported_state"
                    :src="goLobbyIcon"
                    alt=""
                    class="account__lobby-go-icon"
                    width="26"
                    height="24"
                  />
                  <svg
                    v-else
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
                <span class="account__lobby-text">
                  <span class="account__lobby-title">{{ lobbyTitle(lobby) }}</span>
                  <span class="account__lobby-desc">{{ lobbyBriefInfo(lobby) }}</span>
                </span>
              </RouterLink>
            </li>
          </ul>
          <p v-else class="account__lineups-status">Пока нет созданных лобби.</p>
        </section>
      </template>
    </div>
  </section>
</template>

<style scoped>
.account {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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
  max-width: none;
  transform: translateY(10px);
}

.account__emoji {
  margin: 0;
  font-size: 2rem;
  line-height: 1;
}

.account__message {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 500;
  color: #374151;
  line-height: 1.5;
  white-space: nowrap;
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

.account__head-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-shrink: 0;
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
  text-decoration: none;
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

.account__settings-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.account__settings-btn--secondary {
  color: #2f6feb;
  background: #eff6ff;
  border-color: #93c5fd;
}

.account__settings-btn--secondary:hover {
  background: #dbeafe;
  border-color: #60a5fa;
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

.account__lineups-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.account__lineups-head-main {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.account__lineups-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #374151;
}

.account__lineups-count {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

.account__lineups-all-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.65rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  text-decoration: none;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-sizing: border-box;
}

.account__lineups-all-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.account__lineups-status {
  margin: 0;
  font-size: 0.8125rem;
  color: #6b7280;
}

.account__lineups-status--error {
  color: #b91c1c;
}

.account__lobbies-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.account__lobby-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  text-decoration: none;
  color: inherit;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-sizing: border-box;
}

.account__lobby-row:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.account__lobby-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 12px;
}

.account__lobby-icon--regular {
  color: #2563eb;
  background: #eef4ff;
}

.account__lobby-icon--gomafia {
  color: #8977FE;
  background: rgba(137, 119, 254, 0.08);
  border: 1px solid rgba(137, 119, 254, 0.22);
}

.account__lobby-go-icon {
  width: 26px;
  height: auto;
  max-height: 24px;
  display: block;
  object-fit: contain;
}

.account__lobby-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.account__lobby-title {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account__lobby-desc {
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

  .account__lineups {
    padding-inline: 0.5rem;
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

  .account__head-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
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
