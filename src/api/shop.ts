import { apiFetch, apiFetchJson } from '@/api/client'
import type { LobbyOverlayDesignOption } from '@/api/lobbies'

export type OverlayDesignShopItem = LobbyOverlayDesignOption

export type OverlayDesignShopCatalogResponse = {
  items: OverlayDesignShopItem[]
}

export type PurchaseOverlayDesignBody = {
  design_code: string
}

export type PurchaseOverlayDesignResponse = {
  user_id: string
  design_code: string
  expires_at: string
  price_rub: number
  rental_hours: number
}

/** Каталог плашек с ценами и статусом доступа текущего пользователя. */
export function getOverlayDesignShopCatalog() {
  return apiFetch<OverlayDesignShopCatalogResponse>('/shop/overlay-designs')
}

/** Купить или продлить аренду плашки (имитация оплаты на бэке). */
export function purchaseOverlayDesign(body: PurchaseOverlayDesignBody) {
  return apiFetchJson<PurchaseOverlayDesignResponse>('/shop/overlay-designs/purchase', body, {
    method: 'POST',
  })
}
