import type { PublicProduct } from '@/api/client'
import type { CartLine } from '@/features/landing/CartCheckoutModal'

export const LANDING_BROWSE_KEY = 'aquaFlow_landing_browse_v1'

export type LandingCartItem = {
  productId: string
  qty: number
}

export type LandingBrowseState = {
  stationId: string
  cart: LandingCartItem[]
}

export function defaultLandingBrowseState(): LandingBrowseState {
  return { stationId: '', cart: [] }
}

export function loadLandingBrowseState(): LandingBrowseState {
  try {
    const raw = localStorage.getItem(LANDING_BROWSE_KEY)
    if (!raw) return defaultLandingBrowseState()
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaultLandingBrowseState()
    const o = parsed as Record<string, unknown>
    const stationId = typeof o.stationId === 'string' ? o.stationId : ''
    const cartRaw = Array.isArray(o.cart) ? o.cart : []
    const cart: LandingCartItem[] = []
    for (const item of cartRaw) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      if (typeof row.productId !== 'string' || !row.productId) continue
      const qty = Math.max(1, Math.min(99, Math.floor(Number(row.qty)) || 1))
      cart.push({ productId: row.productId, qty })
    }
    return { stationId, cart }
  } catch {
    return defaultLandingBrowseState()
  }
}

export function saveLandingBrowseState(state: LandingBrowseState): void {
  if (!state.stationId && state.cart.length === 0) {
    localStorage.removeItem(LANDING_BROWSE_KEY)
    return
  }
  localStorage.setItem(
    LANDING_BROWSE_KEY,
    JSON.stringify({
      stationId: state.stationId,
      cart: state.cart.map((l) => ({
        productId: l.productId,
        qty: Math.max(1, Math.min(99, Math.floor(l.qty) || 1)),
      })),
    }),
  )
}

/** Rebuild cart lines from fresh catalog products; drop missing products; refresh prices. */
export function reconcileCartLines(
  products: PublicProduct[],
  lines: LandingCartItem[],
): CartLine[] {
  const byId = new Map(products.map((p) => [p.id, p]))
  const out: CartLine[] = []
  for (const line of lines) {
    const product = byId.get(line.productId)
    if (!product) continue
    out.push({
      product,
      qty: Math.max(1, Math.min(99, Math.floor(line.qty) || 1)),
    })
  }
  return out
}

export function cartToLandingItems(cart: CartLine[]): LandingCartItem[] {
  return cart.map((l) => ({
    productId: l.product.id,
    qty: l.qty,
  }))
}
