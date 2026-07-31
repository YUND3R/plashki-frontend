export type DocsSectionId =
  | 'about'
  | 'start'
  | 'players'
  | 'dashboard'
  | 'import'
  | 'lobby'
  | 'stream'

export const DOCS_SECTIONS: { id: DocsSectionId; label: string }[] = [
  { id: 'about', label: 'О сервисе' },
  { id: 'start', label: 'С чего начать' },
  { id: 'players', label: 'Мои игроки' },
  { id: 'dashboard', label: 'Панель управления' },
  { id: 'import', label: 'Импорт турниров' },
  { id: 'lobby', label: 'Управление лобби' },
  { id: 'stream', label: 'Трансляция' },
]
