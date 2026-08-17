import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as api from '@/api/client'
import { ApiError } from '@/api/client'
import { deleteCustomer as cascadeDeleteCustomer } from '@/domain/cascade'
import { formatSavedAt, today } from '@/domain/dates'
import { completeDelivery as completeDeliveryLocal } from '@/domain/inventory'
import { recordWalkInSale as recordWalkInSaleLocal } from '@/domain/walkIn'
import { formatMoney } from '@/domain/money'
import { emptyStationState, seed } from '@/domain/seed'
import {
  DELIVERY_STATUSES,
  isAquaFlowState,
  normalizeSettings,
  type AquaFlowState,
  type Customer,
  type Delivery,
  type DeliveryStatus,
  type Payment,
  type PayMode,
  type Product,
  type Rider,
  type Settings,
  type UtangEntry,
} from '@/domain/types'
import { loadSessionMeta, saveSessionMeta } from '@/session/meta'
import { configuredApiBaseUrl, type SessionMeta } from '@/session/types'
import {
  clearState,
  downloadBlob,
  loadState,
  saveState,
  saveStateForStation,
  workspaceForStation,
} from '@/store/persistence'

type PersistOptions = { toast?: string | false }

type AquaFlowContextValue = {
  state: AquaFlowState
  lastSavedLabel: string
  toast: string | null
  flash: (message: string) => void
  updateState: (
    updater: (prev: AquaFlowState) => AquaFlowState,
    options?: PersistOptions,
  ) => void
  replaceState: (next: AquaFlowState, options?: PersistOptions) => void
  updateSettings: (settings: Settings) => Promise<void>
  saveProduct: (product: Product) => Promise<void>
  removeProduct: (productId: string) => Promise<void>
  saveDelivery: (delivery: Delivery) => Promise<void>
  patchDeliveryFields: (
    deliveryId: string,
    patch: { status?: DeliveryStatus; riderId?: string },
  ) => Promise<void>
  patchOrderFields: (
    orderId: string,
    patch: { status?: DeliveryStatus; riderId?: string },
  ) => Promise<void>
  completeOrderRemote: (
    orderId: string,
    input: { payment: 'Cash' | 'GCash' | 'Maya' | 'Utang' },
  ) => Promise<boolean>
  removeDelivery: (deliveryId: string) => Promise<void>
  saveCustomer: (customer: Customer) => Promise<void>
  removeCustomer: (customerId: string) => Promise<void>
  saveRider: (rider: Rider & { password?: string }) => Promise<void>
  removeRider: (riderId: string) => Promise<void>
  setInventoryCounts: (full: number, empty: number) => Promise<void>
  refillInventory: (count: number) => Promise<void>
  saveUtang: (entry: UtangEntry) => Promise<void>
  removeUtang: (entryId: string) => Promise<void>
  savePayment: (payment: Payment) => Promise<void>
  removePayment: (paymentId: string) => Promise<void>
  completeDeliveryRemote: (
    deliveryId: string,
    input: {
      payment: 'Cash' | 'GCash' | 'Maya' | 'Utang'
      fullOut: number
      emptyIn: number
      productName: string
    },
  ) => Promise<boolean>
  recordWalkIn: (input: {
    productId: string
    qty: number
    payment: 'Cash' | 'GCash' | 'Maya' | 'Utang'
    fullOut: number
    emptyIn: number
    customerId?: string | null
    note?: string
  }) => Promise<boolean>
  downloadBackup: () => void
  restoreBackup: (file: File) => Promise<void>
  resetAllData: () => void
  session: SessionMeta
  setApiBaseUrl: (url: string) => void
  login: (email: string, password: string) => Promise<void>
  registerStation: (input: {
    stationName: string
    email: string
    password: string
  }) => Promise<void>
  acceptInvite: (token: string, input: { email: string; password: string }) => Promise<void>
  logout: () => void
  refreshOnlineOrders: () => Promise<void>
  refreshFromServer: () => Promise<void>
}

async function putOrCreate<T>(
  put: () => Promise<T>,
  create: () => Promise<T>,
): Promise<T> {
  try {
    return await put()
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return create()
    throw err
  }
}

/** Online pull: remote list is source of truth (drops other-station local bleed). */
function takeRemoteById<T extends { id: string }>(
  remote: T[],
  deletedIds?: Set<string>,
): T[] {
  return remote.filter((row) => !deletedIds?.has(row.id))
}

type DeliveryDirtyFields = {
  status?: boolean
  paid?: boolean
  payMode?: boolean
  riderId?: boolean
  completedAt?: boolean
}

/**
 * Merge server deliveries with local.
 * Remote wins for status/rider/paid/payMode unless that field has an in-flight local edit
 * (avoids stale localStorage Pending overwriting MySQL In Progress).
 */
function mergeDeliveries(
  local: Delivery[],
  remote: Delivery[],
  deletedIds: Set<string>,
  deletedCustomerIds: Set<string>,
  dirtyById: Map<string, DeliveryDirtyFields>,
): Delivery[] {
  const localById = new Map(local.map((d) => [d.id, d] as const))
  const alive = (d: Delivery) =>
    !deletedIds.has(d.id) && !deletedCustomerIds.has(d.customerId)
  return remote.filter(alive).map((r) => {
    const l = localById.get(r.id)
    if (!l) return r
    const dirty = dirtyById.get(r.id)
    return {
      ...r,
      status: dirty?.status ? l.status : r.status,
      paid: dirty?.paid ? l.paid : r.paid,
      payMode: dirty?.payMode ? l.payMode : r.payMode,
      riderId: dirty?.riderId ? l.riderId : r.riderId,
      completedAt: dirty?.completedAt ? l.completedAt : r.completedAt,
    }
  })
}

function markDeliveryDirty(
  map: Map<string, DeliveryDirtyFields>,
  id: string,
  fields: DeliveryDirtyFields,
): void {
  const prev = map.get(id) ?? {}
  map.set(id, { ...prev, ...fields })
}

function clearDeliveryDirty(
  map: Map<string, DeliveryDirtyFields>,
  id: string,
  fields?: (keyof DeliveryDirtyFields)[],
): void {
  if (!fields) {
    map.delete(id)
    return
  }
  const prev = map.get(id)
  if (!prev) return
  const next: DeliveryDirtyFields = { ...prev }
  for (const f of fields) delete next[f]
  if (
    !next.status &&
    !next.paid &&
    !next.payMode &&
    !next.riderId &&
    !next.completedAt
  ) {
    map.delete(id)
  } else {
    map.set(id, next)
  }
}

function toApiDelivery(d: Delivery): api.ApiDelivery {
  return {
    id: d.id,
    orderId: d.orderId || d.id,
    date: d.date,
    time: d.time,
    customerId: d.customerId,
    riderId: d.riderId,
    prodId: d.prodId,
    qty: d.qty,
    amount: d.amount,
    status: d.status,
    paid: d.paid,
    payMode: d.payMode,
    note: d.note,
    paymentProofUrl: d.paymentProofUrl ?? null,
  }
}

function mapApiDelivery(d: api.ApiDelivery): Delivery {
  const status = DELIVERY_STATUSES.includes(d.status as DeliveryStatus)
    ? (d.status as DeliveryStatus)
    : 'Pending'
  const payMode =
    d.payMode === 'Cash' || d.payMode === 'GCash' || d.payMode === 'Maya'
      ? (d.payMode as PayMode)
      : ''
  return {
    id: d.id,
    orderId: d.orderId || d.id,
    date: d.date,
    time: d.time ?? '',
    customerId: d.customerId,
    riderId: d.riderId ?? '',
    prodId: d.prodId,
    qty: Number(d.qty) || 1,
    amount: Number(d.amount) || 0,
    status,
    paid: Boolean(d.paid),
    payMode,
    note: d.note ?? '',
    paymentProofUrl: d.paymentProofUrl ?? null,
    completedAt: d.completedAt ?? null,
  }
}

function mapApiCustomer(c: api.ApiCustomer): Customer {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone ?? '',
    addr: c.addr ?? '',
    gallonsOut: Number(c.gallonsOut) || 0,
    note: c.note ?? '',
  }
}

const AquaFlowContext = createContext<AquaFlowContextValue | null>(null)

function initialWorkspace(): { state: AquaFlowState; session: SessionMeta } {
  const session = loadSessionMeta()
  if (session.stationId) {
    return {
      session,
      state: workspaceForStation(session.stationId, session.stationName || ''),
    }
  }
  return { session, state: loadState() }
}

export function AquaFlowProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(initialWorkspace)
  const [state, setState] = useState<AquaFlowState>(() => boot.state)
  const [sessionState, setSession] = useState<SessionMeta>(() => boot.session)
  // Derive from Vite env every render so HMR / stale localStorage never stick on localhost.
  const session: SessionMeta = {
    ...sessionState,
    apiBaseUrl: configuredApiBaseUrl(),
  }
  const [lastSavedLabel, setLastSavedLabel] = useState(() => `Saved · ${formatSavedAt()}`)
  const [toast, setToast] = useState<string | null>(null)
  const sessionRef = useRef(session)
  const stateRef = useRef(state)
  /** One hydrate attempt per station after sync removal left empty local products. */
  const productsHydrateKeyRef = useRef<string | null>(null)
  /** One load of station info (address / map pin) from MySQL per station session. */
  const settingsHydrateKeyRef = useRef<string | null>(null)
  /** One publish of local products → MySQL so landing matches admin. */
  const productsPublishKeyRef = useRef<string | null>(null)
  /** Product ids deleted this session — skip publish upsert so they stay removed in MySQL. */
  const deletedProductIdsRef = useRef(new Set<string>())
  /** Soft-deleted ids this session — block stale poll/publish from resurrecting rows. */
  const deletedCustomerIdsRef = useRef(new Set<string>())
  const deletedDeliveryIdsRef = useRef(new Set<string>())
  const deletedRiderIdsRef = useRef(new Set<string>())
  const deletedUtangIdsRef = useRef(new Set<string>())
  const deletedPaymentIdsRef = useRef(new Set<string>())
  /** In-flight delivery field edits — keep local until server confirms. */
  const deliveryDirtyRef = useRef(new Map<string, DeliveryDirtyFields>())
  sessionRef.current = session
  stateRef.current = state

  const flash = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => {
      setToast((current) => (current === message ? null : current))
    }, 2200)
  }, [])

  const persistSession = useCallback((next: SessionMeta) => {
    const normalized: SessionMeta = {
      ...next,
      apiBaseUrl: configuredApiBaseUrl(),
    }
    sessionRef.current = normalized
    saveSessionMeta(normalized)
    setSession(normalized)
  }, [])

  const normalizeState = useCallback((raw: AquaFlowState): AquaFlowState => {
    return {
      ...raw,
      settings: normalizeSettings(raw.settings),
      deliveries: raw.deliveries.map((d) => ({
        ...d,
        orderId: d.orderId || d.id,
      })),
    }
  }, [])

  const persistWorkspace = useCallback(
    (next: AquaFlowState) => {
      const normalized = normalizeState(next)
      stateRef.current = normalized
      setState(normalized)
      saveState(normalized)
      const sid = sessionRef.current.stationId
      if (sid) saveStateForStation(sid, normalized)
      setLastSavedLabel(`Saved · ${formatSavedAt()}`)
    },
    [normalizeState],
  )

  const clearDomainSessionRefs = useCallback(() => {
    productsHydrateKeyRef.current = null
    productsPublishKeyRef.current = null
    settingsHydrateKeyRef.current = null
    deletedProductIdsRef.current.clear()
    deletedCustomerIdsRef.current.clear()
    deletedDeliveryIdsRef.current.clear()
    deletedRiderIdsRef.current.clear()
    deletedUtangIdsRef.current.clear()
    deletedPaymentIdsRef.current.clear()
    deliveryDirtyRef.current.clear()
  }, [])

  const updateState = useCallback(
    (updater: (prev: AquaFlowState) => AquaFlowState, options?: PersistOptions) => {
      const prev = stateRef.current
        const next = updater(prev)
      persistWorkspace(next)
        if (options?.toast !== false) {
          flash(options?.toast ?? 'Autosaved ✓')
        }
    },
    [flash, persistWorkspace],
  )

  const replaceState = useCallback(
    (next: AquaFlowState, options?: PersistOptions) => {
      updateState(() => next, options)
    },
    [updateState],
  )

  const updateSettings = useCallback(
    async (settings: Settings) => {
      updateState((prev) => ({ ...prev, settings }), {
        toast: sessionRef.current.token ? false : undefined,
      })
      const token = sessionRef.current.token
      if (!token) return
      try {
        await api.putSettings(sessionRef.current.apiBaseUrl, token, {
          stationName: settings.stationName,
          owner: settings.owner,
          phone: settings.phone,
          address: settings.address,
          lat: settings.lat,
          lng: settings.lng,
          currency: settings.currency,
        })
        flash('Station info saved · live on landing page')
      } catch (err) {
        flash(
          err instanceof ApiError
            ? `Saved locally · server: ${err.message}`
            : 'Saved locally · could not update landing page',
        )
      }
    },
    [flash, updateState],
  )

  const saveProduct = useCallback(
    async (product: Product) => {
      deletedProductIdsRef.current.delete(product.id)
      updateState(
        (prev) => {
          const exists = prev.products.some((p) => p.id === product.id)
          return {
            ...prev,
            products: exists
              ? prev.products.map((p) => (p.id === product.id ? product : p))
              : [...prev.products, product],
          }
        },
        { toast: sessionRef.current.token ? false : 'Product saved ✓' },
      )
      const token = sessionRef.current.token
      if (!token) return
      try {
        await api.upsertProduct(sessionRef.current.apiBaseUrl, token, product)
        flash('Product saved · live on landing page')
      } catch (err) {
        flash(
          err instanceof ApiError
            ? `Saved locally · server: ${err.message}`
            : 'Saved locally · could not update landing page',
        )
      }
    },
    [flash, updateState],
  )

  const removeProduct = useCallback(
    async (productId: string) => {
      deletedProductIdsRef.current.add(productId)
      updateState(
        (prev) => ({
          ...prev,
          products: prev.products.filter((p) => p.id !== productId),
        }),
        { toast: sessionRef.current.token ? false : 'Product deleted' },
      )
      const token = sessionRef.current.token
      if (!token) {
        flash('Deleted locally · sign in to remove it from the landing page')
        return
      }
      try {
        await api.deleteProduct(sessionRef.current.apiBaseUrl, token, productId)
        flash('Product deleted · removed from database')
      } catch (err) {
        // Never on server (local-only id) — local delete is enough.
        if (err instanceof ApiError && err.status === 404) {
          flash('Product deleted')
          return
        }
        flash(
          err instanceof ApiError
            ? `Deleted locally · server: ${err.message}`
            : 'Deleted locally · could not update database',
        )
      }
    },
    [flash, updateState],
  )

  const saveDelivery = useCallback(
    async (delivery: Delivery) => {
      deletedDeliveryIdsRef.current.delete(delivery.id)
      markDeliveryDirty(deliveryDirtyRef.current, delivery.id, {
        status: true,
        paid: true,
        payMode: true,
        riderId: true,
      })
      updateState(
        (prev) => {
          const exists = prev.deliveries.some((d) => d.id === delivery.id)
          return {
            ...prev,
            deliveries: exists
              ? prev.deliveries.map((d) => (d.id === delivery.id ? delivery : d))
              : [...prev.deliveries, delivery],
          }
        },
        { toast: sessionRef.current.token ? false : 'Delivery saved ✓' },
      )
      const token = sessionRef.current.token
      if (!token) {
        clearDeliveryDirty(deliveryDirtyRef.current, delivery.id)
        return
      }
      const payload = toApiDelivery(delivery)
      const base = sessionRef.current.apiBaseUrl
      try {
        try {
          await api.putDelivery(base, token, payload)
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 404) throw err
          await api.createDelivery(base, token, payload)
        }
        clearDeliveryDirty(deliveryDirtyRef.current, delivery.id)
        flash('Delivery saved')
      } catch (err) {
        flash(
          err instanceof ApiError
            ? `Saved locally · server: ${err.message}`
            : 'Saved locally · could not update server',
        )
      }
    },
    [flash, updateState],
  )

  const patchDeliveryFields = useCallback(
    async (
      deliveryId: string,
      patch: { status?: DeliveryStatus; riderId?: string },
    ) => {
      const current = stateRef.current.deliveries.find((d) => d.id === deliveryId)
      if (!current) return
      if (
        patch.status !== undefined &&
        patch.status === current.status &&
        patch.riderId === undefined
      ) {
        return
      }
      if (
        patch.riderId !== undefined &&
        patch.riderId === current.riderId &&
        patch.status === undefined
      ) {
        return
      }

      const nextDelivery: Delivery = {
        ...current,
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.riderId !== undefined ? { riderId: patch.riderId } : {}),
      }
      deletedDeliveryIdsRef.current.delete(deliveryId)
      const dirtyFields: DeliveryDirtyFields = {
        ...(patch.status !== undefined ? { status: true } : {}),
        ...(patch.riderId !== undefined ? { riderId: true } : {}),
      }
      markDeliveryDirty(deliveryDirtyRef.current, deliveryId, dirtyFields)
      updateState(
        (prev) => ({
          ...prev,
          deliveries: prev.deliveries.map((d) =>
            d.id === deliveryId ? nextDelivery : d,
          ),
        }),
        { toast: false },
      )

      const token = sessionRef.current.token
      if (!token) {
        clearDeliveryDirty(
          deliveryDirtyRef.current,
          deliveryId,
          Object.keys(dirtyFields) as (keyof DeliveryDirtyFields)[],
        )
        flash('Delivery updated')
        return
      }
      try {
        const res = await api.patchDelivery(
          sessionRef.current.apiBaseUrl,
          token,
          deliveryId,
          {
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            ...(patch.riderId !== undefined ? { riderId: patch.riderId } : {}),
          },
        )
        const mapped = mapApiDelivery(res.delivery)
        clearDeliveryDirty(
          deliveryDirtyRef.current,
          deliveryId,
          Object.keys(dirtyFields) as (keyof DeliveryDirtyFields)[],
        )
        updateState(
          (prev) => ({
            ...prev,
            deliveries: prev.deliveries.map((d) => {
              if (d.id !== deliveryId) return d
              const stillDirty = deliveryDirtyRef.current.get(deliveryId)
              return {
                ...mapped,
                status: stillDirty?.status ? d.status : mapped.status,
                riderId: stillDirty?.riderId ? d.riderId : mapped.riderId,
              }
            }),
          }),
          { toast: false },
        )
        flash('Delivery updated')
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          // Not on server yet — fall back to full upsert.
          await saveDelivery(nextDelivery)
          return
        }
        flash(
          err instanceof ApiError
            ? `Updated locally · server: ${err.message}`
            : 'Updated locally · could not update server',
        )
      }
    },
    [flash, saveDelivery, updateState],
  )

  const removeDelivery = useCallback(
    async (deliveryId: string) => {
      deletedDeliveryIdsRef.current.add(deliveryId)
      updateState(
        (prev) => ({
          ...prev,
          utang: prev.utang.filter((u) => u.deliveryId !== deliveryId),
          deliveries: prev.deliveries.filter((d) => d.id !== deliveryId),
        }),
        { toast: sessionRef.current.token ? false : 'Delivery deleted' },
      )
      const token = sessionRef.current.token
      if (!token) return
      try {
        await api.deleteDelivery(sessionRef.current.apiBaseUrl, token, deliveryId)
        flash('Delivery deleted')
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          flash('Delivery deleted')
          return
        }
        flash(
          err instanceof ApiError
            ? `Deleted locally · server: ${err.message}`
            : 'Deleted locally · could not update server',
        )
      }
    },
    [flash, updateState],
  )

  const saveCustomer = useCallback(
    async (customer: Customer) => {
      deletedCustomerIdsRef.current.delete(customer.id)
      updateState(
        (prev) => {
          const exists = prev.customers.some((c) => c.id === customer.id)
          return {
            ...prev,
            customers: exists
              ? prev.customers.map((c) => (c.id === customer.id ? customer : c))
              : [...prev.customers, customer],
          }
        },
        { toast: sessionRef.current.token ? false : 'Customer saved ✓' },
      )
      const token = sessionRef.current.token
      if (!token) return
      const base = sessionRef.current.apiBaseUrl
      const payload: api.ApiCustomer = {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        addr: customer.addr,
        gallonsOut: customer.gallonsOut,
        note: customer.note,
      }
      try {
        await putOrCreate(
          () => api.putCustomer(base, token, payload),
          () => api.createCustomer(base, token, payload),
        )
        flash('Customer saved')
      } catch (err) {
        flash(
          err instanceof ApiError
            ? `Saved locally · server: ${err.message}`
            : 'Saved locally · could not update server',
        )
      }
    },
    [flash, updateState],
  )

  const removeCustomer = useCallback(
    async (customerId: string) => {
      const prev = stateRef.current
      deletedCustomerIdsRef.current.add(customerId)
      for (const d of prev.deliveries) {
        if (d.customerId === customerId) deletedDeliveryIdsRef.current.add(d.id)
      }
      for (const u of prev.utang) {
        if (u.customerId === customerId) deletedUtangIdsRef.current.add(u.id)
      }
      for (const p of prev.payments) {
        if (p.customerId === customerId) deletedPaymentIdsRef.current.add(p.id)
      }
      updateState((s) => cascadeDeleteCustomer(s, customerId), {
        toast: sessionRef.current.token ? false : 'Customer deleted',
      })
      const token = sessionRef.current.token
      if (!token) return
      try {
        await api.deleteCustomer(sessionRef.current.apiBaseUrl, token, customerId)
        flash('Customer deleted')
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          flash('Customer deleted')
          return
        }
        flash(
          err instanceof ApiError
            ? `Deleted locally · server: ${err.message}`
            : 'Deleted locally · could not update server',
        )
      }
    },
    [flash, updateState],
  )

  const saveRider = useCallback(
    async (rider: Rider & { password?: string }) => {
      const { password, ...riderRow } = rider
      deletedRiderIdsRef.current.delete(rider.id)
      updateState(
        (prev) => {
          const exists = prev.riders.some((r) => r.id === rider.id)
          const nextRider: Rider = {
            id: riderRow.id,
            name: riderRow.name,
            phone: riderRow.phone,
            email: riderRow.email ?? null,
            hasAccount:
              riderRow.hasAccount ||
              Boolean(riderRow.email) ||
              Boolean(password),
          }
          return {
            ...prev,
            riders: exists
              ? prev.riders.map((r) => (r.id === rider.id ? nextRider : r))
              : [...prev.riders, nextRider],
          }
        },
        { toast: sessionRef.current.token ? false : 'Rider saved ✓' },
      )
      const token = sessionRef.current.token
      if (!token) return
      const base = sessionRef.current.apiBaseUrl
      const payload = {
        id: rider.id,
        name: rider.name,
        phone: rider.phone,
        email: rider.email ?? undefined,
        password,
      }
      try {
        const res = await putOrCreate(
          () => api.putRider(base, token, payload),
          () => api.createRider(base, token, payload),
        )
        updateState(
          (prev) => ({
            ...prev,
            riders: prev.riders.map((r) =>
              r.id === res.rider.id
                ? {
                    id: res.rider.id,
                    name: res.rider.name,
                    phone: res.rider.phone,
                    email: res.rider.email ?? null,
                    hasAccount: Boolean(res.rider.hasAccount),
                  }
                : r,
            ),
          }),
          { toast: false },
        )
        flash(
          password || res.rider.hasAccount
            ? 'Rider saved · can sign in at /rider'
            : 'Rider saved',
        )
      } catch (err) {
        flash(
          err instanceof ApiError
            ? `Saved locally · server: ${err.message}`
            : 'Saved locally · could not update server',
        )
      }
    },
    [flash, updateState],
  )

  const removeRider = useCallback(
    async (riderId: string) => {
      deletedRiderIdsRef.current.add(riderId)
      updateState(
        (prev) => ({
          ...prev,
          riders: prev.riders.filter((r) => r.id !== riderId),
        }),
        { toast: sessionRef.current.token ? false : 'Rider deleted' },
      )
      const token = sessionRef.current.token
      if (!token) return
      try {
        await api.deleteRider(sessionRef.current.apiBaseUrl, token, riderId)
        flash('Rider deleted')
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          flash('Rider deleted')
          return
        }
        flash(
          err instanceof ApiError
            ? `Deleted locally · server: ${err.message}`
            : 'Deleted locally · could not update server',
        )
      }
    },
    [flash, updateState],
  )

  const setInventoryCounts = useCallback(
    async (full: number, empty: number) => {
      const next = { full: Math.max(0, full), empty: Math.max(0, empty) }
      updateState((prev) => ({ ...prev, inventory: next }), {
        toast: sessionRef.current.token ? false : 'Inventory updated ✓',
      })
      const token = sessionRef.current.token
      if (!token) return
      try {
        const res = await api.putInventory(sessionRef.current.apiBaseUrl, token, next)
        updateState(
          (prev) => ({
            ...prev,
            inventory: {
              full: Number(res.inventory.full) || 0,
              empty: Number(res.inventory.empty) || 0,
            },
          }),
          { toast: false },
        )
        flash('Inventory saved')
      } catch (err) {
        flash(
          err instanceof ApiError
            ? `Saved locally · server: ${err.message}`
            : 'Saved locally · could not update server',
        )
      }
    },
    [flash, updateState],
  )

  const refillInventory = useCallback(
    async (count: number) => {
      const token = sessionRef.current.token
      if (token) {
        try {
          const res = await api.refillInventory(
            sessionRef.current.apiBaseUrl,
            token,
            count,
          )
          updateState(
            (prev) => ({
              ...prev,
              inventory: {
                full: Number(res.inventory.full) || 0,
                empty: Number(res.inventory.empty) || 0,
              },
            }),
            { toast: false },
          )
          flash(`Refilled ${res.refilled} gallons ✓`)
          return
        } catch (err) {
          flash(
            err instanceof ApiError
              ? err.message
              : 'Could not refill on server',
          )
          return
        }
      }
      updateState(
        (prev) => ({
          ...prev,
          inventory: {
            empty: Math.max(0, prev.inventory.empty - count),
            full: Number(prev.inventory.full) + count,
          },
        }),
        { toast: `Refilled ${count} gallons ✓` },
      )
    },
    [flash, updateState],
  )

  const saveUtang = useCallback(
    async (entry: UtangEntry) => {
      deletedUtangIdsRef.current.delete(entry.id)
      updateState(
        (prev) => {
          const exists = prev.utang.some((u) => u.id === entry.id)
          return {
            ...prev,
            utang: exists
              ? prev.utang.map((u) => (u.id === entry.id ? entry : u))
              : [...prev.utang, entry],
          }
        },
        { toast: sessionRef.current.token ? false : 'Utang saved ✓' },
      )
      const token = sessionRef.current.token
      if (!token) return
      const base = sessionRef.current.apiBaseUrl
      const payload: api.ApiUtang = {
        id: entry.id,
        ts: entry.ts,
        customerId: entry.customerId,
        amount: entry.amount,
        note: entry.note,
        deliveryId: entry.deliveryId,
      }
      try {
        await putOrCreate(
          () => api.putUtang(base, token, payload),
          () => api.createUtang(base, token, payload),
        )
        flash('Utang saved')
      } catch (err) {
        flash(
          err instanceof ApiError
            ? `Saved locally · server: ${err.message}`
            : 'Saved locally · could not update server',
        )
      }
    },
    [flash, updateState],
  )

  const removeUtang = useCallback(
    async (entryId: string) => {
      deletedUtangIdsRef.current.add(entryId)
      updateState(
        (prev) => ({ ...prev, utang: prev.utang.filter((u) => u.id !== entryId) }),
        { toast: sessionRef.current.token ? false : 'Deleted' },
      )
      const token = sessionRef.current.token
      if (!token) return
      try {
        await api.deleteUtang(sessionRef.current.apiBaseUrl, token, entryId)
        flash('Utang deleted')
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          flash('Utang deleted')
          return
        }
        flash(
          err instanceof ApiError
            ? `Deleted locally · server: ${err.message}`
            : 'Deleted locally · could not update server',
        )
      }
    },
    [flash, updateState],
  )

  const savePayment = useCallback(
    async (payment: Payment) => {
      deletedPaymentIdsRef.current.delete(payment.id)
      updateState(
        (prev) => {
          const exists = prev.payments.some((p) => p.id === payment.id)
          return {
            ...prev,
            payments: exists
              ? prev.payments.map((p) => (p.id === payment.id ? payment : p))
              : [...prev.payments, payment],
          }
        },
        { toast: sessionRef.current.token ? false : 'Payment saved ✓' },
      )
      const token = sessionRef.current.token
      if (!token) return
      const base = sessionRef.current.apiBaseUrl
      const payload: api.ApiPayment = {
        id: payment.id,
        ts: payment.ts,
        customerId: payment.customerId,
        amount: payment.amount,
        note: payment.note,
        mode: payment.mode,
      }
      try {
        await putOrCreate(
          () => api.putPayment(base, token, payload),
          () => api.createPayment(base, token, payload),
        )
        flash('Payment saved')
      } catch (err) {
        flash(
          err instanceof ApiError
            ? `Saved locally · server: ${err.message}`
            : 'Saved locally · could not update server',
        )
      }
    },
    [flash, updateState],
  )

  const removePayment = useCallback(
    async (paymentId: string) => {
      deletedPaymentIdsRef.current.add(paymentId)
      updateState(
        (prev) => ({
          ...prev,
          payments: prev.payments.filter((p) => p.id !== paymentId),
        }),
        { toast: sessionRef.current.token ? false : 'Deleted' },
      )
      const token = sessionRef.current.token
      if (!token) return
      try {
        await api.deletePayment(sessionRef.current.apiBaseUrl, token, paymentId)
        flash('Payment deleted')
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          flash('Payment deleted')
          return
        }
        flash(
          err instanceof ApiError
            ? `Deleted locally · server: ${err.message}`
            : 'Deleted locally · could not update server',
        )
      }
    },
    [flash, updateState],
  )

  const downloadBackup = useCallback(() => {
    downloadBlob(
      JSON.stringify(state, null, 2),
      `aquaflow-backup-${today()}.json`,
      'application/json',
    )
    flash('Backup downloaded ✓')
  }, [flash, state])

  const restoreBackup = useCallback(
    async (file: File) => {
      const text = await file.text()
      try {
        const parsed: unknown = JSON.parse(text)
        if (!isAquaFlowState(parsed)) throw new Error('Invalid shape')
        replaceState(normalizeState(parsed), { toast: 'Backup restored ✓' })
      } catch {
        flash('Invalid backup file')
      }
    },
    [flash, normalizeState, replaceState],
  )

  const resetAllData = useCallback(() => {
    clearState()
    clearDomainSessionRefs()
    const next = seed()
    persistWorkspace(next)
    flash('Data reset complete')
  }, [clearDomainSessionRefs, flash, persistWorkspace])

  const setApiBaseUrl = useCallback(
    (_url: string) => {
      // Station/rider apps always use VITE_API_URL; ignore overrides.
      persistSession({
        ...sessionRef.current,
        apiBaseUrl: configuredApiBaseUrl(),
      })
    },
    [persistSession],
  )

  const applySession = useCallback(
    (auth: Awaited<ReturnType<typeof api.login>>) => {
      const prevStationId = sessionRef.current.stationId
      const nextStationId = auth.station.id

      // Persist outgoing station workspace before switching.
      if (prevStationId && prevStationId !== nextStationId) {
        saveStateForStation(prevStationId, stateRef.current)
      }

      if (prevStationId !== nextStationId) {
        // New station (or first login): load that station's cache or empty — never keep
        // another station's riders/deliveries in memory (tenancy isolation).
        clearDomainSessionRefs()
        const workspace = workspaceForStation(
          nextStationId,
          auth.station.name || '',
        )
        persistWorkspace(workspace)
      } else if (
        auth.station.name &&
        stateRef.current.settings.stationName !== auth.station.name
      ) {
        persistWorkspace({
          ...stateRef.current,
          settings: {
            ...stateRef.current.settings,
            stationName: auth.station.name,
          },
        })
      }

      persistSession({
        ...sessionRef.current,
        token: auth.token,
        email: auth.user.email,
        stationId: auth.station.id,
        stationName: auth.station.name,
        userRole: auth.user.role,
      })
    },
    [clearDomainSessionRefs, persistSession, persistWorkspace],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      const auth = await api.login(sessionRef.current.apiBaseUrl, email, password)
      if (auth.user.role === 'rider') {
        throw new ApiError(
          'This is a delivery rider account — sign in at /rider',
          403,
          auth,
        )
      }
      applySession(auth)
      flash(`Signed in · ${auth.station.name}`)
    },
    [applySession, flash],
  )

  const registerStation = useCallback(
    async (input: { stationName: string; email: string; password: string }) => {
      const auth = await api.register(sessionRef.current.apiBaseUrl, input)
      applySession(auth)
      flash(`Station created · ${auth.station.name}`)
    },
    [applySession, flash],
  )

  const acceptInvite = useCallback(
    async (token: string, input: { email: string; password: string }) => {
      const auth = await api.acceptInvite(sessionRef.current.apiBaseUrl, token, input)
      applySession(auth)
      flash(`Joined ${auth.station.name}`)
    },
    [applySession, flash],
  )

  const logout = useCallback(() => {
    const sid = sessionRef.current.stationId
    if (sid) saveStateForStation(sid, stateRef.current)
    clearDomainSessionRefs()
    // Drop active workspace so the next login cannot inherit this station's data.
    const blank = emptyStationState('')
    persistWorkspace(blank)
    clearState()
    persistSession({
      ...sessionRef.current,
      token: null,
      email: null,
      stationId: null,
      stationName: null,
      userRole: null,
    })
    flash('Signed out')
  }, [clearDomainSessionRefs, flash, persistSession, persistWorkspace])

  const refreshFromServer = useCallback(async () => {
    const token = sessionRef.current.token
    if (!token) return
    const base = sessionRef.current.apiBaseUrl
    try {
      const [delRes, custRes, riderRes, invRes, utangRes, payRes, prodRes] =
        await Promise.all([
          api.listDeliveries(base, token),
          api.listCustomers(base, token),
          api.listRiders(base, token),
          api.getInventory(base, token),
          api.listUtang(base, token),
          api.listPayments(base, token),
          api.listProducts(base, token),
        ])
      const remoteDeliveries = delRes.deliveries.map(mapApiDelivery)
      const remoteCustomers = custRes.customers.map(mapApiCustomer)
      const remoteRiders: Rider[] = riderRes.riders.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone ?? '',
        email: r.email ?? null,
        hasAccount: Boolean(r.hasAccount),
      }))
      const remoteUtang: UtangEntry[] = utangRes.utang.map((u) => ({
        id: u.id,
        ts: u.ts,
        customerId: u.customerId,
        amount: Number(u.amount) || 0,
        note: u.note ?? '',
        deliveryId: u.deliveryId,
      }))
      const remotePayments: Payment[] = payRes.payments.map((p) => ({
        id: p.id,
        ts: p.ts,
        customerId: p.customerId,
        amount: Number(p.amount) || 0,
        note: p.note ?? '',
        mode: p.mode === 'GCash' ? 'GCash' : 'Cash',
      }))
      const remoteProducts: Product[] = prodRes.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price) || 0,
      }))

      const prev = stateRef.current
      const prevIds = new Set(prev.deliveries.map((d) => d.id))
      const newPending = remoteDeliveries.filter(
        (d) => !prevIds.has(d.id) && d.status === 'Pending',
      ).length

      const next: AquaFlowState = {
        ...prev,
        customers: takeRemoteById(
          remoteCustomers,
          deletedCustomerIdsRef.current,
        ),
        deliveries: mergeDeliveries(
          prev.deliveries,
          remoteDeliveries,
          deletedDeliveryIdsRef.current,
          deletedCustomerIdsRef.current,
          deliveryDirtyRef.current,
        ),
        riders: takeRemoteById(remoteRiders, deletedRiderIdsRef.current),
        utang: takeRemoteById(remoteUtang, deletedUtangIdsRef.current),
        payments: takeRemoteById(remotePayments, deletedPaymentIdsRef.current),
        products:
          remoteProducts.length > 0
            ? takeRemoteById(remoteProducts, deletedProductIdsRef.current)
            : prev.products,
        inventory: {
          full: Number(invRes.inventory.full) || 0,
          empty: Number(invRes.inventory.empty) || 0,
        },
      }
      persistWorkspace(next)
      if (newPending > 0) {
        flash(
          newPending === 1
            ? '1 new online order'
            : `${newPending} new online orders`,
        )
      }
    } catch {
      /* offline / auth — keep local */
    }
  }, [flash, persistWorkspace])

  const refreshOnlineOrders = refreshFromServer

  const patchOrderFields = useCallback(
    async (
      orderId: string,
      patch: { status?: DeliveryStatus; riderId?: string },
    ) => {
      const lines = stateRef.current.deliveries.filter(
        (d) => (d.orderId || d.id) === orderId,
      )
      if (lines.length === 0) return

      updateState(
        (prev) => ({
          ...prev,
          deliveries: prev.deliveries.map((d) => {
            if ((d.orderId || d.id) !== orderId) return d
            if (d.status === 'Completed') return d
            return {
              ...d,
              ...(patch.status !== undefined ? { status: patch.status } : {}),
              ...(patch.riderId !== undefined ? { riderId: patch.riderId } : {}),
            }
          }),
        }),
        { toast: false },
      )

      const token = sessionRef.current.token
      if (!token) {
        flash('Order updated')
        return
      }
      try {
        const res = await api.patchOrderDeliveries(
          sessionRef.current.apiBaseUrl,
          token,
          orderId,
          {
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            ...(patch.riderId !== undefined ? { riderId: patch.riderId } : {}),
          },
        )
        const mapped = res.deliveries.map(mapApiDelivery)
        updateState(
          (prev) => {
            const byId = new Map(mapped.map((d) => [d.id, d]))
            return {
              ...prev,
              deliveries: prev.deliveries.map((d) => byId.get(d.id) ?? d),
            }
          },
          { toast: false },
        )
        flash('Order updated')
      } catch (err) {
        flash(
          err instanceof ApiError
            ? `Updated locally · server: ${err.message}`
            : 'Updated locally · could not update server',
        )
      }
    },
    [flash, updateState],
  )

  const completeDeliveryRemote = useCallback(
    async (
      deliveryId: string,
      input: {
        payment: 'Cash' | 'GCash' | 'Maya' | 'Utang'
        fullOut: number
        emptyIn: number
        productName: string
      },
    ): Promise<boolean> => {
      const token = sessionRef.current.token
      const currency = stateRef.current.settings.currency || '₱'
      if (token) {
        markDeliveryDirty(deliveryDirtyRef.current, deliveryId, {
          status: true,
          paid: true,
          payMode: true,
          completedAt: true,
        })
        try {
          const res = await api.completeDelivery(
            sessionRef.current.apiBaseUrl,
            token,
            deliveryId,
            input,
          )
          clearDeliveryDirty(deliveryDirtyRef.current, deliveryId, [
            'status',
            'paid',
            'payMode',
            'completedAt',
          ])
          await refreshFromServer()
          flash(res.toast || 'Delivered ✓')
          return true
        } catch (err) {
          flash(
            err instanceof ApiError
              ? err.message
              : 'Could not complete delivery on server',
          )
          return false
        }
      }
      let toastMsg = ''
      let ok = false
      updateState(
        (prev) => {
          const result = completeDeliveryLocal(
            prev,
            { deliveryId, ...input },
            (n) => formatMoney(n, currency),
          )
          if (!result) return prev
          ok = true
          toastMsg = result.toast
          return result.state
        },
        { toast: false },
      )
      if (ok) flash(toastMsg)
      return ok
    },
    [flash, refreshFromServer, updateState],
  )

  const completeOrderRemote = useCallback(
    async (
      orderId: string,
      input: { payment: 'Cash' | 'GCash' | 'Maya' | 'Utang' },
    ): Promise<boolean> => {
      const token = sessionRef.current.token
      const lines = stateRef.current.deliveries.filter(
        (d) => (d.orderId || d.id) === orderId,
      )
      if (lines.length === 0) return false

      if (token) {
        try {
          const productNames: Record<string, string> = {}
          for (const line of lines) {
            const p = stateRef.current.products.find((x) => x.id === line.prodId)
            if (p) productNames[line.prodId] = p.name
          }
          const res = await api.completeOrderDeliveries(
            sessionRef.current.apiBaseUrl,
            token,
            orderId,
            { payment: input.payment, productNames },
          )
          await refreshFromServer()
          flash(res.toast || 'Order completed ✓')
          return true
        } catch (err) {
          flash(
            err instanceof ApiError
              ? err.message
              : 'Could not complete order on server',
          )
          return false
        }
      }

      let ok = true
      const currency = stateRef.current.settings.currency || '₱'
      for (const line of lines) {
        if (line.status === 'Completed' || line.status === 'Cancelled') continue
        const pname =
          stateRef.current.products.find((p) => p.id === line.prodId)?.name ??
          'Product'
        const lineOk = await completeDeliveryRemote(line.id, {
          payment: input.payment,
          fullOut: line.qty,
          emptyIn: line.qty,
          productName: pname,
        })
        if (!lineOk) ok = false
      }
      if (ok) {
        flash(
          `Order completed ✓ ${formatMoney(
            lines.reduce((s, l) => s + l.amount, 0),
            currency,
          )}`,
        )
      }
      return ok
    },
    [completeDeliveryRemote, flash, refreshFromServer],
  )

  const recordWalkIn = useCallback(
    async (input: {
      productId: string
      qty: number
      payment: 'Cash' | 'GCash' | 'Maya' | 'Utang'
      fullOut: number
      emptyIn: number
      customerId?: string | null
      note?: string
    }): Promise<boolean> => {
      const token = sessionRef.current.token
      const currency = stateRef.current.settings.currency || '₱'
      if (token) {
        try {
          const res = await api.createWalkInSale(
            sessionRef.current.apiBaseUrl,
            token,
            input,
          )
          await refreshFromServer()
          flash(res.toast || 'Walk-in sale recorded ✓')
          return true
        } catch (err) {
          flash(
            err instanceof ApiError
              ? err.message
              : 'Could not record walk-in sale on server',
          )
          return false
        }
      }
      let toastMsg = ''
      let ok = false
      updateState(
        (prev) => {
          const result = recordWalkInSaleLocal(
            prev,
            input,
            (n) => formatMoney(n, currency),
          )
          if ('error' in result) {
            toastMsg = result.error
            return prev
          }
          ok = true
          toastMsg = result.toast
          return result.state
        },
        { toast: false },
      )
      if (ok) flash(toastMsg)
      else if (toastMsg) flash(toastMsg)
      return ok
    },
    [flash, refreshFromServer, updateState],
  )

  // Station Info (name, phone, address, map pin) lives in MySQL for the landing page.
  // Local workspace often has empty address/pin — load from server once per station session.
  useEffect(() => {
    const token = session.token
    const stationId = session.stationId
    const apiBaseUrl = session.apiBaseUrl
    if (!token || !stationId) return
    if (settingsHydrateKeyRef.current === stationId) return
    settingsHydrateKeyRef.current = stationId

    let cancelled = false
    void api
      .getSettings(apiBaseUrl, token)
      .then((res) => {
        if (cancelled) return
        const settings = normalizeSettings({
          ...res.settings,
          qrPhUrl: res.settings.qrPhUrl ?? '',
        })
        persistWorkspace({
          ...stateRef.current,
          settings,
        })
      })
      .catch(() => {
        if (!cancelled) settingsHydrateKeyRef.current = null
      })

    return () => {
      cancelled = true
    }
  }, [session.token, session.stationId, session.apiBaseUrl, persistWorkspace])

  // Recover products wiped by pre-rip login (emptyStationState) when MySQL still has them.
  // When local already has products, publish them so the landing page matches admin.
  useEffect(() => {
    const token = session.token
    const stationId = session.stationId
    const apiBaseUrl = session.apiBaseUrl
    if (!token || !stationId) return

    if (state.products.length === 0) {
      if (productsHydrateKeyRef.current === stationId) return
      productsHydrateKeyRef.current = stationId

      let cancelled = false
      void api
        .listProducts(apiBaseUrl, token)
        .then((res) => {
          if (cancelled || res.products.length === 0) return
          if (stateRef.current.products.length > 0) return
          const products = res.products.map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price) || 0,
          }))
          const next = { ...stateRef.current, products }
          persistWorkspace(next)
          flash('Products loaded from server')
        })
        .catch(() => {
          if (!cancelled) productsHydrateKeyRef.current = null
        })

      return () => {
        cancelled = true
      }
    }

    // Publish local products only (landing page). Do not push customers/riders/etc. —
    // that previously copied one station's local data into another station's MySQL.
    productsHydrateKeyRef.current = stationId
    if (productsPublishKeyRef.current === stationId) return
    productsPublishKeyRef.current = stationId

    const snap = stateRef.current
    const localProducts = snap.products.filter(
      (p) => !deletedProductIdsRef.current.has(p.id),
    )
    let cancelled = false
    void (async () => {
      try {
        await Promise.all(
          localProducts.map(async (p) => {
            if (deletedProductIdsRef.current.has(p.id)) return
            await api.upsertProduct(apiBaseUrl, token, {
              id: p.id,
              name: p.name,
              price: Number(p.price) || 0,
            })
            if (deletedProductIdsRef.current.has(p.id)) {
              try {
                await api.deleteProduct(apiBaseUrl, token, p.id)
              } catch {
                /* ignore */
              }
            }
          }),
        )
        if (!cancelled) flash('Products published to landing page')
      } catch {
        if (!cancelled) productsPublishKeyRef.current = null
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    session.token,
    session.stationId,
    session.apiBaseUrl,
    state.products.length,
    flash,
    persistWorkspace,
  ])

  // Pull online orders / server customers+deliveries while signed in.
  useEffect(() => {
    if (!session.token || !session.stationId) return
    void refreshOnlineOrders()
    const onFocus = () => {
      void refreshOnlineOrders()
    }
    window.addEventListener('focus', onFocus)
    const timer = window.setInterval(() => {
      void refreshOnlineOrders()
    }, 30_000)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.clearInterval(timer)
    }
  }, [session.token, session.stationId, session.apiBaseUrl, refreshOnlineOrders])

  const value = useMemo(
    () => ({
      state,
      lastSavedLabel,
      toast,
      flash,
      updateState,
      replaceState,
      updateSettings,
      saveProduct,
      removeProduct,
      saveDelivery,
      patchDeliveryFields,
      removeDelivery,
      saveCustomer,
      removeCustomer,
      saveRider,
      removeRider,
      setInventoryCounts,
      refillInventory,
      saveUtang,
      removeUtang,
      savePayment,
      removePayment,
      completeDeliveryRemote,
      patchOrderFields,
      completeOrderRemote,
      recordWalkIn,
      downloadBackup,
      restoreBackup,
      resetAllData,
      session,
      setApiBaseUrl,
      login,
      registerStation,
      acceptInvite,
      logout,
      refreshOnlineOrders,
      refreshFromServer,
    }),
    [
      state,
      lastSavedLabel,
      toast,
      flash,
      updateState,
      replaceState,
      updateSettings,
      saveProduct,
      removeProduct,
      saveDelivery,
      patchDeliveryFields,
      removeDelivery,
      saveCustomer,
      removeCustomer,
      saveRider,
      removeRider,
      setInventoryCounts,
      refillInventory,
      saveUtang,
      removeUtang,
      savePayment,
      removePayment,
      completeDeliveryRemote,
      patchOrderFields,
      completeOrderRemote,
      recordWalkIn,
      downloadBackup,
      restoreBackup,
      resetAllData,
      session,
      setApiBaseUrl,
      login,
      registerStation,
      acceptInvite,
      logout,
      refreshOnlineOrders,
      refreshFromServer,
    ],
  )

  return <AquaFlowContext.Provider value={value}>{children}</AquaFlowContext.Provider>
}

export function useAquaFlow(): AquaFlowContextValue {
  const ctx = useContext(AquaFlowContext)
  if (!ctx) throw new Error('useAquaFlow must be used within AquaFlowProvider')
  return ctx
}

export { ApiError }
