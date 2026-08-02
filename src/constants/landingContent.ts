import type { LobbyPlayer } from '@/api/lobbies'
import { contentAssets, landingPhotoLayoutsForUrl, landingPhotoObjectPosition } from '@/utils/contentAssets'
import iconControl from '@/assets/icons/control.svg?url'
import iconOverlay from '@/assets/icons/overlay.svg?url'
import iconSheriff from '@/assets/icons/sheriff.svg?url'
import iconDon from '@/assets/icons/don.svg?url'
import iconCivilian from '@/assets/icons/civilian.svg?url'
import iconRatings from '@/assets/icons/ratings.svg?url'
import iconRatingPeaceful from '@/assets/icons/rating-peaceful.svg?url'
import iconRatingMafia from '@/assets/icons/rating-mafia.svg?url'
import iconRatingDon from '@/assets/icons/rating-don.svg?url'
import iconRatingSheriff from '@/assets/icons/rating-sheriff.svg?url'
import goLogo from '@/assets/icons/go.svg?url'

export const landingSections = [
  {
    id: 'plates',
    num: '01',
    label: 'Плашки',
    teaser: 'Classic, Masters, Plus — три стиля карточек для OBS',
  },
  {
    id: 'host',
    num: '02',
    label: 'Эфир и ведущий',
    teaser: 'Красивый overlay и управление столом с телефона',
  },
  {
    id: 'integrations',
    num: '↗',
    label: 'GoMafia · MafiaUniverse',
    teaser: 'Импорт состава турнира по ссылке',
  },
  {
    id: 'ratings',
    num: '03',
    label: 'Турнир',
    teaser: 'Таблица, которая считается после каждой игры',
  },
] as const

export function isLandingRoute(name: unknown): boolean {
  return name === 'landing'
}

export const heroStats = [
  { value: '10', label: 'мест за столом' },
  { value: 'Mobile', label: 'удобно ведущему' },
  { value: 'Live', label: 'синхронизация' },
] as const

export const heroQuickPoints = [
  'Плашки для OBS — Classic, Masters, Plus',
  'Красивый эфир для зрителей, удобное управление для ведущего',
  'Турнирная таблица считается после каждой игры',
] as const

export const viewerPoints = [
  'Карточки с фото, ролью и номером места — сразу видно, кто за столом',
  'Overlay в OBS обновляется сам, пока ведущий меняет статусы',
  'Несколько дизайнов под стиль турнира или клуба',
] as const

export const hostPoints = [
  'Импорт состава из GoMafia — MafiaUniverse скоро',
  'Роли, статусы и лучший ход — с телефона, планшета или ноутбука',
  'Одна ссылка для OBS: настроил один раз и ведёте стол',
] as const

export const platformIntegrations = [
  {
    id: 'gomafia',
    name: 'GoMafia',
    siteLabel: 'gomafia.pro',
    url: 'https://gomafia.pro/',
    status: 'available' as const,
    statusLabel: 'Доступно',
    logo: goLogo,
    description:
      'Турнир на gomafia.pro — в plashki за минуту. Вставьте ссылку на страницу турнира, и состав с фото и никами появится в лобби.',
    features: [
      'Участники и варианты столов из турнира',
      'Карточки игроков с фото из профиля GoMafia',
      'Не нужно вручную переносить состав в Excel или чат',
    ],
    exampleUrl: 'gomafia.pro/tournament/12345?tab=games',
    accent: 'gomafia',
  },
  {
    id: 'mafuniverse',
    name: 'MafiaUniverse',
    siteLabel: 'mafiauniverse.org',
    url: 'https://mafiauniverse.org/',
    status: 'soon' as const,
    statusLabel: 'Скоро',
    logo: null,
    description:
      'Турниры и серии с mafiauniverse.org — импорт по ссылке в разработке. Тот же сценарий: скопировали URL, получили готовое лобби.',
    features: [
      'Турниры, серии и клубные события',
      'Участники с фото и никами — как в GoMafia',
      'Один сценарий: ссылка → стол → эфир',
    ],
    exampleUrl: null,
    accent: 'mafuniverse',
  },
] as const

export const integrationFlow = [
  {
    num: '01',
    title: 'Скопируйте ссылку',
    text: 'На GoMafia откройте турнир и вкладку «Итоги по играм». Для MafiaUniverse — скоро тот же шаг.',
  },
  {
    num: '02',
    title: 'Вставьте в plashki',
    text: 'На панели управления — «Загрузить турнир из GoMafia». Сервис подтянет участников и варианты.',
  },
  {
    num: '03',
    title: 'Ведите и показывайте',
    text: 'Расставьте места, назначьте роли — overlay в OBS обновится сам.',
  },
] as const

export const hostFlow = [
  {
    label: '01',
    title: 'Соберите стол',
    text: 'Импорт из GoMafia (MafiaUniverse — скоро) или ручной набор — игроки уже с фото и ником.',
    icon: '↙',
  },
  {
    label: '02',
    title: 'Ведите партию',
    text: 'Роли, статусы, таймер и места — touch-управление с телефона.',
    icon: '✦',
  },
  {
    label: '03',
    title: 'Покажите в эфире',
    text: 'Плашки синхронизируются с лобби — зрители видят актуальный стол.',
    icon: '◉',
  },
] as const

export const plateHighlights = [
  'Фото игрока и номер места',
  'Иконки ролей в эфире',
  'Переключение дизайна в один клик',
] as const

export const ratingTablePreview = [
  {
    rank: 1,
    nick: 'Vortex',
    photo: contentAssets.vortex,
    total: '14.2',
    bonusPlus: '2.5',
    bonusMinus: '0',
    wins: 4,
    games: 6,
    bestMove: '2+1',
    leader: true,
  },
  {
    rank: 2,
    nick: 'Неаполь',
    photo: contentAssets.neapol,
    total: '12.8',
    bonusPlus: '1.5',
    bonusMinus: '0.5',
    wins: 3,
    games: 6,
    bestMove: '1+2',
    leader: false,
  },
  {
    rank: 3,
    nick: 'Luna',
    photo: contentAssets.luna,
    total: '11.4',
    bonusPlus: '1.0',
    bonusMinus: '0',
    wins: 2,
    games: 5,
    bestMove: '1+1',
    leader: false,
  },
  {
    rank: 4,
    nick: 'North',
    photo: '',
    total: '9.6',
    bonusPlus: '0.5',
    bonusMinus: '1.0',
    wins: 2,
    games: 6,
    bestMove: '0+1',
    leader: false,
  },
  {
    rank: 5,
    nick: 'Fox',
    photo: '',
    total: '8.1',
    bonusPlus: '0',
    bonusMinus: '0.5',
    wins: 1,
    games: 5,
    bestMove: '—',
    leader: false,
  },
] as const

export const ratingMechanics = [
  {
    icon: iconRatings,
    title: 'Турнир под серию',
    text: 'Создайте серию с названием и датой, добавьте участников из «Мои игроки» — таблица готова к первой игре.',
    tone: 'rating',
  },
  {
    icon: iconControl,
    title: 'Игра за 10 мест',
    text: '6 мирных, 2 мафии, дон и шериф. Баллы за место, доп. плюс/минус и победитель партии — всё в одной форме.',
    tone: 'game',
  },
  {
    icon: iconOverlay,
    title: 'Из лобби или вручную',
    text: 'Внесите результат после стола в plashki или подтяните партию из лобби — строка в таблице обновится сразу.',
    tone: 'sync',
  },
  {
    icon: iconRatingSheriff,
    title: 'Статистика по ролям',
    text: 'Итог, победы, доп. баллы и лучший ход — отдельно по мирному, мафии, дону и шерифу. Видно, кто силён в какой роли.',
    tone: 'roles',
  },
] as const

export const ratingRoleBadges = [
  { icon: iconRatingPeaceful, label: 'Мирный', tone: 'peaceful' },
  { icon: iconRatingMafia, label: 'Мафия', tone: 'mafia' },
  { icon: iconRatingDon, label: 'Дон', tone: 'don' },
  { icon: iconRatingSheriff, label: 'Шериф', tone: 'sheriff' },
] as const

export const overlaySeats = [
  { seat: 1, nick: 'Неаполь', roleIcon: iconSheriff, tone: 'sheriff', photo: contentAssets.neapol },
  { seat: 2, nick: 'North', roleIcon: iconCivilian, tone: 'peace', photo: '' },
  { seat: 3, nick: 'Vortex', roleIcon: iconDon, tone: 'mafia', photo: contentAssets.vortex },
  { seat: 4, nick: 'Luna', roleIcon: iconCivilian, tone: 'voted', photo: contentAssets.luna },
  { seat: 5, nick: 'Fox', roleIcon: iconCivilian, tone: 'peace', photo: '' },
] as const

export const showcaseDesigns = [
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

export function mockPreviewPlayer(
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

export function seatPhotoStyle(photo: string) {
  const pos = landingPhotoObjectPosition(photo)
  return pos ? { objectPosition: pos } : undefined
}

export function designPreviewSeats(preview: (typeof showcaseDesigns)[number]['preview']): LobbyPlayer[] {
  return [mockPreviewPlayer(preview.nickname, preview.seat, preview.role, preview.photo)]
}

export function playerInitials(nick: string): string {
  return (nick.trim()[0] || '?').toUpperCase()
}
