export const STORAGE_KEY = 'aquaFlow_v1'

export const DELIVERY_STATUSES = [
  'Pending',
  'In Progress',
  'Completed',
  'Cancelled',
] as const

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

export type PayMode = 'Cash' | 'GCash' | 'Maya' | ''

export type Settings = {
  stationName: string
  owner: string
  phone: string
  /** Free-text station address (OpenStreetMap / Nominatim). */
  address: string
  /** Map pin latitude (WGS84), or null if unset. */
  lat: number | null
  /** Map pin longitude (WGS84), or null if unset. */
  lng: number | null
  currency: string
  /** Public API path for QR Ph image, e.g. `/uploads/qrph/….png`. */
  qrPhUrl: string
}

/** Fill address/pin fields for older localStorage / backups. */
export function normalizeSettings(raw: Partial<Settings> | null | undefined): Settings {
  const latRaw = raw?.lat
  const lngRaw = raw?.lng
  const lat =
    latRaw === null || latRaw === undefined || (latRaw as unknown) === ''
      ? null
      : Number(latRaw)
  const lng =
    lngRaw === null || lngRaw === undefined || (lngRaw as unknown) === ''
      ? null
      : Number(lngRaw)
  return {
    stationName: String(raw?.stationName ?? ''),
    owner: String(raw?.owner ?? ''),
    phone: String(raw?.phone ?? ''),
    address: String(raw?.address ?? ''),
    lat: lat != null && Number.isFinite(lat) ? lat : null,
    lng: lng != null && Number.isFinite(lng) ? lng : null,
    currency: String(raw?.currency ?? '₱') || '₱',
    qrPhUrl: typeof raw?.qrPhUrl === 'string' ? raw.qrPhUrl : '',
  }
}

export type Inventory = {
  full: number
  empty: number
}

export type Product = {
  id: string
  name: string
  price: number
}

export type Customer = {
  id: string
  name: string
  phone: string
  addr: string
  gallonsOut: number
  note: string
}

export type Rider = {
  id: string
  name: string
  phone: string
  /** Login email when owner created a /rider account. */
  email?: string | null
  hasAccount?: boolean
}

export type Delivery = {
  id: string
  /** Shared checkout id — multiple lines may share one orderId. */
  orderId: string
  date: string
  time: string
  customerId: string
  riderId: string
  prodId: string
  qty: number
  amount: number
  status: DeliveryStatus
  paid: boolean
  payMode: PayMode
  note: string
  /** Public path to GCash/Maya payment screenshot, if uploaded at checkout. */
  paymentProofUrl?: string | null
  /** ISO timestamp when Finish Transaction completed the order. */
  completedAt?: string | null
}

export type UtangEntry = {
  id: string
  ts: string
  customerId: string
  amount: number
  note: string
  deliveryId?: string
}

export type Payment = {
  id: string
  ts: string
  customerId: string
  amount: number
  note: string
  mode: 'Cash' | 'GCash'
}

export type AquaFlowState = {
  settings: Settings
  inventory: Inventory
  products: Product[]
  customers: Customer[]
  riders: Rider[]
  deliveries: Delivery[]
  utang: UtangEntry[]
  payments: Payment[]
}

export function isAquaFlowState(value: unknown): value is AquaFlowState {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    Array.isArray(v.deliveries) &&
    Array.isArray(v.customers) &&
    Array.isArray(v.products) &&
    Array.isArray(v.riders) &&
    Array.isArray(v.utang) &&
    Array.isArray(v.payments) &&
    !!v.settings &&
    typeof v.settings === 'object' &&
    !!v.inventory &&
    typeof v.inventory === 'object'
  )
}
