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
        <ul class="docs__nav-list">
          <li v-for="section in docsUi.sections" :key="section.id">
            <button
              type="button"
              class="docs__nav-link"
              :class="{ 'docs__nav-link--active': activeSection === section.id }"
              :aria-current="activeSection === section.id ? 'true' : undefined"
              @click="docsUi.scrollToSection(section.id)"
            >
              {{ section.label }}
            </button>
          </li>
        </ul>
      </aside>

      <div ref="contentRef" class="docs__content">
        <article id="docs-section-about" class="docs__block">
          <h3 class="docs__heading">О сервисе</h3>
          <p class="docs__text">
            plashki помогает вести игру и трансляцию: вы собираете состав, назначаете роли и статусы, а на
            экране зрителей отображаются карточки игроков. Вести стол можно с компьютера, планшета или
            телефона.
          </p>
        </article>

        <article id="docs-section-start" class="docs__block">
          <h3 class="docs__heading">С чего начать</h3>
          <ul class="docs__list">
            <li>Зарегистрируйтесь и войдите в аккаунт.</li>
            <li>
              В разделе <strong>Мой аккаунт</strong> проверьте данные профиля и при необходимости откройте
              настройки.
            </li>
          </ul>
        </article>

        <article id="docs-section-players" class="docs__block">
          <h3 class="docs__heading">Мои игроки</h3>
          <ul class="docs__list">
            <li>Создайте карточку для каждого участника: имя, фамилия, никнейм и фото.</li>
            <li>Карточки можно редактировать, добавлять новые фото и выбирать основное.</li>
            <li>Эти профили потом используются при сборе стола в лобби.</li>
          </ul>
        </article>

        <article id="docs-section-dashboard" class="docs__block">
          <h3 class="docs__heading">Панель управления</h3>
          <ul class="docs__list">
            <li>
              Нажмите <strong>Создать игровое лобби</strong>, чтобы собрать стол вручную из своих игроков.
            </li>
            <li>Импорт турнира из внешнего сервиса описан в разделе <strong>Импорт турниров</strong>.</li>
            <li>Откройте нужное лобби, чтобы перейти к управлению игрой.</li>
          </ul>
        </article>

        <article id="docs-section-import" class="docs__block">
          <h3 class="docs__heading">Импорт турниров</h3>
          <p class="docs__text">
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
        </article>

        <article id="docs-section-lobby" class="docs__block">
          <h3 class="docs__heading">Управление лобби</h3>
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
        </article>

        <article id="docs-section-stream" class="docs__block">
          <h3 class="docs__heading">Трансляция</h3>
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
        </article>

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
  --docs-line: #e5e7eb;
  --docs-content-pad: clamp(1.25rem, 3vw, 2rem);
  --docs-nav-pad-x: 0.85rem;
  --docs-mobile-nav-offset: 0px;
  width: 100%;
  margin: 0;
  padding: 0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  background: #fff;
  color: #111827;
  font-family: 'Inter', system-ui, sans-serif;
}

.docs__frame {
  display: grid;
  grid-template-columns: minmax(220px, 17rem) minmax(0, 1fr);
  flex: 1;
  min-height: 0;
  width: 100%;
  align-items: stretch;
}

.docs__nav {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  align-self: stretch;
  padding: 1.25rem var(--docs-nav-pad-x);
  border-right: 1px solid var(--docs-line);
  background: transparent;
  overflow: hidden;
}

.docs__nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.15rem;
  overflow-y: auto;
  min-height: 0;
}

.docs__nav-link {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 0.6rem 0.7rem;
  font: inherit;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.35;
  text-align: left;
  color: #3f4450;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-sizing: border-box;
}

.docs__nav-link:hover:not(.docs__nav-link--active) {
  background: #f4f6f9;
  color: #1f2937;
}

.docs__nav-link:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 1px;
}

.docs__nav-link--active {
  background: #eef4ff;
  color: #2f6feb;
  font-weight: 500;
}

.docs__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0;
  box-sizing: border-box;
}

.docs__block {
  width: 100%;
  scroll-margin-top: calc(0.5rem + var(--docs-mobile-nav-offset));
  padding: 1.25rem var(--docs-content-pad);
  margin: 0;
  border-bottom: 1px solid var(--docs-line);
  text-align: left;
  box-sizing: border-box;
}

.docs__block:last-of-type {
  border-bottom: none;
}

.docs__heading {
  margin: 0 0 0.75rem;
  font-size: clamp(1.2rem, 2vw, 1.375rem);
  font-weight: 600;
  line-height: 1.35;
  color: #111827;
}

.docs__text {
  margin: 0;
  font-size: clamp(1rem, 1.5vw, 1.125rem);
  font-weight: 400;
  line-height: 1.65;
  color: #4b5563;
}

.docs__list {
  margin: 0;
  padding-left: 1.35rem;
  color: #4b5563;
  font-size: clamp(1rem, 1.5vw, 1.125rem);
  font-weight: 400;
  line-height: 1.65;
}

.docs__list li + li {
  margin-top: 0.5rem;
}

.docs__list strong {
  font-weight: 600;
  color: #374151;
}

.docs__code {
  display: inline-block;
  margin-top: 0.35rem;
  padding: 0.15rem 0.45rem;
  font-size: 0.875em;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: #374151;
  background: #f3f4f6;
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
  padding: 1.25rem var(--docs-content-pad);
  border-top: 1px solid var(--docs-line);
  box-sizing: border-box;
}

.docs__footer-text {
  min-width: 0;
  margin: 0;
  min-height: 2.5rem;
  display: flex;
  align-items: center;
  font-size: 0.975rem;
  line-height: 1.35;
  color: #64748b;
}

.docs__footer-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.5rem;
  padding: 0 1.15rem;
  border: 1px solid #2f6feb;
  border-radius: 8px;
  background: #2f6feb;
  color: #ffffff;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  box-sizing: border-box;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.docs__footer-btn:hover {
  background: #2563d4;
  border-color: #2563d4;
  color: #ffffff;
}

.docs__footer-btn:focus-visible {
  outline: 2px solid #2f6feb;
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
}

@media (max-width: 860px) {
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
