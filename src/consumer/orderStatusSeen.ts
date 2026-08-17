import type { ConsumerOrder } from '@/api/client'

const STORAGE_KEY = 'aquaFlow_consumer_order_seen_v1'

/** orderId → fingerprint of line statuses in that checkout group */
export type OrderStatusSnapshot = Record<string, string>

function readAll(): Record<string, OrderStatusSnapshot> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, OrderStatusSnapshot>
  } catch {
    return {}
  }
}

export function loadOrderStatusSeen(consumerId: string): OrderStatusSnapshot | null {
  const all = readAll()
  const seen = all[consumerId]
  if (!seen || typeof seen !== 'object') return null
  return seen
}

export function saveOrderStatusSeen(
  consumerId: string,
  snapshot: OrderStatusSnapshot,
): void {
  const all = readAll()
  all[consumerId] = snapshot
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

/** Build a stable fingerprint map keyed by checkout orderId. */
export function orderStatusSnapshot(orders: ConsumerOrder[]): OrderStatusSnapshot {
  const byOrder = new Map<string, string[]>()
  for (const o of orders) {
    const key = o.orderId || o.id
    const parts = byOrder.get(key) ?? []
    parts.push(`${o.id}:${o.status}`)
    byOrder.set(key, parts)
  }
  const out: OrderStatusSnapshot = {}
  for (const [orderId, parts] of byOrder) {
    out[orderId] = parts.sort().join('|')
  }
  return out
}

/** Checkout groups whose status differs from the last-seen snapshot. */
export function changedOrderIds(
  current: OrderStatusSnapshot,
  seen: OrderStatusSnapshot,
): string[] {
  const ids: string[] = []
  for (const [orderId, fp] of Object.entries(current)) {
    if (seen[orderId] !== fp) ids.push(orderId)
  }
  return ids
}

/** Count checkout groups whose status differs from the last-seen snapshot. */
export function countOrderStatusUpdates(
  current: OrderStatusSnapshot,
  seen: OrderStatusSnapshot,
): number {
  return changedOrderIds(current, seen).length
}
