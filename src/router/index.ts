import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { useProfileSettingsModalStore } from '@/stores/profileSettingsModal'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/register',
      name: 'register',
      meta: { title: 'Регистрация' },
      component: () => import('@/views/RegisterView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      meta: { title: 'Вход' },
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/verify-email',
      name: 'verify-email',
      meta: { title: 'Подтверждение email' },
      component: () => import('@/views/VerifyEmailView.vue'),
    },
    {
      path: '/auth/verify-email/:tokenId/:signature',
      name: 'verify-email-signed',
      meta: { title: 'Подтверждение email' },
      component: () => import('@/views/VerifyEmailView.vue'),
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      meta: { title: 'Восстановление пароля' },
      component: () => import('@/views/ForgotPasswordView.vue'),
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      meta: { title: 'Сброс пароля' },
      component: () => import('@/views/ResetPasswordView.vue'),
    },
    {
      path: '/overlay/live',
      name: 'overlay-live',
      meta: { title: 'Overlay Live' },
      component: () => import('@/views/OverlayView.vue'),
    },
    {
      path: '/overlay/:lobbyId',
      name: 'overlay-lobby',
      meta: { title: 'Overlay' },
      component: () => import('@/views/OverlayView.vue'),
    },
    {
      path: '/overlay/:design/:lobbyId',
      name: 'overlay-design',
      meta: { title: 'Overlay' },
      component: () => import('@/views/OverlayView.vue'),
    },
    {
      path: '/lobby/:lobbyId/members/:membershipId/photo-crop',
      name: 'lobby-member-photo-crop',
      meta: { title: 'Кадрирование' },
      component: () => import('@/views/LobbyMemberPhotoCropView.vue'),
    },
    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', redirect: '/dashboard' },
        {
          path: 'landing',
          name: 'landing',
          meta: { title: 'plashki' },
          component: () => import('@/views/LandingView.vue'),
        },
        {
          path: 'account',
          name: 'account',
          meta: { title: 'Мой аккаунт' },
          component: () => import('@/views/AccountView.vue'),
        },
        {
          path: 'account/profile-settings',
          name: 'account-profile-settings',
          meta: { title: 'Настройки аккаунта' },
          redirect: () => {
            useProfileSettingsModalStore().open()
            return { name: 'account' }
          },
        },
        {
          path: 'profiles',
          name: 'profiles',
          meta: { title: 'Мои игроки' },
          component: () => import('@/views/ProfilesView.vue'),
        },
        {
          path: 'tariffs',
          name: 'tariffs',
          meta: { title: 'Тарифы' },
          component: () => import('@/views/PagePlaceholder.vue'),
        },
        {
          path: 'docs',
          name: 'docs',
          meta: { title: 'Инструкция' },
          component: () => import('@/views/DocsView.vue'),
        },
        {
          path: 'contact',
          name: 'contact',
          meta: { title: 'Обратная связь' },
          component: () => import('@/views/ContactView.vue'),
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          meta: { title: 'Панель управления' },
          component: () => import('@/views/HomeView.vue'),
        },
        {
          path: 'lobby/:lobbyId/manage',
          name: 'lobby-manage',
          meta: { title: 'Управление лобби' },
          component: () => import('@/views/LobbyManageView.vue'),
        },
        {
          path: 'card-design',
          name: 'card-design',
          meta: { title: 'Все дизайны карточек' },
          component: () => import('@/views/CardsView.vue'),
        },
        {
          path: 'admin/users',
          name: 'admin-users',
          meta: { title: 'Админ: пользователи' },
          component: () => import('@/views/AdminUsersView.vue'),
        },
        {
          path: 'overlay',
          name: 'overlay',
          meta: { title: 'Overlay' },
          component: () => import('@/views/PagePlaceholder.vue'),
        },
      ],
    },
  ],
})

export default router
