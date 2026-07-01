export type SortOrder = 'asc' | 'desc'

export type OverlayDesignCode = 'masters-yug25' | 'classic' | 'plus'

export type LobbyListParams = {
  q?: string
  overlay_design?: OverlayDesignCode
  sort_by?: 'created_at' | 'title' | 'max_players'
  sort_order?: SortOrder
  limit?: number
  offset?: number
}

export type PlayerCardListParams = {
  q?: string
  has_photos?: boolean
  sort_by?: 'created_at' | 'updated_at' | 'nickname'
  sort_order?: SortOrder
  limit?: number
  offset?: number
}

export type AdminUserListParams = {
  q?: string
  role?: 'admin' | 'moderator' | 'sponsor' | 'user'
  subscription?: 'free' | 'standard' | 'premium'
  sort_by?: 'created_at' | 'username' | 'email'
  sort_order?: SortOrder
  limit?: number
  offset?: number
}

export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    sp.set(key, String(value))
  }
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}
