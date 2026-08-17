import { completeDelivery } from '@/domain/inventory'
import { today, uid } from '@/domain/dates'
import type { AquaFlowState, Customer, Delivery } from '@/domain/types'

const WALK_IN_NAME = 'Walk-in'

export type WalkInSaleInput = {
  productId: string
  qty: number
  payment: 'Cash' | 'GCash' | 'Maya' | 'Utang'
  fullOut: number
  emptyIn: number
  customerId?: string | null
  note?: string
}

export type WalkInSaleResult = {
  state: AquaFlowState
  toast: string
}

function ensureWalkInCustomerLocal(state: AquaFlowState): {
  state: AquaFlowState
  customerId: string
} {
  const existing = state.customers.find((c) => c.name === WALK_IN_NAME)
  if (existing) return { state, customerId: existing.id }

  const customer: Customer = {
    id: uid(),
    name: WALK_IN_NAME,
    phone: '',
    addr: '',
    gallonsOut: 0,
    note: 'Counter / walk-in sales',
  }
  return {
    state: { ...state, customers: [...state.customers, customer] },
    customerId: customer.id,
  }
}

/** Offline / local walk-in: create completed sale with product + inventory. */
export function recordWalkInSale(
  state: AquaFlowState,
  input: WalkInSaleInput,
  formatAmount: (n: number) => string,
): WalkInSaleResult | { error: string } {
  const product = state.products.find((p) => p.id === input.productId)
  if (!product) return { error: 'Product not found' }

  const qty = Math.max(1, Math.floor(Number(input.qty) || 0))
  if (qty < 1) return { error: 'qty must be at least 1' }

  let working = state
  let customerId =
    typeof input.customerId === 'string' && input.customerId.trim()
      ? input.customerId.trim()
      : ''

  if (input.payment === 'Utang' && !customerId) {
    return { error: 'Customer is required for Utang walk-in sales' }
  }

  if (!customerId) {
    const ensured = ensureWalkInCustomerLocal(working)
    working = ensured.state
    customerId = ensured.customerId
  } else {
    const cust = working.customers.find((c) => c.id === customerId)
    if (!cust) return { error: 'Customer not found' }
    if (input.payment === 'Utang' && cust.name === WALK_IN_NAME) {
      return { error: 'Select a customer for Utang (not Walk-in)' }
    }
  }

  const amount = product.price * qty
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const deliveryId = uid()
  const delivery: Delivery = {
    id: deliveryId,
    orderId: deliveryId,
    date: today(),
    time,
    customerId,
    riderId: '',
    prodId: product.id,
    qty,
    amount,
    status: 'Pending',
    paid: false,
    payMode: '',
    note: input.note?.trim() || 'Walk-in refill',
    completedAt: null,
  }

  working = {
    ...working,
    deliveries: [...working.deliveries, delivery],
  }

  const completed = completeDelivery(
    working,
    {
      deliveryId,
      payment: input.payment,
      fullOut: input.fullOut,
      emptyIn: input.emptyIn,
      productName: product.name,
    },
    formatAmount,
  )
  if (!completed) return { error: 'Could not complete walk-in sale' }

  const toast =
    input.payment === 'Utang'
      ? 'Walk-in ✓ Nailista sa utang'
      : `Walk-in sale ✓ ${formatAmount(amount)}`

  return { state: completed.state, toast }
}
