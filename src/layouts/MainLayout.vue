<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { logout as apiLogout, me } from '@/api/auth'
import AppSidebar from '@/components/common/AppSidebar.vue'
import ProfileSettingsModal from '@/components/account/ProfileSettingsModal.vue'
import FeedbackModal from '@/components/feedback/FeedbackModal.vue'
import LobbyManageHeaderToolbar from '@/components/lobby/LobbyManageHeaderToolbar.vue'
import profilesListIcon from '@/assets/icons/spisok.svg'
import profilesGridIcon from '@/assets/icons/plitka.svg'
import { useAuthStore } from '@/stores/auth'
import { useDashboardUiStore } from '@/stores/dashboardUi'
import type { DashboardLobbyFilter } from '@/stores/dashboardUi'
import { useCardsUiStore } from '@/stores/cardsUi'
import type { CardDesignFilter } from '@/stores/cardsUi'
import { useProfilesUiStore } from '@/stores/profilesUi'
import type { ProfilesPlayerFilter } from '@/stores/profilesUi'
import { useFeedbackModalStore } from '@/stores/feedbackModal'
import { useLobbyManageUiStore } from '@/stores/lobbyManageUi'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { token } = storeToRefs(auth)
const profilesUi = useProfilesUiStore()
const {
  searchQuery: profilesToolbarSearch,
  playerCardsTotal: profilesPlayerTotal,
  playerFilter: profilesPlayerFilter,
  viewMode: profilesViewMode,
} = storeToRefs(profilesUi)
const dashboardUi = useDashboardUiStore()
const { lobbyFilter } = storeToRefs(dashboardUi)
const cardsUi = useCardsUiStore()
const { designFilter } = storeToRefs(cardsUi)
const feedbackModal = useFeedbackModalStore()
const { toastVisible, toastMessage } = storeToRefs(feedbackModal)
const lobbyManageUi = useLobbyManageUiStore()
const { designPickerOpen, designPickerLobbyTitle } = storeToRefs(lobbyManageUi)
const userRole = ref('')
const userRoleLoading = ref(false)
const isAdmin = computed(() => userRole.value.trim().toUpperCase() === 'ADMIN')

const FILTER_OPTIONS: { value: DashboardLobbyFilter; label: string }[] = [
  { value: 'all', label: 'Все лобби' },
  { value: 'mine', label: 'Созданные мной' },
  { value: 'gomafia', label: 'Загруженные из GoMafia' },
]

const CARD_DESIGN_FILTER_OPTIONS: { value: CardDesignFilter; label: string }[] = [
  { value: 'all', label: 'Все плашки' },
  { value: 'available', label: 'Доступные мне' },
]

const PROFILES_FILTER_OPTIONS: { value: ProfilesPlayerFilter; label: string }[] = [
  { value: 'all', label: 'Все игроки' },
  { value: 'mine', label: 'Созданные мной' },
  { value: 'gomafia', label: 'Загруженные из GoMafia' },
]

function setDashboardFilter(next: DashboardLobbyFilter) {
  dashboardUi.lobbyFilter = next
}

function setProfilesPlayerFilter(next: ProfilesPlayerFilter) {
  profilesUi.playerFilter = next
}

function setCardDesignFilter(next: CardDesignFilter) {
  cardsUi.designFilter = next
}

const pageTitle = computed(() => {
  if (route.name === 'lobby-manage' && designPickerOpen.value) {
    const name = designPickerLobbyTitle.value.trim()
    if (name) return `Дизайн плашек для лобби «${name}»`
    return 'Дизайн плашек для лобби'
  }
  return route.meta.title ?? ''
})
/** Только страница «Мой аккаунт»: действия в шапке; в остальных разделах скрыто. */
const showAccountActions = computed(() => route.name === 'account' && !!token.value)
/** Страница «Мои составы»: поиск + «Создать профиль» в шапке (profilesUi store). */
const showProfilesHeader = computed(() => route.name === 'profiles' && !!token.value)
/** Дашборд: фильтр лобби в шапке справа. */
const showDashboardHeader = computed(() => route.name === 'dashboard' && !!token.value)
/** Страница «Все дизайны карточек» и выбор в лобби: фильтр плашек в шапке справа. */
const showCardDesignHeader = computed(() => {
  if (!token.value) return false
  if (route.name === 'card-design') return true
  return route.name === 'lobby-manage' && designPickerOpen.value
})
/** Страница «Управление лобби»: панель действий в шапке (скрыта при выборе дизайна). */
const showLobbyManageHeader = computed(
  () => route.name === 'lobby-manage' && !!token.value && !designPickerOpen.value,
)
/** Контент без отступа от краёв белой панели. */
const isFlushContentRoute = computed(
  () => route.name === 'lobby-manage' || route.name === 'card-design',
)

async function logout() {
  try {
    await apiLogout()
  } catch {
    // Даже если сервер вернул ошибку logout, локально выходим из сессии.
  } finally {
    auth.setToken(null)
    userRole.value = ''
    await router.push({ name: 'account' })
  }
}

async function syncUserRole() {
  if (!token.value) {
    userRole.value = ''
    return
  }
  if (userRoleLoading.value) return
  userRoleLoading.value = true
  try {
    const profile = await me()
    userRole.value = typeof profile.role === 'string' ? profile.role : ''
  } catch {
    userRole.value = ''
  } finally {
    userRoleLoading.value = false
  }
}

/** Планшеты и телефоны: выдвижное меню, контент на всю ширину. Десктоп 1025px+ — боковая панель в потоке. */
const COMPACT_NAV_MQ = '(max-width: 1024px)'
const isMobile = ref(
  typeof window !== 'undefined' && window.matchMedia(COMPACT_NAV_MQ).matches,
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

function onSidebarFeedback() {
  mobileNavOpen.value = false
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && mobileNavOpen.value) mobileNavOpen.value = false
}

watch([mobileNavOpen, isMobile], () => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = isMobile.value && mobileNavOpen.value ? 'hidden' : ''
})

watch(
  () => route.name,
  (name) => {
    if (name !== 'lobby-manage') lobbyManageUi.closeDesignPicker()
  },
)

watch(
  () => route.fullPath,
  () => {
    mobileNavOpen.value = false
  },
)

watch(token, () => {
  void syncUserRole()
}, { immediate: true })

onMounted(() => {
  profilesUi.hydrateViewMode()
  mq = window.matchMedia(COMPACT_NAV_MQ)
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
      <AppSidebar :mobile-drawer="isMobile" :is-admin="isAdmin" @feedback="onSidebarFeedback" />
    </div>
    <div class="shell__main">
      <main class="shell__panel" :class="{ 'shell__panel--flush-border': isFlushContentRoute }">
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
          <div class="shell__title-wrap">
            <h1 class="shell__title">{{ pageTitle }}</h1>
            <span v-if="isAdmin" class="shell__admin-badge">ADMIN</span>
          </div>
          <div v-if="showAccountActions" class="shell__header-actions">
            <button type="button" class="shell__logout" @click="logout">Выйти</button>
          </div>
          <div v-else-if="showProfilesHeader" class="shell__header-actions shell__header-actions--profiles">
            <p class="shell-profiles-total" aria-live="polite">
              Всего игроков: <span class="shell-profiles-total__num">{{ profilesPlayerTotal }}</span>
            </p>
            <div class="shell-dashboard-filters shell-profiles-filters" role="radiogroup" aria-label="Показать игроков">
              <button
                v-for="opt in PROFILES_FILTER_OPTIONS"
                :key="opt.value"
                type="button"
                role="radio"
                class="shell-dashboard-filters__btn"
                :class="{ 'shell-dashboard-filters__btn--active': profilesPlayerFilter === opt.value }"
                :aria-checked="profilesPlayerFilter === opt.value"
                @click="setProfilesPlayerFilter(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
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
            <div class="shell-profiles-view-switch" role="toolbar" aria-label="Режим отображения карточек игроков">
              <button
                type="button"
                class="shell-profiles-view-btn"
                :class="{ 'shell-profiles-view-btn--active': profilesViewMode === 'grid' }"
                aria-label="Плитка"
                title="Плитка"
                @click="profilesUi.setViewMode('grid')"
              >
                <img class="shell-profiles-view-btn__icon" :src="profilesGridIcon" alt="" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="shell-profiles-view-btn"
                :class="{ 'shell-profiles-view-btn--active': profilesViewMode === 'compact' }"
                aria-label="Список"
                title="Список"
                @click="profilesUi.setViewMode('compact')"
              >
                <img class="shell-profiles-view-btn__icon" :src="profilesListIcon" alt="" aria-hidden="true" />
              </button>
            </div>
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
          <div
            v-else-if="showCardDesignHeader"
            class="shell__header-actions shell__header-actions--card-design"
            role="toolbar"
            aria-label="Фильтр списка плашек"
          >
            <div class="shell-dashboard-filters" role="radiogroup" aria-label="Показать плашки">
              <button
                v-for="opt in CARD_DESIGN_FILTER_OPTIONS"
                :key="opt.value"
                type="button"
                role="radio"
                class="shell-dashboard-filters__btn"
                :class="{ 'shell-dashboard-filters__btn--active': designFilter === opt.value }"
                :aria-checked="designFilter === opt.value"
                @click="setCardDesignFilter(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div v-else-if="showLobbyManageHeader" class="shell__header-actions shell__header-actions--lobby-manage">
            <LobbyManageHeaderToolbar />
          </div>
        </header>
        <div class="shell__body" :class="{ 'shell__body--flush': isFlushContentRoute }">
          <RouterView />
        </div>
      </main>
    </div>
    <ProfileSettingsModal />
    <FeedbackModal />
    <Teleport to="body">
      <Transition name="shell-feedback-toast">
        <p
          v-if="toastVisible"
          class="shell-feedback-toast"
          role="status"
          aria-live="polite"
        >
          {{ toastMessage }}
        </p>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.shell {
  /* Одна высота шапки на всех страницах (эталон - строка как у «Мои составы») */
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
  overflow: visible;
  position: relative;
  z-index: 40;
}

.shell__header-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: var(--shell-header-row-h);
  overflow: visible;
}

.shell__header-actions--lobby-manage {
  margin-left: auto;
  justify-content: flex-end;
  max-width: 100%;
  overflow: visible;
  position: relative;
  z-index: 60;
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
  flex: 1 1 auto;
  min-width: 0;
  margin-left: auto;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  max-width: 100%;
}

.shell-profiles-filters {
  flex-shrink: 0;
}

.shell__header-actions--profiles .shell-profiles-search {
  flex: 1 1 auto;
  min-width: 0;
  width: auto;
  max-width: none;
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

.shell-profiles-view-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.shell-profiles-view-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--shell-header-row-h);
  height: var(--shell-header-row-h);
  min-height: var(--shell-header-row-h);
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.shell-profiles-view-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.shell-profiles-view-btn:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 2px;
}

.shell-profiles-view-btn--active {
  background: #eff6ff;
  border-color: #93c5fd;
}

.shell-profiles-view-btn__icon {
  width: 1rem;
  height: 1rem;
  display: block;
  filter: brightness(0) saturate(100%) invert(37%) sepia(7%) saturate(981%) hue-rotate(182deg) brightness(97%)
    contrast(89%);
}

.shell-profiles-view-btn--active .shell-profiles-view-btn__icon {
  filter: brightness(0) saturate(100%) invert(36%) sepia(70%) saturate(3975%) hue-rotate(210deg) brightness(98%)
    contrast(95%);
}

.shell__title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 600;
  color: #111827;
  line-height: var(--shell-header-row-h);
  min-width: 0;
}

.shell__title-wrap {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.shell__admin-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.35rem;
  padding: 0 0.5rem;
  border-radius: 999px;
  border: 1px solid #f59e0b;
  background: #fffbeb;
  color: #92400e;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 1;
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
  display: flex;
  flex-direction: column;
  min-height: 0;
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

.shell--mobile .shell__header:has(.shell__header-actions--lobby-manage) {
  grid-template-columns: var(--shell-header-row-h) minmax(0, 1fr) auto;
  grid-template-rows: auto;
  grid-template-areas: 'menu title actions';
}

.shell--mobile .shell__header:has(.shell__header-actions--lobby-manage) .shell__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1.125rem;
}

.shell--mobile .shell__header:has(.shell__header-actions--lobby-manage) .shell__header-actions {
  width: auto;
  flex: 0 0 auto;
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

.shell--mobile .shell-profiles-view-switch {
  flex: 0 0 auto;
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

.shell-feedback-toast {
  position: fixed;
  left: 50%;
  bottom: max(1.25rem, env(safe-area-inset-bottom));
  z-index: 3200;
  transform: translateX(-50%);
  margin: 0;
  padding: 0.65rem 1rem;
  max-width: min(22rem, calc(100vw - 2rem));
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  text-align: center;
  pointer-events: none;
}

.shell-feedback-toast-enter-active,
.shell-feedback-toast-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.shell-feedback-toast-enter-from,
.shell-feedback-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(0.35rem);
}
</style>
