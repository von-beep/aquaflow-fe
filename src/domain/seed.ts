import { daysAgo, uid } from '@/domain/dates'
import type {
  AquaFlowState,
  Delivery,
  DeliveryStatus,
  Payment,
  Product,
  UtangEntry,
} from '@/domain/types'

type SeedPay = 'Cash' | 'GCash' | 'Utang' | null

/** Empty workspace for a new/cloud station (no demo deliveries, riders, etc.). */
export function emptyStationState(stationName = ''): AquaFlowState {
  return {
    settings: {
      stationName,
      owner: '',
      phone: '',
      address: '',
      lat: null,
      lng: null,
      currency: '₱',
      qrPhUrl: '',
    },
    inventory: { full: 0, empty: 0 },
    products: [],
    customers: [],
    riders: [],
    deliveries: [],
    utang: [],
    payments: [],
  }
}

export function seed(): AquaFlowState {
  const products: Product[] = [
    { id: 'p1', name: 'Slim Gallon Refill (5gal)', price: 25 },
    { id: 'p2', name: 'Round Gallon Refill (5gal)', price: 30 },
    { id: 'p3', name: 'New Slim Container + Refill', price: 180 },
    { id: 'p4', name: 'Mineral Bottled (500ml x12)', price: 90 },
  ]

  const customers = [
    {
      id: 'c1',
      name: 'Maria Santos',
      phone: '0917 111 2233',
      addr: 'Phase 2, Block 12',
      gallonsOut: 3,
      note: 'MWF delivery',
    },
    {
      id: 'c2',
      name: 'Juan Dela Cruz',
      phone: '0918 222 3344',
      addr: 'Mabini St.',
      gallonsOut: 2,
      note: '',
    },
    {
      id: 'c3',
      name: 'Ana Reyes',
      phone: '0919 333 4455',
      addr: 'Purok 5',
      gallonsOut: 4,
      note: 'Carinderia — daily',
    },
    {
      id: 'c4',
      name: 'Pedro Mendoza',
      phone: '0920 444 5566',
      addr: 'Rizal Ave.',
      gallonsOut: 2,
      note: '',
    },
    {
      id: 'c5',
      name: 'Liza Ramos',
      phone: '0921 555 6677',
      addr: 'Phase 1, Block 3',
      gallonsOut: 1,
      note: '',
    },
  ]

  const riders = [
    { id: 'r1', name: 'Mark', phone: '' },
    { id: 'r2', name: 'Leo', phone: '' },
    { id: 'r3', name: 'Carlo', phone: '' },
  ]

  const deliveries: Delivery[] = []
  const utang: UtangEntry[] = []
  const payments: Payment[] = []

  const mk = (
    dAgo: number,
    time: string,
    cI: number,
    rI: number,
    pI: number,
    qty: number,
    status: DeliveryStatus,
    pay: SeedPay,
  ) => {
    const date = daysAgo(dAgo)
    const amount = products[pI].price * qty
    const id = uid()
    deliveries.push({
      id,
      orderId: id,
      date,
      time,
      customerId: customers[cI].id,
      riderId: riders[rI].id,
      prodId: products[pI].id,
      qty,
      amount,
      status,
      paid: Boolean(pay && pay !== 'Utang'),
      payMode: pay && pay !== 'Utang' ? pay : '',
      note: '',
    })
    if (pay === 'Utang') {
      utang.push({
        id: uid(),
        ts: date,
        customerId: customers[cI].id,
        amount,
        note: `${qty}x ${products[pI].name}`,
        deliveryId: id,
      })
    }
  }

  for (let d = 6; d >= 1; d--) {
    mk(d, '08:30', 0, 0, 0, 3, 'Completed', 'Cash')
    mk(d, '09:30', 1, 1, 0, 2, 'Completed', d % 2 ? 'GCash' : 'Utang')
    mk(d, '10:30', 2, 2, 1, 4, 'Completed', 'Cash')
    if (d % 2) mk(d, '14:00', 3, 0, 0, 2, 'Completed', 'Utang')
  }

  mk(0, '08:15', 0, 0, 0, 3, 'Completed', 'Cash')
  mk(0, '09:30', 1, 1, 0, 2, 'In Progress', null)
  mk(0, '10:00', 2, 2, 1, 4, 'Pending', null)
  mk(0, '08:45', 3, 0, 0, 2, 'Completed', 'Utang')
  mk(0, '11:00', 4, 1, 0, 1, 'Pending', null)

  payments.push({
    id: uid(),
    ts: daysAgo(4),
    customerId: 'c2',
    amount: 500,
    note: 'Partial',
    mode: 'Cash',
  })
  payments.push({
    id: uid(),
    ts: daysAgo(2),
    customerId: 'c4',
    amount: 300,
    note: '',
    mode: 'GCash',
  })

  return {
    settings: {
      stationName: 'AquaFlow Purified Water',
      owner: '',
      phone: '0917 000 0000',
      address: '',
      lat: null,
      lng: null,
      currency: '₱',
      qrPhUrl: '',
    },
    inventory: { full: 350, empty: 76 },
    products,
    customers,
    riders,
    deliveries,
    utang,
    payments,
  }
}

/** Ensures seed “today” stays relative if ever re-seeded */