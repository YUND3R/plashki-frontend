<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { LobbyPlayer } from '@/api/lobbies'
import { useAuthStore } from '@/stores/auth'
import OverlayDesignPlatePreview from '@/components/overlay/OverlayDesignPlatePreview.vue'
import { contentAssets, landingPhotoLayoutsForUrl, landingPhotoObjectPosition } from '@/utils/contentAssets'
import LandingLobbyPhonePreview from '@/components/landing/LandingLobbyPhonePreview.vue'
import logoFull from '@/assets/plashki.svg?url'
import iconControl from '@/assets/icons/control.svg?url'
import iconDesignCard from '@/assets/icons/dsgn_card.svg?url'
import iconOverlay from '@/assets/icons/overlay.svg?url'
import iconProfiles from '@/assets/icons/profiles.svg?url'
import iconObs from '@/assets/icons/obs.svg?url'
import iconSheriff from '@/assets/icons/sheriff.svg?url'
import iconDon from '@/assets/icons/don.svg?url'
import iconCivilian from '@/assets/icons/civilian.svg?url'
import iconMafia from '@/assets/icons/mafia.svg?url'

const auth = useAuthStore()
const { token } = storeToRefs(auth)
const isAuthed = computed(() => !!token.value)

const heroStats = [
  { value: '10', label: 'мест за столом' },
  { value: 'Mobile', label: 'удобно ведущему' },
  { value: 'Live', label: 'синхронизация' },
] as const

const heroQuickPoints = [
  'Лобби и overlay в одном месте',
  'Готово для стрима за 3 шага',
  'Красивые плашки без ручной сборки сцен',
] as const

const productFlow = [
  {
    label: '01',
    title: 'Импорт из GoMafia',
    text: 'Заберите состав турнира и не переносите игроков вручную.',
    icon: '↙',
  },
  {
    label: '02',
    title: 'Ведите игру',
    text: 'Роли, статусы, время и места — с компьютера, планшета или телефона.',
    icon: '✦',
  },
  {
    label: '03',
    title: 'Покажите в эфире',
    text: 'Плашки обновляются в OBS автоматически, пока вы управляете столом.',
    icon: '◉',
  },
] as const

const mobilePerks = [
  'Ведите стол с телефона или планшета — не привязаны к ноутбуку.',
  'Крупные карточки игроков, touch-управление и перестановка мест жестом.',
  'Роли и статусы одним касанием прямо во время игры.',
  'Работает в браузере: ничего скачивать и обновлять не нужно.',
] as const

const features = [
  {
    icon: iconProfiles,
    title: 'База игроков',
    text: 'Фото, ник и имя в одной карточке — перетащите игрока в слот за секунду.',
    accent: 'players',
  },
  {
    icon: iconControl,
    title: 'Управление столом',
    text: 'Роли, статусы и лучший ход — с ноутбука, планшета или телефона, без лишних кликов.',
    accent: 'control',
  },
  {
    icon: iconDesignCard,
    title: 'Дизайн плашек',
    text: 'Несколько готовых вариантов оформления — выберите стиль для лобби или турнира и сохраните его.',
    accent: 'design',
  },
  {
    icon: iconOverlay,
    title: 'Overlay для эфира',
    text: 'Выбранный дизайн сразу в эфире: ссылка для OBS, зрители видят актуальный стол.',
    accent: 'overlay',
  },
] as const

const steps = [
  {
    num: '01',
    title: 'Соберите игроков',
    text: 'Добавьте профили в «Мои игроки» или импортируйте турнир из GoMafia.',
  },
  {
    num: '02',
    title: 'Создайте лобби',
    text: 'Расставьте места с телефона или компьютера, назначьте роли и ведите игру на ходу.',
  },
  {
    num: '03',
    title: 'Выведите в эфир',
    text: 'Выберите вариант дизайна плашек и подключите overlay как браузерный источник — карточки обновляются сами.',
  },
] as const

const overlaySeats = [
  { seat: 1, nick: 'Неаполь', roleIcon: iconSheriff, tone: 'sheriff', photo: contentAssets.neapol },
  { seat: 2, nick: 'North', roleIcon: iconCivilian, tone: 'peace', photo: '' },
  { seat: 3, nick: 'Vortex', roleIcon: iconDon, tone: 'mafia', photo: contentAssets.vortex },
  { seat: 4, nick: 'Luna', roleIcon: iconCivilian, tone: 'voted', photo: contentAssets.luna },
  { seat: 5, nick: 'Fox', roleIcon: iconCivilian, tone: 'peace', photo: '' },
] as const

const showcaseDesigns = [
  {
    code: 'classic',
    title: 'Classic',
    text: 'Классические плашки с крупным номером места и фото игрока.',
    preview: { nickname: 'Неаполь', seat: 1, role: 'sheriff', photo: contentAssets.neapol },
  },
  {
    code: 'masters-yug25',
    title: 'Masters',
    text: 'Турнирный стиль: фото игрока на весь кадр и номер места.',
    preview: { nickname: 'Vortex', seat: 2, role: 'don', photo: contentAssets.vortex },
  },
  {
    code: 'plus',
    title: 'Plus',
    text: 'Высокая карточка с фото, ролью и номером места в эфире.',
    preview: { nickname: 'Luna', seat: 3, role: 'mafia', photo: contentAssets.luna },
  },
] as const

function mockPreviewPlayer(
  nickname: string,
  seat: number,
  gameRole: string | null = null,
  photoUrl = '',
): LobbyPlayer {
  const photo = photoUrl.trim()
  return {
    membership_id: `landing-preview-${seat}`,
    player_card_id: `landing-preview-card-${seat}`,
    user_id: `landing-preview-user-${seat}`,
    username: nickname,
    nickname,
    photo_urls: photo ? [photo] : [],
    photo_layouts: landingPhotoLayoutsForUrl(photo),
    game_role: gameRole,
    joined_at: '1970-01-01T00:00:00.000Z',
  }
}

function seatPhotoStyle(photo: string) {
  const pos = landingPhotoObjectPosition(photo)
  return pos ? { objectPosition: pos } : undefined
}

function designPreviewSeats(preview: (typeof showcaseDesigns)[number]['preview']): LobbyPlayer[] {
  return [mockPreviewPlayer(preview.nickname, preview.seat, preview.role, preview.photo)]
}
</script>

<template>
  <section class="landing">
    <div class="landing__hero">
      <div class="landing__hero-bg" aria-hidden="true">
        <span class="landing__mesh landing__mesh--1" />
        <span class="landing__mesh landing__mesh--2" />
        <span class="landing__mesh landing__mesh--3" />
        <span class="landing__noise" />
        <span class="landing__grid" />
      </div>

      <div class="landing__hero-inner">
        <div class="landing__hero-copy">
          <div class="landing__brand-mark">
            <img class="landing__brand-logo" :src="logoFull" alt="" width="108" height="24" />
            <span class="landing__live-badge">
              <span class="landing__live-dot" />
              Live overlay
            </span>
          </div>

          <p class="landing__eyebrow">Стриминг · Мафия · Турниры</p>

          <h1 class="landing__title">
            Плашки, которые<br />
            <span class="landing__title-accent">выглядят как продукт</span>
          </h1>

          <p class="landing__lead">
            plashki — рабочее место ведущего и стримера: состав, роли, статусы и красивый overlay
            для зрителей. Можно выбрать разный дизайн плашек — вести стол и с телефона.
          </p>

          <ul class="landing__quick-points" aria-label="Преимущества plashki">
            <li v-for="point in heroQuickPoints" :key="point" class="landing__quick-point">
              <span class="landing__quick-dot" aria-hidden="true" />
              <span>{{ point }}</span>
            </li>
          </ul>

          <div class="landing__actions">
            <RouterLink
              v-if="isAuthed"
              class="landing__btn landing__btn--primary"
              :to="{ name: 'dashboard' }"
            >
              <span>Панель управления</span>
              <span class="landing__btn-arrow" aria-hidden="true">→</span>
            </RouterLink>
            <RouterLink v-else class="landing__btn landing__btn--primary" :to="{ name: 'register' }">
              <span>Начать бесплатно</span>
              <span class="landing__btn-arrow" aria-hidden="true">→</span>
            </RouterLink>
            <RouterLink
              v-if="isAuthed"
              class="landing__btn landing__btn--ghost"
              :to="{ name: 'profiles' }"
            >
              Мои игроки
            </RouterLink>
            <RouterLink v-else class="landing__btn landing__btn--ghost" :to="{ name: 'login' }">
              Войти
            </RouterLink>
          </div>

          <dl class="landing__stats">
            <div v-for="stat in heroStats" :key="stat.label" class="landing__stat">
              <dt class="landing__stat-value">{{ stat.value }}</dt>
              <dd class="landing__stat-label">{{ stat.label }}</dd>
            </div>
          </dl>
        </div>

        <div class="landing__hero-visual">
          <div class="landing__hero-visual-glow" aria-hidden="true" />
          <div class="landing__browser">
            <div class="landing__browser-chrome">
              <span class="landing__browser-dots" aria-hidden="true">
                <i /><i /><i />
              </span>
              <span class="landing__browser-url">
                <img class="landing__browser-url-icon" :src="iconObs" alt="" />
                overlay · browser source
              </span>
              <span class="landing__browser-live">REC</span>
            </div>

            <div class="landing__browser-body">
              <div class="landing__browser-toolbar">
                <span>Финал турнира · стол 1</span>
                <div class="landing__browser-toolbar-group">
                  <span class="landing__browser-toolbar-design">Плашки · Plus</span>
                  <span class="landing__browser-toolbar-pill">Синхронизировано</span>
                </div>
              </div>

              <div class="landing__stream-stage">
                <div class="landing__stream-stage-top">
                  <span>Эфирный overlay</span>
                  <span class="landing__stream-stage-live"><i /> LIVE</span>
                </div>
                <article
                  v-for="seat in overlaySeats"
                  :key="seat.seat"
                  class="landing__seat-card"
                  :class="`landing__seat-card--${seat.tone}`"
                >
                  <span class="landing__seat-num">{{ seat.seat }}</span>
                  <span class="landing__seat-avatar">
                    <img
                      v-if="seat.photo"
                      :src="seat.photo"
                      alt=""
                      :style="seatPhotoStyle(seat.photo)"
                    />
                  </span>
                  <span class="landing__seat-nick">{{ seat.nick }}</span>
                  <img class="landing__seat-role" :src="seat.roleIcon" alt="" />
                </article>
                <div class="landing__stream-stage-footer">
                  <span>Ход игрока</span>
                  <b>01:20</b>
                </div>
              </div>
            </div>

            <span class="landing__browser-glow" aria-hidden="true" />
          </div>
          <div class="landing__floating-note landing__floating-note--import">
            <span class="landing__floating-note-icon">↙</span>
            <span><b>GoMafia import</b><small>Состав турнира загружен</small></span>
          </div>
          <div class="landing__floating-note landing__floating-note--sync">
            <span class="landing__floating-note-icon">✓</span>
            <span><b>OBS готов</b><small>Плашки обновляются сами</small></span>
          </div>
        </div>
      </div>
    </div>

    <div class="landing__marquee" aria-hidden="true">
      <div class="landing__marquee-track">
        <span>GoMafia import</span>
        <span>Режим ведущего</span>
        <span>Варианты дизайна</span>
        <span>OBS overlay</span>
        <span>Touch-управление</span>
        <span>Live sync</span>
        <span>GoMafia import</span>
        <span>Режим ведущего</span>
        <span>Варианты дизайна</span>
        <span>OBS overlay</span>
        <span>Touch-управление</span>
        <span>Live sync</span>
      </div>
    </div>

    <div class="landing__product-flow">
      <div class="landing__product-flow-inner">
        <div class="landing__product-flow-copy">
          <p class="landing__section-kicker">Всё для ведущего</p>
          <h2 class="landing__product-flow-title">От турнирного списка<br />до красивого эфира</h2>
          <p class="landing__product-flow-text">
            Не переключайтесь между таблицами, чатами и сценами OBS. Соберите весь рабочий процесс
            ведущего в одном понятном интерфейсе.
          </p>
        </div>

        <ol class="landing__flow-list">
          <li v-for="item in productFlow" :key="item.label" class="landing__flow-card">
            <span class="landing__flow-num">{{ item.label }}</span>
            <span class="landing__flow-icon" aria-hidden="true">{{ item.icon }}</span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.text }}</p>
          </li>
        </ol>
      </div>
    </div>

    <div class="landing__section landing__section--designs">
      <div class="landing__section-head landing__section-head--designs">
        <p class="landing__section-kicker">Главный продукт</p>
        <h3 class="landing__section-title">Дизайн плашек для эфира</h3>
        <p class="landing__section-lead">
          Три готовых стиля карточек с ролями, номерами мест и фото игроков. Переключите дизайн в лобби —
          overlay сразу покажет выбранный вариант зрителям.
        </p>
        <ul class="landing__design-roles" aria-label="Роли в превью">
          <li class="landing__design-role landing__design-role--sheriff">
            <img :src="iconSheriff" alt="" />
            Шериф
          </li>
          <li class="landing__design-role landing__design-role--don">
            <img :src="iconDon" alt="" />
            Дон
          </li>
          <li class="landing__design-role landing__design-role--mafia">
            <img :src="iconMafia" alt="" />
            Мафия
          </li>
        </ul>
      </div>

      <div class="landing__designs-grid">
        <article
          v-for="design in showcaseDesigns"
          :key="design.code"
          class="landing__design-card"
        >
          <OverlayDesignPlatePreview
            class="landing__design-preview"
            size="showcase"
            :design-code="design.code"
            :seats="designPreviewSeats(design.preview)"
            :seat-numbers="[design.preview.seat]"
          />
          <div class="landing__design-card-head">
            <h4 class="landing__design-card-title">{{ design.title }}</h4>
            <p class="landing__design-card-text">{{ design.text }}</p>
          </div>
        </article>
      </div>

      <p class="landing__designs-note">
        <RouterLink v-if="isAuthed" class="landing__text-link landing__text-link--center" :to="{ name: 'card-design' }">
          Открыть все дизайны
          <span aria-hidden="true">→</span>
        </RouterLink>
        <span v-else>После регистрации все варианты доступны в разделе «Дизайн карточек».</span>
      </p>
    </div>

    <div class="landing__section">
      <div class="landing__section-head">
        <p class="landing__section-kicker">Возможности</p>
        <h3 class="landing__section-title">Сделано под реальный эфир</h3>
        <p class="landing__section-lead">
          Не просто красивая обложка — инструменты для эфира, включая выбор оформления карточек под ваш стиль.
        </p>
      </div>

      <div class="landing__bento">
        <article
          v-for="(feature, index) in features"
          :key="feature.title"
          class="landing__bento-card"
          :class="[`landing__bento-card--${feature.accent}`, `landing__bento-card--pos-${index + 1}`]"
        >
          <span class="landing__bento-glow" aria-hidden="true" />
          <span class="landing__feature-icon-wrap">
            <img class="landing__feature-icon" :src="feature.icon" alt="" />
          </span>
          <h4 class="landing__feature-title">{{ feature.title }}</h4>
          <p class="landing__feature-text">{{ feature.text }}</p>
        </article>
      </div>
    </div>

    <div class="landing__section landing__section--mobile">
      <div class="landing__mobile-showcase">
        <div class="landing__mobile-layout">
          <header class="landing__mobile-head">
            <p class="landing__section-kicker">Для ведущего</p>
            <h3 class="landing__section-title">Удобно с телефона и планшета</h3>
            <p class="landing__section-lead landing__mobile-lead">
              Не обязательно сидеть за ноутбуком: управляйте лобби с телефона в руке, а overlay
              продолжит показывать актуальный стол зрителям на стриме.
            </p>
          </header>

          <div class="landing__mobile-stage">
            <span class="landing__mobile-orb landing__mobile-orb--left" aria-hidden="true" />
            <span class="landing__mobile-orb landing__mobile-orb--right" aria-hidden="true" />
            <span class="landing__mobile-stage-floor" aria-hidden="true" />
            <LandingLobbyPhonePreview />
          </div>

          <ul class="landing__mobile-perks" aria-label="Преимущества мобильной версии">
            <li v-for="perk in mobilePerks" :key="perk" class="landing__mobile-perk">
              <span class="landing__mobile-check" aria-hidden="true">✓</span>
              <span>{{ perk }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="landing__section landing__section--steps">
      <div class="landing__steps-layout">
        <div class="landing__section-head landing__section-head--left">
          <p class="landing__section-kicker">Как это работает</p>
          <h3 class="landing__section-title">Три шага до эфира</h3>
          <p class="landing__section-lead">
            Простой поток без обучения: люди → стол → картинка для зрителей.
          </p>
          <RouterLink class="landing__text-link" :to="{ name: 'docs' }">
            Подробная инструкция
            <span aria-hidden="true">→</span>
          </RouterLink>
        </div>

        <ol class="landing__timeline">
          <li v-for="step in steps" :key="step.num" class="landing__timeline-item">
            <span class="landing__timeline-marker">
              <span class="landing__timeline-num">{{ step.num }}</span>
            </span>
            <div class="landing__timeline-body">
              <h4 class="landing__step-title">{{ step.title }}</h4>
              <p class="landing__step-text">{{ step.text }}</p>
            </div>
          </li>
        </ol>
      </div>
    </div>

    <div class="landing__cta">
      <div class="landing__cta-card">
        <div class="landing__cta-copy">
          <p class="landing__cta-kicker">Начните сегодня</p>
          <h3 class="landing__cta-title">Первый стол — за несколько минут</h3>
          <p class="landing__cta-text">
            Создайте аккаунт, добавьте игроков, выберите дизайн плашек и выведите overlay в OBS уже сегодня.
          </p>
        </div>
        <div class="landing__actions landing__actions--cta">
          <RouterLink
            v-if="isAuthed"
            class="landing__btn landing__btn--primary landing__btn--light"
            :to="{ name: 'dashboard' }"
          >
            Открыть панель
          </RouterLink>
          <RouterLink
            v-else
            class="landing__btn landing__btn--primary landing__btn--light"
            :to="{ name: 'register' }"
          >
            Создать аккаунт
          </RouterLink>
          <RouterLink class="landing__btn landing__btn--ghost-dark" :to="{ name: 'docs' }">
            Читать инструкцию
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.landing {
  --landing-blue: #5b8cff;
  --landing-blue-deep: #4076ff;
  --landing-ink: #0b1220;
  --landing-muted: #94a3b8;
  --landing-line: rgba(148, 163, 184, 0.16);
  --landing-display: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-x: clip;
  background: #fff;
  color: var(--landing-ink);
  font-family: 'Inter', system-ui, sans-serif;
}

.landing__hero {
  position: relative;
  overflow: hidden;
  padding: clamp(2rem, 5vw, 4.75rem) clamp(1rem, 3vw, 2.5rem) clamp(2.5rem, 5vw, 4rem);
  background:
    radial-gradient(120% 90% at 85% -10%, rgba(64, 118, 255, 0.35), transparent 55%),
    radial-gradient(80% 60% at 0% 100%, rgba(99, 102, 241, 0.18), transparent 50%),
    linear-gradient(165deg, #070b14 0%, #0f172a 42%, #111827 100%);
  color: #f8fafc;
}

.landing__hero::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 6.5rem;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(11, 18, 32, 0), rgba(11, 18, 32, 0.52));
}

.landing__hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.landing__mesh {
  position: absolute;
  border-radius: 999px;
  filter: blur(60px);
}

.landing__mesh--1 {
  width: 26rem;
  height: 26rem;
  top: -10rem;
  right: -4rem;
  background: rgba(64, 118, 255, 0.34);
}

.landing__mesh--2 {
  width: 18rem;
  height: 18rem;
  bottom: -6rem;
  left: -5rem;
  background: rgba(129, 140, 248, 0.22);
}

.landing__mesh--3 {
  width: 12rem;
  height: 12rem;
  top: 40%;
  left: 42%;
  background: rgba(56, 189, 248, 0.12);
}

.landing__noise {
  position: absolute;
  inset: 0;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.landing__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(circle at 50% 20%, black, transparent 78%);
}

.landing__hero-inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(2.25rem, 5vw, 5.5rem);
  align-items: center;
  max-width: 74rem;
  margin-inline: auto;
}

.landing__brand-mark {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.35rem;
}

.landing__brand-logo {
  display: block;
  filter: brightness(0) invert(1);
  opacity: 0.95;
}

.landing__live-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.82);
}

.landing__live-dot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: #ef4444;
  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.55);
  animation: landing-pulse 2s ease-out infinite;
}

.landing__eyebrow {
  margin: 0 0 0.85rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.landing__title {
  margin: 0;
  font-family: var(--landing-display);
  font-size: clamp(2.15rem, 5vw, 3.75rem);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.04em;
}

.landing__title-accent {
  display: inline-block;
  background: linear-gradient(120deg, #ffffff 0%, #93c5fd 45%, #818cf8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.landing__lead {
  margin: 1.1rem 0 0;
  max-width: 33rem;
  font-size: clamp(0.98rem, 1.5vw, 1.06rem);
  line-height: 1.7;
  color: rgba(203, 213, 225, 0.92);
}

.landing__quick-points {
  display: grid;
  gap: 0.55rem;
  margin: 1.1rem 0 0;
  padding: 0;
  list-style: none;
}

.landing__quick-point {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  width: fit-content;
  max-width: 100%;
  padding: 0.32rem 0.68rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.28);
  color: rgba(226, 232, 240, 0.94);
  font-size: 0.78rem;
  font-weight: 500;
}

.landing__quick-dot {
  width: 0.45rem;
  height: 0.45rem;
  flex-shrink: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #60a5fa, #818cf8);
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.16);
}

.landing__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 1.65rem;
}

.landing__actions--cta {
  margin-top: 0;
  flex-shrink: 0;
}

.landing__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.85rem;
  padding: 0 1.2rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease;
}

.landing__btn:hover {
  transform: translateY(-2px);
}

.landing__btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #5b8cff 0%, #4076ff 55%, #6366f1 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.18) inset,
    0 16px 34px rgba(37, 99, 235, 0.38);
}

.landing__btn--primary:hover {
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.22) inset,
    0 20px 40px rgba(37, 99, 235, 0.45);
}

.landing__btn-arrow {
  transition: transform 0.18s ease;
}

.landing__btn--primary:hover .landing__btn-arrow {
  transform: translateX(3px);
}

.landing__btn--ghost {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(8px);
}

.landing__btn--ghost:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.24);
}

.landing__btn--light {
  color: var(--landing-blue-deep);
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
}

.landing__btn--ghost-dark {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.14);
}

.landing__btn--ghost-dark:hover {
  background: rgba(255, 255, 255, 0.1);
}

.landing__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 1.75rem 0 0;
  padding: 0;
}

.landing__stat {
  margin: 0;
  padding: 0.85rem 0.95rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(10px);
}

.landing__stat-value {
  margin: 0;
  font-family: var(--landing-display);
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #fff;
}

.landing__stat-label {
  margin: 0.2rem 0 0;
  font-size: 0.72rem;
  line-height: 1.35;
  color: rgba(148, 163, 184, 0.95);
}

.landing__hero-visual {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 29rem;
}

.landing__browser {
  position: relative;
  z-index: 2;
  width: min(100%, 31rem);
  border-radius: 24px;
  border: 1px solid rgba(191, 219, 254, 0.22);
  background: rgba(8, 15, 35, 0.86);
  box-shadow:
    0 40px 90px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.06) inset,
    0 0 70px rgba(79, 70, 229, 0.2);
  backdrop-filter: blur(22px);
  transform: perspective(1200px) rotateY(-7deg) rotateX(3deg);
  animation: landing-browser-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.landing__hero-visual-glow {
  position: absolute;
  width: 26rem;
  height: 26rem;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(96, 165, 250, 0.38), rgba(99, 102, 241, 0.14) 46%, transparent 72%);
  filter: blur(20px);
}

.landing__browser-glow {
  position: absolute;
  inset: 10% -8% -12%;
  background: radial-gradient(circle, rgba(64, 118, 255, 0.35), transparent 68%);
  z-index: -1;
  filter: blur(18px);
}

.landing__browser-chrome {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.landing__browser-dots {
  display: inline-flex;
  gap: 0.35rem;
}

.landing__browser-dots i {
  display: block;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  font-style: normal;
}

.landing__browser-dots i:first-child {
  background: #ff5f57;
}

.landing__browser-dots i:nth-child(2) {
  background: #febc2e;
}

.landing__browser-dots i:nth-child(3) {
  background: #28c840;
}

.landing__browser-url {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-width: 0;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.22);
  font-size: 0.6875rem;
  color: rgba(203, 213, 225, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.landing__browser-url-icon {
  width: 0.85rem;
  height: 0.85rem;
  opacity: 0.85;
  filter: brightness(0) invert(1);
}

.landing__browser-live {
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.16);
  color: #fca5a5;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.landing__browser-body {
  padding: 0.85rem;
  background:
    radial-gradient(100% 90% at 50% 0%, rgba(59, 130, 246, 0.14), transparent 62%),
    rgba(2, 6, 23, 0.5);
  border-radius: 0 0 24px 24px;
}

.landing__browser-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.6875rem;
  color: rgba(148, 163, 184, 0.95);
}

.landing__browser-toolbar-pill {
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.14);
  color: #86efac;
  font-weight: 600;
}

.landing__browser-toolbar-group {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.landing__browser-toolbar-design {
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  border: 1px solid rgba(96, 165, 250, 0.28);
  background: rgba(59, 130, 246, 0.12);
  color: #93c5fd;
  font-weight: 600;
  white-space: nowrap;
}

.landing__stream-stage {
  position: relative;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.45rem;
  padding: 2.1rem 0.7rem 2.3rem;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 17px;
  background:
    radial-gradient(60% 120% at 50% 40%, rgba(79, 70, 229, 0.27), transparent 72%),
    linear-gradient(155deg, #111c3b 0%, #0a1022 58%, #10132c 100%);
}

.landing__stream-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: linear-gradient(180deg, black, transparent);
}

.landing__stream-stage-top,
.landing__stream-stage-footer {
  position: absolute;
  z-index: 1;
  left: 0.75rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.61rem;
  font-weight: 600;
  color: rgba(203, 213, 225, 0.75);
}

.landing__stream-stage-top {
  top: 0.7rem;
}

.landing__stream-stage-footer {
  bottom: 0.65rem;
}

.landing__stream-stage-footer b {
  color: #f8fafc;
  font-family: var(--landing-display);
  font-size: 0.72rem;
}

.landing__stream-stage-live {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #fca5a5;
  font-size: 0.57rem;
  letter-spacing: 0.09em;
}

.landing__stream-stage-live i {
  width: 0.36rem;
  height: 0.36rem;
  border-radius: 50%;
  background: #f87171;
}

.landing__seat-card {
  z-index: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.28rem;
  padding: 0.55rem 0.25rem 0.65rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  overflow: hidden;
}

.landing__seat-card--sheriff {
  border-color: rgba(250, 204, 21, 0.28);
  background: linear-gradient(180deg, rgba(250, 204, 21, 0.12), rgba(255, 255, 255, 0.03));
}

.landing__seat-card--mafia {
  border-color: rgba(248, 113, 113, 0.24);
}

.landing__seat-card--voted {
  border-color: rgba(248, 113, 113, 0.35);
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.14), rgba(255, 255, 255, 0.02));
}

.landing__seat-num {
  position: absolute;
  top: 0.28rem;
  left: 0.28rem;
  font-size: 0.5625rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
}

.landing__seat-avatar {
  width: 1.65rem;
  height: 1.65rem;
  margin-top: 0.35rem;
  border-radius: 999px;
  overflow: hidden;
  background: linear-gradient(145deg, rgba(147, 197, 253, 0.9), rgba(129, 140, 248, 0.85));
}

.landing__seat-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.landing__floating-note {
  position: absolute;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 9.75rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid rgba(191, 219, 254, 0.26);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.86);
  box-shadow: 0 16px 34px rgba(2, 6, 23, 0.38);
  backdrop-filter: blur(12px);
}

.landing__floating-note b,
.landing__floating-note small {
  display: block;
}

.landing__floating-note b {
  color: #f8fafc;
  font-size: 0.69rem;
  line-height: 1.2;
}

.landing__floating-note small {
  margin-top: 0.14rem;
  color: #94a3b8;
  font-size: 0.58rem;
  line-height: 1.2;
}

.landing__floating-note-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  flex-shrink: 0;
  border-radius: 9px;
  background: linear-gradient(135deg, #2563eb, #6366f1);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 800;
}

.landing__floating-note--import {
  top: 1.8rem;
  left: -1.6rem;
}

.landing__floating-note--sync {
  right: -1.5rem;
  bottom: 1.6rem;
}

.landing__seat-nick {
  max-width: 100%;
  font-size: 0.5625rem;
  font-weight: 600;
  color: rgba(248, 250, 252, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.landing__seat-role {
  width: 0.75rem;
  height: 0.75rem;
  opacity: 0.88;
  filter: brightness(0) invert(1);
}

.landing__marquee {
  overflow: hidden;
  border-bottom: 1px solid var(--landing-line);
  background: #fff;
  mask-image: linear-gradient(90deg, transparent, black 8%, black 92%, transparent);
}

.landing__marquee-track {
  display: flex;
  gap: 2.5rem;
  width: max-content;
  padding: 0.85rem 0;
  animation: landing-marquee 28s linear infinite;
}

.landing__marquee-track span {
  font-family: var(--landing-display);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #cbd5e1;
  white-space: nowrap;
}

.landing__product-flow {
  position: relative;
  z-index: 1;
  padding: clamp(3rem, 6vw, 5rem) clamp(1rem, 3vw, 2.5rem);
  overflow: visible;
  background: #f8fafc;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.landing__product-flow::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.35;
  background:
    radial-gradient(48% 90% at 0% 40%, rgba(96, 165, 250, 0.14), transparent 72%),
    radial-gradient(40% 70% at 100% 10%, rgba(129, 140, 248, 0.1), transparent 68%);
}

.landing__product-flow-inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: clamp(2rem, 4vw, 3rem);
  align-items: start;
  max-width: 74rem;
  margin-inline: auto;
}

.landing__product-flow-copy {
  max-width: 31rem;
  text-align: left;
}

.landing__product-flow-title {
  margin: 0;
  font-family: var(--landing-display);
  font-size: clamp(1.75rem, 3.2vw, 2.65rem);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.04em;
  color: #0f172a;
}

.landing__product-flow-text {
  margin: 1rem 0 0;
  font-size: 1rem;
  line-height: 1.7;
  color: #64748b;
}

.landing__flow-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.landing__flow-card {
  position: relative;
  min-height: auto;
  padding: 1.15rem;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(148, 163, 184, 0.12);
}

.landing__flow-card::after {
  content: '';
  position: absolute;
  top: 1.35rem;
  right: -1.8rem;
  width: 5rem;
  height: 5rem;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(96, 165, 250, 0.2), transparent 68%);
}

.landing__flow-num {
  display: block;
  color: #94a3b8;
  font-family: var(--landing-display);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.landing__flow-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  margin: 1.1rem 0 1.25rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #eff6ff, #e0e7ff);
  color: #4076ff;
  font-size: 1.15rem;
  font-weight: 800;
}

.landing__flow-card h3 {
  position: relative;
  z-index: 1;
  margin: 0;
  font-family: var(--landing-display);
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.landing__flow-card p {
  position: relative;
  z-index: 1;
  margin: 0.55rem 0 0;
  font-size: 0.8rem;
  line-height: 1.55;
  color: #64748b;
}

.landing__section {
  padding: clamp(2.25rem, 4.5vw, 3.5rem) clamp(1rem, 3vw, 2.5rem);
}

.landing__section--steps {
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(64, 118, 255, 0.06), transparent 55%),
    #f8fafc;
  border-top: 1px solid var(--landing-line);
  border-bottom: 1px solid var(--landing-line);
  padding-top: clamp(3rem, 5vw, 4rem);
}

.landing__section--designs {
  position: relative;
  z-index: 2;
  padding: clamp(3rem, 6vw, 4.5rem) clamp(1rem, 3vw, 2.5rem);
  background:
    radial-gradient(90% 70% at 50% 0%, rgba(64, 118, 255, 0.1), transparent 58%),
    #0b1220;
  border-top: none;
  color: #f8fafc;
}

.landing__section-head--designs {
  max-width: 46rem;
  margin-inline: auto;
  text-align: center;
}

.landing__section-head--designs .landing__section-kicker {
  color: #93c5fd;
}

.landing__section-head--designs .landing__section-title {
  color: #fff;
}

.landing__section-head--designs .landing__section-lead {
  color: rgba(203, 213, 225, 0.88);
}

.landing__design-roles {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.55rem;
  margin: 1.25rem 0 0;
  padding: 0;
  list-style: none;
}

.landing__design-role {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(248, 250, 252, 0.92);
}

.landing__design-role img {
  width: 0.95rem;
  height: 0.95rem;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.9;
}

.landing__design-role--sheriff {
  border-color: rgba(250, 204, 21, 0.28);
  background: rgba(250, 204, 21, 0.1);
}

.landing__design-role--don {
  border-color: rgba(129, 140, 248, 0.28);
  background: rgba(129, 140, 248, 0.12);
}

.landing__design-role--mafia {
  border-color: rgba(167, 139, 250, 0.28);
  background: rgba(167, 139, 250, 0.12);
}

.landing__designs-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.15rem;
  max-width: 80rem;
  margin-inline: auto;
  align-items: stretch;
}

.landing__design-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  padding: 0.85rem;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.08), rgba(148, 163, 184, 0.02));
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: 0 18px 44px rgba(2, 6, 23, 0.22);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.landing__design-card:hover {
  transform: translateY(-4px);
  border-color: rgba(129, 140, 248, 0.46);
  box-shadow: 0 26px 54px rgba(2, 6, 23, 0.34);
}

.landing__design-card-head {
  width: 100%;
  padding: 1rem 0 0;
  text-align: center;
}

.landing__design-card-title {
  margin: 0;
  font-family: var(--landing-display);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff;
}

.landing__design-card-text {
  margin: 0.4rem 0 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: rgba(148, 163, 184, 0.95);
}

.landing__design-preview {
  width: 100%;
  min-height: clamp(20rem, 34vw, 27rem);
  height: clamp(20rem, 34vw, 27rem);
  overflow: visible;
}

.landing__designs-note {
  max-width: 80rem;
  margin: 1.5rem auto 0;
  text-align: center;
  font-size: 0.875rem;
  line-height: 1.55;
  color: rgba(148, 163, 184, 0.95);
}

.landing__section--designs .landing__text-link {
  color: #93c5fd;
}

.landing__text-link--center {
  display: inline-flex;
}

.landing__section--mobile {
  position: relative;
  padding:
    clamp(2.5rem, 5vw, 3.5rem) clamp(1rem, 3vw, 2.5rem)
    clamp(3.5rem, 6vw, 5rem);
  background:
    radial-gradient(55% 70% at 50% 0%, rgba(64, 118, 255, 0.14), transparent 62%),
    radial-gradient(40% 50% at 15% 80%, rgba(99, 102, 241, 0.08), transparent 55%),
    radial-gradient(35% 45% at 88% 75%, rgba(56, 189, 248, 0.07), transparent 50%),
    #fff;
  border-top: 1px solid var(--landing-line);
}

.landing__mobile-showcase {
  width: 100%;
  max-width: 78rem;
  margin-inline: auto;
}

.landing__mobile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: clamp(1rem, 2.5vw, 2rem);
  align-items: center;
}

.landing__mobile-head {
  display: grid;
  gap: 0.85rem;
  max-width: 22rem;
  text-align: left;
  justify-self: start;
}

.landing__mobile-lead {
  max-width: none;
  margin: 0;
}

.landing__mobile-stage {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: clamp(24rem, 40vw, 44rem);
  aspect-ratio: 473 / 512;
  overflow: hidden;
  min-height: 0;
  padding: 0;
  justify-self: center;
}

.landing__mobile-showcase :deep(.landing-phone) {
  width: 100%;
  max-width: none;
  position: relative;
  z-index: 2;
  flex-shrink: 0;
}

.landing__mobile-showcase :deep(.landing-phone__image) {
  transform-origin: top center;
}

.landing__mobile-orb {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(40px);
}

.landing__mobile-orb--left {
  left: 4%;
  top: 18%;
  width: min(42%, 14rem);
  height: min(42%, 14rem);
  background: radial-gradient(circle, rgba(96, 145, 255, 0.34), transparent 68%);
}

.landing__mobile-orb--right {
  right: 2%;
  bottom: 16%;
  width: min(38%, 12rem);
  height: min(38%, 12rem);
  background: radial-gradient(circle, rgba(129, 140, 248, 0.28), transparent 68%);
}

.landing__mobile-stage-floor {
  position: absolute;
  left: 50%;
  bottom: 0;
  z-index: 1;
  width: 78%;
  height: 1.75rem;
  border-radius: 999px;
  background: radial-gradient(ellipse, rgba(15, 23, 42, 0.18), transparent 72%);
  transform: translateX(-50%);
  filter: blur(10px);
  pointer-events: none;
}

.landing__mobile-perks {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  width: 100%;
  max-width: 22rem;
  margin: 0;
  padding: 0;
  list-style: none;
  text-align: left;
  justify-self: end;
}

.landing__mobile-perk {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: start;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.72);
  font-size: 0.9375rem;
  line-height: 1.5;
  color: #475569;
  box-shadow: 0 12px 30px rgba(148, 163, 184, 0.16);
}

.landing__mobile-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  margin-top: 0.1rem;
  border-radius: 999px;
  background: rgba(64, 118, 255, 0.12);
  color: var(--landing-blue-deep);
  font-size: 0.72rem;
  font-weight: 800;
}

.landing__section-head {
  max-width: 38rem;
  margin: 0 auto 2rem;
  text-align: center;
}

.landing__section-head--left {
  margin: 0;
  text-align: left;
}

.landing__section-kicker {
  margin: 0 0 0.55rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--landing-blue-deep);
}

.landing__section-title {
  margin: 0;
  font-family: var(--landing-display);
  font-size: clamp(1.65rem, 3.2vw, 2.35rem);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.landing__section-lead {
  margin: 0.85rem 0 0;
  font-size: 1rem;
  line-height: 1.65;
  color: #64748b;
}

.landing__bento {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-auto-rows: minmax(9.5rem, auto);
  gap: 0.85rem;
  max-width: 74rem;
  margin-inline: auto;
}

.landing__bento-card {
  position: relative;
  overflow: hidden;
  padding: 1.25rem 1.2rem 1.35rem;
  border-radius: 22px;
  border: 1px solid var(--landing-line);
  background: #fff;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.landing__bento-card:hover {
  transform: translateY(-3px);
  border-color: rgba(64, 118, 255, 0.22);
  box-shadow: 0 22px 44px rgba(15, 23, 42, 0.08);
}

.landing__bento-card--pos-1 {
  grid-column: span 7;
  grid-row: span 2;
}

.landing__bento-card--pos-2 {
  grid-column: span 5;
}

.landing__bento-card--pos-3 {
  grid-column: span 5;
}

.landing__bento-card--pos-4 {
  grid-column: span 12;
}

.landing__bento-card--overlay {
  background:
    radial-gradient(circle at 100% 0%, rgba(64, 118, 255, 0.16), transparent 42%),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.landing__bento-card--control {
  background: linear-gradient(180deg, #fafafa 0%, #ffffff 100%);
}

.landing__bento-glow {
  position: absolute;
  width: 10rem;
  height: 10rem;
  top: -4rem;
  right: -3rem;
  border-radius: 999px;
  background: rgba(64, 118, 255, 0.12);
  filter: blur(24px);
  pointer-events: none;
}

.landing__feature-icon-wrap {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin-bottom: 1rem;
  border-radius: 14px;
  background: rgba(64, 118, 255, 0.1);
  border: 1px solid rgba(64, 118, 255, 0.12);
}

.landing__feature-icon {
  width: 1.3rem;
  height: 1.3rem;
}

.landing__feature-title {
  position: relative;
  z-index: 1;
  margin: 0;
  font-family: var(--landing-display);
  font-size: 1.08rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.landing__feature-text {
  position: relative;
  z-index: 1;
  margin: 0.5rem 0 0;
  max-width: 28rem;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #64748b;
}

.landing__steps-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: clamp(1.75rem, 4vw, 3.5rem);
  max-width: 74rem;
  margin-inline: auto;
  align-items: start;
}

.landing__text-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 1.15rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--landing-blue-deep);
  text-decoration: none;
}

.landing__text-link:hover span {
  transform: translateX(3px);
}

.landing__text-link span {
  transition: transform 0.18s ease;
}

.landing__timeline {
  margin: 0;
  padding: 0;
  list-style: none;
}

.landing__timeline-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  padding-bottom: 1.35rem;
}

.landing__timeline-item:last-child {
  padding-bottom: 0;
}

.landing__timeline-marker {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 3rem;
}

.landing__timeline-marker::after {
  content: '';
  position: absolute;
  top: 2.4rem;
  bottom: -1.35rem;
  width: 1px;
  background: linear-gradient(180deg, rgba(64, 118, 255, 0.35), rgba(64, 118, 255, 0.08));
}

.landing__timeline-item:last-child .landing__timeline-marker::after {
  display: none;
}

.landing__timeline-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  border: 1px solid rgba(64, 118, 255, 0.18);
  background: #fff;
  font-family: var(--landing-display);
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--landing-blue-deep);
  box-shadow: 0 10px 24px rgba(64, 118, 255, 0.12);
}

.landing__timeline-body {
  padding: 0.35rem 1rem 1rem;
  border-radius: 18px;
  border: 1px solid var(--landing-line);
  background: #fff;
  box-shadow: 0 16px 28px rgba(148, 163, 184, 0.15);
}

.landing__step-title {
  margin: 0;
  font-family: var(--landing-display);
  font-size: 1.02rem;
  font-weight: 700;
}

.landing__step-text {
  margin: 0.4rem 0 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #64748b;
}

.landing__cta {
  padding: clamp(2rem, 4vw, 3rem) clamp(1rem, 3vw, 2.5rem) clamp(2.5rem, 5vw, 3.5rem);
  background: #fff;
}

.landing__cta-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  max-width: 74rem;
  margin-inline: auto;
  padding: clamp(1.5rem, 3vw, 2rem) clamp(1.25rem, 3vw, 2rem);
  border-radius: 28px;
  background:
    radial-gradient(120% 120% at 100% 0%, rgba(255, 255, 255, 0.14), transparent 50%),
    linear-gradient(135deg, #1d4ed8 0%, #4076ff 42%, #6366f1 100%);
  box-shadow: 0 28px 60px rgba(37, 99, 235, 0.28);
}

.landing__cta-kicker {
  margin: 0 0 0.45rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
}

.landing__cta-title {
  margin: 0;
  font-family: var(--landing-display);
  font-size: clamp(1.45rem, 3vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #fff;
}

.landing__cta-text {
  margin: 0.65rem 0 0;
  max-width: 30rem;
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.84);
}

@keyframes landing-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.55);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}

@keyframes landing-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

@keyframes landing-browser-in {
  from {
    opacity: 0;
    transform: perspective(1200px) rotateY(-8deg) rotateX(4deg) translateY(24px);
  }
  to {
    opacity: 1;
    transform: perspective(1200px) rotateY(-8deg) rotateX(4deg) translateY(0);
  }
}

@media (max-width: 1024px) {
  .landing__hero-inner {
    grid-template-columns: 1fr;
  }

  .landing__hero-visual {
    order: -1;
  }

  .landing__browser {
    transform: none;
    width: min(100%, 24rem);
  }

  .landing__hero-visual {
    min-height: 25rem;
  }

  .landing__floating-note--import {
    left: 0;
  }

  .landing__floating-note--sync {
    right: 0;
  }

  .landing__product-flow-inner {
    grid-template-columns: 1fr;
    gap: 1.75rem;
  }

  .landing__product-flow-copy {
    max-width: none;
    text-align: center;
  }

  .landing__flow-list {
    grid-template-columns: 1fr;
  }

  .landing__bento-card--pos-1,
  .landing__bento-card--pos-2,
  .landing__bento-card--pos-3,
  .landing__bento-card--pos-4 {
    grid-column: span 12;
    grid-row: auto;
  }

  .landing__steps-layout {
    grid-template-columns: 1fr;
  }

  .landing__mobile-layout {
    grid-template-columns: 1fr;
    gap: 1.75rem;
  }

  .landing__mobile-head {
    max-width: none;
    justify-self: stretch;
  }

  .landing__mobile-stage {
    width: min(88vw, 34rem);
    order: 2;
  }

  .landing__mobile-perks {
    max-width: none;
    justify-self: stretch;
    order: 3;
  }

  .landing__designs-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    overflow-x: visible;
    scroll-snap-type: none;
    padding-bottom: 0;
  }

  .landing__design-preview {
    min-height: 22rem;
    height: 22rem;
  }

  .landing__quick-point {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .landing__stats {
    grid-template-columns: 1fr;
  }

  .landing__designs-grid {
    grid-template-columns: 1fr;
  }

  .landing__flow-list {
    grid-template-columns: 1fr;
  }

  .landing__flow-card {
    min-height: auto;
    padding: 1rem;
  }

  .landing__flow-icon {
    margin: 0.75rem 0;
  }

  .landing__design-preview {
    min-height: 20rem;
    height: 20rem;
  }

  .landing__mobile-perks {
    grid-template-columns: 1fr;
  }

  .landing__brand-mark {
    flex-direction: column;
    align-items: flex-start;
  }

  .landing__seat-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .landing__stream-stage {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .landing__stream-stage .landing__seat-card:nth-of-type(n + 4) {
    display: none;
  }

  .landing__hero-visual {
    min-height: 21rem;
  }

  .landing__floating-note {
    min-width: auto;
    padding: 0.45rem 0.55rem;
  }

  .landing__floating-note small {
    display: none;
  }

  .landing__floating-note--import {
    top: 0.25rem;
    left: 0;
  }

  .landing__floating-note--sync {
    right: 0;
    bottom: 0.3rem;
  }

  .landing__actions,
  .landing__actions--cta {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .landing__btn {
    width: 100%;
  }

  .landing__cta-card {
    flex-direction: column;
    align-items: stretch;
  }

  .landing__design-card {
    padding: 0.65rem;
    border-radius: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing__marquee-track,
  .landing__live-dot,
  .landing__browser {
    animation: none;
  }

  .landing__btn:hover,
  .landing__bento-card:hover {
    transform: none;
  }
}
</style>
