<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import logoFull from '@/assets/plashki.svg?url'
import logoCompact from '@/assets/pl.svg?url'
import iconMyAccount from '@/assets/icons/my_account.svg?url'
import iconProfiles from '@/assets/icons/profiles.svg?url'
import iconDesignCard from '@/assets/icons/dsgn_card.svg?url'
import iconTarifs from '@/assets/icons/tarifs.svg?url'
import iconDocumentation from '@/assets/icons/documentation.svg?url'
import iconMessage from '@/assets/icons/messege_with_us.svg?url'
import iconControl from '@/assets/icons/control.svg?url'
import iconOverlay from '@/assets/icons/overlay.svg?url'
const props = withDefaults(defineProps<{ mobileDrawer?: boolean; isAdmin?: boolean }>(), {
  mobileDrawer: false,
  isAdmin: false,
})

const collapsed = ref(false)

watch(
  () => props.mobileDrawer,
  (v) => {
    if (v) collapsed.value = false
  },
)

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

const mainSection = [
  { to: '/account', label: 'Мой аккаунт', icon: iconMyAccount },
  { to: '/profiles', label: 'Мои игроки', icon: iconProfiles },
  { to: '/tariffs', label: 'Тарифы', icon: iconTarifs },
  { to: '/docs', label: 'Инструкция', icon: iconDocumentation },
  { to: '/contact', label: 'Обратная связь', icon: iconMessage },
] as const

const streamSection = [
  { to: '/dashboard', label: 'Панель управления', icon: iconControl },
  { to: '/card-design', label: 'Дизайн карточек', icon: iconDesignCard },
  { to: '/overlay', label: 'Overlay', icon: iconOverlay },
] as const

const adminSection = [{ to: '/admin/users', label: 'Пользователи', icon: iconProfiles }] as const
</script>

<template>
  <aside
    class="sidebar"
    :class="{
      'sidebar--collapsed': collapsed,
      'sidebar--mobile-drawer': props.mobileDrawer,
      'sidebar--admin': props.isAdmin,
    }"
  >
    <RouterLink class="sidebar__logo" :to="{ name: 'landing' }" aria-label="plashki - на главную страницу">
      <img
        class="sidebar__logo-img"
        :src="collapsed ? logoCompact : logoFull"
        alt=""
        width="100"
        height="22"
      />
    </RouterLink>

    <button v-if="!props.mobileDrawer" type="button" class="sidebar__collapse" @click="toggleCollapse">
      <span class="sidebar__burger" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span v-if="!collapsed" class="sidebar__collapse-text">Свернуть</span>
    </button>

    <div v-if="props.isAdmin && !collapsed" class="sidebar__admin-chip" aria-label="Режим администратора">
      ADMIN MODE
    </div>

    <nav id="app-sidebar-nav" class="sidebar__nav" aria-label="Основное меню">
      <p v-if="!collapsed" class="sidebar__group">Основное</p>
      <RouterLink
        v-for="item in mainSection"
        :key="item.label"
        :to="item.to"
        class="sidebar__link"
        :title="collapsed ? item.label : undefined"
      >
        <span class="sidebar__icon" aria-hidden="true">
          <img
            class="sidebar__icon-img"
            :class="{
              'sidebar__icon-img--account': item.to === '/account',
              'sidebar__icon-img--message': item.to === '/contact',
            }"
            :src="item.icon"
            alt=""
            :width="item.to === '/account' || item.to === '/contact' ? 17 : 20"
            :height="item.to === '/account' || item.to === '/contact' ? 17 : 20"
          />
        </span>
        <span v-if="!collapsed" class="sidebar__label">{{ item.label }}</span>
      </RouterLink>

      <p v-if="!collapsed" class="sidebar__group sidebar__group--spaced">Стриминг</p>
      <RouterLink
        v-for="item in streamSection"
        :key="item.to"
        :to="item.to"
        class="sidebar__link"
        :title="collapsed ? item.label : undefined"
      >
        <span class="sidebar__icon" aria-hidden="true">
          <img class="sidebar__icon-img" :src="item.icon" alt="" width="20" height="20" />
        </span>
        <span v-if="!collapsed" class="sidebar__label">{{ item.label }}</span>
      </RouterLink>

      <p v-if="props.isAdmin && !collapsed" class="sidebar__group sidebar__group--spaced">Админ</p>
      <RouterLink
        v-for="item in props.isAdmin ? adminSection : []"
        :key="item.to"
        :to="item.to"
        class="sidebar__link"
        :title="collapsed ? item.label : undefined"
      >
        <span class="sidebar__icon" aria-hidden="true">
          <img class="sidebar__icon-img" :src="item.icon" alt="" width="20" height="20" />
        </span>
        <span v-if="!collapsed" class="sidebar__label">{{ item.label }}</span>
      </RouterLink>
    </nav>

  </aside>
</template>

<style scoped>
.sidebar {
  --sidebar-w: 240px;
  --sidebar-w-collapsed: 72px;
  width: var(--sidebar-w);
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #e8e8ec;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  transition: width 0.2s ease;
}

.sidebar--admin {
  border-color: #fde68a;
}

.sidebar--collapsed {
  width: var(--sidebar-w-collapsed);
}

.sidebar__logo {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  padding: calc(1rem + 10px) 0.75rem calc(0.75rem + 14px);
  text-decoration: none;
  line-height: 0;
  border-bottom: 1px solid #d0d0d4;
}

.sidebar__logo-img {
  display: block;
  width: 100px;
  max-width: 100%;
  height: auto;
  object-fit: contain;
  object-position: center;
}

.sidebar--collapsed .sidebar__logo {
  padding: calc(0.85rem + 10px) 0.35rem calc(0.65rem + 12px);
}

.sidebar--collapsed .sidebar__logo-img {
  width: 22px;
  max-width: 100%;
  object-position: center;
}

.sidebar__collapse {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 15px 0.75rem 0.5rem;
  padding: 0.4rem 0.5rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #9ca3af;
  font-size: 0.8125rem;
  cursor: pointer;
  font-family: inherit;
}

.sidebar__collapse:hover {
  color: #6b7280;
  background: #f9fafb;
}

.sidebar--collapsed .sidebar__collapse {
  justify-content: center;
  margin: 15px 0.5rem 0.5rem;
}

.sidebar__burger {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 18px;
}

.sidebar__burger span {
  display: block;
  height: 2px;
  border-radius: 1px;
  background: currentColor;
}

.sidebar__collapse-text {
  line-height: 1;
}

.sidebar__admin-chip {
  margin: 0.2rem 0.75rem 0.45rem;
  padding: 0.35rem 0.55rem;
  border-radius: 8px;
  border: 1px solid #f59e0b;
  background: #fffbeb;
  color: #92400e;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-align: center;
}

.sidebar__nav {
  flex: 1;
  min-width: 0;
  padding: 0.25rem 0.65rem;
  overflow-x: hidden;
  overflow-y: auto;
}

.sidebar__group {
  margin: 0.75rem 0 0.35rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #b0b4be;
}

.sidebar__group--spaced {
  margin-top: 1.25rem;
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  padding: 0.5rem 0.65rem;
  margin-bottom: 2px;
  border-radius: 8px;
  color: #3f4450;
  text-decoration: none;
  font-size: 0.9375rem;
  font-weight: 400;
  line-height: 1.3;
}

.sidebar__link--action {
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.sidebar__link:hover {
  background: #f4f6f9;
  color: #1f2937;
}

.sidebar__link.router-link-active {
  background: #eef4ff;
  color: #2f6feb;
  font-weight: 500;
}

.sidebar__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.sidebar__icon-img {
  display: block;
  width: 20px;
  height: 20px;
  object-fit: contain;
  filter: grayscale(1);
  opacity: 0.55;
  transition: opacity 0.15s ease, filter 0.15s ease;
}

.sidebar__icon-img--account,
.sidebar__icon-img--message {
  width: 17px;
  height: 17px;
}

.sidebar__link:hover:not(.router-link-active) .sidebar__icon-img {
  opacity: 0.72;
}

/* #2f6feb - как цвет активной ссылки */
.sidebar__link.router-link-active .sidebar__icon-img {
  opacity: 1;
  filter: brightness(0) saturate(100%) invert(40%) sepia(98%) saturate(2476%) hue-rotate(210deg)
    brightness(98%) contrast(98%);
}

.sidebar__link.router-link-active:hover .sidebar__icon-img {
  opacity: 1;
  filter: brightness(0) saturate(100%) invert(36%) sepia(98%) saturate(2476%) hue-rotate(210deg)
    brightness(102%) contrast(98%);
}

.sidebar__label {
  min-width: 0;
}

.sidebar--collapsed .sidebar__link {
  justify-content: center;
  padding: 0.55rem 0.35rem;
}

.sidebar--mobile-drawer {
  width: 100%;
  min-height: 100%;
  border-radius: 0 12px 12px 0;
}

.sidebar--mobile-drawer.sidebar--collapsed {
  width: 100%;
}

@media (max-width: 1024px) {
  .sidebar {
    --sidebar-w: 200px;
    --sidebar-w-collapsed: 64px;
    border-radius: 10px;
  }

  .sidebar__logo {
    padding: calc(0.85rem + 8px) 0.6rem calc(0.65rem + 10px);
  }

  .sidebar__collapse {
    margin: 12px 0.6rem 0.45rem;
  }

  .sidebar__nav {
    padding: 0.2rem 0.5rem;
  }

  .sidebar__link {
    gap: 0.5rem;
    padding: 0.45rem 0.55rem;
    font-size: 0.875rem;
  }

  .sidebar__group {
    margin-left: 0.4rem;
    font-size: 0.625rem;
  }

}

@media (prefers-reduced-motion: reduce) {
  .sidebar {
    transition: none;
  }
}
</style>
