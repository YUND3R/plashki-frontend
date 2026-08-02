<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute } from 'vue-router'
import {
  formatLegalUpdatedAt,
  LEGAL_NAV_SECTIONS,
  LEGAL_PAGE_SECTIONS,
  type LegalDocumentId,
} from '@/constants/legalDocuments'
import { useLegalUiStore } from '@/stores/legalUi'

const route = useRoute()
const legalUi = useLegalUiStore()
const { activeSection } = storeToRefs(legalUi)

const navLabelById = computed(() =>
  Object.fromEntries(LEGAL_NAV_SECTIONS.map((section) => [section.id, section.label])),
)

function navLabel(id: LegalDocumentId): string {
  return navLabelById.value[id] ?? id
}

const MOBILE_NAV_MQ = '(max-width: 1024px)'

const contentRef = ref<HTMLElement | null>(null)
let sectionObserver: IntersectionObserver | null = null
let mobileMq: MediaQueryList | null = null

onMounted(() => {
  void nextTick(() => {
    const root = contentRef.value
    const nodes = LEGAL_PAGE_SECTIONS.map((section) => document.getElementById(`legal-section-${section.id}`)).filter(
      (node): node is HTMLElement => !!node,
    )

    if (!root || !nodes.length) return

    mobileMq = window.matchMedia(MOBILE_NAV_MQ)

    sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const top = visible[0]
        if (!top?.target.id) return
        const id = top.target.id.replace('legal-section-', '') as LegalDocumentId
        legalUi.setActiveSection(id)
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

    const hash = route.hash.replace('#', '')
    if (hash && LEGAL_PAGE_SECTIONS.some((section) => section.id === hash)) {
      legalUi.scrollToSection(hash as LegalDocumentId)
    } else {
      legalUi.syncHeaderNavScroll(activeSection.value, 'auto')
    }
  })
})

onUnmounted(() => {
  sectionObserver?.disconnect()
  sectionObserver = null
})
</script>

<template>
  <section class="legal">
    <div class="legal__frame">
      <aside class="legal__nav" aria-label="Разделы правовой информации">
        <div class="legal__nav-head">
          <p class="legal__nav-kicker">Правовая информация</p>
        </div>

        <ol class="legal__nav-list">
          <li v-for="(section, index) in LEGAL_PAGE_SECTIONS" :key="section.id">
            <button
              type="button"
              class="legal__nav-link"
              :class="{ 'legal__nav-link--active': activeSection === section.id }"
              :aria-current="activeSection === section.id ? 'true' : undefined"
              :title="section.title"
              @click="legalUi.scrollToSection(section.id)"
            >
              <span class="legal__nav-index" aria-hidden="true">{{ index + 1 }}</span>
              <span class="legal__nav-text">
                <span class="legal__nav-label">{{ navLabel(section.id) }}</span>
                <span class="legal__nav-title">{{ section.title }}</span>
              </span>
            </button>
          </li>
        </ol>
      </aside>

      <div ref="contentRef" class="legal__content">
        <div class="legal__articles">
          <article
            v-for="(document, index) in LEGAL_PAGE_SECTIONS"
            :id="`legal-section-${document.id}`"
            :key="document.id"
            class="legal__document"
          >
            <header class="legal__card-head">
              <div class="legal__card-meta">
                <span class="legal__card-index">Документ {{ index + 1 }}</span>
                <time class="legal__card-date" :datetime="document.updatedAt">
                  Обновлено {{ formatLegalUpdatedAt(document.updatedAt) }}
                </time>
              </div>
              <h2 class="legal__heading">{{ document.title }}</h2>
            </header>

            <div class="legal__card-body">
              <section
                v-for="(section, sectionIndex) in document.sections"
                :key="sectionIndex"
                class="legal__section"
                :class="{ 'legal__section--titled': !!section.heading }"
              >
                <h3 v-if="section.heading" class="legal__subheading">{{ section.heading }}</h3>
                <div class="legal__section-body">
                  <p
                    v-for="(paragraph, pIndex) in section.paragraphs"
                    :key="pIndex"
                    class="legal__text"
                    :class="{
                      'legal__text--lead': sectionIndex === 0 && !section.heading && pIndex === 0,
                    }"
                  >
                    {{ paragraph }}
                  </p>
                </div>
              </section>
            </div>
          </article>
        </div>

        <footer class="legal__footer">
          <p class="legal__footer-text">
            Остались вопросы по обработке данных или условиям использования? Напишите нам через обратную связь.
          </p>
          <RouterLink :to="{ name: 'contact' }" class="legal__footer-btn">Обратная связь</RouterLink>
        </footer>
      </div>
    </div>
  </section>
</template>

<style scoped>
.legal {
  --legal-line: #e8e8ec;
  --legal-accent: #2f6feb;
  --legal-accent-soft: #eef4ff;
  --legal-nav-pad-x: 1.15rem;
  --legal-content-pad: 1.5rem;
  --legal-mobile-nav-offset: 0px;

  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  font-family: 'Inter', system-ui, sans-serif;
  background: #ffffff;
}

.legal__frame {
  display: grid;
  grid-template-columns: minmax(240px, 18.5rem) minmax(0, 1fr);
  flex: 1;
  min-height: 0;
  width: 100%;
  align-items: stretch;
  background: #ffffff;
}

.legal__nav {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  min-height: 0;
  padding: 1.35rem 1.15rem;
  border-right: 1px solid var(--legal-line);
  background: #ffffff;
  overflow: hidden;
  align-self: stretch;
}

.legal__nav-head {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0 0.15rem;
}

.legal__nav-kicker {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ca3af;
}

.legal__nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
  overflow-y: auto;
  min-height: 0;
}

.legal__nav-link {
  display: flex;
  align-items: flex-start;
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

.legal__nav-link:hover:not(.legal__nav-link--active) {
  border-color: #d8dee8;
  background: #f8fafc;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.legal__nav-link:focus-visible {
  outline: 2px solid var(--legal-accent);
  outline-offset: 1px;
}

.legal__nav-link--active {
  border-color: #c7d9fb;
  background: var(--legal-accent-soft);
  box-shadow: inset 0 0 0 1px rgba(47, 111, 235, 0.08);
}

.legal__nav-index {
  flex: 0 0 auto;
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

.legal__nav-link--active .legal__nav-index {
  background: #ffffff;
  color: var(--legal-accent);
}

.legal__nav-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.legal__nav-label {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  color: #111827;
}

.legal__nav-link--active .legal__nav-label {
  color: var(--legal-accent);
}

.legal__nav-title {
  font-size: 0.75rem;
  line-height: 1.35;
  color: #6b7280;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.legal__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  background: #ffffff;
  padding: 0;
  box-sizing: border-box;
}

.legal__articles {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  padding: 0;
  box-sizing: border-box;
}

.legal__document {
  scroll-margin-top: calc(0.75rem + var(--legal-mobile-nav-offset));
  border-bottom: 1px solid #e8ebf0;
}

.legal__document:last-of-type {
  border-bottom: none;
}

.legal__card-head {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.35rem var(--legal-content-pad) 0;
}

.legal__document + .legal__document .legal__card-head {
  padding-top: 1.25rem;
}

.legal__card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
}

.legal__card-index {
  display: inline-flex;
  align-items: center;
  margin-left: -5px;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: var(--legal-accent-soft);
  color: var(--legal-accent);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
}

.legal__card-date {
  flex: 0 0 auto;
  margin-left: auto;
  font-size: 0.8125rem;
  line-height: 1.3;
  color: #9ca3af;
  text-align: right;
  white-space: nowrap;
}

.legal__heading {
  margin: 10px 0 0;
  font-size: clamp(1.15rem, 2vw, 1.35rem);
  font-weight: 600;
  line-height: 1.3;
  color: #111827;
}

.legal__card-body {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0.35rem var(--legal-content-pad) 1.25rem;
}

.legal__section + .legal__section {
  margin-top: 0.75rem;
  padding-top: 0;
  border-top: none;
}

.legal__section {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.legal__section-body {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.legal__section--titled {
  gap: 0.25rem;
}

.legal__subheading {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  color: #111827;
}

.legal__text {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.55;
  color: #4b5563;
}

.legal__text--lead {
  font-size: 0.975rem;
  line-height: 1.6;
  color: #374151;
}

.legal__footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 1.25rem;
  row-gap: 0.75rem;
  width: 100%;
  margin: 0;
  padding: 1.25rem var(--legal-content-pad) 1.35rem;
  border-top: 1px solid #e8ebf0;
  box-sizing: border-box;
}

.legal__footer-text {
  min-width: 0;
  margin: 0;
  min-height: 2.5rem;
  display: flex;
  align-items: center;
  font-size: 0.9375rem;
  line-height: 1.45;
  color: #64748b;
}

.legal__footer-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.5rem;
  padding: 0 1.15rem;
  border: 1px solid var(--legal-accent);
  border-radius: 8px;
  background: var(--legal-accent);
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

.legal__footer-btn:hover {
  background: #2563d4;
  border-color: #2563d4;
  color: #ffffff;
}

.legal__footer-btn:focus-visible {
  outline: 2px solid var(--legal-accent);
  outline-offset: 2px;
}

@media (max-width: 1024px) {
  .legal {
    --legal-content-pad: 1rem;
    --legal-mobile-nav-offset: calc(var(--shell-header-row-h, 2.375rem) + 2 * var(--shell-header-pad-y, 0.75rem));
  }

  .legal__frame {
    grid-template-columns: 1fr;
  }

  .legal__nav {
    display: none;
  }

  .legal__content {
    padding: 0;
  }

  .legal__card-head {
    padding-top: 1rem;
  }
}

@media (max-width: 640px) {
  .legal__card-date {
    white-space: normal;
  }

  .legal__footer {
    grid-template-columns: 1fr;
  }

  .legal__footer-text {
    min-height: 0;
  }

  .legal__footer-btn {
    width: 100%;
  }
}
</style>
