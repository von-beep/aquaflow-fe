export const SESSION_META_KEY = 'aquaFlow_session_v1'
/** Legacy key from cloud-sync era — read once for migration. */
export const LEGACY_SYNC_META_KEY = 'aquaFlow_sync_v1'

export type SessionMeta = {
  apiBaseUrl: string
  token: string | null
  email: string | null
  stationId: string | null
  stationName: string | null
  userRole: string | null
}

export const defaultSessionMeta = (): SessionMeta => ({
  apiBaseUrl: configuredApiBaseUrl(),
  token: null,
  email: null,
  stationId: null,
  stationName: null,
  userRole: null,
})

/** Build/runtime API base from Vite env (no trailing slash). */
export function configuredApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/\/$/, '')
  }
  return 'http://localhost:3001'
}

export type AuthSession = {
  token: string
  expiresIn: string
  user: {
    id: string
    email: string
    role: string
    stationId: string
    riderId?: string | null
    isPlatformAdmin?: boolean
  }
  station: {
    id: string
    name: string
    slug: string
    planStatus: string
    phone?: string
    trialEndsAt?: string | null
  }
}

/** Separate from station admin session so owner + rider can coexist in one browser. */
export const RIDER_SESSION_KEY = 'aquaFlow_rider_session_v1'

export type RiderSession = {
  apiBaseUrl: string
  token: string
  email: string
  stationId: string
  stationName: string
  riderId: string
  riderName: string
}

export function defaultRiderSessionApiUrl(): string {
  return configuredApiBaseUrl()
}
