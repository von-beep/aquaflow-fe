import type { Delivery, DeliveryStatus } from '@/domain/types'

export type DeliveryGroup = {
  orderId: string
  lines: Delivery[]
  total: number
  /** Representative status for group controls. */
  status: DeliveryStatus
  riderId: string
  customerId: string
  date: string
  time: string
  payMode: string
  paid: boolean
  note: string
  paymentProofUrl: string | null
  completedAt: string | null | undefined
}

function orderKey(d: Delivery): string {
  return d.orderId || d.id
}

/** Group delivery lines by checkout orderId (legacy rows use id). */
export function groupDeliveries(list: Delivery[]): DeliveryGroup[] {
  const map = new Map<string, Delivery[]>()
  for (const d of list) {
    const key = orderKey(d)
    const arr = map.get(key)
    if (arr) arr.push(d)
    else map.set(key, [d])
  }

  const groups: DeliveryGroup[] = []
  for (const [orderId, lines] of map) {
    lines.sort((a, b) => a.id.localeCompare(b.id))
    const statuses = new Set(lines.map((l) => l.status))
    let status: DeliveryStatus = lines[0]!.status
    if (statuses.has('In Progress')) status = 'In Progress'
    else if (statuses.has('Pending')) status = 'Pending'
    else if (statuses.has('Completed') && statuses.size === 1) status = 'Completed'
    else if (statuses.has('Cancelled') && statuses.size === 1) status = 'Cancelled'
    else if (statuses.has('Completed')) status = 'Completed'

    const riderIds = [...new Set(lines.map((l) => l.riderId || ''))]
    groups.push({
      orderId,
      lines,
      total: lines.reduce((s, l) => s + (Number(l.amount) || 0), 0),
      status,
      riderId: riderIds.length === 1 ? riderIds[0]! : lines[0]!.riderId,
      customerId: lines[0]!.customerId,
      date: lines[0]!.date,
      time: lines[0]!.time,
      payMode: lines[0]!.payMode,
      paid: lines.every((l) => l.paid),
      note: lines[0]!.note,
      paymentProofUrl:
        lines.find((l) => l.paymentProofUrl)?.paymentProofUrl ?? null,
      completedAt: lines.find((l) => l.completedAt)?.completedAt,
    })
  }

  groups.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  return groups
}
