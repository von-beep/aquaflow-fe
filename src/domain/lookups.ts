import type { Customer, Product, Rider } from '@/domain/types'

export function productName(products: Product[], id: string): string {
  return products.find((p) => p.id === id)?.name ?? '—'
}

export function riderName(riders: Rider[], id: string): string {
  return riders.find((r) => r.id === id)?.name ?? '—'
}

export function customerName(customers: Customer[], id: string): string {
  return customers.find((c) => c.id === id)?.name ?? '—'
}
