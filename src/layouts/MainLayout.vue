<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { logout as apiLogout } from '@/api/auth'
import AppSidebar from '@/components/common/AppSidebar.vue'
import ProfileSettingsModal from '@/components/account/ProfileSettingsModal.vue'
import LobbyManageHeaderToolbar from '@/components/lobby/LobbyManageHeaderToolbar.vue'
import { useAuthStore } from '@/stores/auth'
import { useDashboardUiStore } from '@/stores/dashboardUi'
import type { DashboardLobbyFilter } from '@/stores/dashboardUi'
import { useProfilesUiStore } from '@/stores/profilesUi'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { token } = storeToRefs(auth)
const profilesUi = useProfilesUiStore()
const { searchQuery: profilesToolbarSearch, playerCardsTotal: profilesPlayerTotal } = storeToRefs(profilesUi)
const dashboardUi = useDashboardUiStore()
const { lobbyFilter } = storeToRefs(dashboardUi)

const FILTER_OPTIONS: { value: DashboardLobbyFilter; label: string }[] = [
  { value: 'all', label: 'Все лобби' },
  { value: 'mine', label: 'Созданные мной' },
  { value: 'gomafia', label: 'Загруженные из GoMafia' },
]

function setDashboardFilter(next: DashboardLobbyFilter) {
  dashboardUi.lobbyFilter = next
}

const pageTitle = computed(() => route.meta.title ?? '')
/** Только страница «Мой аккаунт»: действия в шапке; в остальных разделах скрыто. */
const showAccountActions = computed(() => route.name === 'account' && !!token.value)
/** Страница «Мои составы»: поиск + «Создать профиль» в шапке (profilesUi store). */
const showProfilesHeader = computed(() => route.name === 'profiles' && !!token.value)
/** Дашборд: фильтр лобби в шапке справа. */
const showDashboardHeader = computed(() => route.name === 'dashboard' && !!token.value)
/** Страница «Управление лобби»: панель действий в шапке (дизайн, Overlay, OBS, удалить). */
const showLobbyManageHeader = computed(() => route.name === 'lobby-manage')
/** Контент лобби без отступа от краёв белой панели. */
const isLobbyManageRoute = computed(() => route.name === 'lobby-manage')

async function logout() {
  apiLogout()
  auth.syncToken()
  await router.push({ name: 'account' })
}

/** Только узкие экраны (телефоны): оверлей-меню. Планшет 640px+ — боковая панель всегда в потоке, без «гамбургера». */
const MOBILE_MQ = '(max-width: 639px)'
const isMobile = ref(
  typeof window !== 'undefined' && window.matchMedia(MOBILE_MQ).matches,
)
const mobileNavOpen = ref(false)
let mq: MediaQueryList | null = null

function syncMobile() {
  const next = mq?.matches ?? false
  isMobile.value = next
  if (!next) mobileNavOpen.value = false
}

function toggleMobileNav() {
  mobileNavOpen.value = !mobileNavOpen.value
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && mobileNavOpen.value) mobileNavOpen.value = false
}

watch([mobileNavOpen, isMobile], () => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = isMobile.value && mobileNavOpen.value ? 'hidden' : ''
})

watch(
  () => route.fullPath,
  () => {
    mobileNavOpen.value = false
  },
)

onMounted(() => {
  mq = window.matchMedia(MOBILE_MQ)
  syncMobile()
  mq.addEventListener('change', syncMobile)
  document.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  mq?.removeEventListener('change', syncMobile)
  document.removeEventListener('keydown', onGlobalKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="shell" :class="{ 'shell--mobile': isMobile, 'shell--nav-open': isMobile && mobileNavOpen }">
    <div
      v-if="isMobile && mobileNavOpen"
      class="shell__nav-backdrop"
      aria-hidden="true"
      @click="mobileNavOpen = false"
    />
    <div class="shell__sidebar">
      <AppSidebar :mobile-drawer="isMobile" />
    </div>
    <div class="shell__main">
      <main class="shell__panel" :class="{ 'shell__panel--flush-border': isLobbyManageRoute }">
        <header class="shell__header">
          <button
            v-if="isMobile"
            type="button"
            class="shell__menu-toggle"
            :aria-expanded="mobileNavOpen"
            aria-controls="app-sidebar-nav"
            @click="toggleMobileNav"
          >
            <span class="shell__menu-burger" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span class="shell__menu-sr">Меню</span>
          </button>
          <h1 class="shell__title">{{ pageTitle }}</h1>
          <div v-if="showAccountActions" class="shell__header-actions">
            <button type="button" class="shell__logout" @click="logout">Выйти</button>
          </div>
          <div v-else-if="showProfilesHeader" class="shell__header-actions shell__header-actions--profiles">
            <p class="shell-profiles-total" aria-live="polite">
              Всего игроков: <span class="shell-profiles-total__num">{{ profilesPlayerTotal }}</span>
            </p>
            <input
              v-model="profilesToolbarSearch"
              class="shell-profiles-search"
              type="search"
              name="player_search"
              placeholder="Поиск игрока"
              autocomplete="off"
              aria-label="Поиск игрока"
            />
            <button type="button" class="shell-profiles-create" @click="profilesUi.requestOpenCreate">
              <span class="shell-profiles-create-plus" aria-hidden="true">+</span>
              Создать профиль
            </button>
          </div>
          <div
            v-else-if="showDashboardHeader"
            class="shell__header-actions shell__header-actions--dashboard"
            role="toolbar"
            aria-label="Фильтр и поиск списка лобби"
          >
            <div class="shell-dashboard-toolbar">
              <div class="shell-dashboard-filters" role="radiogroup" aria-label="Показать лобби">
                <button
                  v-for="opt in FILTER_OPTIONS"
                  :key="opt.value"
                  type="button"
                  role="radio"
                  class="shell-dashboard-filters__btn"
                  :class="{ 'shell-dashboard-filters__btn--active': lobbyFilter === opt.value }"
                  :aria-checked="lobbyFilter === opt.value"
                  @click="setDashboardFilter(opt.value)"
                >
                  {{ opt.label }}
                </button>
              </div>
              <input
                v-model="dashboardUi.tournamentSearchQuery"
                class="shell-profiles-search shell-dashboard-search"
                type="search"
                name="tournament_search"
                placeholder="Поиск по названию турнира"
                autocomplete="off"
                aria-label="Поиск лобби по названию турнира"
              />
            </div>
          </div>
          <div v-else-if="showLobbyManageHeader" class="shell__header-actions shell__header-actions--lobby-manage">
            <LobbyManageHeaderToolbar />
          </div>
        </header>
        <div class="shell__body" :class="{ 'shell__body--flush': isLobbyManageRoute }">
          <RouterView />
        </div>
      </main>
    </div>
    <ProfileSettingsModal />
  </div>
</template>

<style scoped>
.shell {
  /* Одна высота шапки на всех страницах (эталон — строка как у «Мои составы») */
  --shell-header-row-h: 2.375rem;
  --shell-header-pad-y: 0.75rem;
  display: flex;
  gap: 4px;
  align-items: stretch;
  height: 100svh;
  max-height: 100svh;
  box-sizing: border-box;
  padding: 8px;
  background: #dddddd;
  overflow: hidden;
}

.shell__sidebar {
  flex-shrink: 0;
  display: flex;
  min-height: 0;
}

.shell__main {
  flex: 1;
  min-width: 0;
  display: flex;
  min-height: 0;
}

.shell__panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8ec;
  overflow: hidden;
}

.shell__panel.shell__panel--flush-border {
  border: none;
}

.shell__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: var(--shell-header-pad-y) 0.875rem;
  border-bottom: 1px solid #f3f4f6;
  box-sizing: border-box;
  min-height: calc(var(--shell-header-row-h) + 2 * var(--shell-header-pad-y));
}

.shell__header-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: var(--shell-header-row-h);
}

.shell__header-actions--lobby-manage {
  margin-left: auto;
  justify-content: flex-end;
  max-width: 100%;
}

.shell__logout {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--shell-header-row-h);
  height: var(--shell-header-row-h);
  padding: 0 0.95rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #b12a5c;
  background: #fff8fb;
  border: 1px solid #e8a4bf;
  border-radius: 8px;
  cursor: pointer;
  box-sizing: border-box;
}

.shell__logout:hover {
  background: #ffeff5;
  border-color: #d46b94;
  color: #9d174d;
}

.shell__header-actions--profiles {
  gap: 0.65rem;
  align-items: center;
}

.shell-profiles-total {
  margin: 0;
  flex-shrink: 0;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;
  line-height: var(--shell-header-row-h);
}

.shell-profiles-total__num {
  color: #374151;
  font-variant-numeric: tabular-nums;
}

.shell__header-actions--dashboard {
  margin-left: auto;
  justify-content: flex-end;
  max-width: 100%;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.shell-dashboard-filters {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.shell-dashboard-filters__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  min-height: var(--shell-header-row-h);
  height: var(--shell-header-row-h);
  padding: 0 0.65rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #374151;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  box-sizing: border-box;
}

.shell-dashboard-filters__btn:hover:not(.shell-dashboard-filters__btn--active):not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.shell-dashboard-filters__btn--active {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #93c5fd;
}

.shell-dashboard-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  max-width: 100%;
}

.shell-profiles-search,
.shell-profiles-create {
  height: var(--shell-header-row-h);
  min-height: var(--shell-header-row-h);
  max-height: var(--shell-header-row-h);
  padding: 0 0.95rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  box-sizing: border-box;
  border-radius: 8px;
}

.shell-profiles-search {
  width: 14rem;
  max-width: min(14rem, 42vw);
  color: #374151;
  background: #fff;
  border: 1px solid #d1d5db;
  line-height: calc(var(--shell-header-row-h) - 2px);
  -webkit-appearance: none;
  appearance: none;
}

.shell-profiles-search::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

.shell-profiles-search:focus {
  outline: none;
  border-color: #2f6feb;
  box-shadow: 0 0 0 2px #2f6feb;
}

.shell-profiles-create {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  color: #2f6feb;
  background: #eff6ff;
  border: 1px solid #93c5fd;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1;
}

.shell-profiles-create:hover {
  background: #dbeafe;
  border-color: #60a5fa;
}

.shell-profiles-create-plus {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  font-size: 1.1rem;
  font-weight: 500;
  line-height: 1;
}

.shell__title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 600;
  color: #111827;
  line-height: var(--shell-header-row-h);
  min-width: 0;
}

.shell__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  /* Иначе при смене фильтра/длины списка полоска scrollbar появляется и смещает контент по горизонтали */
  scrollbar-gutter: stable;
  padding: 8px;
}

.shell__body.shell__body--flush {
  padding: 0;
}

@media (max-width: 1024px) {
  .shell {
    padding: 6px;
    gap: 4px;
  }

  .shell__header {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0.65rem;
    padding: var(--shell-header-pad-y) 0.75rem;
    min-height: calc(var(--shell-header-row-h) + 2 * var(--shell-header-pad-y));
  }

  .shell__header:has(.shell__logout) {
    flex-wrap: nowrap;
    align-items: center;
  }

  .shell__header:has(.shell__logout) .shell__title {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shell__title {
    font-size: 1.25rem;
  }

  .shell__header-actions {
    flex: 1 1 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.5rem;
    width: 100%;
    box-sizing: border-box;
  }

  .shell-profiles-search,
  .shell-dashboard-search {
    flex: 1 1 12rem;
    min-width: 0;
    max-width: none;
    width: auto;
  }

  .shell__header-actions:has(.shell-profiles-search) {
    flex-wrap: nowrap;
    align-items: center;
  }

  .shell__header-actions--dashboard .shell-dashboard-toolbar {
    flex: 1 1 100%;
    justify-content: flex-start;
    width: 100%;
  }

  .shell-dashboard-toolbar {
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.5rem;
  }

  .shell__body {
    padding: 6px;
  }

  .shell__body.shell__body--flush {
    padding: 0;
  }
}

.shell__nav-backdrop {
  display: none;
}

.shell--mobile {
  position: relative;
  padding: max(4px, env(safe-area-inset-top)) max(4px, env(safe-area-inset-right))
    max(4px, env(safe-area-inset-bottom)) max(4px, env(safe-area-inset-left));
  gap: 0;
}

.shell--mobile .shell__nav-backdrop {
  display: block;
  position: fixed;
  inset: 0;
  z-index: 2050;
  background: rgba(15, 23, 42, 0.48);
}

.shell--mobile .shell__sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 2100;
  width: min(288px, calc(100vw - 40px));
  max-width: min(288px, 88vw);
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  pointer-events: none;
  transform: translateX(-105%);
  transition: transform 0.22s ease;
}

.shell--mobile.shell--nav-open .shell__sidebar {
  pointer-events: auto;
  transform: translateX(0);
  box-shadow: 8px 0 28px rgba(15, 23, 42, 0.18);
}

.shell--mobile .shell__panel {
  border-radius: 10px;
}

.shell--mobile .shell__header {
  display: grid;
  grid-template-columns: var(--shell-header-row-h) 1fr;
  grid-template-areas:
    'menu title'
    'actions actions';
  align-items: center;
  gap: 0.5rem 0.65rem;
  padding: var(--shell-header-pad-y) 0.625rem;
  min-height: calc(var(--shell-header-row-h) + 2 * var(--shell-header-pad-y));
}

/* Одна строка: меню | заголовок | «Выйти» у правого края */
.shell--mobile .shell__header:has(.shell__logout) {
  grid-template-columns: var(--shell-header-row-h) minmax(0, 1fr) auto;
  grid-template-rows: auto;
  grid-template-areas: 'menu title actions';
}

.shell--mobile .shell__header:has(.shell__logout) .shell__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shell--mobile .shell__header:has(.shell__logout) .shell__header-actions {
  width: auto;
  flex-wrap: nowrap;
}

.shell__menu-toggle {
  grid-area: menu;
  display: none;
  align-items: center;
  justify-content: center;
  width: var(--shell-header-row-h);
  height: var(--shell-header-row-h);
  margin: 0;
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
  color: #374151;
  cursor: pointer;
  box-sizing: border-box;
}

.shell--mobile .shell__menu-toggle {
  display: inline-flex;
}

.shell__menu-toggle:hover {
  background: #f3f4f6;
}

.shell__menu-toggle:focus {
  outline: none;
}

.shell__menu-toggle:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.shell__menu-burger {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 18px;
}

.shell__menu-burger span {
  display: block;
  height: 2px;
  border-radius: 1px;
  background: currentColor;
}

.shell__menu-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.shell--mobile .shell__title {
  grid-area: title;
  font-size: 1.125rem;
}

.shell--mobile .shell__header-actions {
  grid-area: actions;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  justify-content: flex-end;
  align-items: center;
}

.shell--mobile .shell__header-actions:has(.shell-profiles-search) {
  justify-content: flex-start;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.shell--mobile .shell-profiles-search {
  flex: 1 1 auto;
  min-width: 0;
}

.shell--mobile .shell-profiles-create {
  flex: 0 0 auto;
  white-space: nowrap;
}

.shell--mobile .shell__body {
  padding: 4px;
}

.shell--mobile .shell__body.shell__body--flush {
  padding: 0;
}

@media (prefers-reduced-motion: reduce) {
  .shell--mobile .shell__sidebar {
    transition: none;
  }
}
</style>
