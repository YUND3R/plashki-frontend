<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { logout as apiLogout, me } from '@/api/auth'
import AppSidebar from '@/components/common/AppSidebar.vue'
import ProfileSettingsModal from '@/components/account/ProfileSettingsModal.vue'
import LobbyManageHeaderToolbar from '@/components/lobby/LobbyManageHeaderToolbar.vue'
import RatingDetailHeaderToolbar from '@/components/ratings/RatingDetailHeaderToolbar.vue'
import profilesListIcon from '@/assets/icons/spisok.svg'
import profilesGridIcon from '@/assets/icons/plitka.svg'
import { useAuthStore } from '@/stores/auth'
import { useDashboardUiStore } from '@/stores/dashboardUi'
import type { DashboardLobbyFilter } from '@/stores/dashboardUi'
import { useCardsUiStore } from '@/stores/cardsUi'
import type { CardDesignFilter } from '@/stores/cardsUi'
import { useProfilesUiStore } from '@/stores/profilesUi'
import type { ProfilesPlayerFilter } from '@/stores/profilesUi'
import { useRatingsUiStore } from '@/stores/ratingsUi'
import { useLobbyManageUiStore } from '@/stores/lobbyManageUi'
import { useContactUiStore } from '@/stores/contactUi'
import { useDocsUiStore } from '@/stores/docsUi'
import { useLegalUiStore } from '@/stores/legalUi'
import type { FeedbackCategory } from '@/api/feedback'
import { isLandingRoute } from '@/constants/landingContent'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { token } = storeToRefs(auth)
const profilesUi = useProfilesUiStore()
const ratingsUi = useRatingsUiStore()
const { detailTab } = storeToRefs(ratingsUi)
const {
  searchQuery: profilesToolbarSearch,
  playerCardsTotal: profilesPlayerTotal,
  playerFilter: profilesPlayerFilter,
  viewMode: profilesViewMode,
} = storeToRefs(profilesUi)
const dashboardUi = useDashboardUiStore()
const { lobbyFilter, createLobbyOpen } = storeToRefs(dashboardUi)
const cardsUi = useCardsUiStore()
const { designFilter } = storeToRefs(cardsUi)
const lobbyManageUi = useLobbyManageUiStore()
const { designPickerOpen, designPickerLobbyTitle, addToRatingOpen } = storeToRefs(lobbyManageUi)
const contactUi = useContactUiStore()
const { category: contactCategory } = storeToRefs(contactUi)
const docsUi = useDocsUiStore()
const { activeSection: docsActiveSection } = storeToRefs(docsUi)
const docsHeaderNavRef = ref<HTMLElement | null>(null)
const legalUi = useLegalUiStore()
const { activeSection: legalActiveSection } = storeToRefs(legalUi)
const legalHeaderNavRef = ref<HTMLElement | null>(null)
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

const CONTACT_CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: 'other', label: 'Другое' },
  { value: 'bug', label: 'Ошибка' },
  { value: 'idea', label: 'Идея' },
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

function setContactCategory(next: FeedbackCategory) {
  contactUi.setCategory(next)
}

const pageTitle = computed(() => {
  if (route.name === 'dashboard' && createLobbyOpen.value) {
    return 'Новое лобби'
  }
  if (route.name === 'lobby-manage') {
    if (addToRatingOpen.value) return 'Добавить в рейтинг'
    const name = designPickerLobbyTitle.value.trim()
    if (designPickerOpen.value) {
      if (name) return `Дизайн плашек для лобби «${name}»`
      return 'Дизайн плашек для лобби'
    }
    if (name) return name
  }
  if (route.name === 'rating-detail') {
    const name = ratingsUi.detailTitle.trim()
    if (name) return name
  }
  if (route.name === 'rating-add-game') return 'Добавить игру'
  return route.meta.title ?? ''
})
/** Только страница «Мой аккаунт»: действия в шапке; в остальных разделах скрыто. */
const showAccountActions = computed(() => route.name === 'account' && !!token.value)
/** Страница «Мои составы»: поиск + «Создать профиль» в шапке (profilesUi store). */
const showProfilesHeader = computed(() => route.name === 'profiles' && !!token.value)
/** Страница рейтинга: действия в шапке. */
const showRatingDetailHeader = computed(
  () => route.name === 'rating-detail' && !!token.value,
)
/** Дашборд: фильтр лобби слева, поиск справа в шапке. */
const showDashboardHeader = computed(
  () => route.name === 'dashboard' && !!token.value && !createLobbyOpen.value,
)
/** Страница «Все дизайны карточек» и выбор в лобби: фильтр плашек в шапке справа. */
const showCardDesignHeader = computed(() => {
  if (!token.value) return false
  if (route.name === 'card-design') return true
  return route.name === 'lobby-manage' && designPickerOpen.value
})
/** Страница «Управление лобби»: панель действий в шапке (скрыта при выборе дизайна). */
const showLobbyManageHeader = computed(
  () => route.name === 'lobby-manage' && !!token.value && !designPickerOpen.value && !addToRatingOpen.value,
)
/** Contact на мобилке: категория обратной связи в шапке рядом с меню. */
const showContactHeader = computed(
  () => route.name === 'contact' && isMobile.value && !!token.value,
)
/** Docs на мобилке: вкладки разделов в шапке рядом с меню. */
const showDocsHeader = computed(() => route.name === 'docs' && isMobile.value)
/** Legal на мобилке: вкладки разделов в шапке рядом с меню. */
const showLegalHeader = computed(() => route.name === 'legal' && isMobile.value)
const isLandingPage = computed(() => isLandingRoute(route.name))

/** Контент без отступа от краёв белой панели. */
const isFlushContentRoute = computed(
  () =>
    isLandingPage.value ||
    route.name === 'lobby-manage' ||
    route.name === 'card-design' ||
    route.name === 'docs' ||
    route.name === 'legal' ||
    route.name === 'contact' ||
    route.name === 'rating-detail' ||
    route.name === 'rating-add-game' ||
    (route.name === 'dashboard' && createLobbyOpen.value),
)
/** Лендинг, docs и contact на мобилке: шапка с кнопкой меню; contact с фильтрами при авторизации; на десктопе docs/contact без шапки. */
const showShellHeader = computed(() => {
  if (route.name === 'contact') return isMobile.value
  if (route.name === 'docs') return isMobile.value
  if (route.name === 'legal') return isMobile.value
  if (isLandingPage.value) return isMobile.value
  return true
})
const hideShellHeaderTitle = computed(
  () =>
    isLandingPage.value ||
    route.name === 'contact' ||
    route.name === 'docs' ||
    route.name === 'legal',
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
    if (name !== 'lobby-manage') {
      lobbyManageUi.closeDesignPicker()
      lobbyManageUi.closeAddToRating()
    }
    if (name !== 'docs') docsUi.setHeaderNavEl(null)
    if (name !== 'legal') legalUi.setHeaderNavEl(null)
  },
)

watch(docsHeaderNavRef, (el) => {
  if (route.name === 'docs') docsUi.setHeaderNavEl(el)
}, { flush: 'post' })

watch(legalHeaderNavRef, (el) => {
  if (route.name === 'legal') legalUi.setHeaderNavEl(el)
}, { flush: 'post' })

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
      <AppSidebar :mobile-drawer="isMobile" :is-admin="isAdmin" />
    </div>
    <div class="shell__main">
      <main
        class="shell__panel"
        :class="{
          'shell__panel--flush-border': isFlushContentRoute && route.name !== 'docs' && route.name !== 'legal' && route.name !== 'contact',
          'shell__panel--docs': route.name === 'docs' || route.name === 'legal',
          'shell__panel--contact': route.name === 'contact',
          'shell__panel--landing': isLandingPage,
        }"
      >
        <header
          v-if="showShellHeader"
          class="shell__header"
          :class="{
            'shell__header--landing-mobile':
              (isLandingPage ||
                route.name === 'contact' ||
                route.name === 'docs' ||
                route.name === 'legal') &&
              !showContactHeader &&
              !showDocsHeader &&
              !showLegalHeader,
          }"
        >
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
          <div
            v-if="!hideShellHeaderTitle && !showProfilesHeader && !showDashboardHeader && !showContactHeader && !showDocsHeader && !showLegalHeader && !showRatingDetailHeader"
            class="shell__title-wrap"
          >
            <h1
              class="shell__title"
              :id="route.name === 'dashboard' && createLobbyOpen ? 'create-lobby-title' : undefined"
            >
              {{ pageTitle }}
            </h1>
          </div>
          <div v-else-if="showRatingDetailHeader" class="shell__title-wrap shell__title-wrap--rating-detail">
            <h1 v-if="pageTitle" class="shell__title shell__title--rating-detail">{{ pageTitle }}</h1>
          </div>
          <div v-else-if="showDashboardHeader" class="shell__title-wrap shell__title-wrap--filters">
            <div
              class="segmented-filter segmented-filter--inline segmented-filter--compact segmented-filter--scroll shell-dashboard-filters"
              role="radiogroup"
              aria-label="Показать лобби"
            >
              <button
                v-for="opt in FILTER_OPTIONS"
                :key="opt.value"
                type="button"
                role="radio"
                class="segmented-filter__btn"
                :class="{ 'segmented-filter__btn--active': lobbyFilter === opt.value }"
                :aria-checked="lobbyFilter === opt.value"
                @click="setDashboardFilter(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div v-else-if="showContactHeader" class="shell__title-wrap shell__title-wrap--filters">
            <div
              class="segmented-filter segmented-filter--compact shell-contact-filters"
              role="radiogroup"
              aria-label="Категория"
            >
              <button
                v-for="opt in CONTACT_CATEGORY_OPTIONS"
                :key="opt.value"
                type="button"
                role="radio"
                class="segmented-filter__btn"
                :class="{ 'segmented-filter__btn--active': contactCategory === opt.value }"
                :aria-checked="contactCategory === opt.value"
                @click="setContactCategory(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div v-else-if="showDocsHeader" class="shell__title-wrap shell__title-wrap--filters">
            <div
              ref="docsHeaderNavRef"
              class="segmented-filter segmented-filter--compact segmented-filter--scroll shell-docs-sections"
              role="tablist"
              aria-label="Разделы инструкции"
            >
              <button
                v-for="section in docsUi.sections"
                :key="section.id"
                type="button"
                role="tab"
                class="segmented-filter__btn"
                :class="{ 'segmented-filter__btn--active': docsActiveSection === section.id }"
                :aria-selected="docsActiveSection === section.id"
                :data-docs-section="section.id"
                @click="docsUi.scrollToSection(section.id)"
              >
                {{ section.label }}
              </button>
            </div>
          </div>
          <div v-else-if="showLegalHeader" class="shell__title-wrap shell__title-wrap--filters">
            <div
              ref="legalHeaderNavRef"
              class="segmented-filter segmented-filter--compact segmented-filter--scroll shell-legal-sections"
              role="tablist"
              aria-label="Разделы правовой информации"
            >
              <button
                v-for="section in legalUi.sections"
                :key="section.id"
                type="button"
                role="tab"
                class="segmented-filter__btn"
                :class="{ 'segmented-filter__btn--active': legalActiveSection === section.id }"
                :aria-selected="legalActiveSection === section.id"
                :data-legal-section="section.id"
                @click="legalUi.scrollToSection(section.id)"
              >
                {{ section.label }}
              </button>
            </div>
          </div>
          <div v-if="showAccountActions" class="shell__header-actions">
            <button type="button" class="shell__logout" @click="logout">Выйти</button>
          </div>
          <div v-else-if="showProfilesHeader" class="shell__profiles-header">
            <div
              class="segmented-filter segmented-filter--inline segmented-filter--compact segmented-filter--scroll shell-profiles-filters"
              role="radiogroup"
              aria-label="Показать игроков"
            >
              <button
                v-for="opt in PROFILES_FILTER_OPTIONS"
                :key="opt.value"
                type="button"
                role="radio"
                class="segmented-filter__btn"
                :class="{ 'segmented-filter__btn--active': profilesPlayerFilter === opt.value }"
                :aria-checked="profilesPlayerFilter === opt.value"
                @click="setProfilesPlayerFilter(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
            <span class="shell__profiles-linebreak" aria-hidden="true" />
            <div
              class="segmented-filter segmented-filter--inline segmented-filter--compact shell-profiles-view-switch"
              role="radiogroup"
              aria-label="Режим отображения карточек игроков"
            >
              <button
                type="button"
                role="radio"
                class="segmented-filter__btn segmented-filter__btn--icon"
                :class="{ 'segmented-filter__btn--active': profilesViewMode === 'compact' }"
                :aria-checked="profilesViewMode === 'compact'"
                aria-label="Список"
                title="Список"
                @click="profilesUi.setViewMode('compact')"
              >
                <img class="shell-profiles-view-btn__icon" :src="profilesListIcon" alt="" aria-hidden="true" />
              </button>
              <button
                type="button"
                role="radio"
                class="segmented-filter__btn segmented-filter__btn--icon"
                :class="{ 'segmented-filter__btn--active': profilesViewMode === 'grid' }"
                :aria-checked="profilesViewMode === 'grid'"
                aria-label="Плитка"
                title="Плитка"
                @click="profilesUi.setViewMode('grid')"
              >
                <img class="shell-profiles-view-btn__icon" :src="profilesGridIcon" alt="" aria-hidden="true" />
              </button>
            </div>
            <div class="shell__profiles-toolbar">
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
                Создать профиль
              </button>
              <div class="shell-profiles-mobile-footer">
                <p class="shell-profiles-mobile-footer__note" aria-live="polite">
                  Всего игроков: <span class="shell-profiles-mobile-footer__num">{{ profilesPlayerTotal }}</span>
                </p>
                <button type="button" class="shell-profiles-mobile-create" @click="profilesUi.requestOpenCreate">
                  Создать профиль
                </button>
              </div>
            </div>
          </div>
          <div
            v-else-if="showRatingDetailHeader"
            class="shell__header-actions shell__header-actions--rating-detail"
          >
            <RatingDetailHeaderToolbar />
            <div
              class="segmented-filter segmented-filter--inline segmented-filter--compact shell-rating-detail-tabs"
              role="tablist"
              aria-label="Раздел рейтинга"
            >
              <button
                type="button"
                role="tab"
                class="segmented-filter__btn"
                :class="{ 'segmented-filter__btn--active': detailTab === 'table' }"
                :aria-selected="detailTab === 'table'"
                @click="ratingsUi.setDetailTab('table')"
              >
                Таблица
              </button>
              <button
                type="button"
                role="tab"
                class="segmented-filter__btn"
                :class="{ 'segmented-filter__btn--active': detailTab === 'games' }"
                :aria-selected="detailTab === 'games'"
                @click="ratingsUi.setDetailTab('games')"
              >
                Игры
              </button>
            </div>
          </div>
          <div
            v-else-if="showDashboardHeader"
            class="shell__header-actions shell__header-actions--dashboard"
            role="toolbar"
            aria-label="Поиск списка лобби"
          >
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
          <div
            v-else-if="showCardDesignHeader"
            class="shell__header-actions shell__header-actions--card-design"
            role="toolbar"
            aria-label="Фильтр списка плашек"
          >
            <div
              class="segmented-filter segmented-filter--inline segmented-filter--compact shell-dashboard-filters"
              role="radiogroup"
              aria-label="Показать плашки"
            >
              <button
                v-for="opt in CARD_DESIGN_FILTER_OPTIONS"
                :key="opt.value"
                type="button"
                role="radio"
                class="segmented-filter__btn"
                :class="{ 'segmented-filter__btn--active': designFilter === opt.value }"
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
        <div
          class="shell__body"
          :class="{
            'shell__body--flush': isFlushContentRoute,
            'shell__body--landing': isLandingPage,
            'shell__body--docs': route.name === 'docs' || route.name === 'legal',
            'shell__body--contact': route.name === 'contact',
          }"
        >
          <RouterView />
        </div>
      </main>
    </div>
    <ProfileSettingsModal />
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

.shell__panel.shell__panel--landing {
  background: #070b14;
  border-color: rgba(148, 163, 184, 0.12);
}

.shell__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: var(--shell-header-pad-y) 0.875rem;
  border-bottom: 1px solid #e5e7eb;
  box-sizing: border-box;
  min-height: calc(var(--shell-header-row-h) + 2 * var(--shell-header-pad-y));
  overflow: visible;
  position: relative;
  z-index: 40;
}

.shell__header--landing-mobile {
  justify-content: flex-start;
  min-height: calc(var(--shell-header-row-h) + 2 * var(--shell-header-pad-y));
  padding: var(--shell-header-pad-y) 0.625rem;
  border-bottom: none;
  background: transparent;
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

.shell__header-actions--rating-detail {
  margin-left: auto;
  justify-content: flex-end;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow: visible;
  gap: 0.45rem;
}

.shell__header-actions--rating-detail .shell-rating-toolbar {
  flex: 1 1 auto;
  min-width: 0;
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

.shell__profiles-header {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.shell__profiles-linebreak {
  display: none;
}

.shell__profiles-toolbar {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.shell__profiles-header .shell-profiles-view-switch {
  order: 1;
}

.shell__profiles-header .shell-profiles-filters {
  order: 2;
  min-width: 0;
  max-width: 100%;
}

.shell__profiles-toolbar {
  order: 3;
}

.shell__profiles-header .shell-profiles-view-switch,
.shell__profiles-header .shell-profiles-filters,
.shell__profiles-toolbar .shell-profiles-create {
  flex: 0 0 auto;
}

.shell__profiles-toolbar .shell-profiles-search {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  max-width: none;
}

.shell__title-wrap--filters {
  flex: 0 1 auto;
  min-width: 0;
}

.shell__title-wrap--filters .shell-dashboard-filters {
  max-width: 100%;
}

.shell__title-wrap--rating-detail {
  flex: 0 1 auto;
  min-width: 0;
}

.shell-rating-detail-tabs {
  flex-shrink: 0;
}

@media (max-width: 1280px) {
  .shell__header:has(.shell__header-actions--rating-detail) {
    flex-wrap: wrap;
    align-items: center;
    row-gap: 0.5rem;
  }

  .shell__title-wrap--rating-detail {
    flex: 1 1 auto;
    min-width: 0;
  }

  .shell:not(.shell--mobile) .shell__header-actions--rating-detail {
    flex: 1 1 100%;
    margin-left: 0;
    justify-content: space-between;
    gap: 0.45rem;
    min-width: 0;
  }

  .shell:not(.shell--mobile) .shell__header-actions--rating-detail :deep(.shell-rating-toolbar) {
    flex: 1 1 auto;
    min-width: 0;
  }

  .shell:not(.shell--mobile) .shell__header-actions--rating-detail :deep(.shell-rating-toolbar__cluster) {
    flex-wrap: wrap;
    justify-content: flex-end;
    row-gap: 0.45rem;
  }

  .shell:not(.shell--mobile) .shell__header-actions--rating-detail :deep(.shell-rating-toolbar__search) {
    flex: 1 1 12rem;
    width: auto;
    min-width: 0;
    max-width: none;
  }

  .shell:not(.shell--mobile) .shell__header-actions--rating-detail :deep(.shell-rating-toolbar__actions) {
    flex: 1 1 auto;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .shell:not(.shell--mobile) .shell__header-actions--rating-detail :deep(.shell-rating-toolbar__actions::-webkit-scrollbar) {
    display: none;
  }
}

.shell__title--rating-detail {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shell-profiles-filters {
  flex-shrink: 0;
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
  flex: 1 1 auto;
  min-width: 0;
  margin-left: 0;
  justify-content: stretch;
  max-width: 100%;
  flex-wrap: nowrap;
  gap: 0.5rem;
}

.shell-dashboard-filters {
  flex-shrink: 0;
}

.shell__header-actions--dashboard .shell-dashboard-search {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  max-width: none;
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
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
  border-color: #2f6feb;
}

.shell-profiles-create {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #2f6feb;
  background: #eff6ff;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1;
}

.shell-profiles-create:hover {
  background: #dbeafe;
}

.shell-profiles-view-switch {
  flex-shrink: 0;
}

.shell-profiles-view-switch .shell-profiles-view-btn__icon {
  width: 1rem;
  height: 1rem;
  display: block;
  filter: brightness(0) saturate(100%) invert(37%) sepia(7%) saturate(981%) hue-rotate(182deg) brightness(97%)
    contrast(89%);
}

.shell-profiles-view-switch .segmented-filter__btn--active .shell-profiles-view-btn__icon {
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
  scrollbar-gutter: auto;
}

.shell__body.shell__body--landing {
  scrollbar-width: none;
  -ms-overflow-style: none;
  scrollbar-gutter: auto;
}

.shell__body.shell__body--landing::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}


.shell__panel--docs .shell__header {
  border-bottom: 1px solid #e5e7eb;
}

.shell__body.shell__body--docs {
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.shell__body.shell__body--contact {
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
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

  .shell__header-actions:has(.shell-dashboard-search) {
    flex-wrap: nowrap;
    align-items: center;
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

.shell--mobile .shell__title-wrap {
  grid-area: title;
  min-width: 0;
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
  flex-wrap: wrap;
}

.shell--mobile .shell__header-actions:has(.shell-rating-toolbar__search) {
  justify-content: flex-end;
  flex-wrap: nowrap;
  min-width: 0;
  overflow: visible;
}

.shell--mobile .shell__header:has(.shell__header-actions--rating-detail) {
  display: grid;
  grid-template-columns: var(--shell-header-row-h) minmax(0, 1fr);
  grid-template-areas:
    'menu title'
    'actions actions'
    'tabs tabs'
    'search search';
  align-items: center;
  gap: 0.5rem 0.45rem;
}

.shell--mobile .shell__header:has(.shell__header-actions--rating-detail) .shell__menu-toggle {
  grid-area: menu;
}

.shell--mobile .shell__header:has(.shell__header-actions--rating-detail) .shell__title-wrap--rating-detail {
  grid-area: title;
  min-width: 0;
}

.shell--mobile .shell__header:has(.shell__header-actions--rating-detail) .shell__title--rating-detail {
  font-size: 1rem;
}

.shell--mobile .shell__header-actions--rating-detail {
  display: contents;
}

.shell--mobile .shell__header-actions--rating-detail .shell-rating-detail-tabs {
  grid-area: tabs;
  display: flex;
  width: 100%;
  max-width: 100%;
  height: var(--shell-header-row-h);
  padding: 0.15rem;
  box-sizing: border-box;
  align-items: center;
  align-self: stretch;
  justify-self: stretch;
}

.shell--mobile .shell__header-actions--rating-detail .shell-rating-detail-tabs .segmented-filter__btn {
  flex: 1 1 0;
  min-width: 0;
}

.shell--mobile .shell__header-actions--rating-detail :deep(.shell-rating-toolbar),
.shell--mobile .shell__header-actions--rating-detail :deep(.shell-rating-toolbar__cluster) {
  display: contents;
}

.shell--mobile .shell__header-actions--rating-detail :deep(.shell-rating-toolbar__search) {
  grid-area: search;
  width: 100%;
  min-width: 0;
  max-width: none;
}

.shell--mobile .shell__header-actions--rating-detail :deep(.shell-rating-toolbar__actions) {
  grid-area: actions;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0.45rem;
  min-width: 0;
  width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.shell--mobile .shell__header-actions--rating-detail :deep(.shell-rating-toolbar__actions::-webkit-scrollbar) {
  display: none;
}

.shell--mobile .shell-profiles-search {
  flex: 1 1 100%;
  min-width: 0;
}

.shell--mobile .shell-profiles-create {
  flex: 0 0 auto;
  white-space: nowrap;
}

.shell--mobile .shell-profiles-view-switch {
  flex: 0 0 auto;
}

.shell--mobile .shell__header:has(.shell__header-actions--dashboard) {
  grid-template-columns: var(--shell-header-row-h) minmax(0, 1fr);
  grid-template-areas:
    'menu filters'
    'search search';
  align-items: start;
  gap: 0.5rem 0.65rem;
}

.shell--mobile .shell__header:has(.shell__header-actions--dashboard) .shell__title-wrap--filters {
  grid-area: filters;
  min-width: 0;
  width: 100%;
}

.shell--mobile .shell__header:has(.shell__header-actions--dashboard) .shell__header-actions--dashboard {
  grid-area: search;
  width: 100%;
  min-width: 0;
  flex: none;
}

.shell--mobile .shell__header:has(.shell__header-actions--dashboard) .shell-dashboard-search {
  width: 100%;
  min-width: 0;
  max-width: none;
}

.shell--mobile .shell__header:has(.shell-contact-filters) {
  display: grid;
  grid-template-columns: var(--shell-header-row-h) minmax(0, 1fr);
  grid-template-areas: 'menu filters';
  grid-template-rows: auto;
  align-items: center;
  gap: 0.5rem;
  min-height: calc(var(--shell-header-row-h) + 2 * var(--shell-header-pad-y));
  padding: var(--shell-header-pad-y) 0.625rem;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.shell--mobile .shell__header:has(.shell-contact-filters) .shell__title-wrap--filters {
  grid-area: filters;
  display: flex;
  align-items: center;
  align-self: center;
  min-width: 0;
  width: 100%;
}

.shell--mobile .shell__header:has(.shell-contact-filters) .shell-contact-filters {
  width: 100%;
  max-width: 100%;
  height: var(--shell-header-row-h);
  padding: 0.15rem;
  box-sizing: border-box;
  align-items: center;
}

.shell--mobile .shell__header:has(.shell-contact-filters) .shell-contact-filters .segmented-filter__btn {
  flex: 1 1 0;
  min-width: 0;
  height: calc(var(--shell-header-row-h) - 0.3rem);
  padding: 0 0.3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  line-height: 1.1;
}

.shell--mobile .shell__header:has(.shell-docs-sections),
.shell--mobile .shell__header:has(.shell-legal-sections) {
  display: grid;
  grid-template-columns: var(--shell-header-row-h) minmax(0, 1fr);
  grid-template-areas: 'menu filters';
  grid-template-rows: auto;
  align-items: center;
  gap: 0.5rem;
  min-height: calc(var(--shell-header-row-h) + 2 * var(--shell-header-pad-y));
  padding: var(--shell-header-pad-y) 0.625rem;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.shell--mobile .shell__header:has(.shell-docs-sections) .shell__title-wrap--filters,
.shell--mobile .shell__header:has(.shell-legal-sections) .shell__title-wrap--filters {
  grid-area: filters;
  display: flex;
  align-items: center;
  align-self: center;
  min-width: 0;
  width: 100%;
}

.shell--mobile .shell__header:has(.shell-docs-sections) .shell-docs-sections,
.shell--mobile .shell__header:has(.shell-legal-sections) .shell-legal-sections {
  width: 100%;
  max-width: 100%;
  height: var(--shell-header-row-h);
  padding: 0.15rem;
  padding-bottom: 0.15rem;
  box-sizing: border-box;
  align-items: center;
}

.shell--mobile .shell__header:has(.shell-docs-sections) .shell-docs-sections .segmented-filter__btn,
.shell--mobile .shell__header:has(.shell-legal-sections) .shell-legal-sections .segmented-filter__btn {
  flex: 0 0 auto;
  height: calc(var(--shell-header-row-h) - 0.3rem);
  padding: 0 0.55rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  line-height: 1.1;
  white-space: nowrap;
}

.shell--mobile .shell__header:has(.shell__profiles-header) {
  display: grid;
  grid-template-columns: var(--shell-header-row-h) minmax(0, 1fr) auto;
  grid-template-areas:
    'menu filters view'
    'search search search';
  align-items: center;
  gap: 0.65rem 0.45rem;
}

.shell--mobile .shell__header:has(.shell__profiles-header) .shell__menu-toggle {
  grid-area: menu;
  order: unset;
}

.shell--mobile .shell__profiles-header {
  display: contents;
}

.shell--mobile .shell__profiles-toolbar {
  display: contents;
}

.shell--mobile .shell-profiles-filters {
  grid-area: filters;
  order: unset;
  flex: initial;
  width: auto;
  min-width: 0;
  max-width: none;
  height: var(--shell-header-row-h);
  padding: 0.15rem;
  box-sizing: border-box;
  align-self: center;
  align-items: center;
}

.shell--mobile .shell-profiles-filters .segmented-filter__btn {
  flex: 0 0 auto;
  height: calc(var(--shell-header-row-h) - 0.3rem);
  padding: 0 0.55rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1.1;
}

.shell--mobile .shell__profiles-linebreak {
  display: none;
}

.shell--mobile .shell-profiles-view-switch {
  grid-area: view;
  order: unset;
  flex: 0 0 auto;
  height: var(--shell-header-row-h);
  padding: 0.15rem;
  box-sizing: border-box;
  align-self: center;
  align-items: center;
  justify-self: end;
}

.shell--mobile .shell-profiles-search {
  grid-area: search;
  order: unset;
  flex: initial;
  width: 100%;
  min-width: 0;
  max-width: none;
  margin: 0;
}

.shell--mobile .shell__profiles-toolbar .shell-profiles-create {
  display: none;
}

.shell-profiles-mobile-footer {
  display: none;
}

.shell--mobile .shell-profiles-mobile-footer {
  position: fixed;
  left: max(4px, env(safe-area-inset-left, 0px));
  right: max(4px, env(safe-area-inset-right, 0px));
  bottom: max(4px, env(safe-area-inset-bottom, 0px));
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 0.75rem;
  min-height: 5.6rem;
  padding: 0.625rem 0.75rem;
  border-top: 1px solid #e5e7eb;
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
  border-radius: 0;
  background: #fff;
  box-sizing: border-box;
}

.shell-profiles-mobile-footer__note {
  margin: 0;
  font-size: 0.8125rem;
  color: #6b7280;
  line-height: 1.3;
}

.shell-profiles-mobile-footer__num {
  color: #374151;
  font-variant-numeric: tabular-nums;
}

.shell-profiles-mobile-create {
  border: 1px solid #2f6feb;
  background: #2f6feb;
  color: #fff;
  border-radius: 8px;
  min-height: 2.25rem;
  width: 100%;
  padding: 0.45rem 1rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.shell-profiles-mobile-create:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.shell-profiles-mobile-create:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}

.shell-profiles-mobile-create:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  background: #9ca3af;
  border-color: #9ca3af;
}

.shell--mobile .shell__body {
  padding: 4px;
}

.shell--mobile:has(.shell__profiles-header) .shell__body {
  padding-bottom: calc(6rem + env(safe-area-inset-bottom, 0px));
}

.shell--mobile .shell__body.shell__body--flush {
  padding: 0;
}

.shell--mobile .shell__body.shell__body--docs {
  padding: 0;
}

.shell--mobile .shell__body.shell__body--contact {
  padding: 0;
}

.shell--mobile .shell__body.shell__body--flush:has(.lobby-manage:not(.lobby-manage--design-picker):not(.lobby-manage--add-rating)) {
  scroll-padding-bottom: calc(10.5rem + env(safe-area-inset-bottom, 0px));
}

@media (prefers-reduced-motion: reduce) {
  .shell--mobile .shell__sidebar {
    transition: none;
  }
}
</style>
