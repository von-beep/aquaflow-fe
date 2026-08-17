import type { AquaFlowState, Delivery } from '@/domain/types'

export function deliveriesOn(state: AquaFlowState, date: string): Delivery[] {
  return state.deliveries.filter((x) => x.date === date && x.status !== 'Cancelled')
}

export function salesOn(state: AquaFlowState, date: string): number {
  return deliveriesOn(state, date)
    .filter((x) => x.status === 'Completed')
    .reduce((a, b) => a + Number(b.amount), 0)
}
