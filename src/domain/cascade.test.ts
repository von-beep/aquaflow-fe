import { describe, expect, it } from 'vitest'
import { deleteCustomer } from '@/domain/cascade'
import type { AquaFlowState } from '@/domain/types'

function state(): AquaFlowState {
  return {
    settings: {
      stationName: 'Test',
      owner: '',
      phone: '',
      address: '',
      lat: null,
      lng: null,
      currency: '₱',
      gcashQrUrl: '',
      mayaQrUrl: '',
      openTime: '08:00',
      closeTime: '18:00',
    },
    inventory: { full: 10, empty: 2 },
    products: [],
    customers: [
      { id: 'c1', name: 'A', phone: '', addr: '', gallonsOut: 1, note: '' },
      { id: 'c2', name: 'B', phone: '', addr: '', gallonsOut: 0, note: '' },
    ],
    riders: [],
    deliveries: [
      {
        id: 'd1',
        date: '2026-07-01',
        time: '08:00',
        customerId: 'c1',
        riderId: 'r1',
        prodId: 'p1',
        qty: 1,
        amount: 25,
        status: 'Completed',
        paid: false,
        payMode: '',
        note: '',
        orderId: 'd1',
      },
      {
        id: 'd2',
        date: '2026-07-01',
        time: '09:00',
        customerId: 'c2',
        riderId: 'r1',
        prodId: 'p1',
        qty: 1,
        amount: 25,
        status: 'Pending',
        paid: false,
        payMode: '',
        note: '',
        orderId: 'd2',
      },
    ],
    utang: [
      {
        id: 'u1',
        ts: '2026-07-01',
        customerId: 'c1',
        amount: 25,
        note: '',
        deliveryId: 'd1',
      },
    ],
    payments: [
      { id: 'pay1', ts: '2026-07-02', customerId: 'c1', amount: 10, note: '', mode: 'Cash' },
      { id: 'pay2', ts: '2026-07-02', customerId: 'c2', amount: 5, note: '', mode: 'Cash' },
    ],
  }
}

describe('deleteCustomer', () => {
  it('removes customer, deliveries, utang, and payments', () => {
    const next = deleteCustomer(state(), 'c1')
    expect(next.customers.map((c) => c.id)).toEqual(['c2'])
    expect(next.deliveries.map((d) => d.id)).toEqual(['d2'])
    expect(next.utang).toHaveLength(0)
    expect(next.payments.map((p) => p.id)).toEqual(['pay2'])
  })
})
