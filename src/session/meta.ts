import {
  LEGACY_SYNC_META_KEY,
  SESSION_META_KEY,
  configuredApiBaseUrl,
  defaultSessionMeta,
  type SessionMeta,
} from '@/session/types'

function coerceSession(raw: unknown): SessionMeta | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Partial<SessionMeta>
  return {
    // Always from Vite env — ignore stale localhost saved in older sessions.
    apiBaseUrl: configuredApiBaseUrl(),
    token: typeof p.token === 'string' ? p.token : null,
    email: typeof p.email === 'string' ? p.email : null,
    stationId: typeof p.stationId === 'string' ? p.stationId : null,
    stationName: typeof p.stationName === 'string' ? p.stationName : null,
    userRole: typeof p.userRole === 'string' ? p.userRole : null,
  }
}

export function loadSessionMeta(): SessionMeta {
  try {
    const current = localStorage.getItem(SESSION_META_KEY)
    if (current) {
      const parsed = coerceSession(JSON.parse(current) as unknown)
      if (parsed) {
        saveSessionMeta(parsed)
        return parsed
      }
    }
    const legacy = localStorage.getItem(LEGACY_SYNC_META_KEY)
    if (legacy) {
      const parsed = coerceSession(JSON.parse(legacy) as unknown)
      if (parsed) {
        saveSessionMeta(parsed)
        return parsed
      }
    }
  } catch {
    // fall through
  }
  return defaultSessionMeta()
}

export function saveSessionMeta(meta: SessionMeta): void {
  localStorage.setItem(
    SESSION_META_KEY,
    JSON.stringify({ ...meta, apiBaseUrl: configuredApiBaseUrl() }),
  )
}
