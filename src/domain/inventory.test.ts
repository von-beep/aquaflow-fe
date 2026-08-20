import { describe, expect, it } from 'vitest'
import { completeDelivery } from '@/domain/inventory'
import type { AquaFlowState } from '@/domain/types'

function baseState(): AquaFlowState {
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
    inventory: { full: 100, empty: 10 },
    products: [{ id: 'p1', name: 'Slim', price: 25 }],
    customers: [
      {
        id: 'c1',
        name: 'Maria',
        phone: '',
        addr: '',
        gallonsOut: 2,
        note: '',
      },
    ],
    riders: [{ id: 'r1', name: 'Mark', phone: '' }],
    deliveries: [
      {
        id: 'd1',
        orderId: 'd1',
        date: '2026-07-30',
        time: '09:00',
        customerId: 'c1',
        riderId: 'r1',
        prodId: 'p1',
        qty: 3,
        amount: 75,
        status: 'Pending',
        paid: false,
        payMode: '',
        note: '',
      },
    ],
    utang: [],
    payments: [],
  }
}

describe('completeDelivery', () => {
  it('updates inventory and gallonsOut on Cash pay', () => {
    const result = completeDelivery(
      baseState(),
      {
        deliveryId: 'd1',
        payment: 'Cash',
        fullOut: 3,
        emptyIn: 2,
        productName: 'Slim',
      },
      (n) => `₱${n}`,
    )
    expect(result).not.toBeNull()
    expect(result!.state.inventory.full).toBe(97)
    expect(result!.state.inventory.empty).toBe(12)
    expect(result!.state.customers[0].gallonsOut).toBe(3) // 2 + 3 - 2
    expect(result!.state.deliveries[0].status).toBe('Completed')
    expect(result!.state.deliveries[0].paid).toBe(true)
    expect(result!.state.deliveries[0].payMode).toBe('Cash')
    expect(result!.state.deliveries[0].completedAt).toBeTruthy()
    expect(result!.state.utang).toHaveLength(0)
    expect(result!.toast).toContain('paid')
  })

  it('creates utang row when payment is Utang', () => {
    const result = completeDelivery(
      baseState(),
      {
        deliveryId: 'd1',
        payment: 'Utang',
        fullOut: 3,
        emptyIn: 3,
        productName: 'Slim',
      },
      (n) => `₱${n}`,
    )
    expect(result).not.toBeNull()
    expect(result!.state.deliveries[0].paid).toBe(false)
    expect(result!.state.utang).toHaveLength(1)
    expect(result!.state.utang[0].amount).toBe(75)
    expect(result!.state.utang[0].deliveryId).toBe('d1')
    expect(result!.toast).toContain('utang')
  })

  it('returns null for missing delivery', () => {
    expect(
      completeDelivery(
        baseState(),
        {
          deliveryId: 'missing',
          payment: 'Cash',
          fullOut: 1,
          emptyIn: 1,
          productName: 'Slim',
        },
        (n) => String(n),
      ),
    ).toBeNull()
  })
})
