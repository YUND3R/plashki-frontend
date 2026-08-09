<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { useDocsUiStore } from '@/stores/docsUi'
import type { DocsSectionId } from '@/constants/docsSections'

const docsUi = useDocsUiStore()
const { activeSection } = storeToRefs(docsUi)

const MOBILE_NAV_MQ = '(max-width: 1024px)'

const contentRef = ref<HTMLElement | null>(null)
let sectionObserver: IntersectionObserver | null = null
let mobileMq: MediaQueryList | null = null

onMounted(() => {
  void nextTick(() => {
    const root = contentRef.value
    const nodes = docsUi.sections
      .map((section) => document.getElementById(`docs-section-${section.id}`))
      .filter((node): node is HTMLElement => !!node)

    if (!root || !nodes.length) return

    mobileMq = window.matchMedia(MOBILE_NAV_MQ)

    sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const top = visible[0]
        if (!top?.target.id) return
        const id = top.target.id.replace('docs-section-', '')
        docsUi.setActiveSection(id as DocsSectionId)
      },
      {
        root,
        rootMargin: mobileMq.matches
          ? 'calc(-1 * (var(--shell-header-row-h, 2.375rem) + 2 * var(--shell-header-pad-y, 0.75rem) + 0.35rem)) 0px -52% 0px'
          : '-12% 0px -55% 0px',
        threshold: [0, 0.12, 0.25, 0.5, 0.75, 1],
      },
    )

    for (const node of nodes) sectionObserver.observe(node)
    docsUi.syncHeaderNavScroll(activeSection.value, 'auto')
  })
})

onUnmounted(() => {
  sectionObserver?.disconnect()
  sectionObserver = null
})
</script>

<template>
  <section class="docs">
    <div class="docs__frame">
      <aside class="docs__nav" aria-label="Навигация по документации">
        <div class="docs__nav-head">
          <p class="docs__nav-kicker">Инструкция</p>
        </div>

        <ol class="docs__nav-list">
          <li v-for="(section, index) in docsUi.sections" :key="section.id">
            <button
              type="button"
              class="docs__nav-link"
              :class="{ 'docs__nav-link--active': activeSection === section.id }"
              :aria-current="activeSection === section.id ? 'true' : undefined"
              @click="docsUi.scrollToSection(section.id)"
            >
              <span class="docs__nav-index" aria-hidden="true">{{ index + 1 }}</span>
              <span class="docs__nav-text">
                <span class="docs__nav-label">{{ section.label }}</span>
              </span>
            </button>
          </li>
        </ol>
      </aside>

      <div ref="contentRef" class="docs__content">
        <div class="docs__articles">
          <article id="docs-section-about" class="docs__section">
            <header class="docs__card-head">
              <div class="docs__card-meta">
                <span class="docs__card-index">Раздел 1</span>
              </div>
              <h2 class="docs__heading">О сервисе</h2>
            </header>
            <div class="docs__card-body">
              <p class="docs__text docs__text--lead">
                plashki помогает вести игру и трансляцию: вы собираете состав, назначаете роли и статусы, а на
                экране зрителей отображаются карточки игроков. Вести стол можно с компьютера, планшета или
                телефона.
              </p>
            </div>
          </article>

          <article id="docs-section-start" class="docs__section">
            <header class="docs__card-head">
              <div class="docs__card-meta">
                <span class="docs__card-index">Раздел 2</span>
              </div>
              <h2 class="docs__heading">С чего начать</h2>
            </header>
            <div class="docs__card-body">
              <ul class="docs__list">
                <li>Зарегистрируйтесь и войдите в аккаунт.</li>
                <li>
                  В разделе <strong>Мой аккаунт</strong> проверьте данные профиля и при необходимости откройте
                  настройки.
                </li>
              </ul>
            </div>
          </article>

          <article id="docs-section-players" class="docs__section">
            <header class="docs__card-head">
              <div class="docs__card-meta">
                <span class="docs__card-index">Раздел 3</span>
              </div>
              <h2 class="docs__heading">Мои игроки</h2>
            </header>
            <div class="docs__card-body">
              <ul class="docs__list">
                <li>Создайте карточку для каждого участника: имя, фамилия, никнейм и фото.</li>
                <li>Карточки можно редактировать, добавлять новые фото и выбирать основное.</li>
                <li>Эти профили потом используются при сборе стола в лобби.</li>
              </ul>
            </div>
          </article>

          <article id="docs-section-dashboard" class="docs__section">
            <header class="docs__card-head">
              <div class="docs__card-meta">
                <span class="docs__card-index">Раздел 4</span>
              </div>
              <h2 class="docs__heading">Панель управления</h2>
            </header>
            <div class="docs__card-body">
              <ul class="docs__list">
                <li>
                  Нажмите <strong>Создать игровое лобби</strong>, чтобы собрать стол вручную из своих игроков.
                </li>
                <li>Импорт турнира из внешнего сервиса описан в разделе <strong>Импорт турниров</strong>.</li>
                <li>Откройте нужное лобби, чтобы перейти к управлению игрой.</li>
              </ul>
            </div>
          </article>

          <article id="docs-section-import" class="docs__section">
            <header class="docs__card-head">
              <div class="docs__card-meta">
                <span class="docs__card-index">Раздел 5</span>
              </div>
              <h2 class="docs__heading">Импорт турниров</h2>
            </header>
            <div class="docs__card-body">
              <p class="docs__text docs__text--lead">
                На панели управления можно загрузить турнир из поддерживаемого сервиса вместо ручного набора
                состава.
              </p>
              <ul class="docs__list">
                <li>
                  <strong>GoMafia</strong> — доступен сейчас. Нажмите
                  <strong>Загрузить турнир из GoMafia</strong>, откройте на сайте страницу турнира и перейдите на
                  вкладку <strong>«Итоги по играм»</strong>, скопируйте ссылку из адресной строки и вставьте в
                  форму. Пример:
                  <code class="docs__code">https://gomafia.pro/tournament/12345?tab=games</code>
                </li>
                <li>
                  <strong>MafUniverse</strong> — скоро. Импорт по ссылке появится в одном из следующих
                  обновлений.
                </li>
              </ul>
            </div>
          </article>

          <article id="docs-section-lobby" class="docs__section">
            <header class="docs__card-head">
              <div class="docs__card-meta">
                <span class="docs__card-index">Раздел 6</span>
              </div>
              <h2 class="docs__heading">Управление лобби</h2>
            </header>
            <div class="docs__card-body">
              <ul class="docs__list">
                <li>Расставьте игроков по местам, при необходимости поменяйте их перетаскиванием.</li>
                <li>Назначайте роли и статусы кликом по кнопкам у каждого участника.</li>
                <li>
                  С телефона или планшета доступны те же действия: крупные карточки, touch-управление и смена
                  мест жестом.
                </li>
                <li>
                  Включите <strong>Режим ведущего</strong>, если не хотите видеть роли на экране во время игры.
                </li>
                <li>
                  Кнопка <strong>Сбросить роли и статусы</strong> очищает все назначения за один раз.
                </li>
                <li>Выберите фото игрока для отображения в лобби, если у карточки несколько снимков.</li>
              </ul>
            </div>
          </article>

          <article id="docs-section-stream" class="docs__section">
            <header class="docs__card-head">
              <div class="docs__card-meta">
                <span class="docs__card-index">Раздел 7</span>
              </div>
              <h2 class="docs__heading">Трансляция</h2>
            </header>
            <div class="docs__card-body">
              <ul class="docs__list">
                <li>
                  В шапке лобби выберите <strong>Дизайн плашек</strong> — можно переключаться между разными
                  вариантами оформления.
                </li>
                <li>Кнопка <strong>Overlay</strong> открывает предпросмотр того, что увидят зрители.</li>
                <li>Добавьте ссылку overlay в OBS как браузерный источник — карточки обновляются сами.</li>
                <li>
                  В разделе <strong>Дизайн карточек</strong> можно заранее посмотреть и выбрать стиль для разных
                  лобби.
                </li>
              </ul>
            </div>
          </article>
        </div>

        <footer class="docs__footer">
          <p class="docs__footer-text">Если что-то непонятно — напишите нам, поможем разобраться.</p>
          <RouterLink class="docs__footer-btn" :to="{ name: 'contact' }">Связаться с нами</RouterLink>
        </footer>
      </div>
    </div>
  </section>
</template>

<style scoped>
.docs {
  --docs-line: #e8e8ec;
  --docs-accent: #2f6feb;
  --docs-accent-soft: #eef4ff;
  --docs-nav-pad-x: 1.15rem;
  --docs-content-pad: 1.5rem;
  --docs-mobile-nav-offset: 0px;

  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  font-family: 'Inter', system-ui, sans-serif;
  background: #ffffff;
}

.docs__frame {
  display: grid;
  grid-template-columns: minmax(240px, 18.5rem) minmax(0, 1fr);
  flex: 1;
  min-height: 0;
  width: 100%;
  align-items: stretch;
  background: #ffffff;
}

.docs__nav {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  min-height: 0;
  padding: 1.35rem 1.15rem;
  border-right: 1px solid var(--docs-line);
  background: #ffffff;
  overflow: hidden;
  align-self: stretch;
}

.docs__nav-head {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0 0.15rem;
}

.docs__nav-kicker {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ca3af;
}

.docs__nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
  overflow-y: auto;
  min-height: 0;
}

.docs__nav-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  min-width: 0;
  padding: 0.7rem 0.75rem;
  font: inherit;
  text-align: left;
  color: #3f4450;
  background: #ffffff;
  border: 1px solid #eceef2;
  border-radius: 10px;
  cursor: pointer;
  box-sizing: border-box;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}

.docs__nav-link:hover:not(.docs__nav-link--active) {
  border-color: #d8dee8;
  background: #f8fafc;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.docs__nav-link:focus-visible {
  outline: 2px solid var(--docs-accent);
  outline-offset: 1px;
}

.docs__nav-link--active {
  border-color: #c7d9fb;
  background: var(--docs-accent-soft);
  box-shadow: inset 0 0 0 1px rgba(47, 111, 235, 0.08);
}

.docs__nav-index {
  flex: 0 0 auto;
  align-self: center;
  width: 1.5rem;
  height: 1.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
}

.docs__nav-link--active .docs__nav-index {
  background: #ffffff;
  color: var(--docs-accent);
}

.docs__nav-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.docs__nav-label {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  color: #111827;
}

.docs__nav-link--active .docs__nav-label {
  color: var(--docs-accent);
}

.docs__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  background: #ffffff;
  padding: 0;
  box-sizing: border-box;
}

.docs__articles {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  padding: 0;
  box-sizing: border-box;
}

.docs__section {
  scroll-margin-top: calc(0.75rem + var(--docs-mobile-nav-offset));
  border-bottom: 1px solid #e8ebf0;
}

.docs__section:last-of-type {
  border-bottom: none;
}

.docs__card-head {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.35rem var(--docs-content-pad) 0;
}

.docs__section + .docs__section .docs__card-head {
  padding-top: 1.25rem;
}

.docs__card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
}

.docs__card-index {
  display: inline-flex;
  align-items: center;
  margin-left: -5px;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: var(--docs-accent-soft);
  color: var(--docs-accent);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
}

.docs__heading {
  margin: 10px 0 0;
  font-size: clamp(1.15rem, 2vw, 1.35rem);
  font-weight: 600;
  line-height: 1.3;
  color: #111827;
}

.docs__card-body {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.35rem var(--docs-content-pad) 1.25rem;
}

.docs__text {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.55;
  color: #4b5563;
}

.docs__text--lead {
  font-size: 0.975rem;
  line-height: 1.6;
  color: #374151;
}

.docs__list {
  margin: 0;
  padding-left: 1.25rem;
  color: #4b5563;
  font-size: 0.9375rem;
  line-height: 1.55;
}

.docs__list li + li {
  margin-top: 0.45rem;
}

.docs__list strong {
  font-weight: 600;
  color: #374151;
}

.docs__code {
  display: inline-block;
  margin-top: 0.35rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.875em;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: #374151;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  word-break: break-all;
}

.docs__footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 1.25rem;
  row-gap: 0.75rem;
  width: 100%;
  margin: 0;
  padding: 1.25rem var(--docs-content-pad) 1.35rem;
  border-top: 1px solid #e8ebf0;
  box-sizing: border-box;
}

.docs__footer-text {
  min-width: 0;
  margin: 0;
  min-height: 2.5rem;
  display: flex;
  align-items: center;
  font-size: 0.9375rem;
  line-height: 1.45;
  color: #64748b;
}

.docs__footer-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.5rem;
  padding: 0 1.15rem;
  border: 1px solid var(--docs-accent);
  border-radius: 8px;
  background: var(--docs-accent);
  color: #ffffff;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  box-sizing: border-box;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.docs__footer-btn:hover {
  background: #2563d4;
  border-color: #2563d4;
  color: #ffffff;
}

.docs__footer-btn:focus-visible {
  outline: 2px solid var(--docs-accent);
  outline-offset: 2px;
}

@media (max-width: 1024px) {
  .docs {
    --docs-content-pad: 1rem;
    --docs-mobile-nav-offset: calc(var(--shell-header-row-h, 2.375rem) + 2 * var(--shell-header-pad-y, 0.75rem));
  }

  .docs__frame {
    grid-template-columns: 1fr;
  }

  .docs__nav {
    display: none;
  }

  .docs__content {
    padding: 0;
  }

  .docs__card-head {
    padding-top: 1rem;
  }
}

@media (max-width: 640px) {
  .docs__footer {
    grid-template-columns: 1fr;
  }

  .docs__footer-text {
    min-height: 0;
  }

  .docs__footer-btn {
    width: 100%;
  }
}
</style>
