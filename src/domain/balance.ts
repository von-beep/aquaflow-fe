import type { AquaFlowState, Customer, Payment, UtangEntry } from '@/domain/types'

export function customerBalance(
  customerId: string,
  utang: UtangEntry[],
  payments: Payment[],
): number {
  const owed = utang
    .filter((u) => u.customerId === customerId)
    .reduce((a, b) => a + Number(b.amount), 0)
  const paid = payments
    .filter((p) => p.customerId === customerId)
    .reduce((a, b) => a + Number(b.amount), 0)
  return owed - paid
}

export function totalUtang(state: Pick<AquaFlowState, 'customers' | 'utang' | 'payments'>): number {
  return state.customers.reduce(
    (sum, c) => sum + Math.max(0, customerBalance(c.id, state.utang, state.payments)),
    0,
  )
}

export function findCustomer(customers: Customer[], id: string): Customer | undefined {
  return customers.find((c) => c.id === id)
}
