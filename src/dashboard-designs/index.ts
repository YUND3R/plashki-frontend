export type DashboardDesignVariant = {
  id: string
  title: string
  description: string
  homeViewPath: string
}

/** Черновики и альтернативные макеты панели управления (не подключены к роуту). */
export const DASHBOARD_DESIGN_VARIANTS: DashboardDesignVariant[] = [
  {
    id: 'modern',
    title: 'Modern',
    description: 'Три блока действий сверху, список лобби снизу, фильтры в шапке.',
    homeViewPath: '@/dashboard-designs/modern/HomeView.vue',
  },
]
