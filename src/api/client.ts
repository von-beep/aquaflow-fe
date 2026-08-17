import type { AuthSession } from '@/session/types'

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

/** @deprecated Use ApiError — kept for gradual call-site updates */
export class SyncApiError extends ApiError {}

async function request<T>(
  baseUrl: string,
  path: string,
  init: RequestInit & { token?: string | null },
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (init.token) headers.set('Authorization', `Bearer ${init.token}`)

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    ...init,
    headers,
  })
  const body = await parseJson(res)
  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${res.status}`
    throw new ApiError(msg, res.status, body)
  }
  return body as T
}

export function login(
  baseUrl: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  return request<AuthSession>(baseUrl, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

/** Change password for the signed-in owner, staff, or rider account. */
export function changePassword(
  baseUrl: string,
  authToken: string,
  input: { currentPassword: string; newPassword: string },
): Promise<{ ok: boolean }> {
  return request(baseUrl, '/auth/change-password', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(input),
  })
}

export function register(
  baseUrl: string,
  input: { stationName: string; email: string; password: string },
): Promise<AuthSession> {
  return request<AuthSession>(baseUrl, '/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export type InvitePreview = {
  invite: {
    email: string | null
    role: string
    expiresAt: string
    stationName: string
  }
}

export type CreatedInvite = {
  invite: {
    id: string
    email: string | null
    token: string
    role: string
    expiresAt: string
    accepted: boolean
    inviteUrlPath: string
  }
}

export function getInvite(baseUrl: string, token: string): Promise<InvitePreview> {
  return request<InvitePreview>(baseUrl, `/auth/invites/${token}`, { method: 'GET' })
}

export function acceptInvite(
  baseUrl: string,
  token: string,
  input: { email: string; password: string },
): Promise<AuthSession> {
  return request<AuthSession>(baseUrl, `/auth/invites/${token}/accept`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export type StationProduct = {
  id: string
  name: string
  price: number
}

export function listProducts(
  baseUrl: string,
  authToken: string,
): Promise<{ products: StationProduct[] }> {
  return request(baseUrl, '/api/products', { method: 'GET', token: authToken })
}

export function createProduct(
  baseUrl: string,
  authToken: string,
  product: StationProduct,
): Promise<{ product: StationProduct }> {
  return request(baseUrl, '/api/products', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(product),
  })
}

export function upsertProduct(
  baseUrl: string,
  authToken: string,
  product: StationProduct,
): Promise<{ product: StationProduct }> {
  return request(baseUrl, `/api/products/${encodeURIComponent(product.id)}`, {
    method: 'PUT',
    token: authToken,
    body: JSON.stringify({ name: product.name, price: product.price }),
  })
}

export async function deleteProduct(
  baseUrl: string,
  authToken: string,
  productId: string,
): Promise<void> {
  await request<unknown>(baseUrl, `/api/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    token: authToken,
  })
}

export type StationSettingsPayload = {
  stationName: string
  owner: string
  phone: string
  address: string
  lat: number | null
  lng: number | null
  currency: string
  qrPhUrl?: string | null
}

export function getSettings(
  baseUrl: string,
  authToken: string,
): Promise<{ settings: StationSettingsPayload }> {
  return request(baseUrl, '/api/settings', {
    method: 'GET',
    token: authToken,
  })
}

export function putSettings(
  baseUrl: string,
  authToken: string,
  settings: StationSettingsPayload,
): Promise<{ settings: StationSettingsPayload }> {
  return request(baseUrl, '/api/settings', {
    method: 'PUT',
    token: authToken,
    body: JSON.stringify({
      stationName: settings.stationName,
      owner: settings.owner,
      phone: settings.phone,
      address: settings.address,
      lat: settings.lat,
      lng: settings.lng,
      currency: settings.currency,
    }),
  })
}

export function uploadStationQrPh(
  baseUrl: string,
  authToken: string,
  imageDataUrl: string,
): Promise<{ qrPhUrl: string | null }> {
  return request(baseUrl, '/api/settings/qrph', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({ image: imageDataUrl }),
  })
}

export function deleteStationQrPh(
  baseUrl: string,
  authToken: string,
): Promise<{ qrPhUrl: null }> {
  return request(baseUrl, '/api/settings/qrph', {
    method: 'DELETE',
    token: authToken,
  })
}

export function listInvites(
  baseUrl: string,
  authToken: string,
): Promise<{ invites: CreatedInvite['invite'][] }> {
  return request(baseUrl, '/api/invites', { method: 'GET', token: authToken })
}

export function createInvite(
  baseUrl: string,
  authToken: string,
  email?: string,
): Promise<CreatedInvite> {
  return request<CreatedInvite>(baseUrl, '/api/invites', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(email ? { email } : {}),
  })
}

export type BillingStatus = {
  billing: {
    planStatus: string
    planCode: string | null
    billingInterval: string | null
    planExpiresAt: string | null
    trialEndsAt: string | null
    entitled: boolean
    xenditPlanId: string | null
    amount: number
    currency: string
    configured: boolean
  }
}

export function getBilling(baseUrl: string, authToken: string): Promise<BillingStatus> {
  return request(baseUrl, '/api/billing', { method: 'GET', token: authToken })
}

export function startBillingCheckout(
  baseUrl: string,
  authToken: string,
): Promise<{ checkoutUrl: string; sessionId: string | null; referenceId: string }> {
  return request(baseUrl, '/api/billing/checkout', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({}),
  })
}

export function cancelBilling(
  baseUrl: string,
  authToken: string,
): Promise<BillingStatus> {
  return request(baseUrl, '/api/billing/cancel', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({}),
  })
}

export type BillingInterval = 'monthly' | 'yearly'
export type ExpiryMode = 'auto' | 'manual'

export type PlatformStation = {
  id: string
  name: string
  slug: string
  phone: string
  planStatus: string
  previousPlanStatus: string | null
  trialEndsAt: string | null
  planCode: string | null
  billingInterval: BillingInterval | null
  planExpiresAt: string | null
  createdAt: string
  userCount: number
}

export type PlanActivateInput = {
  billingInterval: BillingInterval
  expiryMode: ExpiryMode
  planExpiresAt?: string
}

export function listPlatformStations(
  baseUrl: string,
  authToken: string,
): Promise<{ stations: PlatformStation[] }> {
  return request(baseUrl, '/admin/stations', { method: 'GET', token: authToken })
}

export function createPlatformStation(
  baseUrl: string,
  authToken: string,
  input: { stationName: string; email: string; password: string },
): Promise<{ station: PlatformStation; owner: { id: string; email: string } }> {
  return request(baseUrl, '/admin/stations', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(input),
  })
}

export function activateStation(
  baseUrl: string,
  authToken: string,
  stationId: string,
  input: PlanActivateInput,
): Promise<{ station: PlatformStation }> {
  return request(baseUrl, `/admin/stations/${encodeURIComponent(stationId)}/activate`, {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(input),
  })
}

export function setStationBillingInterval(
  baseUrl: string,
  authToken: string,
  stationId: string,
  input: PlanActivateInput,
): Promise<{ station: PlatformStation }> {
  return request(
    baseUrl,
    `/admin/stations/${encodeURIComponent(stationId)}/billing-interval`,
    {
      method: 'PATCH',
      token: authToken,
      body: JSON.stringify(input),
    },
  )
}

export function suspendStation(
  baseUrl: string,
  authToken: string,
  stationId: string,
): Promise<{ station: PlatformStation }> {
  return request(baseUrl, `/admin/stations/${encodeURIComponent(stationId)}/suspend`, {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({}),
  })
}

export function unsuspendStation(
  baseUrl: string,
  authToken: string,
  stationId: string,
): Promise<{ station: PlatformStation }> {
  return request(baseUrl, `/admin/stations/${encodeURIComponent(stationId)}/unsuspend`, {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({}),
  })
}

export type PublicStation = {
  id: string
  name: string
  slug: string
  phone?: string
  address?: string
  lat?: number | null
  lng?: number | null
  /** Relative API path, e.g. `/uploads/qrph/….png`. */
  qrPhUrl?: string | null
}

export type PublicProduct = {
  id: string
  name: string
  price: number
}

export function listPublicStations(
  baseUrl: string,
): Promise<{ stations: PublicStation[] }> {
  return request(baseUrl, '/public/stations', { method: 'GET' })
}

export function getPublicStationProducts(
  baseUrl: string,
  idOrSlug: string,
): Promise<{
  station: PublicStation
  currency: string
  products: PublicProduct[]
}> {
  return request(
    baseUrl,
    `/public/stations/${encodeURIComponent(idOrSlug)}/products`,
    { method: 'GET' },
  )
}

export type PublicOrderItemInput = {
  productId: string
  qty: number
}

export type PublicOrderInput = {
  /** Single-item checkout (legacy). Prefer `items` for multi-item. */
  productId?: string
  qty?: number
  items?: PublicOrderItemInput[]
  customerName: string
  phone: string
  address: string
  note?: string
  /** Cash on Delivery → Cash; GCash/Maya require paymentProof screenshot */
  payMode: 'Cash' | 'GCash' | 'Maya'
  paymentProof?: string
  /** @deprecated Prefer paymentProof screenshot */
  paymentReference?: string
}

export type PublicOrderResult = {
  orderId: string
  deliveryId: string
  customerId: string
  amount: number
  currency: string
  productName: string
  qty: number
  status: string
  payMode?: 'Cash' | 'GCash' | 'Maya'
  items?: {
    deliveryId: string
    productId: string
    productName: string
    qty: number
    amount: number
  }[]
}

export function createPublicOrder(
  baseUrl: string,
  stationIdOrSlug: string,
  input: PublicOrderInput,
  consumerToken: string,
): Promise<PublicOrderResult> {
  return request(
    baseUrl,
    `/public/stations/${encodeURIComponent(stationIdOrSlug)}/orders`,
    {
      method: 'POST',
      token: consumerToken,
      body: JSON.stringify(input),
    },
  )
}

export type ConsumerProfile = {
  id: string
  email: string
  name: string
  phone: string
}

export type ConsumerAuthResult = {
  token: string
  expiresIn: string
  consumer: ConsumerProfile
}

export function registerConsumer(
  baseUrl: string,
  input: { email: string; password: string; name: string; phone?: string },
): Promise<ConsumerAuthResult> {
  return request(baseUrl, '/auth/consumer/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function loginConsumer(
  baseUrl: string,
  email: string,
  password: string,
): Promise<ConsumerAuthResult> {
  return request(baseUrl, '/auth/consumer/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function getConsumerMe(
  baseUrl: string,
  token: string,
): Promise<{ consumer: ConsumerProfile }> {
  return request(baseUrl, '/auth/consumer/me', { method: 'GET', token })
}

export function updateConsumerMe(
  baseUrl: string,
  token: string,
  input: { name?: string; phone?: string },
): Promise<{ consumer: ConsumerProfile }> {
  return request(baseUrl, '/auth/consumer/me', {
    method: 'PATCH',
    token,
    body: JSON.stringify(input),
  })
}

export type ConsumerOrder = {
  id: string
  orderId: string
  stationId: string
  stationName: string
  stationSlug: string
  date: string
  time: string
  productId: string
  productName: string
  qty: number
  amount: number
  currency: string
  status: string
  paid: boolean
  payMode: string
  note: string
  completedAt: string | null
  riderId: string | null
  riderName: string | null
  riderPhone: string | null
}

export function listConsumerOrders(
  baseUrl: string,
  token: string,
  stationId?: string,
): Promise<{ orders: ConsumerOrder[] }> {
  const q = stationId ? `?stationId=${encodeURIComponent(stationId)}` : ''
  return request(baseUrl, `/api/consumer/orders${q}`, { method: 'GET', token })
}

export function cancelConsumerOrder(
  baseUrl: string,
  token: string,
  orderId: string,
  reason: string,
): Promise<{ order: ConsumerOrder; orders?: ConsumerOrder[]; orderId?: string }> {
  return request(baseUrl, `/api/consumer/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
    token,
    body: JSON.stringify({ reason }),
  })
}

export type ConsumerAddress = {
  id: string
  label: string
  address: string
  isDefault: boolean
}

export function listConsumerAddresses(
  baseUrl: string,
  token: string,
): Promise<{ addresses: ConsumerAddress[] }> {
  return request(baseUrl, '/api/consumer/addresses', { method: 'GET', token })
}

export function createConsumerAddress(
  baseUrl: string,
  token: string,
  input: { label?: string; address: string; isDefault?: boolean },
): Promise<{ address: ConsumerAddress }> {
  return request(baseUrl, '/api/consumer/addresses', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  })
}

export function updateConsumerAddress(
  baseUrl: string,
  token: string,
  id: string,
  input: { label?: string; address?: string; isDefault?: boolean },
): Promise<{ address: ConsumerAddress }> {
  return request(baseUrl, `/api/consumer/addresses/${encodeURIComponent(id)}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(input),
  })
}

export async function deleteConsumerAddress(
  baseUrl: string,
  token: string,
  id: string,
): Promise<void> {
  await request<unknown>(
    baseUrl,
    `/api/consumer/addresses/${encodeURIComponent(id)}`,
    { method: 'DELETE', token },
  )
}

export type ApiDelivery = {
  id: string
  orderId: string
  date: string
  time: string
  customerId: string
  riderId: string
  prodId: string
  qty: number
  amount: number
  status: string
  paid: boolean
  payMode: string
  note: string
  paymentProofUrl?: string | null
  completedAt?: string | null
}

export type ApiCustomer = {
  id: string
  name: string
  phone: string
  addr: string
  gallonsOut: number
  note: string
}

export function listDeliveries(
  baseUrl: string,
  authToken: string,
): Promise<{ deliveries: ApiDelivery[] }> {
  return request(baseUrl, '/api/deliveries', { method: 'GET', token: authToken })
}

export function createDelivery(
  baseUrl: string,
  authToken: string,
  delivery: ApiDelivery,
): Promise<{ delivery: ApiDelivery }> {
  return request(baseUrl, '/api/deliveries', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(delivery),
  })
}

export function putDelivery(
  baseUrl: string,
  authToken: string,
  delivery: ApiDelivery,
): Promise<{ delivery: ApiDelivery }> {
  return request(baseUrl, `/api/deliveries/${encodeURIComponent(delivery.id)}`, {
    method: 'PUT',
    token: authToken,
    body: JSON.stringify(delivery),
  })
}

export function patchDelivery(
  baseUrl: string,
  authToken: string,
  deliveryId: string,
  patch: { status?: string; riderId?: string },
): Promise<{ delivery: ApiDelivery }> {
  return request(baseUrl, `/api/deliveries/${encodeURIComponent(deliveryId)}`, {
    method: 'PATCH',
    token: authToken,
    body: JSON.stringify(patch),
  })
}

export function patchOrderDeliveries(
  baseUrl: string,
  authToken: string,
  orderId: string,
  patch: { status?: string; riderId?: string },
): Promise<{ orderId: string; deliveries: ApiDelivery[] }> {
  return request(baseUrl, `/api/deliveries/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    token: authToken,
    body: JSON.stringify(patch),
  })
}

export function completeOrderDeliveries(
  baseUrl: string,
  authToken: string,
  orderId: string,
  input: {
    payment: 'Cash' | 'GCash' | 'Maya' | 'Utang'
    productNames?: Record<string, string>
  },
): Promise<{ orderId: string; deliveries: ApiDelivery[]; toast: string }> {
  return request(
    baseUrl,
    `/api/deliveries/orders/${encodeURIComponent(orderId)}/complete`,
    {
      method: 'POST',
      token: authToken,
      body: JSON.stringify(input),
    },
  )
}

export async function deleteDelivery(
  baseUrl: string,
  authToken: string,
  deliveryId: string,
): Promise<void> {
  await request<unknown>(baseUrl, `/api/deliveries/${encodeURIComponent(deliveryId)}`, {
    method: 'DELETE',
    token: authToken,
  })
}

export function listCustomers(
  baseUrl: string,
  authToken: string,
): Promise<{ customers: ApiCustomer[] }> {
  return request(baseUrl, '/api/customers', { method: 'GET', token: authToken })
}

export function createCustomer(
  baseUrl: string,
  authToken: string,
  customer: ApiCustomer,
): Promise<{ customer: ApiCustomer }> {
  return request(baseUrl, '/api/customers', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(customer),
  })
}

export function putCustomer(
  baseUrl: string,
  authToken: string,
  customer: ApiCustomer,
): Promise<{ customer: ApiCustomer }> {
  return request(baseUrl, `/api/customers/${encodeURIComponent(customer.id)}`, {
    method: 'PUT',
    token: authToken,
    body: JSON.stringify({
      name: customer.name,
      phone: customer.phone,
      addr: customer.addr,
      note: customer.note,
      gallonsOut: customer.gallonsOut,
    }),
  })
}

export async function deleteCustomer(
  baseUrl: string,
  authToken: string,
  customerId: string,
): Promise<void> {
  await request<unknown>(baseUrl, `/api/customers/${encodeURIComponent(customerId)}`, {
    method: 'DELETE',
    token: authToken,
  })
}

export type ApiRider = {
  id: string
  name: string
  phone: string
  email?: string | null
  hasAccount?: boolean
}

export type RiderWriteInput = ApiRider & {
  /** Required with password when creating a /rider login. */
  password?: string
}

export function listRiders(
  baseUrl: string,
  authToken: string,
): Promise<{ riders: ApiRider[] }> {
  return request(baseUrl, '/api/riders', { method: 'GET', token: authToken })
}

export function createRider(
  baseUrl: string,
  authToken: string,
  rider: RiderWriteInput,
): Promise<{ rider: ApiRider }> {
  return request(baseUrl, '/api/riders', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({
      id: rider.id,
      name: rider.name,
      phone: rider.phone,
      ...(rider.email ? { email: rider.email } : {}),
      ...(rider.password ? { password: rider.password } : {}),
    }),
  })
}

export function putRider(
  baseUrl: string,
  authToken: string,
  rider: RiderWriteInput,
): Promise<{ rider: ApiRider }> {
  return request(baseUrl, `/api/riders/${encodeURIComponent(rider.id)}`, {
    method: 'PUT',
    token: authToken,
    body: JSON.stringify({
      name: rider.name,
      phone: rider.phone,
      ...(rider.email ? { email: rider.email } : {}),
      ...(rider.password ? { password: rider.password } : {}),
    }),
  })
}

export type RiderAppOrderLine = {
  id: string
  orderId: string
  prodId: string
  productName: string
  qty: number
  amount: number
  status: string
}

export type RiderAppOrder = {
  orderId: string
  date: string
  time: string
  customerId: string
  customerName: string
  customerPhone: string
  customerAddr: string
  /** Checkout / customer landmark shown under the address. */
  landmark?: string
  status: string
  paid: boolean
  payMode: string
  paymentProofUrl: string | null
  note: string
  total: number
  lines: RiderAppOrderLine[]
}

export function getRiderMe(
  baseUrl: string,
  authToken: string,
): Promise<{
  user: { id: string; email: string; role: string; stationId: string; riderId: string }
  rider: { id: string; name: string; phone: string }
  station: { id: string; name: string }
}> {
  return request(baseUrl, '/api/rider/me', { method: 'GET', token: authToken })
}

export function listRiderOrders(
  baseUrl: string,
  authToken: string,
  date?: string,
): Promise<{ date: string; orders: RiderAppOrder[] }> {
  const q = date ? `?date=${encodeURIComponent(date)}` : ''
  return request(baseUrl, `/api/rider/deliveries${q}`, {
    method: 'GET',
    token: authToken,
  })
}

export function patchRiderOrderStatus(
  baseUrl: string,
  authToken: string,
  orderId: string,
  status: 'Pending' | 'In Progress',
): Promise<{ orderId: string; status: string }> {
  return request(baseUrl, `/api/rider/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    token: authToken,
    body: JSON.stringify({ status }),
  })
}

export function completeRiderOrder(
  baseUrl: string,
  authToken: string,
  orderId: string,
  payment: 'Cash' | 'GCash' | 'Maya' | 'Utang',
): Promise<{ orderId: string; toast: string; completed: number }> {
  return request(
    baseUrl,
    `/api/rider/orders/${encodeURIComponent(orderId)}/complete`,
    {
      method: 'POST',
      token: authToken,
      body: JSON.stringify({ payment }),
    },
  )
}

export async function deleteRider(
  baseUrl: string,
  authToken: string,
  riderId: string,
): Promise<void> {
  await request<unknown>(baseUrl, `/api/riders/${encodeURIComponent(riderId)}`, {
    method: 'DELETE',
    token: authToken,
  })
}

export type ApiInventory = {
  full: number
  empty: number
}

export function getInventory(
  baseUrl: string,
  authToken: string,
): Promise<{ inventory: ApiInventory }> {
  return request(baseUrl, '/api/inventory', { method: 'GET', token: authToken })
}

export function putInventory(
  baseUrl: string,
  authToken: string,
  inventory: ApiInventory,
): Promise<{ inventory: ApiInventory }> {
  return request(baseUrl, '/api/inventory', {
    method: 'PUT',
    token: authToken,
    body: JSON.stringify(inventory),
  })
}

export function refillInventory(
  baseUrl: string,
  authToken: string,
  count: number,
): Promise<{ inventory: ApiInventory; refilled: number }> {
  return request(baseUrl, '/api/inventory/refill', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({ count }),
  })
}

export type ApiUtang = {
  id: string
  ts: string
  customerId: string
  amount: number
  note: string
  deliveryId?: string
}

export function listUtang(
  baseUrl: string,
  authToken: string,
): Promise<{ utang: ApiUtang[] }> {
  return request(baseUrl, '/api/utang', { method: 'GET', token: authToken })
}

export function createUtang(
  baseUrl: string,
  authToken: string,
  entry: ApiUtang,
): Promise<{ entry: ApiUtang }> {
  return request(baseUrl, '/api/utang', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(entry),
  })
}

export function putUtang(
  baseUrl: string,
  authToken: string,
  entry: ApiUtang,
): Promise<{ entry: ApiUtang }> {
  return request(baseUrl, `/api/utang/${encodeURIComponent(entry.id)}`, {
    method: 'PUT',
    token: authToken,
    body: JSON.stringify({
      ts: entry.ts,
      amount: entry.amount,
      note: entry.note,
    }),
  })
}

export async function deleteUtang(
  baseUrl: string,
  authToken: string,
  entryId: string,
): Promise<void> {
  await request<unknown>(baseUrl, `/api/utang/${encodeURIComponent(entryId)}`, {
    method: 'DELETE',
    token: authToken,
  })
}

export type ApiPayment = {
  id: string
  ts: string
  customerId: string
  amount: number
  note: string
  mode: 'Cash' | 'GCash'
}

export function listPayments(
  baseUrl: string,
  authToken: string,
): Promise<{ payments: ApiPayment[] }> {
  return request(baseUrl, '/api/payments', { method: 'GET', token: authToken })
}

export function createPayment(
  baseUrl: string,
  authToken: string,
  payment: ApiPayment,
): Promise<{ payment: ApiPayment }> {
  return request(baseUrl, '/api/payments', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(payment),
  })
}

export function putPayment(
  baseUrl: string,
  authToken: string,
  payment: ApiPayment,
): Promise<{ payment: ApiPayment }> {
  return request(baseUrl, `/api/payments/${encodeURIComponent(payment.id)}`, {
    method: 'PUT',
    token: authToken,
    body: JSON.stringify({
      ts: payment.ts,
      amount: payment.amount,
      mode: payment.mode,
      note: payment.note,
    }),
  })
}

export async function deletePayment(
  baseUrl: string,
  authToken: string,
  paymentId: string,
): Promise<void> {
  await request<unknown>(baseUrl, `/api/payments/${encodeURIComponent(paymentId)}`, {
    method: 'DELETE',
    token: authToken,
  })
}

export function completeDelivery(
  baseUrl: string,
  authToken: string,
  deliveryId: string,
  input: {
    payment: 'Cash' | 'GCash' | 'Maya' | 'Utang'
    fullOut: number
    emptyIn: number
    productName: string
  },
): Promise<{ delivery: ApiDelivery; toast: string }> {
  return request(baseUrl, `/api/deliveries/${encodeURIComponent(deliveryId)}/complete`, {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(input),
  })
}

export function createWalkInSale(
  baseUrl: string,
  authToken: string,
  input: {
    productId: string
    qty: number
    payment: 'Cash' | 'GCash' | 'Maya' | 'Utang'
    fullOut: number
    emptyIn: number
    customerId?: string | null
    note?: string
  },
): Promise<{ delivery: ApiDelivery; toast: string }> {
  return request(baseUrl, '/api/deliveries/walk-in', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify(input),
  })
}

export type ChatConversation = {
  id: string
  stationId: string
  consumerUserId: string
  orderId: string | null
  lastMessageAt: string
  lastMessagePreview: string
  consumerLastReadAt: string | null
  stationLastReadAt: string | null
  createdAt: string
  consumerName: string
  consumerPhone: string
  stationName: string
  unreadCount: number
}

export type ChatMessage = {
  id: string
  conversationId: string
  senderType: 'consumer' | 'station'
  senderId: string
  body: string
  createdAt: string
}

export function listStationChatConversations(
  baseUrl: string,
  authToken: string,
): Promise<{ retentionDays: number; conversations: ChatConversation[] }> {
  return request(baseUrl, '/api/chat/conversations', {
    method: 'GET',
    token: authToken,
  })
}

export function getStationChatUnreadCount(
  baseUrl: string,
  authToken: string,
): Promise<{ unreadCount: number }> {
  return request(baseUrl, '/api/chat/unread-count', {
    method: 'GET',
    token: authToken,
  })
}

export function listStationChatMessages(
  baseUrl: string,
  authToken: string,
  conversationId: string,
): Promise<{ conversation: ChatConversation; messages: ChatMessage[] }> {
  return request(
    baseUrl,
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: 'GET', token: authToken },
  )
}

export function sendStationChatMessage(
  baseUrl: string,
  authToken: string,
  conversationId: string,
  body: string,
): Promise<{ message: ChatMessage }> {
  return request(
    baseUrl,
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      token: authToken,
      body: JSON.stringify({ body }),
    },
  )
}

export function openConsumerChatConversation(
  baseUrl: string,
  consumerToken: string,
  stationId: string,
): Promise<{ conversation: ChatConversation }> {
  return request(baseUrl, '/api/consumer/chat/conversations', {
    method: 'POST',
    token: consumerToken,
    body: JSON.stringify({ stationId }),
  })
}

export function listConsumerChatMessages(
  baseUrl: string,
  consumerToken: string,
  conversationId: string,
): Promise<{ conversation: ChatConversation; messages: ChatMessage[] }> {
  return request(
    baseUrl,
    `/api/consumer/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: 'GET', token: consumerToken },
  )
}

export function sendConsumerChatMessage(
  baseUrl: string,
  consumerToken: string,
  conversationId: string,
  body: string,
): Promise<{ message: ChatMessage }> {
  return request(
    baseUrl,
    `/api/consumer/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      token: consumerToken,
      body: JSON.stringify({ body }),
    },
  )
}

export function getConsumerChatUnreadCount(
  baseUrl: string,
  consumerToken: string,
): Promise<{ unreadCount: number }> {
  return request(baseUrl, '/api/consumer/chat/unread-count', {
    method: 'GET',
    token: consumerToken,
  })
}

