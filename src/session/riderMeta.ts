import {
  RIDER_SESSION_KEY,
  defaultRiderSessionApiUrl,
  type RiderSession,
} from '@/session/types'

export function loadRiderSession(): RiderSession | null {
  try {
    const raw = localStorage.getItem(RIDER_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<RiderSession>
    if (
      typeof parsed.token !== 'string' ||
      !parsed.token ||
      typeof parsed.riderId !== 'string' ||
      !parsed.riderId
    ) {
      return null
    }
    return {
      apiBaseUrl: defaultRiderSessionApiUrl(),
      token: parsed.token,
      email: typeof parsed.email === 'string' ? parsed.email : '',
      stationId: typeof parsed.stationId === 'string' ? parsed.stationId : '',
      stationName: typeof parsed.stationName === 'string' ? parsed.stationName : '',
      riderId: parsed.riderId,
      riderName: typeof parsed.riderName === 'string' ? parsed.riderName : '',
    }
  } catch {
    return null
  }
}

export function saveRiderSession(session: RiderSession): void {
  localStorage.setItem(RIDER_SESSION_KEY, JSON.stringify(session))
}

export function clearRiderSession(): void {
  localStorage.removeItem(RIDER_SESSION_KEY)
}
