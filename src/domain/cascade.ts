import type { AquaFlowState } from '@/domain/types'

/** Remove a customer and all related deliveries, utang, and payments. */
export function deleteCustomer(state: AquaFlowState, customerId: string): AquaFlowState {
  const deliveryIds = new Set(
    state.deliveries.filter((d) => d.customerId === customerId).map((d) => d.id),
  )
  return {
    ...state,
    customers: state.customers.filter((c) => c.id !== customerId),
    deliveries: state.deliveries.filter((d) => d.customerId !== customerId),
    utang: state.utang.filter(
      (u) => u.customerId !== customerId && !(u.deliveryId && deliveryIds.has(u.deliveryId)),
    ),
    payments: state.payments.filter((p) => p.customerId !== customerId),
  }
}
