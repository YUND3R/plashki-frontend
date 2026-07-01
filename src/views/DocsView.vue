<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

type DocsSectionId = 'about' | 'start' | 'players' | 'dashboard' | 'lobby' | 'stream'

const sections: { id: DocsSectionId; label: string }[] = [
  { id: 'about', label: 'О сервисе' },
  { id: 'start', label: 'С чего начать' },
  { id: 'players', label: 'Мои игроки' },
  { id: 'dashboard', label: 'Панель управления' },
  { id: 'lobby', label: 'Управление лобби' },
  { id: 'stream', label: 'Трансляция' },
]

const activeSection = ref<DocsSectionId>('about')
const contentRef = ref<HTMLElement | null>(null)
let sectionObserver: IntersectionObserver | null = null

function scrollToSection(id: DocsSectionId) {
  const el = document.getElementById(`docs-section-${id}`)
  if (!el) return
  activeSection.value = id
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  void nextTick(() => {
    const root = contentRef.value
    const nodes = sections
      .map((section) => document.getElementById(`docs-section-${section.id}`))
      .filter((node): node is HTMLElement => !!node)

    if (!root || !nodes.length) return

    sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const top = visible[0]
        if (!top?.target.id) return
        const id = top.target.id.replace('docs-section-', '') as DocsSectionId
        activeSection.value = id
      },
      {
        root,
        rootMargin: '-12% 0px -55% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    )

    for (const node of nodes) sectionObserver.observe(node)
  })
})

onUnmounted(() => {
  sectionObserver?.disconnect()
  sectionObserver = null
})
</script>

<template>
  <section class="docs">
    <article class="docs__panel">
      <div class="docs__layout">
        <aside class="docs__nav" aria-label="Навигация по документации">
          <ul class="docs__nav-list">
            <li v-for="section in sections" :key="section.id">
              <button
                type="button"
                class="docs__nav-btn"
                :class="{ 'docs__nav-btn--active': activeSection === section.id }"
                :aria-current="activeSection === section.id ? 'true' : undefined"
                @click="scrollToSection(section.id)"
              >
                {{ section.label }}
              </button>
            </li>
          </ul>
        </aside>

        <div ref="contentRef" class="docs__content">
          <article id="docs-section-about" class="docs__block">
            <h2 class="docs__heading">О сервисе</h2>
            <p class="docs__text">
              plashki помогает вести игру и трансляцию: вы собираете состав, назначаете роли и статусы, а на
              экране зрителей отображаются карточки игроков.
            </p>
          </article>

          <article id="docs-section-start" class="docs__block">
            <h2 class="docs__heading">С чего начать</h2>
            <ul class="docs__list">
              <li>Зарегистрируйтесь и войдите в аккаунт.</li>
              <li>
                В разделе <strong>Мой аккаунт</strong> проверьте данные профиля и при необходимости откройте
                настройки.
              </li>
            </ul>
          </article>

          <article id="docs-section-players" class="docs__block">
            <h2 class="docs__heading">Мои игроки</h2>
            <ul class="docs__list">
              <li>Создайте карточку для каждого участника: имя, фамилия, никнейм и фото.</li>
              <li>Карточки можно редактировать, добавлять новые фото и выбирать основное.</li>
              <li>Эти профили потом используются при сборе стола в лобби.</li>
            </ul>
          </article>

          <article id="docs-section-dashboard" class="docs__block">
            <h2 class="docs__heading">Панель управления</h2>
            <ul class="docs__list">
              <li>
                Нажмите <strong>Создать игровое лобби</strong>, чтобы собрать стол вручную из своих игроков.
              </li>
              <li>
                Или загрузите турнир из GoMafia - вставьте ссылку на страницу турнира с вкладкой «Игры».
              </li>
              <li>Откройте нужное лобби, чтобы перейти к управлению игрой.</li>
            </ul>
          </article>

          <article id="docs-section-lobby" class="docs__block">
            <h2 class="docs__heading">Управление лобби</h2>
            <ul class="docs__list">
              <li>Расставьте игроков по местам, при необходимости поменяйте их перетаскиванием.</li>
              <li>Назначайте роли и статусы кликом по кнопкам у каждого участника.</li>
              <li>
                Включите <strong>Режим ведущего</strong>, если не хотите видеть роли на экране во время игры -
                так проще не раскрыть лишнюю информацию.
              </li>
              <li>Кнопка <strong>Сбросить роли и статусы</strong> очищает все назначения за один раз.</li>
              <li>Выберите фото игрока для отображения в лобби, если у карточки несколько снимков.</li>
            </ul>
          </article>

          <article id="docs-section-stream" class="docs__block">
            <h2 class="docs__heading">Трансляция</h2>
            <ul class="docs__list">
              <li>В шапке лобби выберите <strong>Дизайн плашек</strong> - внешний вид карточек на экране.</li>
              <li>Кнопка <strong>Overlay</strong> открывает предпросмотр того, что увидят зрители.</li>
              <li>Добавьте ссылку overlay в OBS или другую программу трансляции как браузерный источник.</li>
              <li>
                В разделе <strong>Дизайн карточек</strong> можно заранее настроить оформление для разных лобби.
              </li>
            </ul>
          </article>

          <p class="docs__footer">
            Если что-то непонятно или нужна помощь - напишите нам в разделе
            <RouterLink class="docs__link" :to="{ name: 'contact' }">Связаться с нами</RouterLink>.
          </p>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.docs {
  width: 100%;
  margin: 0;
  padding: 0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.docs__panel {
  border: none;
  border-radius: 0;
  background: transparent;
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.docs__layout {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 0;
  align-items: stretch;
  flex: 1;
  min-height: 0;
  background: #fff;
}

.docs__nav {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  padding: 0;
  border-right: 1px solid #e5e7eb;
  overflow: hidden;
  background: #fff;
}

.docs__nav-list {
  list-style: none;
  margin: 0;
  padding: 0.75rem;
  display: grid;
  gap: 0.5rem;
  align-content: start;
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.docs__nav-btn {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 2.35rem;
  padding: 0.65rem 0.75rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  text-align: left;
  color: #111827;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  box-sizing: border-box;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
}

.docs__nav-btn:hover:not(.docs__nav-btn--active) {
  border-color: #cbd5e1;
  background: #f9fafb;
}

.docs__nav-btn:focus-visible {
  outline: 2px solid #2f6feb;
  outline-offset: 1px;
}

.docs__nav-btn--active {
  border-color: #60a5fa;
  background: #eff6ff;
  color: #1d4ed8;
}

.docs__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 1.25rem 1.5rem 2rem;
  box-sizing: border-box;
}

.docs__block {
  width: 100%;
  max-width: 42rem;
  scroll-margin-top: 1rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
}

.docs__block + .docs__block {
  margin-top: 2rem;
}

.docs__block:last-of-type {
  padding-bottom: 0;
  border-bottom: none;
}

.docs__heading {
  margin: 0 0 0.75rem;
  font-size: 22px;
  font-weight: 500;
  line-height: 1.35;
  color: #111827;
}

.docs__text {
  margin: 0;
  font-size: 20px;
  font-weight: 300;
  line-height: 1.5;
  color: #4b5563;
}

.docs__list {
  margin: 0;
  padding-left: 1.35rem;
  list-style-type: disc;
  color: #4b5563;
  font-size: 20px;
  font-weight: 300;
  line-height: 1.5;
}

.docs__list li + li {
  margin-top: 0.45rem;
}

.docs__list strong {
  font-weight: 500;
  color: #374151;
}

.docs__footer {
  width: 100%;
  max-width: 42rem;
  margin: 2rem 0 0;
  padding-top: 1.25rem;
  border-top: 1px solid #e5e7eb;
  text-align: left;
  font-size: 20px;
  font-weight: 300;
  line-height: 1.5;
  color: #6b7280;
}

.docs__link {
  color: #2f6feb;
  text-decoration: none;
  font-weight: 500;
}

.docs__link:hover {
  text-decoration: underline;
}

@media (max-width: 860px) {
  .docs__layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .docs__nav {
    height: auto;
    max-height: 40vh;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }

  .docs__nav-list {
    max-height: 28vh;
  }

  .docs__content {
    padding: 1rem 0.85rem 1.5rem;
  }
}
</style>
