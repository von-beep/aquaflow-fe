import { describe, expect, it } from 'vitest'
import { customerBalance, totalUtang } from '@/domain/balance'
import type { Customer, Payment, UtangEntry } from '@/domain/types'

const customers: Customer[] = [
  {
    id: 'c1',
    name: 'A',
    phone: '',
    addr: '',
    gallonsOut: 0,
    note: '',
  },
  {
    id: 'c2',
    name: 'B',
    phone: '',
    addr: '',
    gallonsOut: 0,
    note: '',
  },
]

describe('customerBalance', () => {
  it('is sum(utang) − sum(payments)', () => {
    const utang: UtangEntry[] = [
      { id: 'u1', ts: '2026-01-01', customerId: 'c1', amount: 100, note: '' },
      { id: 'u2', ts: '2026-01-02', customerId: 'c1', amount: 50, note: '' },
    ]
    const payments: Payment[] = [
      { id: 'p1', ts: '2026-01-03', customerId: 'c1', amount: 40, note: '', mode: 'Cash' },
    ]
    expect(customerBalance('c1', utang, payments)).toBe(110)
  })

  it('ignores other customers', () => {
    const utang: UtangEntry[] = [
      { id: 'u1', ts: '2026-01-01', customerId: 'c2', amount: 999, note: '' },
    ]
    expect(customerBalance('c1', utang, [])).toBe(0)
  })
})

describe('totalUtang', () => {
  it('sums only positive balances', () => {
    const utang: UtangEntry[] = [
      { id: 'u1', ts: '2026-01-01', customerId: 'c1', amount: 100, note: '' },
      { id: 'u2', ts: '2026-01-01', customerId: 'c2', amount: 20, note: '' },
    ]
    const payments: Payment[] = [
      { id: 'p1', ts: '2026-01-02', customerId: 'c2', amount: 50, note: '', mode: 'GCash' },
    ]
    // c1: 100, c2: -30 → total 100
    expect(totalUtang({ customers, utang, payments })).toBe(100)
  })
})
