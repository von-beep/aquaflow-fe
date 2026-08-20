import { nowIsoInManila, today, uid } from '@/domain/dates'
import type { AquaFlowState, Delivery, PayMode } from '@/domain/types'

export type CompleteDeliveryInput = {
  deliveryId: string
  payment: string
  fullOut: number
  emptyIn: number
  productName: string
}

export type CompleteDeliveryResult = {
  state: AquaFlowState
  toast: string
}

export function completeDelivery(
  state: AquaFlowState,
  input: CompleteDeliveryInput,
  formatAmount: (n: number) => string,
): CompleteDeliveryResult | null {
  const delivery = state.deliveries.find((d) => d.id === input.deliveryId)
  if (!delivery) return null

  const out = input.fullOut
  const inn = input.emptyIn

  const deliveries = state.deliveries.map((d) => {
    if (d.id !== input.deliveryId) return d
    const next: Delivery = {
      ...d,
      status: 'Completed',
      paid: input.payment !== 'Utang',
      payMode: (input.payment === 'Utang' ? '' : input.payment) as PayMode,
      completedAt: nowIsoInManila(),
    }
    return next
  })

  const inventory = {
    full: Math.max(0, state.inventory.full - out),
    empty: Number(state.inventory.empty) + inn,
  }

  const customers = state.customers.map((c) => {
    if (c.id !== delivery.customerId) return c
    return {
      ...c,
      gallonsOut: Math.max(0, (Number(c.gallonsOut) || 0) + out - inn),
    }
  })

  let utang = state.utang
  let toast: string

  if (input.payment === 'Utang') {
    utang = [
      ...state.utang,
      {
        id: uid(),
        ts: today(),
        customerId: delivery.customerId,
        amount: delivery.amount,
        note: `${delivery.qty}x ${input.productName}`,
        deliveryId: delivery.id,
      },
    ]
    toast = 'Delivered ✓ Nailista sa utang'
  } else {
    toast = `Delivered + paid ✓ ${formatAmount(delivery.amount)}`
  }

  return {
    state: { ...state, deliveries, inventory, customers, utang },
    toast,
  }
}
