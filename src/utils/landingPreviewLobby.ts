import type { GameLobby, LobbyPlayer } from '@/api/lobbies'
import { contentAssets, landingPhotoLayoutsForUrl } from '@/utils/contentAssets'

const PREVIEW_HOST_ID = 'landing-preview-host'

function previewPlayer(
  nickname: string,
  index: number,
  gameRole: string | null,
  photoUrl = '',
): LobbyPlayer {
  const photo = photoUrl.trim()
  return {
    membership_id: `landing-lobby-preview-${index}`,
    player_card_id: `landing-lobby-preview-card-${index}`,
    user_id: `${PREVIEW_HOST_ID}-${index}`,
    username: nickname,
    nickname,
    photo_urls: photo ? [photo] : [],
    photo_layouts: landingPhotoLayoutsForUrl(photo),
    game_role: gameRole,
    joined_at: '1970-01-01T00:00:00.000Z',
  }
}

export function buildLandingPreviewLobby(): GameLobby {
  return {
    id: 'landing-preview-lobby',
    max_players: 10,
    host_user_id: PREVIEW_HOST_ID,
    created_at: '1970-01-01T00:00:00.000Z',
    name: 'Демо-лобби',
    title: 'Демо-лобби',
    players: [
      previewPlayer('Неаполь', 1, 'sheriff', contentAssets.neapol),
      previewPlayer('North', 2, 'peaceful'),
      previewPlayer('Vortex', 3, 'don', contentAssets.vortex),
      previewPlayer('Luna', 4, 'mafia', contentAssets.luna),
      previewPlayer('Fox', 5, 'peaceful'),
      previewPlayer('Shadow', 6, 'peaceful'),
    ],
  }
}

export const LANDING_PREVIEW_HOST_ID = PREVIEW_HOST_ID
